"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type PushPermission = NotificationPermission | "unsupported";

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

export function PushNotificationPrompt() {
  const [permission, setPermission] = useState<PushPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  const checkSubscription = useCallback(async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(Boolean(subscription));
      setVisible(
        Notification.permission !== "granted" || !subscription
      );
    } catch {
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    const dismissedAt = localStorage.getItem("push-prompt-dismissed");
    if (dismissedAt) setDismissed(true);

    void checkSubscription();
  }, [checkSubscription]);

  async function enableNotifications() {
    setIsLoading(true);
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        toast.error("Bildirim izni verilmedi");
        return;
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
      setVisible(false);
      toast.success("Bildirimler açıldı");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Bildirimler etkinleştirilemedi"
      );
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
      setVisible(true);
      toast.success("Bildirimler kapatıldı");
    } catch {
      toast.error("Bildirimler kapatılamadı");
    } finally {
      setIsLoading(false);
    }
  }

  function dismissPrompt() {
    localStorage.setItem("push-prompt-dismissed", Date.now().toString());
    setDismissed(true);
    setVisible(false);
  }

  if (permission === "unsupported" || dismissed) {
    return null;
  }

  if (!visible && isSubscribed) {
    return (
      <div className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shadow-md bg-white"
          onClick={disableNotifications}
          disabled={isLoading}
        >
          <BellOff className="size-4" />
          Bildirimleri kapat
        </Button>
      </div>
    );
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm">
      <div className="rounded-xl border border-forest-200 bg-white p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-forest-50 p-2 text-forest-700">
            <Bell className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-forest-900">Yeni rezervasyon bildirimi</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Yeni rezervasyon geldiğinde telefonunuza anında bildirim alın.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={enableNotifications}
                disabled={isLoading}
              >
                Bildirimleri aç
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={dismissPrompt}
              >
                Sonra
              </Button>
            </div>
          </div>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={dismissPrompt}
            aria-label="Kapat"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
