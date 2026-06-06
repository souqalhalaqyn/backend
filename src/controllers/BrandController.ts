import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import Brand from "../models/Brand.js";
import { localize } from "../utils/localize.js";
import { responder } from "../utils/Responder.js";

export const getAll = async (req: Request, res: Response) => {
  const brands = await Brand.find();
  return responder()
    .code(200)
    .message("brands fetched")
    .payload(localize(brands.map((b) => b.toObject()), req.lang))
    .send(res);
};

export const getById = async (req: Request, res: Response) => {
  const brand = await Brand.findById(req.params.id);
  if (!brand) throw new AppError("Brand not found", 404);
  return responder()
    .code(200)
    .message("brand fetched")
    .payload(localize(brand.toObject(), req.lang))
    .send(res);
};

export const create = async (req: Request, res: Response) => {
  const brand = await Brand.create(req.body);
  return responder()
    .code(201)
    .message("brand created")
    .payload(brand)
    .send(res);
};

export const update = async (req: Request, res: Response) => {
  const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, {
    returnDocument: "after",
    runValidators: true,
  });
  if (!brand) throw new AppError("Brand not found", 404);
  return responder()
    .code(200)
    .message("brand updated")
    .payload(brand)
    .send(res);
};

export const remove = async (req: Request, res: Response) => {
  const brand = await Brand.findByIdAndDelete(req.params.id);
  if (!brand) throw new AppError("Brand not found", 404);
  return responder()
    .code(200)
    .message("brand deleted")
    .payload(brand)
    .send(res);
};
