import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-header";
import { PageContent } from "@/components/admin/page-content";
import { ReservationsPageClient } from "@/components/admin/reservations-page-client";
import { getReservationHubData } from "@/actions/reservation-hub";

function ReservationsFallback() {
  return (
    <div className="rounded-lg border border-forest-100 bg-white p-8 text-center text-muted-foreground">
      Rezervasyonlar yükleniyor...
    </div>
  );
}

export default async function ReservationsPage() {
  const data = await getReservationHubData();

  return (
    <>
      <AdminHeader
        title="Rezervasyonlar"
        description="Takvimden tur kayıtlarını yönetin, siteden gelen talepleri onaylayın"
      />
      <PageContent className="!p-3 sm:!p-4 md:!p-5 max-w-none">
        <Suspense fallback={<ReservationsFallback />}>
          <ReservationsPageClient
            tours={data.tours}
            reservationsByDate={data.reservationsByDate}
            tourSummariesByDate={data.tourSummariesByDate}
            pendingEntries={data.pendingEntries}
            allEntries={data.allEntries}
          />
        </Suspense>
      </PageContent>
    </>
  );
}
