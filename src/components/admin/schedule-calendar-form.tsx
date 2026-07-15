"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { resolveChildPrice } from "@/lib/pricing";
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

function hasCustomOverride(override?: DateOverrideFields): boolean {
  if (!override) return false;
  return !!(override.capacity?.trim() || override.price?.trim() || override.childPrice?.trim());
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
  const [spreadMode, setSpreadMode] = useState(false);
  const [defaults, setDefaults] = useState<DefaultSettings>({
    capacity: tours[0]?.maxGroupSize ?? 15,
    price: "",
    childPrice: "",
  });
  const [isActive, setIsActive] = useState(true);
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
  const defaultChildPricePlaceholder = selectedTour
    ? String(resolveChildPrice(null, selectedTour.childPrice, selectedTour.price))
    : "₺";

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
    setSpreadMode(false);
  }

  function updateOverride(dateKey: string, field: keyof DateOverrideFields, value: string) {
    setDateOverrides((prev) => ({
      ...prev,
      [dateKey]: { ...prev[dateKey], [field]: value },
    }));
  }

  function copyTemplateToDate(dateKey: string) {
    if (!templateDate || templateDate === dateKey) return;
    const template = dateOverrides[templateDate];
    if (!template || !hasCustomOverride(template)) return;
    setDateOverrides((prev) => ({
      ...prev,
      [dateKey]: { ...template },
    }));
  }

  function handleDayClick(dateKey: string) {
    if (bookedDates.has(dateKey)) return;

    if (spreadMode) {
      if (selectedDates.has(dateKey)) return;
      setSelectedDates((prev) => new Set(prev).add(dateKey));
      copyTemplateToDate(dateKey);
      return;
    }

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

  function startSpreadMode() {
    if (selectedDates.size === 0) {
      toast.error("Önce şablon olacak bir gün seçin");
      return;
    }
    if (!templateDate && sortedSelected[0]) {
      setTemplateDate(sortedSelected[0]);
    }
    setSpreadMode(true);
    toast.message("Şablon günün ayarlarını diğer günlere yaymak için takvime tıklayın");
  }

  function resolveDatePayload(startDate: string) {
    const override = dateOverrides[startDate];
    const defaultAdult = parseOptionalPrice(defaults.price);
    const defaultChild = parseOptionalPrice(defaults.childPrice);

    return {
      startDate,
      capacity: parseOptionalCapacity(override?.capacity, defaults.capacity),
      price: parseOptionalPrice(override?.price ?? "") ?? defaultAdult,
      childPrice: parseOptionalPrice(override?.childPrice ?? "") ?? defaultChild,
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
      toast.success("Tur tarihi silindi");
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
      isActive,
      dates: sortedSelected.map(resolveDatePayload),
    });
    setIsSubmitting(false);

    if (result.success) {
      toast.success(`${result.data?.count ?? sortedSelected.length} tur tarihi oluşturuldu`);
      setSelectedDates(new Set());
      setDateOverrides({});
      setTemplateDate(null);
      setSpreadMode(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

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
                  <span className="font-medium text-foreground">{deleteTarget.schedule.tourTitle}</span>
                  {" — "}
                  {formatDateLabel(deleteTarget.dateKey)} tarihli programı silmek istediğinize emin
                  misiniz? Rezervasyon varsa silinemez.
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.2fr)_repeat(3,minmax(0,1fr))_auto_auto] lg:items-end">
              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <Label>Tur</Label>
                <Select value={tourId} onValueChange={(v) => v && resetForTour(v)}>
                  <SelectTrigger className="w-full min-h-10 h-auto py-2">
                    {selectedTour ? (
                      <span className="text-left">
                        <span className="font-medium">{selectedTour.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          {tourTypeLabel(selectedTour.type)} · Tur fiyatı{" "}
                          {formatPrice(selectedTour.price)}
                        </span>
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

              <div className="space-y-2">
                <Label htmlFor="defaultCapacity">Kontenjan</Label>
                <Input
                  id="defaultCapacity"
                  type="number"
                  min={1}
                  className="h-10"
                  value={defaults.capacity}
                  onChange={(e) =>
                    setDefaults((d) => ({ ...d, capacity: Number(e.target.value) || 1 }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Yetişkin ₺</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  className="h-10"
                  placeholder={defaultPricePlaceholder}
                  value={defaults.price}
                  onChange={(e) => setDefaults((d) => ({ ...d, price: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Çocuk ₺</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  className="h-10"
                  placeholder={defaultChildPricePlaceholder}
                  value={defaults.childPrice}
                  onChange={(e) =>
                    setDefaults((d) => ({ ...d, childPrice: e.target.value }))
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-forest-100 px-3 h-10 lg:mb-0">
                <Label htmlFor="active" className="text-sm shrink-0">
                  Aktif
                </Label>
                <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
              </div>

              <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1 lg:justify-end max-md:w-full">
                <Button
                  type="button"
                  variant={spreadMode ? "default" : "outline"}
                  className={cn(
                    "h-10 max-md:flex-1",
                    spreadMode ? "bg-sage-600 hover:bg-sage-700" : ""
                  )}
                  onClick={() => (spreadMode ? setSpreadMode(false) : startSpreadMode())}
                >
                  <Copy className="h-4 w-4 mr-1.5" />
                  {spreadMode ? "Yaymayı Bitir" : "Ayarı Yay"}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || selectedDates.size === 0}
                  className="h-10 bg-forest-600 hover:bg-forest-700 min-w-[140px] max-md:flex-1"
                >
                  {isSubmitting ? "Oluşturuluyor..." : `${selectedDates.size || 0} Tarih Oluştur`}
                </Button>
              </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-forest-100">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {selectedDates.size === 0
                    ? "Takvimden gün seçin"
                    : `${selectedDates.size} gün seçili`}
                  {templateDate && (
                    <span className="text-forest-700 font-medium capitalize">
                      {" "}
                      · Şablon: {formatDateLabel(templateDate)}
                    </span>
                  )}
                </p>
              </div>

              {sortedSelected.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {sortedSelected.map((dateKey) => (
                    <span
                      key={dateKey}
                      className={cn(
                        "inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-full text-xs font-medium border",
                        hasCustomOverride(dateOverrides[dateKey])
                          ? "bg-sage-100 border-sage-300 text-forest-900"
                          : "bg-forest-50 border-forest-200 text-forest-800"
                      )}
                    >
                      <button
                        type="button"
                        className="hover:underline capitalize"
                        onClick={() => setTemplateDate(dateKey)}
                        title="Şablon gün"
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
              ) : (
                <p className="text-xs text-muted-foreground py-2">
                  Seçilen günler burada görünür. Özel kontenjan veya fiyat için takvimde güne tıklayın.
                </p>
              )}
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
              spreadMode={spreadMode}
              onDayClick={handleDayClick}
              onRemoveDate={removeDate}
              onEditSchedule={handleEditSchedule}
              onDeleteSchedule={handleDeleteSchedule}
              onOverrideChange={updateOverride}
            />
          </CardContent>
        </Card>
      </form>
    </>
  );
}
