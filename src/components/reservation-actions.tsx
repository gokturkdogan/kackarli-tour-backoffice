"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Eye, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { AdminReservation } from "@/actions/reservations";
import { updateReservationStatus } from "@/actions/reservations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatScheduleLabel } from "@/lib/date-helpers";
import {
  formatPrice,
  reservationStatusBadgeClass,
  reservationStatusLabel,
  type ReservationStatusValue,
} from "@/lib/utils-helpers";

const STATUS_OPTIONS: ReservationStatusValue[] = [
  "PENDING",
  "CONTACTED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
];

function formatCreatedAt(value: string): string {
  return new Date(value).toLocaleString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 py-2 border-b border-forest-50 last:border-0">
      <span className="text-xs font-medium text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-forest-900 sm:text-right break-words">{value}</span>
    </div>
  );
}

export function ReservationActions({ reservation }: { reservation: AdminReservation }) {
  const router = useRouter();
  const [detailOpen, setDetailOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleStatusChange(status: ReservationStatusValue) {
    if (status === reservation.status || isUpdating) return;

    setIsUpdating(true);
    const result = await updateReservationStatus(reservation.id, status);
    setIsUpdating(false);

    if (result.success) {
      toast.success(`Durum güncellendi: ${reservationStatusLabel(status)}`);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const guestSummary =
    reservation.childCount > 0
      ? `${reservation.adultCount} yetişkin, ${reservation.childCount} çocuk`
      : `${reservation.adultCount} yetişkin`;

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setDetailOpen(true)}
          className="text-forest-700"
        >
          <Eye className="h-4 w-4 mr-1.5" />
          Detay
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isUpdating} />
            }
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Durumu değiştir</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STATUS_OPTIONS.map((status) => (
              <DropdownMenuItem
                key={status}
                disabled={status === reservation.status}
                onClick={() => handleStatusChange(status)}
              >
                {reservationStatusLabel(status)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {reservation.firstName} {reservation.lastName}
            </DialogTitle>
            <DialogDescription>Rezervasyon detayları</DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-forest-100 bg-forest-50/30 px-3 py-1">
            <DetailRow
              label="Durum"
              value={
                <Badge
                  variant="outline"
                  className={reservationStatusBadgeClass(reservation.status)}
                >
                  {reservationStatusLabel(reservation.status)}
                </Badge>
              }
            />
            <DetailRow label="Tur" value={reservation.tour.title} />
            <DetailRow
              label="Tur tarihi"
              value={formatScheduleLabel(
                new Date(reservation.schedule.startDate),
                reservation.schedule.endDate ? new Date(reservation.schedule.endDate) : null
              )}
            />
            <DetailRow label="Kişi sayısı" value={guestSummary} />
            <DetailRow label="Toplam" value={formatPrice(reservation.totalPrice)} />
            <DetailRow label="Telefon" value={reservation.phone} />
            <DetailRow label="E-posta" value={reservation.email} />
            <DetailRow
              label="Biniş noktası"
              value={reservation.boardingPoint ?? "—"}
            />
            <DetailRow label="Not" value={reservation.note?.trim() ? reservation.note : "—"} />
            <DetailRow label="Talep tarihi" value={formatCreatedAt(reservation.createdAt)} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
