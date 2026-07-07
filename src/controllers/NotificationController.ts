import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { responder } from "../utils/Responder.js";
import User from "../models/User.js";
import { sendPushNotification } from "../services/notification.js";

export const sendNotification = async (req: Request, res: Response) => {
  const { title, body, data, userIds } = req.body;

  if (!title || !body) {
    throw new AppError("title and body are required", 400);
  }

  const filter: Record<string, unknown> = {};

  if (Array.isArray(userIds) && userIds.length > 0) {
    filter._id = { $in: userIds };
  } else {
    filter.expoPushToken = { $ne: "", $exists: true };
  }

  const users = await User.find(filter, { _id: 1, expoPushToken: 1 });

  if (users.length === 0) {
    return responder()
      .code(200)
      .message("No users with push tokens found")
      .payload({ total: 0, sent: 0, failed: 0 })
      .send(res);
  }

  let sent = 0;

  for (const user of users) {
    const ok = await sendPushNotification(user.expoPushToken!, title, body, data);
    if (ok) sent++;
  }

  return responder()
    .code(200)
    .message("Notification sent")
    .payload({ sent, failed: users.length - sent, total: users.length })
    .send(res);
};
