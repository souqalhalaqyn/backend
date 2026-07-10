import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import ChargeRequest from "../models/ChargeRequest.js";
import User from "../models/User.js";
import { responder } from "../utils/Responder.js";
import { notifyAdmins } from "../services/notification.js";

// -- User endpoints --

export const getMyRequests = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const requests = await ChargeRequest.find({ user: req.user.userId })
    .sort({ createdAt: -1 })
    .lean();

  return responder()
    .code(200)
    .message("Requests fetched")
    .payload(requests)
    .send(res);
};

export const createRequest = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authentication required", 401);

  const file = req.file as Express.Multer.File | undefined;
  const image = file ? file.filename : (req.body.image ?? "");

  const chargeRequest = await ChargeRequest.create({
    user: req.user.userId,
    image,
    status: "pending",
  });

  notifyAdmins("Charge request", `${req.user.phone ?? "A user"} requested a charge`, { screen: "orders" });

  return responder()
    .code(201)
    .message("Charge request created")
    .payload(chargeRequest)
    .send(res);
};

// -- Admin endpoints --

export const getAllRequests = async (req: Request, res: Response) => {
  const requests = await ChargeRequest.find()
    .populate("user", "phone name")
    .sort({ createdAt: -1 })
    .lean();

  return responder()
    .code(200)
    .message("Requests fetched")
    .payload(requests)
    .send(res);
};

export const getRequestById = async (req: Request, res: Response) => {
  const request = await ChargeRequest.findById(req.params.id)
    .populate("user", "phone name")
    .lean();

  if (!request) throw new AppError("Request not found", 404);

  return responder()
    .code(200)
    .message("Request fetched")
    .payload(request)
    .send(res);
};

export const updateRequestStatus = async (req: Request, res: Response) => {
  const { status } = req.body;
  if (!["pending", "done", "cancelled"].includes(status)) {
    throw new AppError("Invalid status", 400);
  }

  const chargeRequest = await ChargeRequest.findById(req.params.id);
  if (!chargeRequest) throw new AppError("Request not found", 404);
  if (chargeRequest.status !== "pending") {
    throw new AppError("Only pending requests can be updated", 400);
  }

  if (status === "done") {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) {
      throw new AppError("Valid positive amount is required when approving", 400);
    }
    chargeRequest.amount = amount;
    await User.findByIdAndUpdate(chargeRequest.user, {
      $inc: { balance: amount },
    });
  }

  chargeRequest.status = status;
  await chargeRequest.save();

  const populated = await ChargeRequest.findById(chargeRequest._id)
    .populate("user", "phone name")
    .lean();

  return responder()
    .code(200)
    .message("Request updated")
    .payload(populated)
    .send(res);
};
