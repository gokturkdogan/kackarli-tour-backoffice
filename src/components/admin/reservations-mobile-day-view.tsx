"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import type { ReservationEntry } from "@/actions/reservation-hub";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toDateInputValue } from "@/lib/date-helpers";
import {
  confirmedGuestCount,
  formatPrice,
  organizationLeadSourceLabel,
  reservationSourceBadgeClass,
  reservationSourceLabel,
  unifiedStatusBadgeClass,
  unifiedStatusLabel,
} from "@/lib/utils-helpers";

interface ReservationsMobileDayViewProps {
  month: Date;
  reservationsByDate: Record<string, ReservationEntry[]>;
  onEdit: (entry: ReservationEntry) => void;
  onCreateManual: (dateKey: string) => void;
}

interface DayMeta {
  date: Date;
  dateKey: string;
  isToday: boolean;
  isPast: boolean;
  entries: ReservationEntry[];
  reservationCount: number;
  guestCount: number;
  weekdayShort: string;
}

interface TourGroup {
  tourId: string;
  tourTitle: string;
  entries: ReservationEntry[];
  reservationCount: number;
  guestCount: number;
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

function formatDayHeading(date: Date, isToday: boolean) {
  const label = date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });
  return isToday ? `Bugün · ${label}` : label;
}

function groupEntriesByTour(entries: ReservationEntry[]): TourGroup[] {
  const groups = new Map<string, TourGroup>();

  for (const entry of entries) {
    const existing = groups.get(entry.tour.id);
    const guests = confirmedGuestCount(entry);

    if (existing) {
      existing.entries.push(entry);
      existing.reservationCount += 1;
      existing.guestCount += guests;
    } else {
      groups.set(entry.tour.id, {
        tourId: entry.tour.id,
        tourTitle: entry.tour.title,
        entries: [entry],
        reservationCount: 1,
        guestCount: guests,
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) =>
    a.tourTitle.localeCompare(b.tourTitle, "tr")
  );
}

function DayStatusDot({ day }: { day: DayMeta }) {
  if (day.reservationCount > 0) {
    return <span className="block h-1.5 w-1.5 rounded-full bg-rose-500" />;
  }
  if (day.isPast) {
    return <span className="block h-1.5 w-1.5 rounded-full bg-transparent" />;
  }
  return <span className="block h-1.5 w-1.5 rounded-full bg-emerald-400" />;
}

function DayCircleButton({
  day,
  isActive,
  onSelect,
}: {
  day: DayMeta;
  isActive: boolean;
  onSelect: () => void;
}) {
  const hasReservations = day.reservationCount > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
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
          !isActive &&
            !day.isToday &&
            day.isPast &&
            "bg-stone-100 text-stone-400",
          !isActive &&
            !day.isToday &&
            !day.isPast &&
            hasReservations &&
            "bg-rose-50 text-rose-900 ring-1 ring-rose-200",
          !isActive &&
            !day.isToday &&
            !day.isPast &&
            !hasReservations &&
            "bg-white text-forest-900 ring-1 ring-forest-100"
        )}
      >
        {day.date.getDate()}
      </span>
      <DayStatusDot day={day} />
    </button>
  );
}

function ReservationRow({
  entry,
  onEdit,
}: {
  entry: ReservationEntry;
  onEdit: () => void;
}) {
  const guestCount = entry.adultCount + entry.childCount;

  return (
    <button
      type="button"
      onClick={onEdit}
      className="w-full rounded-lg border border-forest-50 bg-white p-3 text-left transition-colors active:bg-forest-50/60"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-forest-900 truncate">
            {entry.firstName} {entry.lastName}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {entry.phone}
            {entry.email ? ` · ${entry.email}` : ""}
          </p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0 text-forest-700"
          aria-label="Düzenle"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        <Badge variant="outline" className={reservationSourceBadgeClass(entry.source)}>
          {reservationSourceLabel(entry.source)}
        </Badge>
        {entry.source === "MANUAL" && entry.leadSource ? (
          <Badge variant="outline" className="text-[10px]">
            {organizationLeadSourceLabel(entry.leadSource)}
          </Badge>
        ) : null}
        <Badge
          variant="outline"
          className={cn("text-[10px]", unifiedStatusBadgeClass(entry.source, entry.status))}
        >
          {unifiedStatusLabel(entry.source, entry.status)}
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-2 mt-2 text-xs">
        <span className="text-muted-foreground tabular-nums">
          {guestCount} kişi
          {entry.boardingPoint ? ` · ${entry.boardingPoint}` : ""}
        </span>
        <span className="font-semibold text-forest-900 tabular-nums">
          {formatPrice(entry.totalPrice)}
        </span>
      </div>
    </button>
  );
}

