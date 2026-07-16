"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toDateInputValue } from "@/lib/date-helpers";
import { resolveAdultPrice, resolveChildPrice } from "@/lib/pricing";
import type { CalendarExistingSchedule } from "@/actions/schedules";
import type { DateOverrideFields } from "@/components/admin/schedule-month-calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  useCustomChildPrice?: boolean;
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
  override?: DateOverrideFields;
  canManage: boolean;
  weekday: string;
  weekdayShort: string;
}

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

function getDefaultActiveDateKey(month: Date, today: Date): string {
  const days = getMonthDays(month);
  const todayKey = toDateInputValue(today);
  if (days.some((d) => toDateInputValue(d) === todayKey)) {
    return todayKey;
  }
  return toDateInputValue(days[0]!);
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

function ScheduleIconButtons({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-forest-700"
        aria-label="Düzenle"
        onClick={onEdit}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-rose-700"
        aria-label="Sil"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function MobileScheduleCard({ schedule }: { schedule: CalendarExistingSchedule }) {
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
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex flex-wrap justify-end gap-1 items-center">
            <span className="rounded-full bg-sage-200 px-2 py-0.5 text-[10px] font-semibold text-forest-800">
              Başka tur
            </span>
            {canManage && <ScheduleIconButtons onEdit={onEdit} onDelete={onDelete} />}
          </div>
        </div>
      </div>
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
  useCustomChildPrice,
  onRemoveDate,
  onOverrideChange,
}: {
  dateKey: string;
  override?: DateOverrideFields;
  templateDate?: string | null;
  defaultCapacity: number;
  defaultPricePlaceholder: string;
  defaultChildPricePlaceholder: string;
  useCustomChildPrice: boolean;
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
          {hasCustomOverride(override, useCustomChildPrice) && (
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
        Boş bırakılan alanlar için alttaki varsayılan değerler kullanılır.
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
        <div className={cn("grid gap-2", useCustomChildPrice ? "grid-cols-2" : "grid-cols-1")}>
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
          {useCustomChildPrice && (
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
          )}
        </div>
      </div>
    </div>
  );
}

function DayStatusDot({ day }: { day: DayMeta }) {
  if (day.isSelected) {
    return <span className="block h-1.5 w-1.5 rounded-full bg-forest-500" />;
  }
  if (day.isBooked) {
    return <span className="block h-1.5 w-1.5 rounded-full bg-rose-500" />;
  }
  if (day.otherSchedules.length > 0) {
    return <span className="block h-1.5 w-1.5 rounded-full bg-sage-500" />;
  }
  if (day.isAvailable) {
    return <span className="block h-1.5 w-1.5 rounded-full bg-emerald-400" />;
  }
  return <span className="block h-1.5 w-1.5 rounded-full bg-transparent" />;
}

function DayCircleButton({
  day,
  isActive,
  onSelect,
  buttonRef,
}: {
  day: DayMeta;
  isActive: boolean;
  onSelect: () => void;
  buttonRef?: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onSelect}
      aria-label={day.weekday}
      aria-current={isActive ? "date" : undefined}
      className="flex shrink-0 flex-col items-center gap-1.5 px-0.5"
    >
      <span
        className={cn(
          "text-[10px] font-semibold uppercase tracking-wide",
          isActive ? "text-forest-700" : "text-muted-foreground"
        )}
      >
        {day.weekdayShort.replace(".", "").slice(0, 3)}
      </span>
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold tabular-nums transition-colors",
          isActive && "bg-forest-600 text-white shadow-sm",
          !isActive && day.isToday && "bg-forest-50 text-forest-900 ring-2 ring-forest-400",
          !isActive && !day.isToday && day.isPast && "bg-stone-100 text-stone-400",
          !isActive &&
            !day.isToday &&
            !day.isPast &&
            day.isSelected &&
            "bg-forest-100 text-forest-800 ring-1 ring-forest-300",
          !isActive &&
            !day.isToday &&
            !day.isPast &&
            !day.isSelected &&
            day.isBooked &&
            "bg-rose-50 text-rose-900 ring-1 ring-rose-200",
          !isActive &&
            !day.isToday &&
            !day.isPast &&
            !day.isSelected &&
            !day.isBooked &&
            day.otherSchedules.length > 0 &&
            "bg-sage-50 text-forest-800 ring-1 ring-sage-200",
          !isActive &&
            !day.isToday &&
            !day.isPast &&
            !day.isSelected &&
            !day.isBooked &&
            day.otherSchedules.length === 0 &&
            day.isAvailable &&
            "bg-white text-forest-900 ring-1 ring-forest-100"
        )}
      >
        {day.date.getDate()}
      </span>
      <DayStatusDot day={day} />
    </button>
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
  useCustomChildPrice = false,
  onDayClick,
  onRemoveDate,
  onEditSchedule,
  onDeleteSchedule,
  onOverrideChange,
}: ScheduleMobileListProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const dayButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [activeDateKey, setActiveDateKey] = useState(() =>
    getDefaultActiveDateKey(month, today)
  );

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
        override: dateOverrides[dateKey],
        canManage: !isPast,
        weekday: date.toLocaleDateString("tr-TR", { weekday: "long" }),
        weekdayShort: date.toLocaleDateString("tr-TR", { weekday: "short" }),
      };
    });
  }, [days, today, existingSchedulesByDate, selectedTourId, selectedDates, dateOverrides]);

  const activeDay = useMemo(
    () => dayMetas.find((d) => d.dateKey === activeDateKey) ?? dayMetas[0],
    [dayMetas, activeDateKey]
  );

  useEffect(() => {
    setActiveDateKey(getDefaultActiveDateKey(month, today));
  }, [month, today]);

  useEffect(() => {
    const button = dayButtonRefs.current[activeDateKey];
    if (button) {
      button.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeDateKey, month]);

  const hasContent =
    activeDay &&
    (activeDay.isBooked ||
      activeDay.isSelected ||
      activeDay.otherSchedules.length > 0 ||
      activeDay.isAvailable);

  return (
    <div className="md:hidden space-y-4">
      <div
        ref={stripRef}
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none"
      >
        {dayMetas.map((day) => (
          <DayCircleButton
            key={day.dateKey}
            day={day}
            isActive={day.dateKey === activeDateKey}
            onSelect={() => setActiveDateKey(day.dateKey)}
            buttonRef={(el) => {
              dayButtonRefs.current[day.dateKey] = el;
            }}
          />
        ))}
      </div>

      {activeDay ? (
        <div
          className={cn(
            "rounded-xl border bg-white overflow-hidden",
            activeDay.isToday && "ring-2 ring-forest-400 ring-offset-1",
            activeDay.isSelected && "border-forest-300",
            activeDay.isBooked && !activeDay.isSelected && "border-rose-200",
            !activeDay.isBooked && !activeDay.isSelected && "border-forest-100"
          )}
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-forest-50 bg-mist/40">
            <p className="text-sm font-semibold text-forest-900 capitalize truncate">
              {formatDayHeading(activeDay.date, activeDay.isToday)}
            </p>
            {activeDay.isBooked && activeDay.currentTourSchedule && activeDay.canManage && (
              <ScheduleIconButtons
                onEdit={() => onEditSchedule(activeDay.currentTourSchedule!, activeDay.dateKey)}
                onDelete={() =>
                  onDeleteSchedule(activeDay.currentTourSchedule!, activeDay.dateKey)
                }
              />
            )}
          </div>

          <div className="p-3 space-y-3">
            {activeDay.isBooked && activeDay.currentTourSchedule && (
              <MobileScheduleCard schedule={activeDay.currentTourSchedule} />
            )}

            {activeDay.otherSchedules.map((schedule) => (
              <OtherTourRow
                key={schedule.id}
                schedule={schedule}
                canManage={activeDay.canManage}
                onEdit={() => onEditSchedule(schedule, activeDay.dateKey)}
                onDelete={() => onDeleteSchedule(schedule, activeDay.dateKey)}
              />
            ))}

            {activeDay.isSelected && (
              <SelectedDayPanel
                dateKey={activeDay.dateKey}
                override={activeDay.override}
                templateDate={templateDate}
                defaultCapacity={defaultCapacity}
                defaultPricePlaceholder={defaultPricePlaceholder}
                defaultChildPricePlaceholder={defaultChildPricePlaceholder}
                useCustomChildPrice={useCustomChildPrice}
                onRemoveDate={onRemoveDate}
                onOverrideChange={onOverrideChange}
              />
            )}

            {activeDay.isAvailable && (
              <button
                type="button"
                onClick={() => onDayClick(activeDay.dateKey)}
                className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 px-4 py-10 text-center active:bg-emerald-50 transition-colors"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <Plus className="h-6 w-6" />
                </span>
                <span className="text-sm font-semibold text-emerald-800">Tur tarihi ekle</span>
                <span className="text-xs text-muted-foreground">
                  Bu güne yeni tur programı eklemek için dokunun
                </span>
              </button>
            )}

            {!hasContent && activeDay.isPast && (
              <div className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center">
                <p className="text-sm font-medium text-stone-600">Geçmiş gün</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Bu günde kayıtlı tur tarihi yok.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground px-1">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          Kayıtlı
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-forest-500" />
          Seçili
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Eklenebilir
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-sage-500" />
          Başka tur
        </span>
      </div>
    </div>
  );
}
