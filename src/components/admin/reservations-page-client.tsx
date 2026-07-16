"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type {
  CalendarTourSummary,
  ReservationEntry,
} from "@/actions/reservation-hub";
import { ReservationEntryFormModal } from "@/components/admin/reservation-entry-form-modal";
import { ReservationsDayModal } from "@/components/admin/reservations-day-modal";
import { ReservationsMobileDayView } from "@/components/admin/reservations-mobile-day-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDateLabel, toDateInputValue } from "@/lib/date-helpers";
import {
  formatPrice,
  reservationSourceBadgeClass,
  reservationSourceLabel,
  unifiedStatusBadgeClass,
  unifiedStatusLabel,
} from "@/lib/utils-helpers";

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

interface TourOption {
  id: string;
  title: string;
}

interface ReservationsPageClientProps {
  tours: TourOption[];
  reservationsByDate: Record<string, ReservationEntry[]>;
  tourSummariesByDate: Record<string, CalendarTourSummary[]>;
  pendingEntries: ReservationEntry[];
  allEntries: ReservationEntry[];
}

function getMonthGrid(month: Date) {
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

function formatCreatedAt(value: string) {
  return new Date(value).toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReservationsPageClient({
  tours,
  reservationsByDate,
  tourSummariesByDate,
  pendingEntries,
  allEntries,
}: ReservationsPageClientProps) {
  const searchParams = useSearchParams();

  const [month, setMonth] = useState(() => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [tourFilter, setTourFilter] = useState("all");
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create-manual" | "edit">("create-manual");
  const [editingEntry, setEditingEntry] = useState<ReservationEntry | null>(null);
  const [formDateKey, setFormDateKey] = useState<string | null>(null);

  const filteredByDate = useMemo(() => {
    if (tourFilter === "all") return reservationsByDate;
    const filtered: Record<string, ReservationEntry[]> = {};
    for (const [dateKey, entries] of Object.entries(reservationsByDate)) {
      const next = entries.filter((entry) => entry.tour.id === tourFilter);
      if (next.length > 0) filtered[dateKey] = next;
    }
    return filtered;
  }, [reservationsByDate, tourFilter]);

  const filteredSummariesByDate = useMemo(() => {
    if (tourFilter === "all") return tourSummariesByDate;
    const filtered: Record<string, CalendarTourSummary[]> = {};
    for (const [dateKey, summaries] of Object.entries(tourSummariesByDate)) {
      const next = summaries.filter((item) => item.tourId === tourFilter);
      if (next.length > 0) filtered[dateKey] = next;
    }
    return filtered;
  }, [tourSummariesByDate, tourFilter]);

  const selectedDayEntries = selectedDateKey
    ? filteredByDate[selectedDateKey] ?? []
    : [];

  useEffect(() => {
    const reservationId = searchParams.get("reservation");
    if (!reservationId) return;
    const entry = allEntries.find((item) => item.id === reservationId);
    if (entry) {
      setEditingEntry(entry);
      setFormMode("edit");
      setFormModalOpen(true);
    }
  }, [searchParams, allEntries]);

  function openDayModal(dateKey: string) {
    setSelectedDateKey(dateKey);
    setDayModalOpen(true);
  }

  function openCreateManual(dateKey?: string | null) {
    setEditingEntry(null);
    setFormMode("create-manual");
    setFormDateKey(dateKey ?? selectedDateKey);
    setDayModalOpen(false);
    setFormModalOpen(true);
  }

  function openEdit(entry: ReservationEntry) {
    setEditingEntry(entry);
    setFormMode("edit");
    setDayModalOpen(false);
    setFormModalOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormModalOpen(open);
    if (!open) {
      setEditingEntry(null);
    }
  }

  const monthLabel = month.toLocaleDateString("tr-TR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <Card className="border-forest-100">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  setMonth(
                    (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
                  )
                }
              >
                <ChevronLeft className="size-4" />
              </Button>
              <div className="min-w-[160px] text-center font-semibold capitalize text-forest-900">
                {monthLabel}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  setMonth(
                    (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
                  )
                }
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={tourFilter}
                onValueChange={(value) => value && setTourFilter(value)}
              >
                <SelectTrigger className="w-[220px]">
                  {tourFilter === "all"
                    ? "Tüm turlar"
                    : tours.find((tour) => tour.id === tourFilter)?.title}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm turlar</SelectItem>
                  {tours.map((tour) => (
                    <SelectItem key={tour.id} value={tour.id}>
                      {tour.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                className="bg-forest-600 hover:bg-forest-700"
                onClick={() => openCreateManual()}
              >
                <Plus className="size-4" />
                Manuel Kayıt
              </Button>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {getMonthGrid(month).map(({ date, inMonth }) => {
                const dateKey = toDateInputValue(date);
                const summaries = filteredSummariesByDate[dateKey] ?? [];
                const totalCount = summaries.reduce(
                  (sum, item) => sum + item.reservationCount,
                  0
                );

                return (
                  <button
                    key={`${dateKey}-${inMonth}`}
                    type="button"
                    onClick={() => openDayModal(dateKey)}
                    className={cn(
                      "min-h-[130px] rounded-xl border p-2.5 text-left transition-colors hover:border-forest-300 hover:bg-forest-50/60",
                      inMonth
                        ? "border-forest-100 bg-white"
                        : "border-transparent bg-stone-50/70 text-muted-foreground",
                      totalCount > 0 && "border-forest-300 bg-forest-50/30"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-sm font-semibold">{date.getDate()}</span>
                      {totalCount > 0 ? (
                        <span className="rounded-full bg-forest-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          {totalCount}
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-1.5">
                      {summaries.slice(0, 3).map((summary) => (
                        <div
                          key={summary.tourId}
                          className="rounded-md border border-rose-100 bg-white px-2 py-1.5 shadow-sm"
                        >
                          <p className="text-[11px] font-semibold text-rose-950 line-clamp-2 leading-tight">
                            {summary.tourTitle}
                          </p>
                          <p className="text-[10px] text-rose-800/80 mt-0.5 tabular-nums">
                            {summary.reservationCount} kayıt · {summary.guestCount} kişi
                          </p>
                        </div>
                      ))}
                      {summaries.length > 3 ? (
                        <p className="text-[10px] text-muted-foreground px-1">
                          +{summaries.length - 3} tur daha
                        </p>
                      ) : null}
                      {summaries.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground">Kayıt ekle</p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <ReservationsMobileDayView
            month={month}
            reservationsByDate={filteredByDate}
            onEdit={openEdit}
            onCreateManual={(dateKey) => openCreateManual(dateKey)}
          />
        </CardContent>
      </Card>

      <Card className="border-forest-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Bekleyen Talepler</CardTitle>
          <p className="text-sm text-muted-foreground">
            Siteden gelen bekleyen ve iletişimdeki talepler. Onaylananlar listeden kalkar.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingEntries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-forest-200 p-8 text-center text-muted-foreground">
              Bekleyen site talebi yok.
            </div>
          ) : (
            pendingEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => openEdit(entry)}
                className="w-full rounded-xl border border-forest-100 bg-white p-4 text-left hover:bg-forest-50/50 transition-colors"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-forest-900">
                      {entry.firstName} {entry.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {entry.tour.title} · {formatDateLabel(entry.tourDateKey)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {entry.phone} · {entry.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={reservationSourceBadgeClass(entry.source)}
                    >
                      {reservationSourceLabel(entry.source)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={unifiedStatusBadgeClass(entry.source, entry.status)}
                    >
                      {unifiedStatusLabel(entry.source, entry.status)}
                    </Badge>
                    <span className="text-sm font-medium tabular-nums">
                      {formatPrice(entry.totalPrice)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatCreatedAt(entry.createdAt)}
                </p>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <ReservationsDayModal
        open={dayModalOpen}
        onOpenChange={setDayModalOpen}
        dateKey={selectedDateKey}
        entries={selectedDayEntries}
        onCreateManual={() => openCreateManual(selectedDateKey)}
        onEdit={openEdit}
      />

      <ReservationEntryFormModal
        open={formModalOpen}
        onOpenChange={handleFormClose}
        tours={tours}
        entry={editingEntry}
        mode={formMode}
        initialDateKey={formDateKey}
        initialTourId={tourFilter !== "all" ? tourFilter : null}
        initialFocus={false}
        finalFocus={false}
      />
    </div>
  );
}
