import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { PushNotificationPrompt } from "@/components/push-notification-prompt";
import { Toaster } from "@/components/ui/sonner";

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset className="bg-mist min-h-screen min-w-0 overflow-x-hidden">
        {children}
      </SidebarInset>
      <Toaster richColors position="top-right" />
      <PushNotificationPrompt />
    </SidebarProvider>
  );
}
