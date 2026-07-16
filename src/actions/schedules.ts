"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { scheduleSchema, bulkScheduleSchema, type ScheduleFormData, type BulkScheduleFormData } from "@/lib/validations";
import { parseDateOnly, toDateInputValue } from "@/lib/date-helpers";
import type { ActionResult } from "@/actions/types";
import {
  buildReservationEmailData,
  sendReservationStatusEmail,
} from "@/lib/emails/reservation-email";

const reservationEmailInclude = {
  tour: {
    select: {
      title: true,
      subtitle: true,
      duration: true,
      departureTime: true,
      returnTime: true,
      includedServices: true,
      itinerary: {
        orderBy: [{ sortOrder: "asc" as const }, { dayNumber: "asc" as const }],
        select: {
          time: true,
          title: true,
          duration: true,
          stopType: true,
          sortOrder: true,
          dayNumber: true,
        },
      },
    },
  },
  schedule: { select: { startDate: true, endDate: true } },
};

export async function getSchedules() {
  return prisma.tourSchedule.findMany({
    orderBy: [{ startDate: "asc" }],
    include: {
      tour: { select: { id: true, title: true, type: true, price: true, childPrice: true } },
      _count: { select: { reservations: true } },
    },
  });
}

export async function getScheduleById(id: string) {
  return prisma.tourSchedule.findUnique({
    where: { id },
    include: {
      tour: { select: { id: true, title: true, type: true, price: true, childPrice: true } },
    },
  });
}

export async function getToursForScheduleSelect(includeTourId?: string) {
  const tours = await prisma.tour.findMany({
    where: {
      OR: [{ isActive: true }, ...(includeTourId ? [{ id: includeTourId }] : [])],
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      type: true,
      price: true,
      childPrice: true,
      maxGroupSize: true,
    },
  });

  return tours.map((tour) => ({
    id: tour.id,
    title: tour.title,
    type: tour.type,
    price: Number(tour.price),
    childPrice: tour.childPrice ? Number(tour.childPrice) : null,
    maxGroupSize: tour.maxGroupSize,
  }));
}

export type CalendarExistingSchedule = {
  id: string;
  tourId: string;
  tourTitle: string;
  capacity: number;
  reservedCount: number;
  pendingCount: number;
  reservationCount: number;
  price: number | null;
  childPrice: number | null;
  tourPrice: number;
  tourChildPrice: number | null;
  isActive: boolean;
};

function guestSum(adultCount: number | null, childCount: number | null): number {
  return (adultCount ?? 0) + (childCount ?? 0);
}

async function getReservationGuestCountsBySchedule() {
  const stats = await prisma.reservation.groupBy({
    by: ["scheduleId", "status"],
    where: {
      status: { in: ["CONFIRMED", "PENDING"] },
    },
    _sum: {
      adultCount: true,
      childCount: true,
    },
  });

  const map = new Map<string, { confirmed: number; pending: number }>();

  for (const stat of stats) {
    if (!stat.scheduleId) continue;
    const guests = guestSum(stat._sum.adultCount, stat._sum.childCount);
    const entry = map.get(stat.scheduleId) ?? { confirmed: 0, pending: 0 };

    if (stat.status === "CONFIRMED") {
      entry.confirmed += guests;
    } else if (stat.status === "PENDING") {
      entry.pending += guests;
    }

    map.set(stat.scheduleId, entry);
  }

  return map;
}

async function getActiveReservationCountsBySchedule() {
  const stats = await prisma.reservation.groupBy({
    by: ["scheduleId"],
    where: {
      status: { not: "CANCELLED" },
      scheduleId: { not: null },
    },
    _count: { _all: true },
  });

  const map = new Map<string, number>();
  for (const stat of stats) {
    if (stat.scheduleId) {
      map.set(stat.scheduleId, stat._count._all);
    }
  }
  return map;
}

export async function getExistingSchedulesByDate(): Promise<
  Record<string, CalendarExistingSchedule[]>
