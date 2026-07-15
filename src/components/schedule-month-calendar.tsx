"use client";

import { ChevronLeft, ChevronRight, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toDateInputValue } from "@/lib/date-helpers";
import { resolveAdultPrice, resolveChildPrice } from "@/lib/pricing";
import type { CalendarExistingSchedule } from "@/actions/schedules";

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export interface DateOverrideFields {
  capacity?: string;
  price?: string;
  childPrice?: string;
}

interface ScheduleMonthCalendarProps {
  month: Date;
  onMonthChange: (month: Date) => void;
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
}

function CalendarCellField({
  id,
  label,
  hint,
  value,
  onChange,
  min,
  step,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  step?: string;
}) {
  return (
    <div className="space-y-0.5">
      <label htmlFor={id} className="text-[9px] font-semibold uppercase tracking-wide text-cream/85 leading-none">
        {label}
      </label>
      <Input
        id={id}
        type="number"
        min={min}
        step={step}
        placeholder={hint}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 text-[10px] px-2 bg-white/95 border-white/40 text-forest-900 placeholder:text-forest-500/60"
      />
    </div>
  );
}

function getMonthGrid(month: Date): { date: Date; inMonth: boolean }[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells: { date: Date; inMonth: boolean }[] = [];

  for (let i = startOffset; i > 0; i--) {
    cells.push({ date: new Date(year, monthIndex, 1 - i), inMonth: false });
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    cells.push({ date: new Date(year, monthIndex, day), inMonth: true });
  }

  while (cells.length % 7 !== 0) {
    const next = cells.length - startOffset - lastDay.getDate() + 1;
    cells.push({ date: new Date(year, monthIndex + 1, next), inMonth: false });
  }

  return cells;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function hasCustomOverride(override?: DateOverrideFields): boolean {
  if (!override) return false;
  return !!(override.capacity?.trim() || override.price?.trim() || override.childPrice?.trim());
}

function truncateLabel(text: string, max = 11): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function AddDayIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 6.5v7M6.5 10h7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function formatCompactPrice(price: number): string {
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(price)}₺`;
}

function ActiveStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
        isActive ? "bg-forest-600 text-white" : "bg-slate-500 text-white"
      )}
    >
      {isActive ? "Aktif" : "Pasif"}
    </span>
  );
}

function ScheduleManageButtons({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="inline-flex items-center gap-0.5 rounded px-2 py-1 text-[10px] font-semibold text-forest-700 bg-white border border-forest-200 hover:bg-forest-50 transition-colors cursor-pointer shadow-sm"
      >
        <Pencil className="h-3 w-3" />
        Düzenle
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="inline-flex items-center gap-0.5 rounded px-2 py-1 text-[10px] font-semibold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer shadow-sm"
      >
        <Trash2 className="h-3 w-3" />
        Sil
      </button>
    </div>
  );
}

function BookedScheduleCard({
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
    <div
      className={cn(
        "rounded-lg border bg-white shadow-sm overflow-hidden",
        schedule.isActive ? "border-rose-200" : "border-slate-300 opacity-95"
      )}
      title={schedule.tourTitle}
    >
      <div
        className={cn(
          "flex items-start justify-between gap-1.5 px-2.5 py-1.5 border-b",
          schedule.isActive
            ? "bg-gradient-to-r from-rose-100 to-rose-50 border-rose-100"
            : "bg-gradient-to-r from-slate-100 to-slate-50 border-slate-200"
        )}
      >
        <p className="text-xs font-semibold leading-snug text-rose-950 line-clamp-2 flex-1 min-w-0">
          {schedule.tourTitle}
        </p>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex flex-wrap justify-end gap-0.5">
            <ActiveStatusBadge isActive={schedule.isActive} />
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white",
                isFull ? "bg-rose-600" : "bg-amber-600"
              )}
            >
              {isFull ? "Dolu" : "Açık"}
            </span>
          </div>
          {canManage && <ScheduleManageButtons onEdit={onEdit} onDelete={onDelete} />}
        </div>
      </div>

      <div className="px-2.5 py-2 space-y-2">
        <div>
          <div className="flex items-center justify-between text-[11px] text-rose-900/75 mb-1">
            <span className="font-medium">Kontenjan</span>
            <span className="font-bold tabular-nums text-rose-950">
              {schedule.reservedCount}/{schedule.capacity}
            </span>
          </div>
          <div className="h-2 rounded-full bg-rose-100 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isFull ? "bg-rose-500" : "bg-amber-500"
              )}
              style={{ width: `${fillPct}%` }}
            />
          </div>
          {!isFull && (
            <p className="text-[10px] text-rose-800/70 mt-0.5 tabular-nums">
              {spotsLeft} yer kaldı
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-rose-100">
          <div className="rounded-md bg-rose-50/80 px-1.5 py-1">
            <p className="text-[10px] font-medium text-rose-800/70 leading-none">Yetişkin</p>
            <p className="text-xs font-bold text-forest-900 tabular-nums leading-tight mt-1">
              {formatCompactPrice(adultPrice)}
            </p>
          </div>
          <div className="rounded-md bg-rose-50/80 px-1.5 py-1">
            <p className="text-[10px] font-medium text-rose-800/70 leading-none">Çocuk</p>
            <p className="text-xs font-bold text-forest-900 tabular-nums leading-tight mt-1">
              {formatCompactPrice(childPrice)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function OtherTourScheduleCard({
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

  return (
    <div
      className={cn(
        "rounded-lg border bg-white/95 px-2 py-1.5 space-y-1.5",
        schedule.isActive ? "border-sage-200" : "border-slate-300 opacity-95"
      )}
      title={schedule.tourTitle}
    >
      <div className="flex items-start justify-between gap-1.5">
        <span className="inline-block truncate rounded-md bg-sage-200/90 px-2 py-0.5 text-[11px] font-semibold text-forest-900 max-w-[65%]">
          {truncateLabel(schedule.tourTitle, 18)}
        </span>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex flex-wrap justify-end gap-0.5">
            <ActiveStatusBadge isActive={schedule.isActive} />
            <span className="text-[9px] font-medium text-sage-700 bg-sage-100 px-1.5 py-0.5 rounded">
              Başka tur
            </span>
          </div>
          {canManage && <ScheduleManageButtons onEdit={onEdit} onDelete={onDelete} />}
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] tabular-nums">
        <span className="text-forest-600">
          Kap <span className="font-semibold text-forest-800">{schedule.reservedCount}/{schedule.capacity}</span>
        </span>
        <span className="font-semibold text-forest-900">{formatCompactPrice(adultPrice)}</span>
      </div>
      <p className="text-[10px] text-forest-600 tabular-nums">
        Çocuk {formatCompactPrice(childPrice)}
      </p>
    </div>
  );
}

export function ScheduleMonthCalendar({
  month,
  onMonthChange,
  selectedDates,
  selectedTourId,
  existingSchedulesByDate,
  dateOverrides,
  defaultCapacity,
  defaultPricePlaceholder,
  defaultChildPricePlaceholder,
  templateDate,
  spreadMode = false,
  onDayClick,
  onRemoveDate,
  onEditSchedule,
  onDeleteSchedule,
  onOverrideChange,
}: ScheduleMonthCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthLabel = month.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
  const cells = getMonthGrid(month);

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          aria-label="Önceki ay"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="text-lg font-semibold text-forest-900 capitalize">{monthLabel}</h3>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          aria-label="Sonraki ay"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 bg-forest-100/80 rounded-xl overflow-hidden border border-forest-100 p-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="bg-mist/80 py-3 text-center text-sm font-semibold text-muted-foreground uppercase tracking-wide rounded-md"
          >
            {day}
          </div>
        ))}

        {cells.map(({ date, inMonth }) => {
          const dateKey = toDateInputValue(date);
          const isPast = date < today;
          const existingOnDay = existingSchedulesByDate[dateKey] ?? [];
          const isBooked = existingOnDay.some((s) => s.tourId === selectedTourId);
          const isSelected = selectedDates.has(dateKey);
          const isTemplate = templateDate === dateKey;
          const isToday = isSameDay(date, today);
          const isAvailable = inMonth && !isPast && !isBooked && !isSelected;
          const override = dateOverrides[dateKey];
          const isCustom = hasCustomOverride(override);
          const currentTourSchedule = existingOnDay.find((s) => s.tourId === selectedTourId);
          const hasExisting = inMonth && existingOnDay.length > 0;
          const cellHasDetail = isSelected || hasExisting || isAvailable;
          const bookedCellTall = isBooked && !isSelected;
          const selectedCellTall = isSelected && inMonth;

          const isClickable = isAvailable || isSelected;
          const canManageExisting = inMonth && !isPast;

          return (
            <div
              key={dateKey + (inMonth ? "" : "-pad")}
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onClick={() => {
                if (isClickable) onDayClick(dateKey);
              }}
              onKeyDown={(e) => {
                if (isClickable && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onDayClick(dateKey);
                }
              }}
              className={cn(
                "group relative flex flex-col transition-all",
                isClickable && "cursor-pointer",
                selectedCellTall
                  ? "min-h-[208px] sm:min-h-[228px] rounded-lg"
                  : bookedCellTall
                    ? "min-h-[180px] sm:min-h-[200px] rounded-lg"
                    : cellHasDetail
                      ? "min-h-[140px] sm:min-h-[156px] rounded-lg"
                      : "min-h-[76px] sm:min-h-[88px] rounded-lg",
                !inMonth && "bg-mist/30",
                inMonth && isPast && !isSelected && "bg-stone-100/95",
                bookedCellTall &&
                  (currentTourSchedule?.isActive === false
                    ? "bg-slate-50 ring-1 ring-inset ring-slate-300/90"
                    : "bg-rose-50 ring-1 ring-inset ring-rose-200/90"),
                isAvailable && !hasExisting && "bg-white hover:bg-emerald-50/70",
                isAvailable && hasExisting && "bg-sage-50/60 hover:bg-emerald-50/70",
                isSelected && "bg-forest-700 hover:bg-forest-600/95",
                isTemplate && isSelected && "ring-2 ring-sage-400 ring-inset",
                isToday && !isSelected && isAvailable && "ring-1 ring-inset ring-emerald-400",
                isToday && !isSelected && inMonth && isPast && "ring-1 ring-inset ring-stone-300",
                isToday && !isSelected && bookedCellTall && "ring-2 ring-inset ring-rose-300",
                isClickable &&
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-forest-500"
              )}
            >
              <div
                className={cn(
                  "flex items-start justify-between w-full p-1.5 sm:p-2 shrink-0 pointer-events-none",
                  bookedCellTall && "pb-1"
                )}
              >
                <span
                  className={cn(
                    "text-base font-semibold tabular-nums",
                    isSelected && "text-cream",
                    isAvailable && "text-forest-900",
                    inMonth && isPast && !isSelected && "text-stone-400 font-medium",
                    bookedCellTall && "text-rose-900",
                    !inMonth && "text-muted-foreground/40 font-normal"
                  )}
                >
                  {date.getDate()}
                </span>
                {isCustom && isSelected && (
                  <span className="text-[8px] font-bold uppercase tracking-wider bg-sage-400 text-forest-900 px-1 rounded">
                    Özel
                  </span>
                )}
                {isTemplate && isSelected && !isCustom && (
                  <span className="text-[8px] font-bold uppercase tracking-wider bg-sage-400/80 text-forest-900 px-1 rounded">
                    Şablon
                  </span>
                )}
                {bookedCellTall && (
                  <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white shadow-sm">
                    Kayıtlı
                  </span>
                )}
                {isAvailable && (
                  <span
                    className={cn(
                      "inline-flex shrink-0 text-emerald-600 transition-colors",
                      "group-hover:text-emerald-700 group-hover:scale-105"
                    )}
                  >
                    <AddDayIcon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                  </span>
                )}
              </div>

              {isAvailable && !hasExisting && (
                <div className="flex-1 flex items-center justify-center pb-1.5 pointer-events-none text-emerald-500/35 group-hover:text-emerald-600/55 transition-colors">
                  <AddDayIcon className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
              )}

              {bookedCellTall && currentTourSchedule && (
                <div
                  className="flex-1 px-2 pb-2 relative z-10"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <BookedScheduleCard
                    schedule={currentTourSchedule}
                    canManage={canManageExisting}
                    onEdit={() => onEditSchedule(currentTourSchedule, dateKey)}
                    onDelete={() => onDeleteSchedule(currentTourSchedule, dateKey)}
                  />
                </div>
              )}

              {hasExisting && !isSelected && !isBooked && (
                <div
                  className="flex-1 px-1.5 pb-1.5 space-y-1.5 overflow-hidden relative z-10"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {existingOnDay.map((schedule) => (
                    <OtherTourScheduleCard
                      key={schedule.id}
                      schedule={schedule}
                      canManage={canManageExisting}
                      onEdit={() => onEditSchedule(schedule, dateKey)}
                      onDelete={() => onDeleteSchedule(schedule, dateKey)}
                    />
                  ))}
                </div>
              )}

              {isSelected && inMonth && (
                <div
                  className="relative z-10 flex-1 flex flex-col px-1.5 pb-1.5"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-end mb-1">
                    <button
                      type="button"
                      onClick={() => onRemoveDate(dateKey)}
                      className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-cream/90 bg-white/15 hover:bg-white/25 transition-colors cursor-pointer"
                      aria-label="Günü kaldır"
                    >
                      <X className="h-3 w-3" />
                      Kaldır
                    </button>
                  </div>
                  <div className="space-y-1">
                    <CalendarCellField
                      id={`${dateKey}-capacity`}
                      label="Kontenjan"
                      hint={String(defaultCapacity)}
                      value={override?.capacity ?? ""}
                      onChange={(v) => onOverrideChange(dateKey, "capacity", v)}
                      min={1}
                    />
                    <CalendarCellField
                      id={`${dateKey}-price`}
                      label="Yetişkin ₺"
                      hint={defaultPricePlaceholder}
                      value={override?.price ?? ""}
                      onChange={(v) => onOverrideChange(dateKey, "price", v)}
                      min={0}
                      step="0.01"
                    />
                    <CalendarCellField
                      id={`${dateKey}-childPrice`}
                      label="Çocuk ₺"
                      hint={defaultChildPricePlaceholder}
                      value={override?.childPrice ?? ""}
                      onChange={(v) => onOverrideChange(dateKey, "childPrice", v)}
                      min={0}
                      step="0.01"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 mt-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-forest-700" />
          Seçili
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-white border border-emerald-300" />
          <AddDayIcon className="h-3 w-3 text-emerald-600" />
          Eklenebilir
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-rose-50 border border-rose-300" />
          Kayıtlı tur
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-stone-100 border border-stone-200" />
          Geçmiş
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-sage-50 border border-sage-200" />
          Başka tur kayıtlı
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-forest-600" />
          Aktif
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-500" />
          Pasif
        </span>
        {spreadMode && <span className="text-sage-700 font-medium">Yayma modu aktif</span>}
      </div>
    </div>
  );
}
