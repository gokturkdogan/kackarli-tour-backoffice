"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, List, Plus } from "lucide-react";
import type { AdminOrganization } from "@/actions/organizations";
import { getSchedulesForOrganizationForm } from "@/actions/organizations";
import { OrganizationDayModal } from "@/components/admin/organization-day-modal";
import { OrganizationFormModal } from "@/components/admin/organization-form-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDateLabel, toDateInputValue } from "@/lib/date-helpers";
import {
  organizationLeadSourceLabel,
  organizationStatusLabel,
  formatPrice,
} from "@/lib/utils-helpers";

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

interface TourOption {
  id: string;
  title: string;
  type: "DAY_TRIP" | "ACCOMMODATION";
  price: number;
  childPrice: number | null;
}

interface OrganizationPageClientProps {
  tours: TourOption[];
  organizationsByDate: Record<string, AdminOrganization[]>;
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

export function OrganizationPageClient({
  tours,
  organizationsByDate,
}: OrganizationPageClientProps) {
  const [month, setMonth] = useState(() => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [tourFilter, setTourFilter] = useState<string>("all");
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingOrganization, setEditingOrganization] =
    useState<AdminOrganization | null>(null);
  const [formDateKey, setFormDateKey] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<
    Awaited<ReturnType<typeof getSchedulesForOrganizationForm>>
  >([]);

  const filteredOrganizationsByDate = useMemo(() => {
    if (tourFilter === "all") return organizationsByDate;

    const filtered: Record<string, AdminOrganization[]> = {};
    for (const [dateKey, items] of Object.entries(organizationsByDate)) {
      const next = items.filter((item) => item.tour.id === tourFilter);
      if (next.length > 0) filtered[dateKey] = next;
    }
    return filtered;
  }, [organizationsByDate, tourFilter]);

  const selectedDayOrganizations = selectedDateKey
    ? filteredOrganizationsByDate[selectedDateKey] ?? []
    : [];

  const listEntries = useMemo(() => {
    return Object.entries(filteredOrganizationsByDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateKey, items]) => ({
        dateKey,
        items,
        guestCount: items.reduce(
          (sum, item) => sum + item.adultCount + item.childCount,
          0
        ),
      }));
  }, [filteredOrganizationsByDate]);

  const monthLabel = month.toLocaleDateString("tr-TR", {
    month: "long",
    year: "numeric",
  });

  const loadSchedules = useCallback(async (tourId: string) => {
    const next = await getSchedulesForOrganizationForm(tourId);
    setSchedules(next);
    return next;
  }, []);

  function openDayModal(dateKey: string) {
    setSelectedDateKey(dateKey);
    setDayModalOpen(true);
  }

  function openCreateForm(dateKey?: string | null) {
    setEditingOrganization(null);
    setFormDateKey(dateKey ?? selectedDateKey);
    setFormModalOpen(true);
    const tourId = tourFilter !== "all" ? tourFilter : tours[0]?.id;
    if (tourId) void loadSchedules(tourId);
  }

  function openEditForm(organization: AdminOrganization) {
    setEditingOrganization(organization);
    setFormDateKey(organization.tourDate.slice(0, 10));
    setDayModalOpen(false);
    setFormModalOpen(true);
    void loadSchedules(organization.tour.id);
  }

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
                  setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
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
                  setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
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

              <div className="flex rounded-lg border border-forest-100 p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "calendar" ? "default" : "ghost"}
                  className={cn(viewMode === "calendar" && "bg-forest-600 hover:bg-forest-700")}
                  onClick={() => setViewMode("calendar")}
                >
                  <LayoutGrid className="size-4" />
                  Takvim
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "list" ? "default" : "ghost"}
                  className={cn(viewMode === "list" && "bg-forest-600 hover:bg-forest-700")}
                  onClick={() => setViewMode("list")}
                >
                  <List className="size-4" />
                  Liste
                </Button>
              </div>

              <Button
                type="button"
                className="bg-forest-600 hover:bg-forest-700"
                onClick={() => openCreateForm()}
              >
                <Plus className="size-4" />
                Yeni Organizasyon
              </Button>
            </div>
          </div>

          {viewMode === "calendar" ? (
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
                  const dayOrganizations = filteredOrganizationsByDate[dateKey] ?? [];
                  const guestCount = dayOrganizations.reduce(
                    (sum, item) => sum + item.adultCount + item.childCount,
                    0
                  );

                  return (
                    <button
                      key={dateKey + String(inMonth)}
                      type="button"
                      onClick={() => openDayModal(dateKey)}
                      className={cn(
                        "min-h-[120px] rounded-xl border p-3 text-left transition-colors hover:border-forest-300 hover:bg-forest-50/60",
                        inMonth
                          ? "border-forest-100 bg-white"
                          : "border-transparent bg-stone-50/70 text-muted-foreground",
                        dayOrganizations.length > 0 && "border-forest-300 bg-forest-50/40"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold">{date.getDate()}</span>
                        {dayOrganizations.length > 0 ? (
                          <span className="rounded-full bg-forest-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                            {dayOrganizations.length}
                          </span>
                        ) : null}
                      </div>

                      {dayOrganizations.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium text-forest-800">
                            {guestCount} kişi
                          </p>
                          <div className="space-y-1">
                            {dayOrganizations.slice(0, 3).map((organization) => (
                              <p
                                key={organization.id}
                                className="text-[11px] leading-tight text-forest-700 truncate"
                              >
                                {organization.firstName} {organization.lastName} ·{" "}
                                {organization.tour.title}
                              </p>
                            ))}
                            {dayOrganizations.length > 3 ? (
                              <p className="text-[11px] text-muted-foreground">
                                +{dayOrganizations.length - 3} daha
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 text-[11px] text-muted-foreground">
                          Organizasyon ekle
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {viewMode === "calendar" ? (
            <div className="md:hidden space-y-3">
              {getMonthGrid(month)
                .filter(({ inMonth }) => inMonth)
                .map(({ date }) => {
                  const dateKey = toDateInputValue(date);
                  const dayOrganizations = filteredOrganizationsByDate[dateKey] ?? [];
                  if (dayOrganizations.length === 0) return null;

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => openDayModal(dateKey)}
                      className="w-full rounded-xl border border-forest-100 bg-white p-4 text-left"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-forest-900">
                            {formatDateLabel(dateKey)}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {dayOrganizations.length} organizasyon
                          </p>
                        </div>
                        <span className="rounded-full bg-forest-600 px-3 py-1 text-xs font-semibold text-white">
                          {dayOrganizations.reduce(
                            (sum, item) => sum + item.adultCount + item.childCount,
                            0
                          )}{" "}
                          kişi
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          ) : null}

          {viewMode === "list" ? (
            <div className="space-y-3">
              {listEntries.length === 0 ? (
                <div className="rounded-lg border border-dashed border-forest-200 p-8 text-center text-muted-foreground">
                  Henüz organizasyon kaydı yok.
                </div>
              ) : (
                listEntries.map((entry) => (
                  <button
                    key={entry.dateKey}
                    type="button"
                    onClick={() => openDayModal(entry.dateKey)}
                    className="w-full rounded-xl border border-forest-100 bg-white p-4 text-left hover:bg-forest-50/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-forest-900">
                          {formatDateLabel(entry.dateKey)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {entry.items.length} organizasyon · {entry.guestCount} kişi
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {entry.items.map((organization) => (
                        <div
                          key={organization.id}
                          className="rounded-lg border border-forest-50 bg-forest-50/30 px-3 py-2 text-sm"
                        >
                          <p className="font-medium text-forest-900">
                            {organization.firstName} {organization.lastName} ·{" "}
                            {organization.tour.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {organizationLeadSourceLabel(organization.leadSource)} ·{" "}
                            {organizationStatusLabel(organization.status)} ·{" "}
                            {formatPrice(organization.totalPrice)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <OrganizationDayModal
        open={dayModalOpen}
        onOpenChange={setDayModalOpen}
        dateKey={selectedDateKey}
        organizations={selectedDayOrganizations}
        onCreate={() => openCreateForm(selectedDateKey)}
        onEdit={openEditForm}
      />

      <OrganizationFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        tours={tours}
        initialDateKey={formDateKey}
        initialTourId={tourFilter !== "all" ? tourFilter : null}
        organization={editingOrganization}
        schedules={schedules}
        onSchedulesNeeded={loadSchedules}
      />
    </div>
  );
}
