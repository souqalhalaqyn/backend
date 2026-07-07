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

  const filter: Record<string, unknown> = {
    expoPushToken: { $ne: "", $exists: true },
  };

  if (Array.isArray(userIds) && userIds.length > 0) {
    filter._id = { $in: userIds };
  }

  const users = await User.find(filter, { expoPushToken: 1 });

  if (users.length === 0) {
    return responder().code(200).message("No users with push tokens found").send(res);
  }

  const results = { sent: 0, failed: 0 };

  await Promise.allSettled(
    users.map((user) =>
      sendPushNotification(user.expoPushToken!, title, body, data).then(
        () => results.sent++,
        () => results.failed++,
      ),
    ),
  );

  return responder()
    .code(200)
    .message("Notification sent")
    .payload({ sent: results.sent, failed: results.failed, total: users.length })
    .send(res);
};
