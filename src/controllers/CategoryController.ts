import type { Request, Response } from "express";
import mongoose from "mongoose";
import { AppError } from "../errors/AppError.js";
import Category from "../models/Category.js";
import Container from "../models/Container.js";
import Product from "../models/Product.js";
import { createCrudController } from "../utils/CrudFactory.js";
import { attachProducts } from "../utils/attachProducts.js";
import { localize } from "../utils/localize.js";
import { responder } from "../utils/Responder.js";

export const categoryCrud = createCrudController({
  model: Category,
  resourceName: "category",
  localize: true,
  pagination: { maxLimit: 10000 },
});

const LIMIT_PER_CATEGORY = 10;

export const getAll = async (req: Request, res: Response) => {
  const categories = await Category.find().lean();
  const categoryIds = categories.map((c) => c._id);

  const containerFilter: Record<string, unknown> = { categories: { $in: categoryIds } };
  if (!req.isAdminRequest) containerFilter.isActive = true;
  const allContainers = await Container.find(containerFilter)
    .populate("brand", "nameEn nameAr")
    .sort({ createdAt: -1 })
    .lean();

  const containerByCategory: Record<string, any[]> = {};
  for (const c of allContainers) {
    for (const catId of (c.categories ?? [])) {
      const key = catId.toString();
      if (!containerByCategory[key]) containerByCategory[key] = [];
      if (containerByCategory[key].length < LIMIT_PER_CATEGORY) containerByCategory[key].push(c);
    }
  }

  const allContainerIds = allContainers.map((c) => c._id);
  const productFilter: Record<string, unknown> = { container: { $in: allContainerIds } };
  if (!req.isAdminRequest) productFilter.isActive = true;
  const allProducts = await Product.find(productFilter)
    .sort({ productIndex: 1 })
    .lean();

  const productMap: Record<string, any[]> = {};
  for (const p of allProducts) {
    const cid = p.container.toString();
    if (!productMap[cid]) productMap[cid] = [];
    productMap[cid].push(p);
  }

  const data = categories.map((cat) => {
    const catContainers = (containerByCategory[cat._id.toString()] ?? []).map((c) => ({
      ...c,
      products: (productMap[c._id.toString()] ?? []).slice(0, 1),
    }));
    return { ...cat, containers: catContainers };
  });

  return responder()
    .code(200)
    .message("categories fetched")
    .payload(localize(data, req.lang, req))
    .send(res);
};

export const getById = async (req: Request, res: Response) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new AppError("Category not found", 404);

  const containerFilter: Record<string, unknown> = { categories: category._id };
  if (!req.isAdminRequest) containerFilter.isActive = true;
  const containers = await Container.find(containerFilter)
    .populate("brand", "nameEn nameAr")
    .limit(LIMIT_PER_CATEGORY)
    .sort({ createdAt: -1 })
    .lean();

  const data = {
    ...category.toJSON(),
    containers: await attachProducts(containers, 1, req.isAdminRequest),
  };

  return responder()
    .code(200)
    .message("category fetched")
    .payload(localize(data, req.lang, req))
    .send(res);
};

export const getContainers = async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  const skip = (page - 1) * limit;
  const categoryId = new mongoose.Types.ObjectId(req.params.id as string);

  const containerFilter: Record<string, unknown> = { categories: categoryId };
  if (!req.isAdminRequest) containerFilter.isActive = true;
  const [containers, total] = await Promise.all([
    Container.find(containerFilter)
      .populate("brand", "nameEn nameAr")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean(),
    Container.countDocuments(containerFilter),
  ]);

  const data = await attachProducts(containers, 1, req.isAdminRequest);

  return responder()
    .code(200)
    .message("containers fetched")
    .payload(localize(data, req.lang, req))
    .meta({ page, limit, total, totalPages: Math.ceil(total / limit) })
    .send(res);
};
