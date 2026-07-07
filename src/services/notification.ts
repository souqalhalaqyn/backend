import { Expo } from "expo-server-sdk";
import type {
  ExpoPushMessage,
  ExpoPushTicket,
  ExpoPushSuccessTicket,
  ExpoPushErrorReceipt,
} from "expo-server-sdk";

const expo = new Expo();

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
