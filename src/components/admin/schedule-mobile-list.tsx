"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toDateInputValue } from "@/lib/date-helpers";
import { resolveAdultPrice, resolveChildPrice } from "@/lib/pricing";
import type { CalendarExistingSchedule } from "@/actions/schedules";
import type { DateOverrideFields } from "@/components/admin/schedule-month-calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MobileFilter = "ozet" | "kayitli" | "secili" | "eklenebilir" | "tumu";

interface ScheduleMobileListProps {
  month: Date;
  selectedDates: Set<string>;
  selectedTourId: string;
  existingSchedulesByDate: Record<string, CalendarExistingSchedule[]>;
  dateOverrides: Record<string, DateOverrideFields>;
  defaultCapacity: number;
  defaultPricePlaceholder: string;
  defaultChildPricePlaceholder: string;
  templateDate?: string | null;
  onDayClick: (dateKey: string) => void;
  onRemoveDate: (dateKey: string) => void;
  onEditSchedule: (schedule: CalendarExistingSchedule, dateKey: string) => void;
  onDeleteSchedule: (schedule: CalendarExistingSchedule, dateKey: string) => void;
  onOverrideChange: (dateKey: string, field: keyof DateOverrideFields, value: string) => void;
}

interface DayMeta {
  date: Date;
  dateKey: string;
  isPast: boolean;
  isToday: boolean;
  existingOnDay: CalendarExistingSchedule[];
  isBooked: boolean;
  isSelected: boolean;
  isAvailable: boolean;
  currentTourSchedule?: CalendarExistingSchedule;
  otherSchedules: CalendarExistingSchedule[];
  dayPendingCount: number;
  override?: DateOverrideFields;
  canManage: boolean;
  weekday: string;
  weekdayShort: string;
  monthShort: string;
}

const FILTERS: { id: MobileFilter; label: string }[] = [
  { id: "ozet", label: "Özet" },
  { id: "kayitli", label: "Kayıtlı" },
  { id: "secili", label: "Seçili" },
  { id: "eklenebilir", label: "Eklenebilir" },
  { id: "tumu", label: "Tümü" },
];

function getMonthDays(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const days: Date[] = [];
  for (let day = 1; day <= lastDay; day++) {
    days.push(new Date(year, monthIndex, day, 12, 0, 0, 0));
  }
  return days;
}

function hasCustomOverride(override?: DateOverrideFields): boolean {
  if (!override) return false;
  return !!(override.capacity?.trim() || override.price?.trim() || override.childPrice?.trim());
}

