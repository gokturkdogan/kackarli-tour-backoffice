import { AdminHeader } from "@/components/admin/admin-header";
import { ReservationActions } from "@/components/admin/reservation-actions";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getReservations } from "@/actions/reservations";
import { formatScheduleLabel } from "@/lib/date-helpers";
import {
  formatPrice,
  reservationStatusBadgeClass,
  reservationStatusLabel,
} from "@/lib/utils-helpers";

function formatCreatedAt(value: string): string {
  return new Date(value).toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ReservationsPage() {
  const reservations = await getReservations();

  return (
    <>
      <AdminHeader
        title="Rezervasyonlar"
        description="Rezervasyon taleplerini görüntüleyin ve yönetin"
      />
      <div className="p-6 space-y-4">
        <div className="rounded-lg border border-forest-100 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Müşteri</TableHead>
                <TableHead>İletişim</TableHead>
                <TableHead>Tur</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Kişi</TableHead>
                <TableHead>Toplam</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    Henüz rezervasyon talebi yok
                  </TableCell>
                </TableRow>
              ) : (
                reservations.map((reservation) => {
                  const guestCount = reservation.adultCount + reservation.childCount;

                  return (
                    <TableRow key={reservation.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-forest-900">
                            {reservation.firstName} {reservation.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatCreatedAt(reservation.createdAt)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{reservation.phone}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">
                            {reservation.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-forest-900 max-w-[200px] truncate">
                          {reservation.tour.title}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-forest-800 max-w-[180px] leading-snug">
                          {formatScheduleLabel(
                            new Date(reservation.schedule.startDate),
                            reservation.schedule.endDate
                              ? new Date(reservation.schedule.endDate)
                              : null
                          )}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm tabular-nums">{guestCount}</p>
                        {reservation.childCount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {reservation.adultCount}+{reservation.childCount}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="font-medium tabular-nums">
                        {formatPrice(reservation.totalPrice)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={reservationStatusBadgeClass(reservation.status)}
                        >
                          {reservationStatusLabel(reservation.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <ReservationActions reservation={reservation} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
