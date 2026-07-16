"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import type { OrganizationStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { parseDateOnly, toDateInputValue } from "@/lib/date-helpers";
import { resolveAdultPrice, resolveChildPrice } from "@/lib/pricing";
import {
  organizationSchema,
  organizationUpdateSchema,
  type OrganizationFormData,
} from "@/lib/validations";
import type { ActionResult } from "@/actions/types";

export interface AdminOrganization {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  adultCount: number;
  childCount: number;
  boardingPoint: string | null;
  note: string | null;
  totalPrice: number;
  leadSource: OrganizationFormData["leadSource"];
  status: OrganizationFormData["status"];
  tourDate: string;
  createdAt: string;
  tour: {
    id: string;
    title: string;
    slug: string;
  };
  schedule: {
    id: string;
    startDate: string;
    endDate: string | null;
  } | null;
}

const organizationInclude = {
  tour: { select: { id: true, title: true, slug: true } },
  schedule: { select: { id: true, startDate: true, endDate: true } },
} as const;

function guestCount(adultCount: number, childCount: number) {
  return adultCount + childCount;
}

function mapOrganization(
  organization: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    adultCount: number;
    childCount: number;
    boardingPoint: string | null;
    note: string | null;
    totalPrice: Prisma.Decimal;
    leadSource: OrganizationFormData["leadSource"];
    status: OrganizationFormData["status"];
    tourDate: Date;
    createdAt: Date;
    tour: { id: string; title: string; slug: string };
    schedule: { id: string; startDate: Date; endDate: Date | null } | null;
  }
): AdminOrganization {
  return {
    id: organization.id,
    firstName: organization.firstName,
    lastName: organization.lastName,
    phone: organization.phone,
    email: organization.email,
    adultCount: organization.adultCount,
    childCount: organization.childCount,
    boardingPoint: organization.boardingPoint,
    note: organization.note,
    totalPrice: Number(organization.totalPrice),
    leadSource: organization.leadSource,
    status: organization.status,
    tourDate: organization.tourDate.toISOString(),
    createdAt: organization.createdAt.toISOString(),
    tour: organization.tour,
    schedule: organization.schedule
      ? {
          id: organization.schedule.id,
          startDate: organization.schedule.startDate.toISOString(),
          endDate: organization.schedule.endDate?.toISOString() ?? null,
        }
      : null,
  };
}

function countsTowardCapacity(status: OrganizationStatus) {
  return status === "CONFIRMED";
}

async function findScheduleForTourDate(tourId: string, tourDate: Date) {
  const dateKey = toDateInputValue(tourDate);
  const schedules = await prisma.tourSchedule.findMany({
    where: {
      tourId,
      isActive: true,
      startDate: {
        gte: parseDateOnly(dateKey),
        lt: new Date(parseDateOnly(dateKey).getTime() + 24 * 60 * 60 * 1000),
      },
    },
    include: {
      tour: { select: { price: true, childPrice: true } },
    },
    take: 1,
  });

  return schedules[0] ?? null;
}

async function assertScheduleCapacity(
  scheduleId: string,
  guestDelta: number
): Promise<ActionResult> {
  if (guestDelta <= 0) return { success: true };

  const schedule = await prisma.tourSchedule.findUnique({
    where: { id: scheduleId },
    select: { capacity: true, reservedCount: true },
  });

  if (!schedule) {
    return { success: false, error: "Tur tarihi bulunamadı" };
  }

  const spotsLeft = schedule.capacity - schedule.reservedCount;
  if (guestDelta > spotsLeft) {
    return {
      success: false,
      error: `Bu tarihte yalnızca ${spotsLeft} kişilik kontenjan kaldı`,
    };
  }

  return { success: true };
}

async function adjustScheduleReservedCount(
  tx: Prisma.TransactionClient,
  scheduleId: string | null | undefined,
  delta: number
) {
  if (!scheduleId || delta === 0) return;

  await tx.tourSchedule.update({
    where: { id: scheduleId },
    data: { reservedCount: { increment: delta } },
  });
}

