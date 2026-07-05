import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import Settings from "../models/Settings.js";
import User from "../models/User.js";
import { responder } from "../utils/Responder.js";

export const getSettings = async (_req: Request, res: Response) => {
  const settings = await Settings.findOne().lean();
  if (!settings) throw new AppError("Settings not found", 404);
  return responder()
    .code(200)
    .message("settings fetched")
    .payload(settings)
    .send(res);
};

export const updateSettings = async (req: Request, res: Response) => {
  const settings = await Settings.findOne();
  if (!settings) throw new AppError("Settings not found", 404);

  const allowedFields = Object.keys(Settings.schema.obj);
  for (const key of Object.keys(req.body)) {
    if (!allowedFields.includes(key))
      throw new AppError(`Field "${key}" is not allowed`, 400);
  }

  Object.assign(settings, req.body);
  await settings.save();

  return responder()
    .code(200)
    .message("settings updated")
    .payload(settings)
    .send(res);
};

export const addSliderImage = async (req: Request, res: Response) => {
  const { image, productId } = req.body;
  if (!image) throw new AppError("Image filename is required", 400);

  const settings = await Settings.findOne();
  if (!settings) throw new AppError("Settings not found", 404);

  const entry: Record<string, unknown> = { image };
  if (productId) entry.productId = productId;

  settings.sliderImages.push(entry as any);
  await settings.save();

  return responder()
    .code(200)
    .message("Slider image added")
    .payload(settings.sliderImages)
    .send(res);
};

export const removeSliderImage = async (req: Request, res: Response) => {
  const index = Number(req.params.index);
  const settings = await Settings.findOne();
  if (!settings) throw new AppError("Settings not found", 404);

  if (index < 0 || index >= settings.sliderImages.length) {
    throw new AppError("Slider image not found", 404);
  }

  settings.sliderImages.splice(index, 1);
  settings.markModified("sliderImages");
  await settings.save();

  return responder()
    .code(200)
    .message("Slider image removed")
    .payload(settings.sliderImages)
    .send(res);
};

export const updateSliderImage = async (req: Request, res: Response) => {
  const index = Number(req.params.index);
  const { productId } = req.body;

  const settings = await Settings.findOne();
  if (!settings) throw new AppError("Settings not found", 404);

  if (index < 0 || index >= settings.sliderImages.length) {
    throw new AppError("Slider image not found", 404);
  }

  settings.sliderImages[index] = { ...settings.sliderImages[index], productId: productId ?? "" } as any;
  settings.markModified("sliderImages");
  await settings.save();

  return responder()
    .code(200)
    .message("Slider image updated")
    .payload(settings.sliderImages)
    .send(res);
};

export const getExchangeRate = async (_req: Request, res: Response) => {
  const settings = await Settings.findOne();
  const rate = settings?.sypExchangeRate ?? 15000;
  return responder()
    .code(200)
    .message("Exchange rate fetched")
    .payload({ rate })
    .send(res);
};

export const getSliderImages = async (req: Request, res: Response) => {
  const settings = await Settings.findOne();
  if (!settings) throw new AppError("Settings not found", 404);

  const entries = settings.sliderImages.map((s: any) =>
    typeof s === "string" ? { image: s, productId: "" } : s,
  );

  return responder()
    .code(200)
    .message("Slider images fetched")
    .payload(entries)
    .send(res);
};

export const getUsers = async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(10000, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find()
      .select("-password -refreshTokenVersion")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(),
  ]);

  return responder()
    .code(200)
    .message("users fetched")
    .payload(users)
    .meta({ page, limit, total, totalPages: Math.ceil(total / limit) })
    .send(res);
};

export const getUserById = async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id).select("-password -refreshTokenVersion").lean();
  if (!user) throw new AppError("User not found", 404);
  return responder()
    .code(200)
    .message("user fetched")
    .payload(user)
    .send(res);
};

export const updateUserBalance = async (req: Request, res: Response) => {
  const { amount } = req.body;
  if (typeof amount !== "number") throw new AppError("Valid amount is required", 400);

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $inc: { balance: amount } },
    { new: true, select: "-refreshTokenVersion" },
  );
  if (!user) throw new AppError("User not found", 404);
  return responder()
    .code(200)
    .message("balance updated")
    .payload(user.toObject ? user.toObject() : user)
    .send(res);
};

export const blockUser = async (req: Request, res: Response) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isBlocked: true },
    { new: true, select: "-password -refreshTokenVersion" },
  );
  if (!user) throw new AppError("User not found", 404);
  return responder()
    .code(200)
    .message("user blocked")
    .payload(user)
    .send(res);
};

export const unblockUser = async (req: Request, res: Response) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isBlocked: false },
    { new: true, select: "-password -refreshTokenVersion" },
  );
  if (!user) throw new AppError("User not found", 404);
  return responder()
    .code(200)
    .message("user unblocked")
    .payload(user)
    .send(res);
};

export const changeUserPassword = async (req: Request, res: Response) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    throw new AppError("Password must be at least 6 characters", 400);
  }

  const bcrypt = await import("bcrypt");
  const hashed = await bcrypt.hash(newPassword, 10);

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { password: hashed, mustChangePassword: true, refreshTokenVersion: 0 },
    { new: true, select: "-password -refreshTokenVersion" },
  );
  if (!user) throw new AppError("User not found", 404);
  return responder()
    .code(200)
    .message("password changed, user must change on next login")
    .payload(user)
    .send(res);
};
