"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export type PushPermission = NotificationPermission | "unsupported";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<PushPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const checkSubscription = useCallback(async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      setIsSubscribed(false);
      setIsReady(true);
      return;
    }

    setPermission(Notification.permission);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(Boolean(subscription));
    } catch {
      setIsSubscribed(false);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    void checkSubscription();
  }, [checkSubscription]);

  async function enableNotifications() {
    setIsLoading(true);
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        toast.error("Bildirim izni verilmedi");
        return false;
      }

      const keyResponse = await fetch("/api/push/vapid-public-key");
      if (!keyResponse.ok) {
        throw new Error("Push yapılandırması bulunamadı");
      }

      const { publicKey } = (await keyResponse.json()) as { publicKey: string };
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const saveResponse = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!saveResponse.ok) {
        throw new Error("Abonelik kaydedilemedi");
      }

      setIsSubscribed(true);
      toast.success("Bildirimler açıldı");
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Bildirimler etkinleştirilemedi"
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  async function disableNotifications() {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      } else {
        await fetch("/api/push/subscribe", { method: "DELETE" });
      }

      setIsSubscribed(false);
      toast.success("Bildirimler kapatıldı");
      return true;
    } catch {
      toast.error("Bildirimler kapatılamadı");
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleNotifications() {
    if (isSubscribed) {
      return disableNotifications();
    }
    return enableNotifications();
  }

  return {
    permission,
    isSubscribed,
    isLoading,
    isReady,
    isSupported: permission !== "unsupported",
    enableNotifications,
    disableNotifications,
    toggleNotifications,
    refresh: checkSubscription,
  };
}