> {
  const [schedules, reservationCounts, activeReservationCounts] = await Promise.all([
    prisma.tourSchedule.findMany({
      select: {
        id: true,
        tourId: true,
        startDate: true,
        capacity: true,
        price: true,
        childPrice: true,
        isActive: true,
        tour: {
          select: {
            title: true,
            price: true,
            childPrice: true,
          },
        },
      },
      orderBy: [{ startDate: "asc" }],
    }),
    getReservationGuestCountsBySchedule(),
    getActiveReservationCountsBySchedule(),
  ]);

  const map: Record<string, CalendarExistingSchedule[]> = {};
  for (const schedule of schedules) {
    const dateKey = toDateInputValue(schedule.startDate);
    const counts = reservationCounts.get(schedule.id) ?? { confirmed: 0, pending: 0 };
    const entry: CalendarExistingSchedule = {
      id: schedule.id,
      tourId: schedule.tourId,
      tourTitle: schedule.tour.title,
      capacity: schedule.capacity,
      reservedCount: counts.confirmed,
      pendingCount: counts.pending,
      reservationCount: activeReservationCounts.get(schedule.id) ?? 0,
      price: schedule.price ? Number(schedule.price) : null,
      childPrice: schedule.childPrice ? Number(schedule.childPrice) : null,
      tourPrice: Number(schedule.tour.price),
      tourChildPrice: schedule.tour.childPrice ? Number(schedule.tour.childPrice) : null,
      isActive: schedule.isActive,
    };
    if (!map[dateKey]) map[dateKey] = [];
    map[dateKey].push(entry);
  }

  return map;
}

export async function createSchedulesBulk(
  data: BulkScheduleFormData
): Promise<ActionResult<{ count: number }>> {
  try {
    await requireAdmin();
    const parsed = bulkScheduleSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
    }

    const tour = await prisma.tour.findUnique({ where: { id: parsed.data.tourId } });
    if (!tour) {
      return { success: false, error: "Tur bulunamadı" };
    }

    const uniqueDates = new Map<string, (typeof parsed.data.dates)[number]>();
    for (const entry of parsed.data.dates) {
      uniqueDates.set(entry.startDate, entry);
    }

    if (uniqueDates.size !== parsed.data.dates.length) {
      return { success: false, error: "Aynı tarih birden fazla kez seçilemez" };
    }

    const dateKeys = [...uniqueDates.keys()];
    const parsedDates = dateKeys.map((key) => parseDateOnly(key));

    const existing = await prisma.tourSchedule.findMany({
      where: {
        tourId: parsed.data.tourId,
        startDate: { in: parsedDates },
      },
      select: { startDate: true },
    });

    if (existing.length > 0) {
      const taken = existing.map((s) => toDateInputValue(s.startDate)).join(", ");
      return {
        success: false,
        error: `Bu tur için zaten kayıtlı tarihler var: ${taken}`,
      };
    }

    await prisma.$transaction(
      dateKeys.map((dateKey) => {
        const entry = uniqueDates.get(dateKey)!;
        return prisma.tourSchedule.create({
          data: {
            tourId: parsed.data.tourId,
            startDate: parseDateOnly(dateKey),
            endDate: null,
            capacity: entry.capacity ?? parsed.data.capacity,
            price: entry.price ? new Prisma.Decimal(entry.price) : null,
            childPrice: entry.childPrice ? new Prisma.Decimal(entry.childPrice) : null,
            isActive: parsed.data.isActive,
          },
        });
      })
    );

    revalidatePath("/schedules");
    revalidatePath("/");
    revalidatePath("/turlar");
    revalidatePath("/rezervasyon");

    return { success: true, data: { count: dateKeys.length } };
  } catch {
    return { success: false, error: "Tur tarihleri oluşturulurken bir hata oluştu" };
  }
}

export async function createSchedule(
  data: ScheduleFormData
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    const parsed = scheduleSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
    }

    const tour = await prisma.tour.findUnique({ where: { id: parsed.data.tourId } });
    if (!tour) {
      return { success: false, error: "Tur bulunamadı" };
    }

    const startDate = parseDateOnly(parsed.data.startDate);
    const endDate = parsed.data.endDate ? parseDateOnly(parsed.data.endDate) : null;

    const duplicate = await prisma.tourSchedule.findFirst({
      where: {
        tourId: parsed.data.tourId,
        startDate,
      },
    });
    if (duplicate) {
      return { success: false, error: "Bu tur için aynı tarihte zaten bir program var" };
    }

    const schedule = await prisma.tourSchedule.create({
      data: {
        tourId: parsed.data.tourId,
        startDate,
        endDate,
        capacity: parsed.data.capacity,
        price: parsed.data.price ? new Prisma.Decimal(parsed.data.price) : null,
        childPrice: parsed.data.childPrice ? new Prisma.Decimal(parsed.data.childPrice) : null,
        isActive: parsed.data.isActive,
      },
    });

    revalidatePath("/schedules");
    revalidatePath("/");
    revalidatePath("/turlar");
    return { success: true, data: { id: schedule.id } };
  } catch {
    return { success: false, error: "Tur tarihi oluşturulurken bir hata oluştu" };
  }
}

