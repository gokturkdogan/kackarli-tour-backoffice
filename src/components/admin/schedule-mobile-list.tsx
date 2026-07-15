"use client";

import type { ReactNode } from "react";
import { Bell, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toDateInputValue } from "@/lib/date-helpers";
import type { CalendarExistingSchedule } from "@/actions/schedules";
import type { DateOverrideFields } from "@/components/admin/schedule-month-calendar";

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
  spreadMode?: boolean;
  onDayClick: (dateKey: string) => void;
  onRemoveDate: (dateKey: string) => void;
  onEditSchedule: (schedule: CalendarExistingSchedule, dateKey: string) => void;
  onDeleteSchedule: (schedule: CalendarExistingSchedule, dateKey: string) => void;
  onOverrideChange: (dateKey: string, field: keyof DateOverrideFields, value: string) => void;
  renderBookedCard: (
    schedule: CalendarExistingSchedule,
    dateKey: string,
    canManage: boolean
  ) => ReactNode;
  renderOtherCard: (
    schedule: CalendarExistingSchedule,
    dateKey: string,
    canManage: boolean
  ) => ReactNode;
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

function hasCustomOverride(override?: DateOverrideFields): boolean {
  if (!override) return false;
  return !!(override.capacity?.trim() || override.price?.trim() || override.childPrice?.trim());
}

function MobileCalendarCellField({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-cream/90">
        {label}
      </label>
      <input
        id={id}
        type="number"
        placeholder={hint}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-white/30 bg-white/95 px-3 text-sm text-forest-900"
      />
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
  renderBookedCard,
  renderOtherCard,
}: ScheduleMobileListProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = getMonthDays(month);

  return (
    <div className="md:hidden space-y-2">
      {days.map((date) => {
        const dateKey = toDateInputValue(date);
        const isPast = date < today;
        const existingOnDay = existingSchedulesByDate[dateKey] ?? [];
        const isBooked = existingOnDay.some((s) => s.tourId === selectedTourId);
        const isSelected = selectedDates.has(dateKey);
        const isAvailable = !isPast && !isBooked && !isSelected;
        const currentTourSchedule = existingOnDay.find((s) => s.tourId === selectedTourId);
        const otherSchedules = existingOnDay.filter((s) => s.tourId !== selectedTourId);
        const dayPendingCount = existingOnDay.reduce(
          (sum, schedule) => sum + schedule.pendingCount,
          0
        );
        const override = dateOverrides[dateKey];
        const isClickable = isAvailable || isSelected;
        const canManage = !isPast;
        const weekday = date.toLocaleDateString("tr-TR", { weekday: "long" });

        return (
          <div
            key={dateKey}
            className={cn(
              "rounded-xl border p-3 space-y-3",
              isSelected && "border-forest-600 bg-forest-700",
              isBooked && !isSelected && "border-rose-200 bg-rose-50/50",
              isAvailable && "border-forest-100 bg-white",
              isPast && !isSelected && "border-stone-200 bg-stone-50/80 opacity-80"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onDayClick(dateKey)}
                className={cn(
                  "flex items-center gap-2 text-left min-w-0",
                  isClickable && "cursor-pointer"
                )}
              >
                <span
                  className={cn(
                    "text-lg font-bold tabular-nums",
                    isSelected ? "text-cream" : "text-forest-900"
                  )}
                >
                  {date.getDate()}
                </span>
                <span
                  className={cn(
                    "text-sm capitalize truncate",
                    isSelected ? "text-cream/90" : "text-muted-foreground"
                  )}
                >
                  {weekday}
                </span>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                {isBooked && (
                  <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    Kayıtlı
                  </span>
                )}
                {dayPendingCount > 0 && (
                  <span
                    className="inline-flex items-center justify-center rounded-full bg-amber-500 p-1 text-white"
                    title={`${dayPendingCount} bekleyen rezervasyon`}
                  >
                    <Bell className="h-3 w-3" />
                  </span>
                )}
                {isSelected && (
                  <button
                    type="button"
                    onClick={() => onRemoveDate(dateKey)}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold text-cream bg-white/15"
                  >
                    <X className="h-3 w-3" />
                    Kaldır
                  </button>
                )}
              </div>
            </div>

            {isBooked && currentTourSchedule && (
              <div onClick={(e) => e.stopPropagation()}>
                {renderBookedCard(currentTourSchedule, dateKey, canManage)}
              </div>
            )}

            {otherSchedules.length > 0 && (
              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                {otherSchedules.map((schedule) => (
                  <div key={schedule.id}>
                    {renderOtherCard(schedule, dateKey, canManage)}
                  </div>
                ))}
              </div>
            )}

            {isSelected && (
              <div className="space-y-3 pt-1" onClick={(e) => e.stopPropagation()}>
                {templateDate === dateKey && (
                  <p className="text-[10px] uppercase tracking-wide text-sage-300 font-semibold">
                    Şablon gün
                  </p>
                )}
                {hasCustomOverride(override) && (
                  <p className="text-[10px] uppercase tracking-wide text-sage-300 font-semibold">
                    Özel ayar
                  </p>
                )}
                <MobileCalendarCellField
                  id={`mobile-${dateKey}-capacity`}
                  label="Kontenjan"
                  hint={String(defaultCapacity)}
                  value={override?.capacity ?? ""}
                  onChange={(v) => onOverrideChange(dateKey, "capacity", v)}
                />
                <MobileCalendarCellField
                  id={`mobile-${dateKey}-price`}
                  label="Yetişkin ₺"
                  hint={defaultPricePlaceholder}
                  value={override?.price ?? ""}
                  onChange={(v) => onOverrideChange(dateKey, "price", v)}
                />
                <MobileCalendarCellField
                  id={`mobile-${dateKey}-childPrice`}
                  label="Çocuk ₺"
                  hint={defaultChildPricePlaceholder}
                  value={override?.childPrice ?? ""}
                  onChange={(v) => onOverrideChange(dateKey, "childPrice", v)}
                />
              </div>
            )}

            {isAvailable && (
              <button
                type="button"
                onClick={() => onDayClick(dateKey)}
                className="w-full rounded-lg border border-dashed border-emerald-300 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                + Bu güne tur tarihi ekle
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
