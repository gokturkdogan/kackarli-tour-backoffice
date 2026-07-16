"use client";

import { Bell, BellOff, Loader2 } from "lucide-react";
import { usePushNotificationsContext } from "@/components/push-notifications-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PushNotificationToggle() {
  const {
    permission,
    isSubscribed,
    isLoading,
    isReady,
    isSupported,
    toggleNotifications,
  } = usePushNotificationsContext();

  if (!isReady || !isSupported) {
    return null;
  }

  const isDenied = permission === "denied";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn(
        "shrink-0",
        isSubscribed ? "text-forest-700" : "text-muted-foreground"
      )}
      onClick={() => void toggleNotifications()}
      disabled={isLoading || isDenied}
      aria-label={isSubscribed ? "Bildirimleri kapat" : "Bildirimleri aç"}
      title={
        isDenied
          ? "Bildirim izni tarayıcı ayarlarından kapalı"
          : isSubscribed
            ? "Bildirimleri kapat"
            : "Bildirimleri aç"
      }
    >
      {isLoading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : isSubscribed ? (
        <Bell className="size-4" />
      ) : (
        <BellOff className="size-4" />
      )}
    </Button>
  );
}
