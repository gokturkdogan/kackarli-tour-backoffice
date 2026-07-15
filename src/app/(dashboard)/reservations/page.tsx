import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-header";
import { PageContent } from "@/components/admin/page-content";
import { ReservationsTable } from "@/components/admin/reservations-table";
import { getReservations } from "@/actions/reservations";

function ReservationsTableFallback() {
  return (
    <div className="rounded-lg border border-forest-100 bg-white p-8 text-center text-muted-foreground">
      Rezervasyonlar yükleniyor...
    </div>
  );
}

export default async function ReservationsPage() {
  const reservations = await getReservations();

  return (
    <>
      <AdminHeader
        title="Rezervasyonlar"
        description="Rezervasyon taleplerini görüntüleyin ve yönetin"
      />
      <PageContent>
        <Suspense fallback={<ReservationsTableFallback />}>
          <ReservationsTable reservations={reservations} />
        </Suspense>
      </PageContent>
    </>
  );
}
