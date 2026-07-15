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
    <header className="flex h-14 items-center gap-4 border-b border-forest-800/10 bg-cream/80 backdrop-blur-sm px-4 sticky top-0 z-10">
      <SidebarTrigger className="text-forest-700" />
      <Separator orientation="vertical" className="h-6" />
      <div className="flex-1">
        <h1 className="text-lg font-semibold text-forest-900">{title}</h1>
        {description && (
          <p className="text-xs text-muted-foreground hidden sm:block">
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
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
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
