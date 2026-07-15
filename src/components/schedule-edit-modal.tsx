"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateSchedule, type CalendarExistingSchedule } from "@/actions/schedules";
import { formatDateLabel } from "@/lib/date-helpers";
import { resolveAdultPrice, resolveChildPrice } from "@/lib/pricing";
import { formatPrice } from "@/lib/utils-helpers";

export interface ScheduleEditTarget {
  schedule: CalendarExistingSchedule;
  dateKey: string;
}

interface ScheduleEditModalProps {
  target: ScheduleEditTarget | null;
  onClose: () => void;
}

function parseOptionalPrice(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  return num > 0 ? num : undefined;
}

export function ScheduleEditModal({ target, onClose }: ScheduleEditModalProps) {
  const router = useRouter();
  const [capacity, setCapacity] = useState("");
  const [price, setPrice] = useState("");
  const [childPrice, setChildPrice] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const schedule = target?.schedule ?? null;
  const dateKey = target?.dateKey ?? null;

  useEffect(() => {
    if (!schedule) return;
    setCapacity(String(schedule.capacity));
    setPrice(schedule.price != null ? String(schedule.price) : "");
    setChildPrice(schedule.childPrice != null ? String(schedule.childPrice) : "");
    setIsActive(schedule.isActive);
  }, [schedule]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!schedule || !dateKey) return;

    const cap = Number(capacity);
    if (!Number.isFinite(cap) || cap < 1) {
      toast.error("Geçerli bir kontenjan girin");
      return;
    }

    setIsSubmitting(true);
    const result = await updateSchedule(schedule.id, {
      tourId: schedule.tourId,
      startDate: dateKey,
      capacity: Math.floor(cap),
      price: parseOptionalPrice(price),
      childPrice: parseOptionalPrice(childPrice),
      isActive,
    });
    setIsSubmitting(false);

    if (result.success) {
      toast.success("Tur tarihi güncellendi");
      onClose();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Tur Tarihini Düzenle</DialogTitle>
            <DialogDescription className="capitalize">
              {schedule?.tourTitle} — {dateKey ? formatDateLabel(dateKey) : ""}
            </DialogDescription>
          </DialogHeader>

          {schedule && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-mist/60 border border-forest-100 px-3 py-2 text-sm">
                <p className="text-muted-foreground">
                  Rezerve:{" "}
                  <span className="font-semibold text-forest-900">
                    {schedule.reservedCount} / {schedule.capacity}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tur fiyatı: {formatPrice(schedule.tourPrice)}
                  {schedule.tourChildPrice != null &&
                    ` · Çocuk: ${formatPrice(schedule.tourChildPrice)}`}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-capacity">Kontenjan</Label>
                <Input
                  id="edit-capacity"
                  type="number"
                  min={schedule.reservedCount || 1}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  required
                />
                {schedule.reservedCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    En az {schedule.reservedCount} olmalı (mevcut rezervasyonlar)
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-price">Yetişkin fiyatı (₺)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder={String(schedule.tourPrice)}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Boş bırakırsanız turun liste fiyatı kullanılır
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-child-price">Çocuk fiyatı (₺)</Label>
                <Input
                  id="edit-child-price"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder={
                    schedule
                      ? String(
                          resolveChildPrice(
                            null,
                            schedule.tourChildPrice,
                            resolveAdultPrice(schedule.price, schedule.tourPrice)
                          )
                        )
                      : ""
                  }
                  value={childPrice}
                  onChange={(e) => setChildPrice(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Boş bırakırsanız tur çocuk fiyatı veya yetişkin fiyatı kullanılır
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-forest-100 px-3 py-2">
                <Label htmlFor="edit-active">Aktif</Label>
                <Switch id="edit-active" checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-forest-600 hover:bg-forest-700"
            >
              {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
