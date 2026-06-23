import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import AdRequest from "../models/AdRequest.js";
import { responder } from "../utils/Responder.js";
import { localize } from "../utils/localize.js";

export const createAdRequest = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const { container, products } = req.body;

  if (!container || !container.nameEn || !container.nameAr) {
    throw new AppError("Container nameEn and nameAr are required", 400);
  }
  if (!products || !Array.isArray(products) || products.length === 0) {
    throw new AppError("At least one product is required", 400);
  }

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if (!p.nameEn || !p.nameAr || p.price == null || Number(p.price) <= 0) {
      throw new AppError(`Product at index ${i} is missing required fields (nameEn, nameAr, price)`, 400);
    }
  }

  const ad = await AdRequest.create({
    user: req.user.userId,
    container: {
      nameEn: container.nameEn,
      nameAr: container.nameAr,
      shortDescriptionEn: container.shortDescriptionEn || "",
      shortDescriptionAr: container.shortDescriptionAr || "",
      longDescriptionEn: container.longDescriptionEn || "",
      longDescriptionAr: container.longDescriptionAr || "",
    },
    products: products.map((p: any) => ({
      nameEn: p.nameEn,
      nameAr: p.nameAr,
      price: Number(p.price),
      stock: Number(p.stock) || 0,
      images: p.images || [],
      shortDescriptionEn: p.shortDescriptionEn || "",
      shortDescriptionAr: p.shortDescriptionAr || "",
      longDescriptionEn: p.longDescriptionEn || "",
      longDescriptionAr: p.longDescriptionAr || "",
      tagsEn: p.tagsEn || [],
      tagsAr: p.tagsAr || [],
      aliasesEn: p.aliasesEn || [],
      aliasesAr: p.aliasesAr || [],
      notesEn: p.notesEn || [],
      notesAr: p.notesAr || [],
    })),
  });

  return responder().code(201).message("Ad request created").payload(ad).send(res);
};

export const getApprovedAds = async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const [ads, total] = await Promise.all([
    AdRequest.find({ status: "approved" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AdRequest.countDocuments({ status: "approved" }),
  ]);

  const localized = localize(ads, req.lang);

  return responder()
    .code(200)
    .message("approved ads retrieved")
    .payload(localized)
    .meta({ page, limit, total, pages: Math.ceil(total / limit) })
    .send(res);
};

export const getAdById = async (req: Request, res: Response) => {
  const ad = await AdRequest.findById(req.params.id).lean();
  if (!ad) throw new AppError("Ad not found", 404);
  if (ad.status !== "approved") throw new AppError("Ad not available", 404);

  const localized = localize(ad, req.lang);
  return responder().code(200).message("ad retrieved").payload(localized).send(res);
};

export const getUserAdHistory = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const ads = await AdRequest.find({ user: req.user.userId })
    .sort({ createdAt: -1 })
    .lean();

  const localized = localize(ads, req.lang);
  return responder().code(200).message("ad history retrieved").payload(localized).send(res);
};

export const getAllAdRequests = async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const statusFilter = req.query.status as string;
  const filter: Record<string, any> = {};
  if (statusFilter && ["pending", "approved", "rejected"].includes(statusFilter)) {
    filter.status = statusFilter;
  }

  const [ads, total] = await Promise.all([
    AdRequest.find(filter)
      .populate("user", "phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AdRequest.countDocuments(filter),
  ]);

  return responder()
    .code(200)
    .message("ad requests retrieved")
    .payload(ads)
    .meta({ page, limit, total, pages: Math.ceil(total / limit) })
    .send(res);
};

export const approveAdRequest = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const ad = await AdRequest.findByIdAndUpdate(
    req.params.id,
    { status: "approved", reviewedBy: req.user.userId, reviewedAt: new Date() },
    { new: true },
  );

  if (!ad) throw new AppError("Ad request not found", 404);

  return responder().code(200).message("Ad request approved").payload(ad).send(res);
};

export const rejectAdRequest = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const { rejectionReason } = req.body;
  if (!rejectionReason || !rejectionReason.trim()) {
    throw new AppError("Rejection reason is required", 400);
  }

  const ad = await AdRequest.findByIdAndUpdate(
    req.params.id,
    {
      status: "rejected",
      rejectionReason: rejectionReason.trim(),
      reviewedBy: req.user.userId,
      reviewedAt: new Date(),
    },
    { new: true },
  );

  if (!ad) throw new AppError("Ad request not found", 404);

  return responder().code(200).message("Ad request rejected").payload(ad).send(res);
};
