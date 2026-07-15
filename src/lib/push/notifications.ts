import webpush from "web-push";

export function getVapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    return null;
  }

  return { publicKey, privateKey, subject };
}

export function configureWebPush() {
  const config = getVapidConfig();
  if (!config) return false;

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  reservationId?: string;
};

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
) {
  if (!configureWebPush()) {
    throw new Error("VAPID keys are not configured");
  }

  return webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    JSON.stringify(payload)
  );
}

export async function notifyAdminsNewReservation(reservation: {
  id: string;
  firstName: string;
  lastName: string;
  adultCount: number;
  childCount: number;
  tour: { title: string };
}) {
  const { prisma } = await import("@/lib/prisma");

  if (!configureWebPush()) {
    console.warn("[push] VAPID keys not configured, skipping admin notification");
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { user: { role: "ADMIN" } },
  });

  if (subscriptions.length === 0) return;

  const guestParts = [];
  if (reservation.adultCount > 0) {
    guestParts.push(`${reservation.adultCount} yetişkin`);
  }
  if (reservation.childCount > 0) {
    guestParts.push(`${reservation.childCount} çocuk`);
  }

  const guestText = guestParts.length > 0 ? ` (${guestParts.join(", ")})` : "";
  const payload: PushPayload = {
    title: "Yeni Rezervasyon",
    body: `${reservation.firstName} ${reservation.lastName} — ${reservation.tour.title}${guestText}`,
    url: `/reservations?reservation=${reservation.id}`,
    reservationId: reservation.id,
  };

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await sendPushNotification(sub, payload);
      } catch (error) {
        const statusCode =
          error && typeof error === "object" && "statusCode" in error
            ? (error as { statusCode?: number }).statusCode
            : undefined;

        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          console.error("[push] Admin bildirimi gönderilemedi:", error);
        }
      }
    })
  );
}
