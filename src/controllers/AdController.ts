import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import AdRequest from "../models/AdRequest.js";
import User from "../models/User.js";
import { responder } from "../utils/Responder.js";
import { localize } from "../utils/localize.js";
import { notifyAdmins } from "../services/notification.js";
import Settings from "../models/Settings.js";

export const createAdRequest = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const { container, products } = req.body;

  if (!container || !container.nameAr) {
    throw new AppError("Container nameAr is required", 400);
  }
  if (!products || !Array.isArray(products) || products.length === 0) {
    throw new AppError("At least one product is required", 400);
  }

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if (!p.nameAr || p.price == null || Number(p.price) <= 0) {
      throw new AppError(`Product at index ${i} is missing required fields (nameAr, price)`, 400);
    }
  }

  const ad = await AdRequest.create({
    user: req.user.userId,
    container: {
      nameEn: container.nameEn || container.nameAr,
      nameAr: container.nameAr,
      descriptionEn: container.descriptionEn || container.descriptionAr || "",
      descriptionAr: container.descriptionAr || "",
    },
    products: products.map((p: any) => ({
      nameEn: p.nameEn || p.nameAr,
      nameAr: p.nameAr,
      price: Number(p.price),
      stock: Number(p.stock) || 0,
      images: p.images || [],
      descriptionEn: p.descriptionEn || p.descriptionAr || "",
      descriptionAr: p.descriptionAr || "",
    })),
    contactPhone: req.body.phone || "",
  });

  notifyAdmins("طلب إعلان جديد", `${req.user?.phone ?? "مستخدم"} قام بتقديم طلب إعلان`, { screen: "ads" });

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

  const ad = await AdRequest.findById(req.params.id);
  if (!ad) throw new AppError("Ad request not found", 404);

  ad.status = "approved";
  ad.reviewedBy = req.user.userId as any;
  ad.reviewedAt = new Date();
  await ad.save();

  const settings = await Settings.findOne();
  const adPrice = settings?.adPrice ?? 0;
  if (adPrice > 0) {
    await User.findByIdAndUpdate(ad.user, { $inc: { balance: -adPrice } });
  }

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
      reviewedBy: req.user.userId as any,
      reviewedAt: new Date(),
    },
    { returnDocument: "after" },
  );

  if (!ad) throw new AppError("Ad request not found", 404);

  return responder().code(200).message("Ad request rejected").payload(ad).send(res);
};

export const updateAdRequest = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const ad = await AdRequest.findById(req.params.id);
  if (!ad) throw new AppError("Ad request not found", 404);
  if (ad.status !== "approved") throw new AppError("Only approved ads can be edited", 400);

  const { container, products } = req.body;

  if (container) {
    if (container.nameAr) ad.container.nameAr = container.nameAr;
    if (container.nameEn != null) ad.container.nameEn = container.nameEn;
    if (container.descriptionAr != null) ad.container.descriptionAr = container.descriptionAr;
    if (container.descriptionEn != null) ad.container.descriptionEn = container.descriptionEn;
  }

  if (Array.isArray(products) && products.length > 0) {
    const mapped = products.map((p: any) => ({
      nameEn: p.nameEn ?? p.nameAr ?? "",
      nameAr: p.nameAr ?? "",
      price: Number(p.price) || 0,
      stock: Number(p.stock) || 0,
      images: p.images ?? [],
      descriptionEn: p.descriptionEn ?? "",
      descriptionAr: p.descriptionAr ?? "",
      tagsEn: p.tagsEn ?? [],
      tagsAr: p.tagsAr ?? [],
      aliasesEn: p.aliasesEn ?? [],
      aliasesAr: p.aliasesAr ?? [],
      notesEn: p.notesEn ?? [],
      notesAr: p.notesAr ?? [],
    }));
    ad.set("products", mapped);
  }

  await ad.save();

  return responder().code(200).message("Ad request updated").payload(ad).send(res);
};

export const deleteAd = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const ad = await AdRequest.findByIdAndDelete(req.params.id);
  if (!ad) throw new AppError("Ad request not found", 404);

  return responder().code(200).message("Ad request deleted").send(res);
};
