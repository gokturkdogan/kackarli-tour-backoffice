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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

      <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-2">
              <Label>Tur</Label>
              <Select value={tourId} onValueChange={(v) => v && resetForTour(v)}>
                <SelectTrigger className="w-full sm:max-w-md min-h-10 h-auto py-2">
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
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={spreadMode ? "default" : "outline"}
                size="sm"
                className={spreadMode ? "bg-sage-600 hover:bg-sage-700" : ""}
                onClick={() => (spreadMode ? setSpreadMode(false) : startSpreadMode())}
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                {spreadMode ? "Yaymayı Bitir" : "Ayarı Yay"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_210px] gap-3 items-start">
        <Card className="min-w-0">
          <CardHeader className="pb-2 px-4 sm:px-5 pt-4">
            <CardTitle className="text-lg">Takvim</CardTitle>
            <p className="text-sm text-muted-foreground">
              Kayıtlı günlerde durum, kontenjan ve fiyat görünür.
            </p>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-4">
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

        <div className="space-y-2 xl:sticky xl:top-20 w-full max-w-[210px]">
          <Card>
            <CardHeader className="pb-1.5 px-3 pt-3">
              <CardTitle className="text-sm font-semibold">Yeni Tarih</CardTitle>
              <p className="text-[10px] text-muted-foreground">{selectedDates.size} gün seçili</p>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2.5">
              {sortedSelected.length === 0 ? (
                <p className="text-[10px] text-muted-foreground py-3 text-center rounded-md border border-dashed border-forest-200">
                  Takvimden gün seçin
                </p>
              ) : (
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {sortedSelected.map((dateKey) => (
                    <span
                      key={dateKey}
                      className={cn(
                        "inline-flex items-center gap-0.5 pl-1.5 pr-0.5 py-0.5 rounded-full text-[10px] font-medium border",
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
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {templateDate && (
                <p className="text-[10px] text-muted-foreground capitalize truncate">
                  Şablon: {formatDateLabel(templateDate)}
                </p>
              )}

              <div className="border-t border-forest-100 pt-2 space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="defaultCapacity" className="text-[10px]">
                    Kontenjan
                  </Label>
                  <Input
                    id="defaultCapacity"
                    type="number"
                    min={1}
                    className="h-8 text-xs"
                    value={defaults.capacity}
                    onChange={(e) =>
                      setDefaults((d) => ({ ...d, capacity: Number(e.target.value) || 1 }))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px]">Yetişkin ₺</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="h-8 text-xs"
                    placeholder={defaultPricePlaceholder}
                    value={defaults.price}
                    onChange={(e) => setDefaults((d) => ({ ...d, price: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px]">Çocuk ₺</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="h-8 text-xs"
                    placeholder={defaultChildPricePlaceholder}
                    value={defaults.childPrice}
                    onChange={(e) =>
                      setDefaults((d) => ({ ...d, childPrice: e.target.value }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between py-0.5">
                  <Label htmlFor="active" className="text-[10px]">
                    Aktif
                  </Label>
                  <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || selectedDates.size === 0}
                  className="w-full h-8 text-xs bg-forest-600 hover:bg-forest-700"
                >
                  {isSubmitting ? "..." : `${selectedDates.size} Tarih Oluştur`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
    </>
  );
}
