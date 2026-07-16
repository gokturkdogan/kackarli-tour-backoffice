"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

export interface DashboardMonthBucket {
  label: string;
  count: number;
}

export interface DashboardStats {
  tours: {
    total: number;
    active: number;
  };
  reservations: {
    total: number;
    fromWeb: number;
    manual: number;
    pending: number;
    confirmed: number;
    completed: number;
    confirmedGuests: number;
  };
  tourPlan: {
    activeSchedules: number;
    upcomingSchedules: number;
    totalCapacity: number;
    reservedSpots: number;
    schedulesByMonth: DashboardMonthBucket[];
  };
}

function getMonthBuckets(): { start: Date; end: Date; label: string }[] {
  const now = new Date();
  const buckets: { start: Date; end: Date; label: string }[] = [];

  for (let i = 0; i < 4; i++) {
    const start = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + i + 1, 0, 23, 59, 59, 999);
    const label = start.toLocaleDateString("tr-TR", { month: "short" });
    buckets.push({ start, end, label });
  }

  return buckets;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  await requireAdmin();

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const monthBuckets = getMonthBuckets();

  const [
    tourCount,
    activeTours,
    webByStatus,
    manualByStatus,
    activeSchedules,
    upcomingSchedules,
    upcomingScheduleRows,
    schedulesInBuckets,
    confirmedGuestRows,
    manualConfirmedGuests,
  ] = await Promise.all([
    prisma.tour.count(),
    prisma.tour.count({ where: { isActive: true } }),
    prisma.reservation.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.organization.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.tourSchedule.count({ where: { isActive: true } }),
    prisma.tourSchedule.count({
      where: { isActive: true, startDate: { gte: now } },
    }),
    prisma.tourSchedule.findMany({
      where: { isActive: true, startDate: { gte: now } },
      select: { capacity: true, reservedCount: true },
    }),
    Promise.all(
      monthBuckets.map((bucket) =>
        prisma.tourSchedule.count({
          where: {
            isActive: true,
            startDate: { gte: bucket.start, lte: bucket.end },
          },
        })
      )
    ),
    prisma.reservation.findMany({
      where: { status: "CONFIRMED" },
      select: { adultCount: true, childCount: true },
    }),
    prisma.organization.findMany({
      where: { status: "CONFIRMED" },
      select: { adultCount: true, childCount: true },
    }),
  ]);
  const webStatusMap = Object.fromEntries(
    webByStatus.map((row) => [row.status, row._count._all])
  ) as Record<string, number>;
  const manualStatusMap = Object.fromEntries(
    manualByStatus.map((row) => [row.status, row._count._all])
  ) as Record<string, number>;

  const fromWeb = Object.entries(webStatusMap)
    .filter(([status]) => status !== "CANCELLED")
    .reduce((sum, [, count]) => sum + count, 0);

  const manual = Object.entries(manualStatusMap)
    .filter(([status]) => status !== "CANCELLED")
    .reduce((sum, [, count]) => sum + count, 0);

  const pending =
    (webStatusMap.PENDING ?? 0) +
    (webStatusMap.CONTACTED ?? 0) +
    (manualStatusMap.PLANNED ?? 0);

  const confirmed =
    (webStatusMap.CONFIRMED ?? 0) + (manualStatusMap.CONFIRMED ?? 0);

  const completed =
    (webStatusMap.COMPLETED ?? 0) + (manualStatusMap.COMPLETED ?? 0);

  const confirmedGuests =
    confirmedGuestRows.reduce((sum, row) => sum + row.adultCount + row.childCount, 0) +
    manualConfirmedGuests.reduce((sum, row) => sum + row.adultCount + row.childCount, 0);

  const totalCapacity = upcomingScheduleRows.reduce((sum, row) => sum + row.capacity, 0);
  const reservedSpots = upcomingScheduleRows.reduce(
    (sum, row) => sum + row.reservedCount,
    0
  );

  return {
    tours: {
      total: tourCount,
      active: activeTours,
    },
    reservations: {
      total: fromWeb + manual,
      fromWeb,
      manual,
      pending,
      confirmed,
      completed,
      confirmedGuests,
    },
    tourPlan: {
      activeSchedules,
      upcomingSchedules,
      totalCapacity,
      reservedSpots,
      schedulesByMonth: monthBuckets.map((bucket, index) => ({
        label: bucket.label,
        count: schedulesInBuckets[index] ?? 0,
      })),
    },
  };
}
