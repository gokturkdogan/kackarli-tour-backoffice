import { AdminHeader } from "@/components/admin/admin-header";
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
      <div className="p-6 space-y-4">
        <ReservationsTable reservations={reservations} />
      </div>
    </>
  );
}
