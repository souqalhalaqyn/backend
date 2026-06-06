import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import Settings from "../models/Settings.js";
import User from "../models/User.js";
import { responder } from "../utils/Responder.js";

export const getSettings = async (_req: Request, res: Response) => {
  const settings = await Settings.findOne();
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
  const { image } = req.body;
  if (!image) throw new AppError("Image filename is required", 400);

  const settings = await Settings.findOne();
  if (!settings) throw new AppError("Settings not found", 404);

  settings.sliderImages.push(image);
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

export const getSliderImages = async (_req: Request, res: Response) => {
  const settings = await Settings.findOne();
  if (!settings) throw new AppError("Settings not found", 404);

  return responder()
    .code(200)
    .message("Slider images fetched")
    .payload(settings.sliderImages)
    .send(res);
};

export const getUsers = async (_req: Request, res: Response) => {
  const users = await User.find()
    .select("-password -refreshTokenVersion")
    .sort({ createdAt: -1 });
  return responder()
    .code(200)
    .message("users fetched")
    .payload(users)
    .send(res);
};

export const getUserById = async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id).select("-password -refreshTokenVersion");
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
    .payload(user)
    .send(res);
};
