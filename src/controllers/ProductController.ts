import type { Request, Response } from "express";
import mongoose from "mongoose";
import { AppError } from "../errors/AppError.js";
import Product from "../models/Product.js";
import { createCrudController } from "../utils/CrudFactory.js";
import { responder } from "../utils/Responder.js";

export const productCrud = createCrudController({
  model: Product,
  resourceName: "product",
  localize: true,
  populate: "container",
  pagination: { defaultLimit: 20, maxLimit: 10000 },
  listFilter: (req) => {
    const filter: Record<string, unknown> = {};
    const containerParam = (req.query.container as string) || (req.query.contianerId as string);
    if (containerParam && mongoose.Types.ObjectId.isValid(containerParam)) {
      filter.container = new mongoose.Types.ObjectId(containerParam);
    }
    return filter;
  },
});

export const uploadImages = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) throw new AppError("no images provided", 400);

  const filenames = files.map((f) => f.filename);

  return responder()
    .code(201)
    .message("images uploaded")
    .payload(filenames)
    .send(res);
};
