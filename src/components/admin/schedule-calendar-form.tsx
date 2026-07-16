"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
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
  ScheduleMonthCalendar,
  type DateOverrideFields,
} from "@/components/admin/schedule-month-calendar";
import { cn } from "@/lib/utils";
import { formatDateLabel } from "@/lib/date-helpers";
import { formatPrice, tourTypeLabel } from "@/lib/utils-helpers";
import {
  ScheduleEditModal,
  type ScheduleEditTarget,
} from "@/components/admin/schedule-edit-modal";
import { createSchedulesBulk, deleteSchedule, type CalendarExistingSchedule } from "@/actions/schedules";

interface TourOption {
  id: string;
  title: string;
  type: "DAY_TRIP" | "ACCOMMODATION";
  price: number;
  childPrice: number | null;
  maxGroupSize: number | null;
}

interface DefaultSettings {
  capacity: number;
  price: string;
  childPrice: string;
}

interface ScheduleCalendarFormProps {
  tours: TourOption[];
  existingSchedulesByDate: Record<string, CalendarExistingSchedule[]>;
}

function parseOptionalPrice(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  return num > 0 ? num : undefined;
}

function parseOptionalCapacity(value: string | undefined, fallback: number): number {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  const num = Number(trimmed);
  return num > 0 ? Math.floor(num) : fallback;
}

function isPastDateKey(dateKey: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateKey + "T12:00:00") < today;
}

function hasCustomOverride(
  override?: DateOverrideFields,
  includeChildPrice = true
): boolean {
  if (!override) return false;
  return !!(
    override.capacity?.trim() ||
    override.price?.trim() ||
    (includeChildPrice && override.childPrice?.trim())
  );
}

interface ScheduleSettingsFieldsProps {
  tourId: string;
  tours: TourOption[];
  selectedTour?: TourOption;
  defaults: DefaultSettings;
  defaultPricePlaceholder: string;
  useCustomChildPrice: boolean;
  compact?: boolean;
  onTourChange: (tourId: string) => void;
  onDefaultsChange: (updater: (current: DefaultSettings) => DefaultSettings) => void;
  onCustomChildPriceChange: (checked: boolean) => void;
}