function revalidateOrganizationPaths() {
  revalidatePath("/reservations");
  revalidatePath("/schedules");
  revalidatePath("/");
}

export async function getOrganizationsByDate(): Promise<
  Record<string, AdminOrganization[]>
> {
  await requireAdmin();

  const organizations = await prisma.organization.findMany({
    where: { status: { not: "CANCELLED" } },
    orderBy: [{ tourDate: "asc" }, { createdAt: "asc" }],
    include: organizationInclude,
  });

  const grouped: Record<string, AdminOrganization[]> = {};

  for (const organization of organizations) {
    const dateKey = toDateInputValue(organization.tourDate);
    const mapped = mapOrganization(organization);
    grouped[dateKey] = grouped[dateKey] ?? [];
    grouped[dateKey].push(mapped);
  }

  return grouped;
}

export async function getSchedulesForOrganizationForm(tourId: string) {
  await requireAdmin();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const schedules = await prisma.tourSchedule.findMany({
    where: {
      tourId,
      isActive: true,
      startDate: { gte: today },
    },
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      capacity: true,
      reservedCount: true,
      price: true,
      childPrice: true,
      tour: { select: { price: true, childPrice: true } },
    },
  });

  return schedules.map((schedule) => ({
    id: schedule.id,
    startDate: schedule.startDate.toISOString(),
    endDate: schedule.endDate?.toISOString() ?? null,
    capacity: schedule.capacity,
    reservedCount: schedule.reservedCount,
    spotsLeft: schedule.capacity - schedule.reservedCount,
    price: schedule.price ? Number(schedule.price) : Number(schedule.tour.price),
    childPrice: schedule.childPrice
      ? Number(schedule.childPrice)
      : schedule.tour.childPrice
        ? Number(schedule.tour.childPrice)
        : null,
  }));
}

export async function createOrganization(
  data: OrganizationFormData
): Promise<ActionResult<{ id: string }>> {
  const session = await requireAdmin();
  const parsed = organizationSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Geçersiz veri",
    };
  }

  const input = parsed.data;
  const tourDate = parseDateOnly(input.tourDate);
  const guests = guestCount(input.adultCount, input.childCount);

  try {
    const result = await prisma.$transaction(async (tx) => {
      let scheduleId = input.scheduleId || null;
      let schedule = scheduleId
        ? await tx.tourSchedule.findFirst({
            where: { id: scheduleId, tourId: input.tourId, isActive: true },
            include: { tour: { select: { price: true, childPrice: true } } },
          })
        : null;

      if (!schedule) {
        schedule = await findScheduleForTourDate(input.tourId, tourDate);
        scheduleId = schedule?.id ?? null;
      }

      if (countsTowardCapacity(input.status) && scheduleId) {
        const capacityCheck = await assertScheduleCapacity(scheduleId, guests);
        if (!capacityCheck.success) {
          throw new Error(capacityCheck.error);
        }
      }

      const organization = await tx.organization.create({
        data: {
          tourId: input.tourId,
          scheduleId,
          tourDate,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          phone: input.phone.trim(),
          email: input.email?.trim() || null,
          adultCount: input.adultCount,
          childCount: input.childCount,
          boardingPoint: input.boardingPoint?.trim() || null,
          note: input.note?.trim() || null,
          totalPrice: new Prisma.Decimal(input.totalPrice),
          leadSource: input.leadSource,
          status: input.status,
          createdById: session.user.id,
        },
      });

      if (countsTowardCapacity(input.status) && scheduleId) {
        await adjustScheduleReservedCount(tx, scheduleId, guests);
      }

      return organization;
    });

    revalidateOrganizationPaths();
    return { success: true, data: { id: result.id } };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Organizasyon oluşturulurken bir hata oluştu",
    };
  }
}

