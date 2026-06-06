import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import Category from "../models/Category.js";
import Container from "../models/Container.js";
import Product from "../models/Product.js";
import { localize } from "../utils/localize.js";
import { responder } from "../utils/Responder.js";

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

export const getAll = async (req: Request, res: Response) => {
  const categories = await Category.find();

  const data = await Promise.all(
    categories.map(async (cat) => {
      const containers = await Container.find({ categories: cat._id })
        .populate("brand", "nameEn nameAr")
        .limit(10)
        .lean()
        .sort({ createdAt: -1 });
      return {
        ...cat.toObject(),
        containers: await attachFirstProduct(containers),
      };
    }),
  );

  return responder()
    .code(200)
    .message("categories fetched")
    .payload(localize(data, req.lang))
    .send(res);
};

export const getById = async (req: Request, res: Response) => {
  const category = await Category.findById(req.params.id as string);
  if (!category) throw new AppError("Category not found", 404);

  const containers = await Container.find({ categories: category._id })
    .populate("brand", "nameEn nameAr")
    .limit(10)
    .lean()
    .sort({ createdAt: -1 });

  const data = {
    ...category.toObject(),
    containers: await attachFirstProduct(containers),
  };

  return responder()
    .code(200)
    .message("category fetched")
    .payload(localize(data, req.lang))
    .send(res);
};

export const getContainers = async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  const skip = (page - 1) * limit;
  const categoryId = req.params.id as string;

  const [containers, total] = await Promise.all([
    Container.find({ categories: categoryId })
      .populate("brand", "nameEn nameAr")
      .skip(skip)
      .limit(limit)
      .lean()
      .sort({ createdAt: -1 }),
    Container.countDocuments({ categories: categoryId }),
  ]);

  const data = await attachFirstProduct(containers);

  return responder()
    .code(200)
    .message("containers fetched")
    .payload(localize(data, req.lang))
    .meta({ page, limit, total, totalPages: Math.ceil(total / limit) })
    .send(res);
};

export const create = async (req: Request, res: Response) => {
  const category = await Category.create(req.body);
  return responder()
    .code(201)
    .message("category created")
    .payload(category)
    .send(res);
};

export const update = async (req: Request, res: Response) => {
  const category = await Category.findByIdAndUpdate(req.params.id as string, req.body, {
    returnDocument: "after",
    runValidators: true,
  });
  if (!category) throw new AppError("Category not found", 404);
  return responder()
    .code(200)
    .message("category updated")
    .payload(category)
    .send(res);
};

export const remove = async (req: Request, res: Response) => {
  const category = await Category.findByIdAndDelete(req.params.id as string);
  if (!category) throw new AppError("Category not found", 404);
  return responder()
    .code(200)
    .message("category deleted")
    .payload(category)
    .send(res);
};
