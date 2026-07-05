import type { Request, Response } from "express";
import Container from "../models/Container.js";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import { attachProducts } from "../utils/attachProducts.js";
import { responder } from "../utils/Responder.js";

const escapedRegex = (s: string) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const bilingualRegex = (fields: string[], escaped: string) => ({
  $or: fields.map((f) => ({ [f]: { $regex: escaped, $options: "i" } })),
});

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
    ["nameEn", "nameAr", "descriptionEn", "descriptionAr"],
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

    if (sort === "price_asc" || sort === "price_desc") {
      const allIds = all.map((c) => c._id);
      const firstProducts = await Product.find({ container: { $in: allIds } })
        .sort({ productIndex: 1 })
        .lean();
      const priceMap: Record<string, number> = {};
      for (const p of firstProducts) {
        const cid = p.container.toString();
        if (priceMap[cid] === undefined) priceMap[cid] = p.price;
      }
      all.sort((a, b) => {
        const pa = priceMap[a._id.toString()] ?? 0;
        const pb = priceMap[b._id.toString()] ?? 0;
        return sort === "price_asc" ? pa - pb : pb - pa;
      });
    } else if (sort === "name") {
      all.sort((a, b) =>
        ((a as any).nameAr || (a as any).nameEn || "")?.localeCompare((b as any).nameAr || (b as any).nameEn || "") ?? 0,
      );
    }

    containers = all.slice(skip, skip + limit);

    const data = await attachProducts(containers, 1);

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

    const data = await attachProducts(fallback, 1);

    return responder()
      .code(200)
      .message("search results")
      .payload(data)
      .meta({ page, limit, total, totalPages: Math.ceil(total / limit) })
      .send(res);
  }
};