function formatCompactPrice(price: number): string {
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(price)}₺`;
}

function formatDayHeading(date: Date, isToday: boolean) {
  const label = date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });
  return isToday ? `Bugün · ${label}` : label;
}

function MobileScheduleCard({
  schedule,
  canManage,
  onEdit,
  onDelete,
}: {
  schedule: CalendarExistingSchedule;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const adultPrice = resolveAdultPrice(schedule.price, schedule.tourPrice);
  const childPrice = resolveChildPrice(
    schedule.childPrice,
    schedule.tourChildPrice,
    adultPrice
  );
  const fillPct = Math.min(100, Math.round((schedule.reservedCount / schedule.capacity) * 100));
  const isFull = schedule.reservedCount >= schedule.capacity;
  const spotsLeft = Math.max(0, schedule.capacity - schedule.reservedCount);

  return (
    <div className="rounded-lg border border-rose-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-rose-50 border-b border-rose-100">
        <div className="flex flex-wrap gap-1.5">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
              schedule.isActive ? "bg-forest-600 text-white" : "bg-slate-500 text-white"
            )}
          >
            {schedule.isActive ? "Aktif" : "Pasif"}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white",
              isFull ? "bg-rose-600" : "bg-amber-500"
            )}
          >
            {isFull ? "Dolu" : "Açık"}
          </span>
        </div>
        {schedule.pendingCount > 0 && (
          <span
            className="inline-flex items-center justify-center rounded-full bg-amber-500 p-1.5 text-white"
            title={`${schedule.pendingCount} bekleyen rezervasyon`}
          >
            <Bell className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      <div className="p-3 space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>Onaylı kontenjan</span>
            <span className="font-semibold text-forest-900 tabular-nums">
              {schedule.reservedCount}/{schedule.capacity}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-rose-100 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isFull ? "bg-rose-500" : "bg-amber-500"
              )}
              style={{ width: `${fillPct}%` }}
            />
          </div>
          {!isFull && (
            <p className="text-xs text-muted-foreground mt-1">{spotsLeft} yer kaldı</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-mist px-3 py-2">
            <p className="text-[10px] text-muted-foreground">Yetişkin</p>
            <p className="text-sm font-semibold text-forest-900 tabular-nums">
              {formatCompactPrice(adultPrice)}
            </p>
          </div>
          <div className="rounded-lg bg-mist px-3 py-2">
            <p className="text-[10px] text-muted-foreground">Çocuk</p>
            <p className="text-sm font-semibold text-forest-900 tabular-nums">
              {formatCompactPrice(childPrice)}
            </p>
          </div>
        </div>

        {canManage && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10"
              onClick={onEdit}
            >
              <Pencil className="h-4 w-4 mr-1.5" />
              Düzenle
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 text-rose-700 border-rose-200 hover:bg-rose-50"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Sil
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function OtherTourRow({
  schedule,
  canManage,
  onEdit,
  onDelete,
}: {
  schedule: CalendarExistingSchedule;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const adultPrice = resolveAdultPrice(schedule.price, schedule.tourPrice);

  return (
    <div className="rounded-lg border border-sage-200 bg-sage-50/50 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-forest-900 truncate">{schedule.tourTitle}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Onaylı {schedule.reservedCount}/{schedule.capacity} · {formatCompactPrice(adultPrice)}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-sage-200 px-2 py-0.5 text-[10px] font-semibold text-forest-800">
          Başka tur
        </span>
      </div>
      {canManage && (
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" size="sm" className="h-9" onClick={onEdit}>
            Düzenle
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 text-rose-700 border-rose-200"
            onClick={onDelete}
          >
            Sil
          </Button>
        </div>
      )}
    </div>
  );
}

function SelectedDayPanel({
  dateKey,
  override,
  templateDate,
  defaultCapacity,
  defaultPricePlaceholder,
  defaultChildPricePlaceholder,
  onRemoveDate,
  onOverrideChange,
}: {
  dateKey: string;
  override?: DateOverrideFields;
  templateDate?: string | null;
  defaultCapacity: number;
  defaultPricePlaceholder: string;
  defaultChildPricePlaceholder: string;
  onRemoveDate: (dateKey: string) => void;
  onOverrideChange: (dateKey: string, field: keyof DateOverrideFields, value: string) => void;
}) {
  return (
    <div className="rounded-lg border border-forest-200 bg-forest-50/80 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-forest-600 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">
            Seçildi
          </span>
          {templateDate === dateKey && (
            <span className="rounded-full bg-sage-500 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">
              Şablon
            </span>
          )}
          {hasCustomOverride(override) && (
            <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">
              Özel
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-muted-foreground"
          onClick={() => onRemoveDate(dateKey)}
        >
          <X className="h-4 w-4 mr-1" />
          Kaldır
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Boş bırakılan alanlar için sağdaki varsayılan değerler kullanılır.
      </p>

      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`mobile-${dateKey}-capacity`} className="text-xs">
            Kontenjan
          </Label>
          <Input
            id={`mobile-${dateKey}-capacity`}
            type="number"
            min={1}
            placeholder={String(defaultCapacity)}
            value={override?.capacity ?? ""}
            onChange={(e) => onOverrideChange(dateKey, "capacity", e.target.value)}
            className="h-10 bg-white"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor={`mobile-${dateKey}-price`} className="text-xs">
              Yetişkin ₺
            </Label>
            <Input
              id={`mobile-${dateKey}-price`}
              type="number"
              min={0}
              step="0.01"
              placeholder={defaultPricePlaceholder}
              value={override?.price ?? ""}
              onChange={(e) => onOverrideChange(dateKey, "price", e.target.value)}
              className="h-10 bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`mobile-${dateKey}-childPrice`} className="text-xs">
              Çocuk ₺
            </Label>
            <Input
              id={`mobile-${dateKey}-childPrice`}
              type="number"
              min={0}
              step="0.01"
              placeholder={defaultChildPricePlaceholder}
              value={override?.childPrice ?? ""}
              onChange={(e) => onOverrideChange(dateKey, "childPrice", e.target.value)}
              className="h-10 bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScheduleMobileList({
  month,
  selectedDates,
  selectedTourId,
  existingSchedulesByDate,
  dateOverrides,
  defaultCapacity,
  defaultPricePlaceholder,
  defaultChildPricePlaceholder,
  templateDate,
  onDayClick,
  onRemoveDate,
  onEditSchedule,
  onDeleteSchedule,
  onOverrideChange,
}: ScheduleMobileListProps) {
  const todayRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<MobileFilter>("ozet");
  const [showAllAvailable, setShowAllAvailable] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const days = useMemo(() => getMonthDays(month), [month]);

  const dayMetas = useMemo<DayMeta[]>(() => {
    return days.map((date) => {
      const dateKey = toDateInputValue(date);
      const isPast = date < today;
      const isToday = date.getTime() === today.getTime();
      const existingOnDay = existingSchedulesByDate[dateKey] ?? [];
      const isBooked = existingOnDay.some((s) => s.tourId === selectedTourId);
      const isSelected = selectedDates.has(dateKey);
      const isAvailable = !isPast && !isBooked && !isSelected;

      return {
        date,
        dateKey,
        isPast,
        isToday,
        existingOnDay,
        isBooked,
        isSelected,
        isAvailable,
        currentTourSchedule: existingOnDay.find((s) => s.tourId === selectedTourId),
        otherSchedules: existingOnDay.filter((s) => s.tourId !== selectedTourId),
        dayPendingCount: existingOnDay.reduce((sum, s) => sum + s.pendingCount, 0),
        override: dateOverrides[dateKey],
        canManage: !isPast,
        weekday: date.toLocaleDateString("tr-TR", { weekday: "long" }),
        weekdayShort: date.toLocaleDateString("tr-TR", { weekday: "short" }),
        monthShort: date.toLocaleDateString("tr-TR", { month: "short" }),
      };
    });
  }, [days, today, existingSchedulesByDate, selectedTourId, selectedDates, dateOverrides]);

  const stats = useMemo(() => {
    const booked = dayMetas.filter((d) => d.isBooked).length;
    const selected = dayMetas.filter((d) => d.isSelected).length;
    const available = dayMetas.filter((d) => d.isAvailable).length;
    const pending = dayMetas.filter((d) => d.dayPendingCount > 0).length;
    return { booked, selected, available, pending };
  }, [dayMetas]);

  const filteredDays = useMemo(() => {
    if (filter === "kayitli") {
      return dayMetas.filter((d) => d.isBooked || d.otherSchedules.length > 0);
    }
    if (filter === "secili") {
      return dayMetas.filter((d) => d.isSelected);
    }
    if (filter === "eklenebilir") {
      return dayMetas.filter((d) => d.isAvailable);
    }
    if (filter === "tumu") {
      return dayMetas.filter((d) => !d.isPast || d.existingOnDay.length > 0 || d.isSelected);
    }

    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 14);

    const important = dayMetas.filter((d) => {
      if (d.isBooked || d.isSelected || d.otherSchedules.length > 0 || d.dayPendingCount > 0) {
        return true;
      }
      if (d.isToday) return true;
      if (d.isAvailable && d.date <= horizon) return true;
      return false;
    });

    const importantKeys = new Set(important.map((d) => d.dateKey));
    const extraAvailable = dayMetas.filter(
      (d) => d.isAvailable && !importantKeys.has(d.dateKey)
    );

    if (showAllAvailable || extraAvailable.length === 0) {
      return [...important, ...extraAvailable];
    }

    return important;
  }, [dayMetas, filter, showAllAvailable, today]);

  const hiddenAvailableCount = useMemo(() => {
    if (filter !== "ozet") return 0;
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 14);
    return dayMetas.filter(
      (d) =>
        d.isAvailable &&
        d.date > horizon &&
        !showAllAvailable
    ).length;
  }, [dayMetas, filter, showAllAvailable, today]);

  useEffect(() => {
    setShowAllAvailable(false);
    setFilter("ozet");
  }, [month]);

  useEffect(() => {
    if (filter === "ozet" && todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [month, filter]);

  const isCompactAvailable = (day: DayMeta) =>
    filter === "ozet" && day.isAvailable && !day.isToday;

  return (
    <div className="md:hidden space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-rose-700/80">Kayıtlı</p>
          <p className="text-lg font-bold text-rose-900 tabular-nums">{stats.booked}</p>
        </div>
        <div className="rounded-lg bg-forest-50 border border-forest-100 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-forest-700/80">Seçili</p>
          <p className="text-lg font-bold text-forest-900 tabular-nums">{stats.selected}</p>
        </div>
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-emerald-700/80">Eklenebilir</p>
          <p className="text-lg font-bold text-emerald-900 tabular-nums">{stats.available}</p>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-amber-800/80">Bekleyen</p>
          <p className="text-lg font-bold text-amber-900 tabular-nums">{stats.pending}</p>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors",
              filter === item.id
                ? "bg-forest-600 text-white shadow-sm"
                : "bg-white border border-forest-100 text-forest-700"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filteredDays.length === 0 ? (
        <div className="rounded-xl border border-dashed border-forest-200 bg-white px-4 py-10 text-center">
          <p className="text-sm font-medium text-forest-900">Bu filtrede gün yok</p>
          <p className="text-xs text-muted-foreground mt-1">
            Başka bir filtre seçin veya yeni gün ekleyin.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDays.map((day) => {
            const showFullCard =
              day.isBooked ||
              day.isSelected ||
              day.otherSchedules.length > 0 ||
              day.dayPendingCount > 0 ||
              !isCompactAvailable(day);

            if (!showFullCard) {
              return (
                <button
                  key={day.dateKey}
                  type="button"
                  onClick={() => onDayClick(day.dateKey)}
                  className="w-full flex items-center justify-between gap-3 rounded-xl border border-forest-100 bg-white px-3 py-3 text-left active:bg-emerald-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
                      <span className="text-sm font-bold leading-none tabular-nums">
                        {day.date.getDate()}
                      </span>
                      <span className="text-[9px] uppercase mt-0.5">{day.weekdayShort}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-forest-900 capitalize truncate">
                        {day.weekday}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {day.monthShort}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shrink-0">
                    <Plus className="h-3.5 w-3.5" />
                    Ekle
                  </span>
                </button>
              );
            }

            return (
              <div
                key={day.dateKey}
                ref={day.isToday ? todayRef : undefined}
                className={cn(
                  "rounded-xl border bg-white overflow-hidden",
                  day.isToday && "ring-2 ring-forest-400 ring-offset-1",
                  day.isSelected && "border-forest-300",
                  day.isBooked && !day.isSelected && "border-rose-200",
                  !day.isBooked && !day.isSelected && "border-forest-100"
                )}
              >
                <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-forest-50 bg-mist/40">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-forest-900 capitalize truncate">
                      {formatDayHeading(day.date, day.isToday)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {day.isBooked && (
                      <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                        Kayıtlı
                      </span>
                    )}
                    {day.dayPendingCount > 0 && (
                      <span
                        className="inline-flex items-center justify-center rounded-full bg-amber-500 p-1.5 text-white"
                        title={`${day.dayPendingCount} bekleyen rezervasyon`}
                      >
                        <Bell className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 space-y-3">
                  {day.isBooked && day.currentTourSchedule && (
                    <MobileScheduleCard
                      schedule={day.currentTourSchedule}
                      canManage={day.canManage}
                      onEdit={() => onEditSchedule(day.currentTourSchedule!, day.dateKey)}
                      onDelete={() => onDeleteSchedule(day.currentTourSchedule!, day.dateKey)}
                    />
                  )}

                  {day.otherSchedules.map((schedule) => (
                    <OtherTourRow
                      key={schedule.id}
                      schedule={schedule}
                      canManage={day.canManage}
                      onEdit={() => onEditSchedule(schedule, day.dateKey)}
                      onDelete={() => onDeleteSchedule(schedule, day.dateKey)}
                    />
                  ))}

                  {day.isSelected && (
                    <SelectedDayPanel
                      dateKey={day.dateKey}
                      override={day.override}
                      templateDate={templateDate}
                      defaultCapacity={defaultCapacity}
                      defaultPricePlaceholder={defaultPricePlaceholder}
                      defaultChildPricePlaceholder={defaultChildPricePlaceholder}
                      onRemoveDate={onRemoveDate}
                      onOverrideChange={onOverrideChange}
                    />
                  )}

                  {day.isAvailable && filter !== "ozet" && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => onDayClick(day.dateKey)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Bu güne tur tarihi ekle
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hiddenAvailableCount > 0 && (
        <Button
          type="button"
          variant="outline"
          className="w-full h-11"
          onClick={() => setShowAllAvailable(true)}
        >
          <ChevronDown className="h-4 w-4 mr-2" />
          {hiddenAvailableCount} eklenebilir gün daha göster
        </Button>
      )}

      {showAllAvailable && filter === "ozet" && (
        <Button
          type="button"
          variant="ghost"
          className="w-full h-9 text-muted-foreground"
          onClick={() => setShowAllAvailable(false)}
        >
          <ChevronUp className="h-4 w-4 mr-2" />
          Daha az göster
        </Button>
      )}
    </div>
  );
}
