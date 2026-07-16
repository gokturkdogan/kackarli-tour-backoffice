"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotificationsContext } from "@/components/push-notifications-provider";

export function PushNotificationPrompt() {
  const { isSubscribed, isLoading, isReady, isSupported, enableNotifications } =
    usePushNotificationsContext();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedAt = localStorage.getItem("push-prompt-dismissed");
    if (dismissedAt) setDismissed(true);
  }, []);

  function dismissPrompt() {
    localStorage.setItem("push-prompt-dismissed", Date.now().toString());
    setDismissed(true);
  }

  if (!isReady || !isSupported || dismissed || isSubscribed) {
    return null;
  }

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
              Yeni rezervasyon geldiğinde telefonunuza anında bildirim alın. İstediğiniz zaman
              üst menüden kapatabilirsiniz.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => void enableNotifications()}
                disabled={isLoading}
              >
                Bildirimleri aç
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={dismissPrompt}>
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
