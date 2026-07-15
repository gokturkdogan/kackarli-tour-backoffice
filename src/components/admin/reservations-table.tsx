"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { AdminReservation } from "@/actions/reservations";
import { updateReservationStatus } from "@/actions/reservations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatScheduleLabel } from "@/lib/date-helpers";
import { cn } from "@/lib/utils";
import {
  formatPrice,
  reservationStatusBadgeClass,
  reservationStatusLabel,
  type ReservationStatusValue,
} from "@/lib/utils-helpers";

const MODAL_STATUS_OPTIONS: ReservationStatusValue[] = [
  "PENDING",
  "CONTACTED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
];

function formatCreatedAt(value: string, long = false): string {
  return new Date(value).toLocaleString("tr-TR", {
    day: "numeric",
    month: long ? "long" : "short",
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

export function ReservationsTable({
  reservations,
}: {
  reservations: AdminReservation[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<AdminReservation | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleStatusChange(status: ReservationStatusValue) {
    if (!selected || status === selected.status || isUpdating) return;

    setIsUpdating(true);
    const result = await updateReservationStatus(selected.id, status);
    setIsUpdating(false);

    if (result.success) {
      toast.success(`Durum güncellendi: ${reservationStatusLabel(status)}`);
      setSelected((current) =>
        current ? { ...current, status } : null
      );
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const guestSummary = selected
    ? selected.childCount > 0
      ? `${selected.adultCount} yetişkin, ${selected.childCount} çocuk`
      : `${selected.adultCount} yetişkin`
    : "";

  return (
    <>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Henüz rezervasyon talebi yok
                </TableCell>
              </TableRow>
            ) : (
              reservations.map((reservation) => {
                const guestCount = reservation.adultCount + reservation.childCount;

                return (
                  <TableRow
                    key={reservation.id}
                    className="cursor-pointer hover:bg-forest-50/60 transition-colors"
                    onClick={() => setSelected(reservation)}
                  >
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
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selected.firstName} {selected.lastName}
                </DialogTitle>
                <DialogDescription>Rezervasyon detayları</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Durum</p>
                  <div className="grid grid-cols-3 gap-2">
                    {MODAL_STATUS_OPTIONS.map((status) => {
                      const isActive = selected.status === status;
                      return (
                        <Button
                          key={status}
                          type="button"
                          variant={isActive ? "default" : "outline"}
                          size="sm"
                          disabled={isUpdating}
                          className={cn(
                            "w-full",
                            isActive && status === "CONFIRMED" && "bg-forest-600 hover:bg-forest-700",
                            isActive && status === "PENDING" && "bg-amber-500 hover:bg-amber-600 text-white",
                            isActive && status === "CANCELLED" && "bg-rose-500 hover:bg-rose-600 text-white"
                          )}
                          onClick={() => handleStatusChange(status)}
                        >
                          {isUpdating && isActive ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            reservationStatusLabel(status)
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-lg border border-forest-100 bg-forest-50/30 px-3 py-1">
                  <DetailRow label="Tur" value={selected.tour.title} />
                  <DetailRow
                    label="Tur tarihi"
                    value={formatScheduleLabel(
                      new Date(selected.schedule.startDate),
                      selected.schedule.endDate
                        ? new Date(selected.schedule.endDate)
                        : null
                    )}
                  />
                  <DetailRow label="Kişi sayısı" value={guestSummary} />
                  <DetailRow label="Toplam" value={formatPrice(selected.totalPrice)} />
                  <DetailRow label="Telefon" value={selected.phone} />
                  <DetailRow label="E-posta" value={selected.email} />
                  <DetailRow
                    label="Biniş noktası"
                    value={selected.boardingPoint ?? "—"}
                  />
                  <DetailRow
                    label="Not"
                    value={selected.note?.trim() ? selected.note : "—"}
                  />
                  <DetailRow
                    label="Talep tarihi"
                    value={formatCreatedAt(selected.createdAt, true)}
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