function ScheduleSettingsFields({
  tourId,
  tours,
  selectedTour,
  defaults,
  defaultPricePlaceholder,
  useCustomChildPrice,
  compact = false,
  onTourChange,
  onDefaultsChange,
  onCustomChildPriceChange,
}: ScheduleSettingsFieldsProps) {
  return (
    <div className={cn("space-y-2.5", compact && "space-y-2")}>
      <div className="space-y-1.5">
        <Label className={cn(compact && "text-xs")}>Tur</Label>
        <Select value={tourId} onValueChange={(v) => v && onTourChange(v)}>
          <SelectTrigger className={cn("w-full", compact ? "min-h-9 h-9 text-sm" : "min-h-10 h-auto py-2")}>
            {selectedTour ? (
              <span className="text-left truncate">
                <span className="font-medium">{selectedTour.title}</span>
                {!compact && (
                  <span className="block text-xs text-muted-foreground">
                    {tourTypeLabel(selectedTour.type)} · {formatPrice(selectedTour.price)}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">Tur seçin</span>
            )}
          </SelectTrigger>
          <SelectContent>
            {tours.map((tour) => (
              <SelectItem key={tour.id} value={tour.id}>
                {tour.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
        <div className="space-y-1.5">
          <Label htmlFor={compact ? "mobile-defaultCapacity" : "defaultCapacity"} className={cn(compact && "text-xs")}>
            Kontenjan
          </Label>
          <Input
            id={compact ? "mobile-defaultCapacity" : "defaultCapacity"}
            type="number"
            min={1}
            className={compact ? "h-9" : "h-10"}
            value={defaults.capacity}
            onChange={(e) =>
              onDefaultsChange((d) => ({ ...d, capacity: Number(e.target.value) || 1 }))
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label className={cn(compact && "text-xs")}>Yetişkin ₺</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            className={compact ? "h-9" : "h-10"}
            placeholder={defaultPricePlaceholder}
            value={defaults.price}
            onChange={(e) => onDefaultsChange((d) => ({ ...d, price: e.target.value }))}
          />
        </div>

        {!compact && useCustomChildPrice && (
          <div className="space-y-1.5">
            <Label>Çocuk ₺</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              className="h-10"
              placeholder={defaultPricePlaceholder}
              value={defaults.childPrice}
              onChange={(e) => onDefaultsChange((d) => ({ ...d, childPrice: e.target.value }))}
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Checkbox
          id={compact ? "mobile-custom-child-price" : "custom-child-price"}
          checked={useCustomChildPrice}
          onCheckedChange={(checked) => onCustomChildPriceChange(checked === true)}
        />
        <Label
          htmlFor={compact ? "mobile-custom-child-price" : "custom-child-price"}
          className={cn("font-normal cursor-pointer", compact ? "text-xs" : "text-sm")}
        >
          Çocuk fiyatı farklı
        </Label>
      </div>

      {compact && useCustomChildPrice && (
        <div className="space-y-1.5">
          <Label className="text-xs">Çocuk ₺</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            className="h-9"
            placeholder={defaultPricePlaceholder}
            value={defaults.childPrice}
            onChange={(e) => onDefaultsChange((d) => ({ ...d, childPrice: e.target.value }))}
          />
        </div>
      )}
    </div>
  );
}

export function ScheduleCalendarForm({
  tours,
  existingSchedulesByDate,
}: ScheduleCalendarFormProps) {
  const router = useRouter();
  const [tourId, setTourId] = useState(tours[0]?.id ?? "");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [dateOverrides, setDateOverrides] = useState<Record<string, DateOverrideFields>>({});
  const [templateDate, setTemplateDate] = useState<string | null>(null);
  const [defaults, setDefaults] = useState<DefaultSettings>({
    capacity: tours[0]?.maxGroupSize ?? 15,
    price: "",
    childPrice: "",
  });
  const [useCustomChildPrice, setUseCustomChildPrice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editTarget, setEditTarget] = useState<ScheduleEditTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScheduleEditTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedTour = tours.find((t) => t.id === tourId);
  const bookedDates = useMemo(() => {
    const set = new Set<string>();
    for (const [dateKey, schedules] of Object.entries(existingSchedulesByDate)) {
      if (schedules.some((s) => s.tourId === tourId)) set.add(dateKey);
    }
    return set;
  }, [existingSchedulesByDate, tourId]);

  const sortedSelected = useMemo(() => [...selectedDates].sort(), [selectedDates]);

  const defaultPricePlaceholder = selectedTour ? String(selectedTour.price) : "₺";
  const defaultChildPricePlaceholder = defaultPricePlaceholder;

  function resetForTour(nextTourId: string) {
    setTourId(nextTourId);
    const tour = tours.find((t) => t.id === nextTourId);
    setDefaults({
      capacity: tour?.maxGroupSize ?? 15,
      price: "",
      childPrice: "",
    });
    setSelectedDates(new Set());
    setDateOverrides({});
    setTemplateDate(null);
    setUseCustomChildPrice(false);
  }

  function handleCustomChildPriceChange(checked: boolean) {
    setUseCustomChildPrice(checked);
    if (!checked) {
      setDefaults((d) => ({ ...d, childPrice: "" }));
      setDateOverrides((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          if (next[key]?.childPrice) {
            const { childPrice: _removed, ...rest } = next[key]!;
            next[key] = rest;
          }
        }
        return next;
      });
    }
  }

  function updateOverride(dateKey: string, field: keyof DateOverrideFields, value: string) {
    setDateOverrides((prev) => ({
      ...prev,
      [dateKey]: { ...prev[dateKey], [field]: value },
    }));
  }

  function handleDayClick(dateKey: string) {
    if (bookedDates.has(dateKey)) return;

    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
        setDateOverrides((o) => {
          const copy = { ...o };
          delete copy[dateKey];
          return copy;
        });
        if (templateDate === dateKey) {
          const remaining = [...next].sort();
          setTemplateDate(remaining[0] ?? null);
        }
      } else {
        next.add(dateKey);
        if (next.size === 1) setTemplateDate(dateKey);
      }
      return next;
    });
  }

  function removeDate(dateKey: string) {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      next.delete(dateKey);
      return next;
    });
    setDateOverrides((o) => {
      const copy = { ...o };
      delete copy[dateKey];
      return copy;
    });
    if (templateDate === dateKey) {
      const remaining = sortedSelected.filter((d) => d !== dateKey);
      setTemplateDate(remaining[0] ?? null);
    }
  }

  function resolveDatePayload(startDate: string) {
    const override = dateOverrides[startDate];
    const defaultAdult = parseOptionalPrice(defaults.price);
    const adultPrice = parseOptionalPrice(override?.price ?? "") ?? defaultAdult;

    let childPrice: number | undefined;
    if (useCustomChildPrice) {
      childPrice =
        parseOptionalPrice(override?.childPrice ?? "") ??
        parseOptionalPrice(defaults.childPrice) ??
        adultPrice;
    } else if (adultPrice !== undefined) {
      childPrice = adultPrice;
    }

    return {
      startDate,
      capacity: parseOptionalCapacity(override?.capacity, defaults.capacity),
      price: adultPrice,
      childPrice,
    };
  }

  function handleEditSchedule(schedule: CalendarExistingSchedule, dateKey: string) {
    if (isPastDateKey(dateKey)) {
      toast.error("Geçmiş tur tarihleri düzenlenemez");
      return;
    }
    setEditTarget({ schedule, dateKey });
  }

  function handleDeleteSchedule(schedule: CalendarExistingSchedule, dateKey: string) {
    if (isPastDateKey(dateKey)) {
      toast.error("Geçmiş tur tarihleri silinemez");
      return;
    }
    setDeleteTarget({ schedule, dateKey });
  }

  async function confirmDeleteSchedule() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    const result = await deleteSchedule(deleteTarget.schedule.id);
    setIsDeleting(false);

    if (result.success) {
      const cancelledCount = deleteTarget.schedule.reservationCount;
      toast.success(
        cancelledCount > 0
          ? `Tur tarihi silindi, ${cancelledCount} rezervasyon iptal edildi`
          : "Tur tarihi silindi"
      );
      setDeleteTarget(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (sortedSelected.length === 0) {
      toast.error("Takvimden en az bir gün seçin");
      return;
    }

    setIsSubmitting(true);
    const result = await createSchedulesBulk({
      tourId,
      capacity: defaults.capacity,
      isActive: true,
      dates: sortedSelected.map(resolveDatePayload),
    });
    setIsSubmitting(false);

    if (result.success) {
      toast.success(`${result.data?.count ?? sortedSelected.length} tur tarihi oluşturuldu`);
      setSelectedDates(new Set());
      setDateOverrides({});
      setTemplateDate(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const selectedDatesSummary =
    selectedDates.size === 0 ? (
      <p className="text-xs text-muted-foreground">
        Seçilen günler burada görünür. Özel kontenjan veya fiyat için takvimde güne tıklayın.
      </p>
    ) : (
      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
        {sortedSelected.map((dateKey) => (
          <span
            key={dateKey}
            className={cn(
              "inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-full text-xs font-medium border",
              hasCustomOverride(dateOverrides[dateKey], useCustomChildPrice)
                ? "bg-sage-100 border-sage-300 text-forest-900"
                : "bg-forest-50 border-forest-200 text-forest-800"
            )}
          >
            <button
              type="button"
              className="hover:underline capitalize"
              onClick={() => setTemplateDate(dateKey)}
            >
              {new Date(dateKey + "T12:00:00").toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "short",
              })}
            </button>
            <button
              type="button"
              className="p-0.5 rounded-full hover:bg-black/10"
              onClick={() => removeDate(dateKey)}
              aria-label="Kaldır"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    );

  return (
    <>
      <ScheduleEditModal target={editTarget} onClose={() => setEditTarget(null)} />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tur tarihini sil</AlertDialogTitle>
            <AlertDialogDescription className="capitalize">
              {deleteTarget && (
                <>
                  <span className="block">
                    <span className="font-medium text-foreground">
                      {deleteTarget.schedule.tourTitle}
                    </span>
                    {" — "}
                    {formatDateLabel(deleteTarget.dateKey)} tarihli programı silmek istediğinize emin
                    misiniz?
                  </span>
                  {deleteTarget.schedule.reservationCount > 0 && (
                    <span className="mt-2 block rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 normal-case">
                      Bu tarihte{" "}
                      <span className="font-semibold">
                        {deleteTarget.schedule.reservationCount} rezervasyon
                      </span>{" "}
                      var. Silerseniz tüm rezervasyonlar iptal edilecek ve müşterilere iptal
                      e-postası gönderilecektir.
                    </span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSchedule}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Siliniyor..." : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <form onSubmit={handleSubmit} className="space-y-4 pb-44 md:pb-0">
        <Card className="hidden md:block">
          <CardContent className="pt-5 pb-5 space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <ScheduleSettingsFields
                tourId={tourId}
                tours={tours}
                selectedTour={selectedTour}
                defaults={defaults}
                defaultPricePlaceholder={defaultPricePlaceholder}
                useCustomChildPrice={useCustomChildPrice}
                onTourChange={resetForTour}
                onDefaultsChange={setDefaults}
                onCustomChildPriceChange={handleCustomChildPriceChange}
              />
              <Button
                type="submit"
                disabled={isSubmitting || selectedDates.size === 0}
                className="h-10 bg-forest-600 hover:bg-forest-700 min-w-[160px] lg:mt-7"
              >
                {isSubmitting ? "Oluşturuluyor..." : `${selectedDates.size || 0} Tarih Oluştur`}
              </Button>
            </div>

            <div className="space-y-2 pt-3 border-t border-forest-100">
              <p className="text-sm text-muted-foreground">
                {selectedDates.size === 0
                  ? "Takvimden gün seçin"
                  : `${selectedDates.size} gün seçili`}
              </p>
              {selectedDatesSummary}
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardContent className="p-3 sm:p-4 md:p-5">
            <ScheduleMonthCalendar
              month={month}
              onMonthChange={setMonth}
              selectedDates={selectedDates}
              selectedTourId={tourId}
              existingSchedulesByDate={existingSchedulesByDate}
              dateOverrides={dateOverrides}
              defaultCapacity={defaults.capacity}
              defaultPricePlaceholder={defaultPricePlaceholder}
              defaultChildPricePlaceholder={defaultChildPricePlaceholder}
              templateDate={templateDate}
              useCustomChildPrice={useCustomChildPrice}
              onDayClick={handleDayClick}
              onRemoveDate={removeDate}
              onEditSchedule={handleEditSchedule}
              onDeleteSchedule={handleDeleteSchedule}
              onOverrideChange={updateOverride}
            />
          </CardContent>
        </Card>

        <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-forest-100 bg-white/95 backdrop-blur-sm shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
          <div className="px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
            <ScheduleSettingsFields
              compact
              tourId={tourId}
              tours={tours}
              selectedTour={selectedTour}
              defaults={defaults}
              defaultPricePlaceholder={defaultPricePlaceholder}
              useCustomChildPrice={useCustomChildPrice}
              onTourChange={resetForTour}
              onDefaultsChange={setDefaults}
              onCustomChildPriceChange={handleCustomChildPriceChange}
            />
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <p className="text-xs text-muted-foreground">
                {selectedDates.size === 0 ? "Gün seçin" : `${selectedDates.size} gün seçili`}
              </p>
              <Button
                type="submit"
                disabled={isSubmitting || selectedDates.size === 0}
                className="h-9 bg-forest-600 hover:bg-forest-700 px-4 shrink-0"
              >
                {isSubmitting ? "..." : `${selectedDates.size || 0} Tarih`}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