export async function updateOrganization(
  data: OrganizationFormData & { id: string }
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = organizationUpdateSchema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Geçersiz veri",
    };
  }

  const input = parsed.data;
  const tourDate = parseDateOnly(input.tourDate);
  const guests = guestCount(input.adultCount, input.childCount);

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.organization.findUnique({
        where: { id: input.id },
      });

      if (!existing) {
        throw new Error("Organizasyon bulunamadı");
      }

      let scheduleId = input.scheduleId || null;
      let schedule = scheduleId
        ? await tx.tourSchedule.findFirst({
            where: { id: scheduleId, tourId: input.tourId, isActive: true },
          })
        : null;

      if (!schedule) {
        const matched = await findScheduleForTourDate(input.tourId, tourDate);
        schedule = matched;
        scheduleId = matched?.id ?? null;
      }

      const oldGuests = guestCount(existing.adultCount, existing.childCount);
      const oldCounts = countsTowardCapacity(existing.status);
      const newCounts = countsTowardCapacity(input.status);

      if (oldCounts && existing.scheduleId) {
        await adjustScheduleReservedCount(tx, existing.scheduleId, -oldGuests);
      }

      if (newCounts && scheduleId) {
        const capacityCheck = await assertScheduleCapacity(scheduleId, guests);
        if (!capacityCheck.success) {
          if (oldCounts && existing.scheduleId) {
            await adjustScheduleReservedCount(tx, existing.scheduleId, oldGuests);
          }
          throw new Error(capacityCheck.error);
        }
        await adjustScheduleReservedCount(tx, scheduleId, guests);
      }

      await tx.organization.update({
        where: { id: input.id },
        data: {
          tourId: input.tourId,
          scheduleId,
          tourDate,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          phone: input.phone.trim(),
          email: input.email?.trim() || null,
          adultCount: input.adultCount,
          childCount: input.childCount,
          boardingPoint: input.boardingPoint?.trim() || null,
          note: input.note?.trim() || null,
          totalPrice: new Prisma.Decimal(input.totalPrice),
          leadSource: input.leadSource,
          status: input.status,
        },
      });
    });

    revalidateOrganizationPaths();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Organizasyon güncellenirken bir hata oluştu",
    };
  }
}

export async function deleteOrganization(id: string): Promise<ActionResult> {
  await requireAdmin();

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.organization.findUnique({ where: { id } });
      if (!existing) {
        throw new Error("Organizasyon bulunamadı");
      }

      if (countsTowardCapacity(existing.status) && existing.scheduleId) {
        const guests = guestCount(existing.adultCount, existing.childCount);
        await adjustScheduleReservedCount(tx, existing.scheduleId, -guests);
      }

      await tx.organization.delete({ where: { id } });
    });

    revalidateOrganizationPaths();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Organizasyon silinirken bir hata oluştu",
    };
  }
}

export async function calculateOrganizationPrice(input: {
  tourId: string;
  scheduleId?: string;
  tourDate: string;
  adultCount: number;
  childCount: number;
}): Promise<ActionResult<{ totalPrice: number }>> {
  await requireAdmin();

  const tour = await prisma.tour.findUnique({
    where: { id: input.tourId },
    select: { price: true, childPrice: true },
  });

  if (!tour) {
    return { success: false, error: "Tur bulunamadı" };
  }

  let schedule = input.scheduleId
    ? await prisma.tourSchedule.findFirst({
        where: { id: input.scheduleId, tourId: input.tourId },
        select: { price: true, childPrice: true },
      })
    : null;

  if (!schedule) {
    schedule = await findScheduleForTourDate(
      input.tourId,
      parseDateOnly(input.tourDate)
    );
  }

  const adultPrice = resolveAdultPrice(
    schedule?.price ? Number(schedule.price) : null,
    Number(tour.price)
  );
  const childPrice = resolveChildPrice(
    schedule?.childPrice ? Number(schedule.childPrice) : null,
    tour.childPrice ? Number(tour.childPrice) : null,
    adultPrice
  );

  const totalPrice =
    input.adultCount * adultPrice + input.childCount * childPrice;

  return { success: true, data: { totalPrice } };
}
