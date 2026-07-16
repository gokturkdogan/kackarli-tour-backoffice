"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ReservationEntry } from "@/actions/reservation-hub";
import { deleteReservationEntry } from "@/actions/reservations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateLabel } from "@/lib/date-helpers";
import {
  formatPrice,
  organizationLeadSourceLabel,
  reservationSourceBadgeClass,
  reservationSourceLabel,
  unifiedStatusBadgeClass,
  unifiedStatusLabel,
} from "@/lib/utils-helpers";

interface ReservationsDayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateKey: string | null;
  entries: ReservationEntry[];
  onCreateManual: () => void;
  onEdit: (entry: ReservationEntry) => void;
}

export function ReservationsDayModal({
  open,
  onOpenChange,
  dateKey,
  entries,
  onCreateManual,
  onEdit,
}: ReservationsDayModalProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<ReservationEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalGuests = entries.reduce(
    (sum, entry) => sum + entry.adultCount + entry.childCount,
    0
  );

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const result = await deleteReservationEntry(deleteTarget.source, deleteTarget.id);
    setIsDeleting(false);

    if (result.success) {
      toast.success("Kayıt silindi");
      setDeleteTarget(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-md:max-h-[90vh] max-md:overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dateKey ? formatDateLabel(dateKey) : "Rezervasyonlar"}
            </DialogTitle>
            <DialogDescription>
              {entries.length} kayıt · {totalGuests} kişi
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {entries.length === 0 ? (
              <div className="rounded-lg border border-dashed border-forest-200 bg-forest-50/40 p-8 text-center text-muted-foreground">
                Bu tarihte kayıt yok.
              </div>
            ) : (
              entries.map((entry) => {
                const guestCount = entry.adultCount + entry.childCount;
                return (
                  <div
                    key={`${entry.source}-${entry.id}`}
                    className="rounded-xl border border-forest-100 bg-white p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-forest-900">
                          {entry.firstName} {entry.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {entry.phone}
                          {entry.email ? ` · ${entry.email}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => onEdit(entry)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-rose-600 hover:text-rose-700"
                          onClick={() => setDeleteTarget(entry)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={reservationSourceBadgeClass(entry.source)}
                      >
                        {reservationSourceLabel(entry.source)}
                      </Badge>
                      <Badge variant="outline" className="bg-forest-50 text-forest-900">
                        {entry.tour.title}
                      </Badge>
                      {entry.source === "MANUAL" && entry.leadSource ? (
                        <Badge variant="outline">
                          {organizationLeadSourceLabel(entry.leadSource)}
                        </Badge>
                      ) : null}
                      <Badge
                        variant="outline"
                        className={unifiedStatusBadgeClass(entry.source, entry.status)}
                      >
                        {unifiedStatusLabel(entry.source, entry.status)}
                      </Badge>
                    </div>

                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <p>
                        <span className="text-muted-foreground">Kişi:</span> {guestCount}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Toplam:</span>{" "}
                        {formatPrice(entry.totalPrice)}
                      </p>
                      {entry.boardingPoint ? (
                        <p className="sm:col-span-2">
                          <span className="text-muted-foreground">Biniş:</span>{" "}
                          {entry.boardingPoint}
                        </p>
                      ) : null}
                      {entry.note ? (
                        <p className="sm:col-span-2">
                          <span className="text-muted-foreground">Not:</span> {entry.note}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              className="bg-forest-600 hover:bg-forest-700"
              onClick={onCreateManual}
            >
              <Plus className="size-4" />
              Manuel Kayıt Ekle
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kaydı sil</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `${deleteTarget.firstName} ${deleteTarget.lastName} kaydı silinecek.${
                    deleteTarget.source === "WEB"
                      ? " Müşteriye iptal e-postası gönderilir."
                      : ""
                  }`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700"
              onClick={handleDelete}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
