import type { Request, Response } from "express";
import Container from "../models/Container.js";
import Product from "../models/Product.js";
import Brand from "../models/Brand.js";
import Category from "../models/Category.js";
import { responder } from "../utils/Responder.js";

const escapedRegex = (s: string) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const bilingualRegex = (fields: string[], escaped: string) => ({
  $or: fields.map((f) => ({ [f]: { $regex: escaped, $options: "i" } })),
});

async function attachFirstProduct(containers: any[]) {
  const containerIds = containers.map((c) => c._id);
  const products = await Product.find({ container: { $in: containerIds } })
    .sort({ productIndex: 1 })
    .lean();
  const productMap: Record<string, any[]> = {};
  for (const p of products) {
    const cid = p.container.toString();
    if (!productMap[cid]) productMap[cid] = [];
    productMap[cid].push(p);
  }
  return containers.map((c) => ({
    ...c,
    products: (productMap[c._id.toString()] ?? []).slice(0, 1),
  }));
}

export const search = async (req: Request, res: Response) => {
  const q = (req.query.q as string)?.trim();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const sort = (req.query.sort as string) || "relevance";
  const skip = (page - 1) * limit;

  if (!q) {
    return responder()
      .code(200)
      .message("search results")
      .payload([])
      .meta({ page, limit, total: 0, totalPages: 0 })
      .send(res);
  }

  const escaped = escapedRegex(q);

  const textFilter = { $text: { $search: q } };

  const containerRegexFilter = bilingualRegex(
    ["nameEn", "nameAr", "shortDescriptionEn", "shortDescriptionAr", "longDescriptionEn", "longDescriptionAr"],
    escaped,
  );

  const productRegexFilter = bilingualRegex(
    ["nameEn", "nameAr", "tagsEn", "tagsAr", "aliasesEn", "aliasesAr"],
    escaped,
  );

  const categoryIds: string[] = [];

  const [categories] = await Promise.all([
    Category.find(
      bilingualRegex(["nameEn", "nameAr"], escaped),
      { _id: 1 },
    ).lean(),
  ]);

  categoryIds.push(...categories.map((c) => c._id.toString()));

  const refFilter: Record<string, unknown> = {};
  if (categoryIds.length > 0) {
    refFilter.categories = { $in: categoryIds };
  }

  const hasRefFilter = categoryIds.length > 0;

  let containers;
  let total;

  try {
    const matchingProductContainerIds = await Product.distinct("container", {
      $or: [
        { $text: { $search: q } },
        productRegexFilter,
      ],
    });

    const textResults = await Container.find(
      { ...textFilter, isActive: true },
      { score: { $meta: "textScore" } },
    )
      .populate("brand", "nameEn nameAr")
      .populate("categories", "nameEn nameAr")
      .sort({ score: { $meta: "textScore" } })
      .lean();

    const textIds = textResults.map((c) => c._id.toString());

    const matchFilterOr: Record<string, unknown>[] = hasRefFilter
      ? [containerRegexFilter, refFilter]
      : [containerRegexFilter];

    if (matchingProductContainerIds.length > 0) {
      const excluded = matchingProductContainerIds.filter(
        (cid) => !textIds.includes(cid.toString()),
      );
      if (excluded.length > 0) {
        matchFilterOr.push({ _id: { $in: excluded } });
      }
    }

    const containerMatchFilter: Record<string, unknown> = {
      _id: { $nin: textIds },
      isActive: true,
      $or: matchFilterOr,
    };

    const regexMatch = await Container.find(containerMatchFilter)
      .populate("brand", "nameEn nameAr")
      .populate("categories", "nameEn nameAr")
      .lean();

    const all = [...textResults, ...regexMatch];

    total = all.length;
    containers = all.slice(skip, skip + limit);

    if (sort === "price_asc" || sort === "price_desc") {
      const containerIds = containers.map((c) => c._id);
      const firstProducts = await Product.find({ container: { $in: containerIds } })
        .sort({ productIndex: 1 })
        .lean();
      const priceMap: Record<string, number> = {};
      for (const p of firstProducts) {
        const cid = p.container.toString();
        if (priceMap[cid] === undefined) priceMap[cid] = p.price;
      }
      containers.sort((a, b) => {
        const pa = priceMap[a._id.toString()] ?? 0;
        const pb = priceMap[b._id.toString()] ?? 0;
        return sort === "price_asc" ? pa - pb : pb - pa;
      });
    } else if (sort === "name") {
      containers.sort((a, b) =>
        (a as any).nameEn?.localeCompare((b as any).nameEn ?? "") ?? 0,
      );
    }

    const data = await attachFirstProduct(containers);

    return responder()
      .code(200)
      .message("search results")
      .payload(data)
      .meta({ page, limit, total, totalPages: Math.ceil(total / limit) })
      .send(res);
  } catch {
    const fallback = await Container.find({ ...containerRegexFilter, isActive: true })
      .populate("brand", "nameEn nameAr")
      .populate("categories", "nameEn nameAr")
      .skip(skip)
      .limit(limit)
      .lean();

    total = await Container.countDocuments({ ...containerRegexFilter, isActive: true });

    const data = await attachFirstProduct(fallback);

    return responder()
      .code(200)
      .message("search results")
      .payload(data)
      .meta({ page, limit, total, totalPages: Math.ceil(total / limit) })
      .send(res);
  }
};
