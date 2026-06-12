import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import Container from "../models/Container.js";
import Product from "../models/Product.js";
import Settings from "../models/Settings.js";
import { localize } from "../utils/localize.js";
import { responder } from "../utils/Responder.js";

async function attachProducts(containers: any[]) {
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

  const settings = await Settings.findOne();
  const rate = settings?.sypExchangeRate ?? 15000;

  return containers.map((c) => {
    const containerProducts = productMap[c._id.toString()] ?? [];
    return {
      ...c,
      products: containerProducts.map((p: any) => ({
        ...p,
        priceSY: p.price ? p.price * rate : undefined,
      })),
    };
  });
}

export const getAll = async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = { isActive: true };

  const [containers, total] = await Promise.all([
    Container.find(filter)
      .populate("brand", "nameEn nameAr")
      .populate("categories", "nameEn nameAr")
      .skip(skip)
      .limit(limit)
      .lean(),
    Container.countDocuments(filter),
  ]);

  const data = await attachProducts(containers);

  return responder()
    .code(200)
    .message("containers fetched")
    .payload(localize(data, req.lang))
    .meta({ page, limit, total, totalPages: Math.ceil(total / limit) })
    .send(res);
};

export const getById = async (req: Request, res: Response) => {
  const container = await Container.findOne({ _id: req.params.id, isActive: true })
    .populate("brand", "nameEn nameAr")
    .populate("categories", "nameEn nameAr")
    .lean();

  if (!container) throw new AppError("Container not found", 404);

  const data = (await attachProducts([container]))[0];

  return responder()
    .code(200)
    .message("container fetched")
    .payload(localize(data, req.lang))
    .send(res);
};

export const create = async (req: Request, res: Response) => {
  const container = await Container.create(req.body);

  const populated = await Container.findById(container._id)
    .populate("brand", "nameEn nameAr")
    .populate("categories", "nameEn nameAr")
    .lean();

  if (!populated) throw new AppError("Container not found after creation", 500);

  return responder()
    .code(201)
    .message("container created")
    .payload(localize(populated, req.lang))
    .send(res);
};

export const update = async (req: Request, res: Response) => {
  const container = await Container.findByIdAndUpdate(
    req.params.id,
    req.body,
    { returnDocument: "after", runValidators: true },
  );
  if (!container) throw new AppError("Container not found", 404);

  const updated = await Container.findById(req.params.id)
    .populate("brand", "nameEn nameAr")
    .populate("categories", "nameEn nameAr")
    .lean();

  if (!updated) throw new AppError("Container not found after update", 500);

  return responder()
    .code(200)
    .message("container updated")
    .payload(localize(updated, req.lang))
    .send(res);
};

export const remove = async (req: Request, res: Response) => {
  const container = await Container.findByIdAndDelete(req.params.id);
  if (!container) throw new AppError("Container not found", 404);

  await Product.deleteMany({ container: container._id });

  return responder()
    .code(200)
    .message("container deleted")
    .payload(container)
    .send(res);
};

export const addProductImage = async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { image } = req.body;
  if (!image) throw new AppError("Image filename is required", 400);

  const product = await Product.findByIdAndUpdate(
    productId,
    { $push: { images: image } },
    { returnDocument: "after" },
  );
  if (!product) throw new AppError("Product not found", 404);

  return responder()
    .code(200)
    .message("Image added")
    .payload(product.images ?? [])
    .send(res);
};

export const removeProductImage = async (req: Request, res: Response) => {
  const { productId, imageIndex } = req.params;

  const iIdx = Number(imageIndex);
  const product = await Product.findById(productId);
  if (!product) throw new AppError("Product not found", 404);

  const images = product.images ?? [];
  if (iIdx < 0 || iIdx >= images.length) throw new AppError("Image not found", 404);

  const updated = await Product.findByIdAndUpdate(
    productId,
    { $unset: { [`images.${iIdx}`]: 1 } },
    { returnDocument: "after" },
  );

  if (updated) {
    updated.images = updated.images.filter(Boolean);
    updated.markModified("images");
    await updated.save();
  }

  return responder()
    .code(200)
    .message("Image removed")
    .payload(updated?.images ?? [])
    .send(res);
};
