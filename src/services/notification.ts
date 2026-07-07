import { Expo } from "expo-server-sdk";
import type { ExpoPushMessage } from "expo-server-sdk";

const expo = new Expo();

export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<boolean> {
  if (!Expo.isExpoPushToken(expoPushToken)) {
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
    for (const chunk of chunks) {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (const ticket of tickets) {
        if (ticket.status === "error") {
          console.error("Expo push error:", ticket.message);
          return false;
        }
      }
    }
    return true;
  } catch (err) {
    console.error("Expo push exception:", err);
    return false;
  }
}
