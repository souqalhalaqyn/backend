import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import Container from "../models/Container.js";
import Offer from "../models/Offer.js";
import OfferPurchase from "../models/OfferPurchase.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import { localize } from "../utils/localize.js";
import { responder } from "../utils/Responder.js";
import { notifyAdmins } from "../services/notification.js";

// -- Public endpoints --

export const getAvailable = async (req: Request, res: Response) => {
  const offers = await Offer.find({ status: "available" })
    .populate("container", "nameEn nameAr descriptionEn descriptionAr")
    .populate("product", "nameEn nameAr images price stock")
    .sort({ createdAt: -1 })
    .lean();

  return responder()
    .code(200)
    .message("Offers fetched")
    .payload(localize(offers, req.lang, req))
    .send(res);
};

export const getById = async (req: Request, res: Response) => {
  const offer = await Offer.findById(req.params.id)
    .populate("container", "nameEn nameAr descriptionEn descriptionAr")
    .populate("product", "nameEn nameAr images price stock descriptionEn descriptionAr tagsEn tagsAr aliasesEn aliasesAr notesEn notesAr")
    .lean();

  if (!offer) throw new AppError("Offer not found", 404);

  return responder()
    .code(200)
    .message("Offer fetched")
    .payload(localize(offer, req.lang, req))
    .send(res);
};

export const buyOffer = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const offer = await Offer.findById(req.params.id);
  if (!offer) throw new AppError("Offer not found", 404);
  if (offer.status !== "available") throw new AppError("Offer is no longer available", 400);

  const user = await User.findById(req.user.userId);
  if (!user) throw new AppError("User not found", 404);
  if (user.balance < offer.offerPrice) throw new AppError("Insufficient balance", 400);

  // Atomic balance deduction
  const updatedUser = await User.findOneAndUpdate(
    { _id: req.user.userId, balance: { $gte: offer.offerPrice } },
    { $inc: { balance: -offer.offerPrice } },
    { returnDocument: "after" },
  );
  if (!updatedUser) throw new AppError("Insufficient balance", 400);

  try {
    // Update product stock + activate
    const product = await Product.findByIdAndUpdate(
      offer.product,
      { $inc: { stock: offer.totalQuantity }, isActive: true },
      { returnDocument: "after" },
    );
    if (!product) throw new AppError("Product not found", 500);

    // Mark offer as sold
    offer.buyer = req.user.userId as any;
    offer.status = "sold";
    await offer.save();
  } catch (err) {
    // Rollback balance
    await User.findByIdAndUpdate(req.user.userId, { $inc: { balance: offer.offerPrice } });
    throw err;
  }

  const populated = await Offer.findById(offer._id)
    .populate("container", "nameEn nameAr descriptionEn descriptionAr")
    .populate("product", "nameEn nameAr images price stock")
    .lean();

  notifyAdmins("شراء عرض", `${req.user?.phone ?? "مستخدم"} قام بشراء عرض`, { screen: "offers", offerId: offer._id.toString() });

  return responder()
    .code(200)
    .message("Offer purchased successfully")
    .payload(localize(populated as any, req.lang, req))
    .send(res);
};

export const getMyOffer = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const offer = await Offer.findOne({ buyer: req.user.userId, status: { $in: ["sold", "completed"] } })
    .populate("container", "nameEn nameAr descriptionEn descriptionAr")
    .populate("product", "nameEn nameAr images price stock")
    .sort({ createdAt: -1 })
    .lean();

  if (!offer) throw new AppError("No purchased offer found", 404);

  const purchases = await OfferPurchase.find({ offer: offer._id })
    .sort({ createdAt: -1 })
    .populate("retailBuyer", "phone")
    .lean();

  return responder()
    .code(200)
    .message("Offer fetched")
    .payload({ ...offer, purchases })
    .send(res);
};

// -- Admin endpoints --

export const getAll = async (req: Request, res: Response) => {
  const offers = await Offer.find()
    .populate("container", "nameEn nameAr")
    .populate("product", "nameEn nameAr images price")
    .populate("buyer", "phone")
    .sort({ createdAt: -1 })
    .lean();

  return responder()
    .code(200)
    .message("Offers fetched")
    .payload(localize(offers, req.lang, req))
    .send(res);
};

export const getByIdAdmin = async (req: Request, res: Response) => {
  const offer = await Offer.findById(req.params.id)
    .populate("container", "nameEn nameAr")
    .populate("product", "nameEn nameAr images price")
    .populate("buyer", "phone")
    .lean();

  if (!offer) throw new AppError("Offer not found", 404);

  return responder()
    .code(200)
    .message("Offer fetched")
    .payload(localize(offer as any, req.lang, req))
    .send(res);
};

export const create = async (req: Request, res: Response) => {
  const { container, product, totalQuantity, offerPrice, unitSellPrice, commissionPercent } = req.body;

  if (!container || !product) throw new AppError("Container and product are required", 400);
  if (!totalQuantity || totalQuantity < 1) throw new AppError("Valid totalQuantity is required", 400);
  if (offerPrice == null || offerPrice < 0) throw new AppError("Valid offerPrice is required", 400);
  if (unitSellPrice == null || unitSellPrice < 0) throw new AppError("Valid unitSellPrice is required", 400);
  if (commissionPercent == null || commissionPercent < 0 || commissionPercent > 100) {
    throw new AppError("Valid commissionPercent (0-100) is required", 400);
  }

  // Verify product exists and belongs to container
  const productDoc = await Product.findById(product);
  if (!productDoc) throw new AppError("Product not found", 404);
  if (productDoc.container.toString() !== container) {
    throw new AppError("Product does not belong to the specified container", 400);
  }

  const offer = await Offer.create({
    container,
    product,
    totalQuantity,
    offerPrice,
    unitSellPrice,
    commissionPercent,
  });

  const populated = await Offer.findById(offer._id)
    .populate("container", "nameEn nameAr")
    .populate("product", "nameEn nameAr images price")
    .lean();

  if (!populated) throw new AppError("Offer not found after creation", 500);

  return responder()
    .code(201)
    .message("Offer created")
    .payload(localize(populated as any, req.lang, req))
    .send(res);
};

export const update = async (req: Request, res: Response) => {
  const offer = await Offer.findById(req.params.id);
  if (!offer) throw new AppError("Offer not found", 404);
  if (offer.status !== "available") throw new AppError("Only available offers can be updated", 400);

  const allowedFields = ["totalQuantity", "offerPrice", "unitSellPrice", "commissionPercent"];
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      (offer as any)[field] = req.body[field];
    }
  }

  await offer.save();

  const populated = await Offer.findById(offer._id)
    .populate("container", "nameEn nameAr")
    .populate("product", "nameEn nameAr images price")
    .lean();

  if (!populated) throw new AppError("Offer not found after update", 500);

  return responder()
    .code(200)
    .message("Offer updated")
    .payload(localize(populated as any, req.lang, req))
    .send(res);
};

export const remove = async (req: Request, res: Response) => {
  const offer = await Offer.findByIdAndDelete(req.params.id);
  if (!offer) throw new AppError("Offer not found", 404);

  // Delete associated purchase records
  await OfferPurchase.deleteMany({ offer: offer._id });

  return responder()
    .code(200)
    .message("Offer deleted")
    .payload(offer)
    .send(res);
};
