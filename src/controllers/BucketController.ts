import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import User from "../models/User.js";
import { responder } from "../utils/Responder.js";

export const getMyBalance = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const user = await User.findById(req.user.userId).select("balance");
  if (!user) throw new AppError("User not found", 404);

  return responder().code(200).message("Balance fetched").payload({ balance: user.balance }).send(res);
};

export const addFunds = async (req: Request, res: Response) => {
  const { phone, amount } = req.body;

  if (!phone || typeof phone !== "string") {
    throw new AppError("Phone number is required", 400);
  }
  if (!amount || typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    throw new AppError("Valid positive amount is required", 400);
  }

  const user = await User.findOneAndUpdate(
    { phone },
    { $inc: { balance: amount } },
    { returnDocument: "after" },
  );
  if (!user) throw new AppError("User not found", 404);

  return responder().code(200).message("Funds added").payload({ balance: user.balance }).send(res);
};
