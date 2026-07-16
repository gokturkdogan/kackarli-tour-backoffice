import { AdminHeader } from "@/components/admin/admin-header";
import { DashboardOverview } from "@/components/admin/dashboard-overview";
import { PageContent } from "@/components/admin/page-content";
import { getDashboardStats } from "@/actions/dashboard";

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <>
      <AdminHeader
        title="Dashboard"
        description="Kaçkarlı Tur yönetim paneline hoş geldiniz"
      />
      <PageContent>
        <DashboardOverview stats={stats} />
      </PageContent>
    </>
  );
}
