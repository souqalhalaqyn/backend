import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import Product from "../models/Product.js";
import Settings from "../models/Settings.js";
import { localize } from "../utils/localize.js";
import { responder } from "../utils/Responder.js";

export const getAll = async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const settings = await Settings.findOne();
  const [products, total] = await Promise.all([
    Product.find().skip(skip).limit(limit).populate("container"),
    Product.countDocuments(),
  ]);

  const data = products.map((p) => {
    const obj = p.toObject();
    return {
      ...obj,
      priceSY: settings?.sypExchangeRate
        ? p.price * settings.sypExchangeRate
        : undefined,
    };
  });

  return responder()
    .code(200)
    .message("products fetched")
    .payload(localize(data, req.lang))
    .meta({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    })
    .send(res);
};

export const getById = async (req: Request, res: Response) => {
  const product = await Product.findById(req.params.id).populate("container");
  if (!product) throw new AppError("Product not found", 404);
  return responder()
    .code(200)
    .message("product fetched")
    .payload(localize(product.toObject(), req.lang))
    .send(res);
};

export const create = async (req: Request, res: Response) => {
  const product = await Product.create(req.body);

  return responder()
    .code(201)
    .message("product created")
    .payload(product)
    .send(res);
};

export const update = async (req: Request, res: Response) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    returnDocument: "after",
    runValidators: true,
  });
  if (!product) throw new AppError("Product not found", 404);

  return responder()
    .code(200)
    .message("product updated")
    .payload(product)
    .send(res);
};

export const remove = async (req: Request, res: Response) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new AppError("Product not found", 404);
  return responder()
    .code(200)
    .message("product deleted")
    .payload(product)
    .send(res);
};

export const uploadImages = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0)
    throw new AppError("no images provided", 400);

  const filenames = files.map((f) => f.filename);

  return responder()
    .code(201)
    .message("images uploaded")
    .payload(filenames)
    .send(res);
};