function TourReservationCard({
  group,
  onEdit,
}: {
  group: TourGroup;
  onEdit: (entry: ReservationEntry) => void;
}) {
  return (
    <div className="rounded-lg border border-rose-200 bg-white overflow-hidden">
      <div className="bg-gradient-to-r from-rose-100 to-rose-50 border-b border-rose-100 px-3 py-2.5">
        <p className="text-sm font-semibold text-rose-950 line-clamp-2 leading-snug">
          {group.tourTitle}
        </p>
        {group.guestCount > 0 ? (
          <p className="text-xs text-rose-800/80 mt-1 tabular-nums">
            {group.guestCount} kişi
          </p>
        ) : null}
      </div>

      <div className="p-2">
        <div className="max-h-72 overflow-y-auto space-y-2 pr-0.5 scrollbar-thin">
          {group.entries.map((entry) => (
            <ReservationRow
              key={`${entry.source}-${entry.id}`}
              entry={entry}
              onEdit={() => onEdit(entry)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ReservationsMobileDayView({
  month,
  reservationsByDate,
  onEdit,
  onCreateManual,
}: ReservationsMobileDayViewProps) {
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
      const entries = reservationsByDate[dateKey] ?? [];
      const guestCount = entries.reduce(
        (sum, entry) => sum + confirmedGuestCount(entry),
        0
      );

      return {
        date,
        dateKey,
        isToday: date.getTime() === today.getTime(),
        isPast: date < today,
        entries,
        reservationCount: entries.length,
        guestCount,
        weekdayShort: date.toLocaleDateString("tr-TR", { weekday: "short" }),
      };
    });
  }, [days, today, reservationsByDate]);

  const activeDay = useMemo(
    () => dayMetas.find((d) => d.dateKey === activeDateKey) ?? dayMetas[0],
    [dayMetas, activeDateKey]
  );

  const tourGroups = useMemo(
    () => (activeDay ? groupEntriesByTour(activeDay.entries) : []),
    [activeDay]
  );

  useEffect(() => {
    setActiveDateKey(getDefaultActiveDateKey(month, today));
  }, [month, today]);

  if (!activeDay) return null;

  return (
    <div className="md:hidden space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {dayMetas.map((day) => (
          <DayCircleButton
            key={day.dateKey}
            day={day}
            isActive={day.dateKey === activeDateKey}
            onSelect={() => setActiveDateKey(day.dateKey)}
          />
        ))}
      </div>

      <div
        className={cn(
          "rounded-xl border bg-white overflow-hidden",
          activeDay.isToday && "ring-2 ring-forest-400 ring-offset-1",
          activeDay.reservationCount > 0 ? "border-rose-200" : "border-forest-100"
        )}
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-forest-50 bg-mist/40">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-forest-900 capitalize truncate">
              {formatDayHeading(activeDay.date, activeDay.isToday)}
            </p>
            {activeDay.guestCount > 0 ? (
              <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                {activeDay.guestCount} kişi
              </p>
            ) : null}
          </div>
        </div>

        <div className="p-3 space-y-3">
          {tourGroups.length > 0 ? (
            tourGroups.map((group) => (
              <TourReservationCard
                key={group.tourId}
                group={group}
                onEdit={onEdit}
              />
            ))
          ) : (
            <button
              type="button"
              onClick={() => onCreateManual(activeDay.dateKey)}
              className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 px-4 py-10 text-center active:bg-emerald-50 transition-colors"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
                <Plus className="h-6 w-6" />
              </span>
              <span className="text-sm font-semibold text-emerald-800">Manuel kayıt ekle</span>
              <span className="text-xs text-muted-foreground">
                Bu güne yeni rezervasyon eklemek için dokunun
              </span>
            </button>
          )}

          {tourGroups.length > 0 && (
            <Button
              type="button"
              variant="outline"
              className="w-full h-10 border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              onClick={() => onCreateManual(activeDay.dateKey)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Manuel kayıt ekle
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground px-1">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          Kayıtlı gün
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Boş gün
        </span>
      </div>
    </div>
  );
}
