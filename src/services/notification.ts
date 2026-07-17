import { Expo } from "expo-server-sdk";
import type {
  ExpoPushMessage,
  ExpoPushTicket,
  ExpoPushSuccessTicket,
  ExpoPushErrorReceipt,
} from "expo-server-sdk";
import User from "../models/User.js";

const expo = new Expo();

const STATUS_TRANSLATIONS: Record<string, { en: string; ar: string }> = {
  pending: { en: "Pending", ar: "قيد الانتظار" },
  confirmed: { en: "Confirmed", ar: "مؤكد" },
  processing: { en: "Processing", ar: "قيد المعالجة" },
  shipped: { en: "Shipped", ar: "تم الشحن" },
  delivered: { en: "Delivered", ar: "تم التوصيل" },
  cancelled: { en: "Cancelled", ar: "ملغي" },
};

export function translateStatus(status: string, lang: "ar" | "en"): string {
  return STATUS_TRANSLATIONS[status]?.[lang] ?? status;
}

export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<boolean> {
  if (!Expo.isExpoPushToken(expoPushToken)) {
    console.warn("Invalid Expo push token format:", String(expoPushToken).slice(0, 30));
    return false;
  }

  const message: ExpoPushMessage = {
    to: expoPushToken,
    sound: "default",
    title,
    body,
    data: data ?? {},
  };

  try {
    const chunks = expo.chunkPushNotifications([message]);
    const allTickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      allTickets.push(...tickets);
    }

    for (const ticket of allTickets) {
      if (ticket.status === "error") {
        console.error("Expo push ticket error:", (ticket as ExpoPushErrorReceipt).message);
        return false;
      }
    }

    const ticketIds = allTickets
      .filter((t): t is ExpoPushSuccessTicket => t.status === "ok")
      .map((t) => t.id);

    if (ticketIds.length > 0) {
      await new Promise((r) => setTimeout(r, 2000));

      const receiptChunks = expo.chunkPushNotificationReceiptIds(ticketIds);
      for (const chunk of receiptChunks) {
        const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
        for (const receiptId in receipts) {
          const receipt = receipts[receiptId]!;
          if (receipt.status === "error") {
            console.error("Expo push receipt error:", receiptId, (receipt as ExpoPushErrorReceipt).message);
            return false;
          }
        }
      }
    }

    return true;
  } catch (err) {
    console.error("Expo push exception:", err);
    return false;
  }
}

export async function notifyAdmins(
  titleAr: string, titleEn: string,
  bodyAr: string, bodyEn: string,
  data?: Record<string, unknown>,
) {
  try {
    const admins = await User.find(
      { role: { $in: ["admin", "super_admin"] }, adminExpoPushToken: { $ne: "", $exists: true } },
      { adminExpoPushToken: 1, lang: 1 },
    );
    for (const admin of admins) {
      if (admin.adminExpoPushToken) {
        const isAr = (admin.lang ?? "ar") === "ar";
        await sendPushNotification(
          admin.adminExpoPushToken,
          isAr ? titleAr : titleEn,
          isAr ? bodyAr : bodyEn,
          data,
        );
      }
    }
  } catch (err) {
    console.error("notifyAdmins error:", err);
  }
}
