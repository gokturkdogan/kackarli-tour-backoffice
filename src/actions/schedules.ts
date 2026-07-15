"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { scheduleSchema, bulkScheduleSchema, type ScheduleFormData, type BulkScheduleFormData } from "@/lib/validations";
import { parseDateOnly, toDateInputValue } from "@/lib/date-helpers";
import type { ActionResult } from "@/actions/types";

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
  price: number | null;
  childPrice: number | null;
  tourPrice: number;
  tourChildPrice: number | null;
  isActive: boolean;
};

export async function getExistingSchedulesByDate(): Promise<
  Record<string, CalendarExistingSchedule[]>
> {
  const schedules = await prisma.tourSchedule.findMany({
    select: {
      id: true,
      tourId: true,
      startDate: true,
      capacity: true,
      reservedCount: true,
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
  });

  const map: Record<string, CalendarExistingSchedule[]> = {};
  for (const schedule of schedules) {
    const dateKey = toDateInputValue(schedule.startDate);
    const entry: CalendarExistingSchedule = {
      id: schedule.id,
      tourId: schedule.tourId,
      tourTitle: schedule.tour.title,
      capacity: schedule.capacity,
      reservedCount: schedule.reservedCount,
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

    revalidatePath("/admin/schedules");
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

    revalidatePath("/admin/schedules");
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

    if (parsed.data.capacity < existing.reservedCount) {
      return {
        success: false,
        error: `Kapasite, mevcut rezervasyon sayısından (${existing.reservedCount}) az olamaz`,
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

    revalidatePath("/admin/schedules");
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

    revalidatePath("/admin/schedules");
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
      include: { _count: { select: { reservations: true } } },
    });
    if (!schedule) {
      return { success: false, error: "Tur tarihi bulunamadı" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (schedule.startDate < today) {
      return { success: false, error: "Geçmiş tur tarihleri silinemez" };
    }

    if (schedule._count.reservations > 0) {
      return {
        success: false,
        error: "Rezervasyonu olan tur tarihi silinemez",
      };
    }

    await prisma.tourSchedule.delete({ where: { id } });

    revalidatePath("/admin/schedules");
    revalidatePath("/");
    revalidatePath("/turlar");
    revalidatePath("/rezervasyon");
    return { success: true };
  } catch {
    return { success: false, error: "Tur tarihi silinirken bir hata oluştu" };
  }
}
