import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import Container from "../models/Container.js";
import Product from "../models/Product.js";
import { createCrudController } from "../utils/CrudFactory.js";
import { attachProducts } from "../utils/attachProducts.js";
import { responder } from "../utils/Responder.js";

const CONTAINER_POPULATE = [
  { path: "brand", select: "nameEn nameAr" },
  { path: "categories", select: "nameEn nameAr" },
];

async function refetchContainer(id: any) {
  return Container.findById(id).populate(CONTAINER_POPULATE).lean();
}

export const containerCrud = createCrudController({
  model: Container,
  resourceName: "container",
  populate: CONTAINER_POPULATE,
  localize: true,
  pagination: { defaultLimit: 20, maxLimit: 10000 },
  listFilter: async (req) => {
    if (req.isAdminRequest) return { isActive: true };
    const containerIds = await Product.distinct("container", { isActive: true });
    return { isActive: true, _id: { $in: containerIds } };
  },
  hooks: {
    afterList: async ({ req, docs }) => attachProducts(docs!, undefined, req.isAdminRequest),
    afterGet: async ({ req, doc }) => {
      const attached = await attachProducts([doc!], undefined, req.isAdminRequest);
      const result = attached[0] ?? doc!;
      if (!req.isAdminRequest && (!result.products || result.products.length === 0)) {
        throw new AppError("Container not found", 404);
      }
      return result;
    },
    afterCreate: async ({ req, doc }) => {
      if (!doc) throw new AppError("Container not created", 500);
      const populated = await refetchContainer((doc as any)._id);
      if (!populated) throw new AppError("Container not found after creation", 500);
      return populated;
    },
    afterUpdate: async ({ req, doc }) => {
      if (!doc) throw new AppError("Container not updated", 500);
      const populated = await refetchContainer((doc as any)._id);
      if (!populated) throw new AppError("Container not found after update", 500);
      return populated;
    },
    beforeRemove: async ({ req }) => {
      const container = await Container.findById(req.params.id);
      if (container) {
        await Product.deleteMany({ container: container._id });
      }
    },
  },
});

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
