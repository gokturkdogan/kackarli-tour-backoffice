"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { PushNotificationToggle } from "@/components/push-notification-toggle";

interface AdminHeaderProps {
  title: string;
  description?: string;
}

export function AdminHeader({ title, description }: AdminHeaderProps) {
  const { data: session } = useSession();

  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b border-forest-800/10 bg-cream/95 backdrop-blur-md px-4 max-md:fixed max-md:inset-x-0 max-md:top-0 max-md:z-40 max-md:pt-[env(safe-area-inset-top)] max-md:min-h-[calc(3.5rem+env(safe-area-inset-top))] max-md:h-auto max-md:gap-2 max-md:px-3 max-md:pb-2 md:sticky md:top-0 md:z-10">
        <SidebarTrigger className="text-forest-700 shrink-0" />
        <Separator orientation="vertical" className="h-6 max-md:hidden" />
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-forest-900 truncate max-md:text-base">{title}</h1>
          {description && (
            <p className="text-xs text-muted-foreground hidden sm:block truncate">
              {description}
            </p>
          )}
        </div>
        <PushNotificationToggle />
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="gap-2 text-forest-700" />}>
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{session?.user?.email}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-destructive cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <div
        className="shrink-0 md:hidden min-h-[calc(3.5rem+env(safe-area-inset-top))]"
        aria-hidden
      />
    </>
  );
}
