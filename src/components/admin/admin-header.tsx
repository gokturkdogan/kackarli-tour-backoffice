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

interface AdminHeaderProps {
  title: string;
  description?: string;
}

export function AdminHeader({ title, description }: AdminHeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="flex h-auto min-h-14 items-center gap-2 sm:gap-4 border-b border-forest-800/10 bg-cream/80 backdrop-blur-sm px-3 sm:px-4 py-2 sm:py-0 sticky top-0 z-10">
      <SidebarTrigger className="text-forest-700 shrink-0" />
      <Separator orientation="vertical" className="h-6 hidden sm:block" />
      <div className="flex-1 min-w-0">
        <h1 className="text-base sm:text-lg font-semibold text-forest-900 truncate">{title}</h1>
        {description && (
          <p className="text-xs text-muted-foreground truncate">
            {description}
          </p>
        )}
      </div>
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
  );
}
