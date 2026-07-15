"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  Calendar,
  BookOpen,
  Megaphone,
  Image,
  Home,
  Settings,
  Mountain,
} from "lucide-react";
import {
  Sidebar,
  useSidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Turlar", href: "/tours", icon: Map },
  { title: "Tur Tarihleri", href: "/schedules", icon: Calendar },
  { title: "Rezervasyonlar", href: "/reservations", icon: BookOpen },
  { title: "Duyurular", href: "/announcements", icon: Megaphone, disabled: true },
  { title: "Galeri", href: "/gallery", icon: Image, disabled: true },
  { title: "Ana Sayfa", href: "/homepage", icon: Home, disabled: true },
  { title: "Site Ayarları", href: "/settings", icon: Settings, disabled: true },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  function handleNavigate() {
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  return (
    <Sidebar className="border-r border-forest-800/20">
      <SidebarHeader className="border-b border-forest-800/20 px-4 py-4">
        <Link href="/" className="flex items-center gap-3" onClick={handleNavigate}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-forest-600">
            <Mountain className="h-5 w-5 text-cream" />
          </div>
          <div>
            <p className="font-semibold text-forest-900 text-sm">Kaçkarlı Tur</p>
            <p className="text-xs text-muted-foreground">Yönetim Paneli</p>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menü</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  {item.disabled ? (
                    <SidebarMenuButton
                      className={cn("opacity-50 pointer-events-none")}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton
                      render={<Link href={item.href} onClick={handleNavigate} />}
                      isActive={
                        item.href === "/"
                          ? pathname === "/"
                          : pathname.startsWith(item.href)
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-forest-800/20 p-4">
        <p className="text-xs text-muted-foreground">Kaçkarlı Tur Yönetim Paneli</p>
      </SidebarFooter>
    </Sidebar>
  );
}
