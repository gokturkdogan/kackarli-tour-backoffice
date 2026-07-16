"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { toDateInputValue } from "@/lib/date-helpers";
import { confirmedGuestCount } from "@/lib/utils-helpers";
import type { AdminReservation } from "@/actions/reservations";
import type { AdminOrganization } from "@/actions/organizations";
import { getToursForScheduleSelect } from "@/actions/schedules";

export type ReservationEntrySource = "WEB" | "MANUAL";

export interface ReservationEntry {
  id: string;
  source: ReservationEntrySource;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  adultCount: number;
  childCount: number;
  boardingPoint: string | null;
  note: string | null;
  totalPrice: number;
  status: string;
  statusLabel: string;
  tourDateKey: string;
  createdAt: string;
  tour: {
    id: string;
    title: string;
    slug?: string;
  };
  schedule: {
    id: string;
    startDate: string;
    endDate: string | null;
  } | null;
  leadSource?: AdminOrganization["leadSource"];
}

export interface CalendarTourSummary {
  tourId: string;
  tourTitle: string;
  reservationCount: number;
  guestCount: number;
}

function mapWebReservation(reservation: AdminReservation): ReservationEntry {
  return {
    id: reservation.id,
    source: "WEB",
    firstName: reservation.firstName,
    lastName: reservation.lastName,
    phone: reservation.phone,
    email: reservation.email,
    adultCount: reservation.adultCount,
    childCount: reservation.childCount,
    boardingPoint: reservation.boardingPoint,
    note: reservation.note,
    totalPrice: reservation.totalPrice,
    status: reservation.status,
    statusLabel: reservation.status,
    tourDateKey: reservation.schedule
      ? reservation.schedule.startDate.slice(0, 10)
      : reservation.createdAt.slice(0, 10),
    createdAt: reservation.createdAt,
    tour: reservation.tour,
    schedule: reservation.schedule,
  };
}

function mapManualOrganization(organization: AdminOrganization): ReservationEntry {
  return {
    id: organization.id,
    source: "MANUAL",
    firstName: organization.firstName,
    lastName: organization.lastName,
    phone: organization.phone,
    email: organization.email,
    adultCount: organization.adultCount,
    childCount: organization.childCount,
    boardingPoint: organization.boardingPoint,
    note: organization.note,
    totalPrice: organization.totalPrice,
    status: organization.status,
    statusLabel: organization.status,
    tourDateKey: organization.tourDate.slice(0, 10),
    createdAt: organization.createdAt,
    tour: organization.tour,
    schedule: organization.schedule,
    leadSource: organization.leadSource,
  };
}

function isActiveCalendarEntry(entry: ReservationEntry) {
  return entry.status !== "CANCELLED";
}

function isPendingWebEntry(entry: ReservationEntry) {
  return (
    entry.source === "WEB" &&
    (entry.status === "PENDING" || entry.status === "CONTACTED")
  );
}

export async function getReservationHubData() {
  await requireAdmin();

  const [tours, webReservations, manualOrganizations] = await Promise.all([
    getToursForScheduleSelect(),
    prisma.reservation.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        tour: { select: { id: true, title: true, slug: true } },
        schedule: { select: { id: true, startDate: true, endDate: true } },
      },
    }),
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        tour: { select: { id: true, title: true, slug: true } },
        schedule: { select: { id: true, startDate: true, endDate: true } },
      },
    }),
  ]);

  const entries: ReservationEntry[] = [
    ...webReservations.map((reservation) =>
      mapWebReservation({
        ...reservation,
        totalPrice: Number(reservation.totalPrice),
        createdAt: reservation.createdAt.toISOString(),
        schedule: reservation.schedule
          ? {
              id: reservation.schedule.id,
              startDate: reservation.schedule.startDate.toISOString(),
              endDate: reservation.schedule.endDate?.toISOString() ?? null,
            }
          : null,
      })
    ),
    ...manualOrganizations.map((organization) =>
      mapManualOrganization({
        ...organization,
        totalPrice: Number(organization.totalPrice),
        tourDate: organization.tourDate.toISOString(),
        createdAt: organization.createdAt.toISOString(),
        schedule: organization.schedule
          ? {
              id: organization.schedule.id,
              startDate: organization.schedule.startDate.toISOString(),
              endDate: organization.schedule.endDate?.toISOString() ?? null,
            }
          : null,
      })
    ),
  ];

  const reservationsByDate: Record<string, ReservationEntry[]> = {};
  const tourSummariesByDate: Record<string, CalendarTourSummary[]> = {};

  for (const entry of entries.filter(isActiveCalendarEntry)) {
    const dateKey = entry.tourDateKey;
    reservationsByDate[dateKey] = reservationsByDate[dateKey] ?? [];
    reservationsByDate[dateKey].push(entry);

    const summaries = tourSummariesByDate[dateKey] ?? [];
    const existing = summaries.find((item) => item.tourId === entry.tour.id);
    const guests = confirmedGuestCount(entry);

    if (existing) {
      existing.reservationCount += 1;
      existing.guestCount += guests;
    } else {
      summaries.push({
        tourId: entry.tour.id,
        tourTitle: entry.tour.title,
        reservationCount: 1,
        guestCount: guests,
      });
    }

    tourSummariesByDate[dateKey] = summaries;
  }

  const pendingEntries = entries
    .filter(isPendingWebEntry)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    tours,
    reservationsByDate,
    tourSummariesByDate,
    pendingEntries,
    allEntries: entries,
  };
}

export async function getReservationEntryById(
  source: ReservationEntrySource,
  id: string
): Promise<ReservationEntry | null> {
  await requireAdmin();

  if (source === "WEB") {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        tour: { select: { id: true, title: true, slug: true } },
        schedule: { select: { id: true, startDate: true, endDate: true } },
      },
    });
    if (!reservation) return null;
    return mapWebReservation({
      ...reservation,
      totalPrice: Number(reservation.totalPrice),
      createdAt: reservation.createdAt.toISOString(),
      schedule: reservation.schedule
        ? {
            id: reservation.schedule.id,
            startDate: reservation.schedule.startDate.toISOString(),
            endDate: reservation.schedule.endDate?.toISOString() ?? null,
          }
        : null,
    });
  }

  const organization = await prisma.organization.findUnique({
    where: { id },
    include: {
      tour: { select: { id: true, title: true, slug: true } },
      schedule: { select: { id: true, startDate: true, endDate: true } },
    },
  });

  if (!organization) return null;

  return mapManualOrganization({
    ...organization,
    totalPrice: Number(organization.totalPrice),
    tourDate: organization.tourDate.toISOString(),
    createdAt: organization.createdAt.toISOString(),
    schedule: organization.schedule
      ? {
          id: organization.schedule.id,
          startDate: organization.schedule.startDate.toISOString(),
          endDate: organization.schedule.endDate?.toISOString() ?? null,
        }
      : null,
  });
}