export async function updateSchedule(
  id: string,
  data: ScheduleFormData
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = scheduleSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
    }

    const existing = await prisma.tourSchedule.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Tur tarihi bulunamadı" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (existing.startDate < today) {
      return { success: false, error: "Geçmiş tur tarihleri düzenlenemez" };
    }

    const startDate = parseDateOnly(parsed.data.startDate);
    const endDate = parsed.data.endDate ? parseDateOnly(parsed.data.endDate) : null;

    const duplicate = await prisma.tourSchedule.findFirst({
      where: {
        tourId: parsed.data.tourId,
        startDate,
        NOT: { id },
      },
    });
    if (duplicate) {
      return { success: false, error: "Bu tur için aynı tarihte zaten bir program var" };
    }

    const confirmedGuests = await prisma.reservation.aggregate({
      where: { scheduleId: id, status: "CONFIRMED" },
      _sum: { adultCount: true, childCount: true },
    });
    const confirmedCount =
      (confirmedGuests._sum.adultCount ?? 0) + (confirmedGuests._sum.childCount ?? 0);

    if (parsed.data.capacity < confirmedCount) {
      return {
        success: false,
        error: `Kapasite, onaylı rezervasyon sayısından (${confirmedCount}) az olamaz`,
      };
    }

    await prisma.tourSchedule.update({
      where: { id },
      data: {
        tourId: parsed.data.tourId,
        startDate,
        endDate,
        capacity: parsed.data.capacity,
        price: parsed.data.price ? new Prisma.Decimal(parsed.data.price) : null,
        childPrice: parsed.data.childPrice ? new Prisma.Decimal(parsed.data.childPrice) : null,
        isActive: parsed.data.isActive,
      },
    });

    revalidatePath("/schedules");
    revalidatePath("/");
    revalidatePath("/turlar");
    revalidatePath("/rezervasyon");
    return { success: true };
  } catch {
    return { success: false, error: "Tur tarihi güncellenirken bir hata oluştu" };
  }
}

export async function toggleScheduleActive(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const schedule = await prisma.tourSchedule.findUnique({ where: { id } });
    if (!schedule) {
      return { success: false, error: "Tur tarihi bulunamadı" };
    }

    await prisma.tourSchedule.update({
      where: { id },
      data: { isActive: !schedule.isActive },
    });

    revalidatePath("/schedules");
    return { success: true };
  } catch {
    return { success: false, error: "Durum güncellenirken bir hata oluştu" };
  }
}

export async function deleteSchedule(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const schedule = await prisma.tourSchedule.findUnique({
      where: { id },
      include: {
        reservations: {
          where: { status: { not: "CANCELLED" } },
          include: reservationEmailInclude,
        },
      },
    });
    if (!schedule) {
      return { success: false, error: "Tur tarihi bulunamadı" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (schedule.startDate < today) {
      return { success: false, error: "Geçmiş tur tarihleri silinemez" };
    }

    const emailPayloads = schedule.reservations.map((reservation) =>
      buildReservationEmailData({
        ...reservation,
        totalPrice: reservation.totalPrice,
        schedule: {
          startDate: schedule.startDate,
          endDate: schedule.endDate,
        },
      })
    );

    await prisma.$transaction(async (tx) => {
      if (schedule.reservations.length > 0) {
        await tx.reservation.updateMany({
          where: { scheduleId: id, status: { not: "CANCELLED" } },
          data: { status: "CANCELLED" },
        });
      }

      await tx.tourSchedule.delete({ where: { id } });
    });

    await Promise.all(
      emailPayloads.map(async (emailData) => {
        try {
          await sendReservationStatusEmail("cancelled", emailData);
        } catch (error) {
          console.error("[mail] Tur tarihi silme iptal e-postası gönderilemedi:", error);
        }
      })
    );

    revalidatePath("/schedules");
    revalidatePath("/reservations");
    revalidatePath("/");
    revalidatePath("/turlar");
    revalidatePath("/rezervasyon");
    return { success: true };
  } catch {
    return { success: false, error: "Tur tarihi silinirken bir hata oluştu" };
  }
}
