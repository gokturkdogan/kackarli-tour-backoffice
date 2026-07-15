import { AdminHeader } from "@/components/admin/admin-header";
import { PageContent } from "@/components/admin/page-content";
import { ReservationsTable } from "@/components/admin/reservations-table";
import { getReservations } from "@/actions/reservations";

export default async function ReservationsPage() {
  const reservations = await getReservations();

  return (
    <>
      <AdminHeader
        title="Rezervasyonlar"
        description="Rezervasyon taleplerini görüntüleyin ve yönetin"
      />
      <PageContent>
        <ReservationsTable reservations={reservations} />
      </PageContent>
    </>
  );
}
