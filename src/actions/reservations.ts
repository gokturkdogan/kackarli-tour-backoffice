"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import type { ReservationStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { reservationStatusUpdateSchema, webReservationUpdateSchema } from "@/lib/validations";
import type { ActionResult } from "@/actions/types";
import {
  buildReservationEmailData,
  sendReservationStatusEmail,
  type ReservationEmailVariant,
} from "@/lib/emails/reservation-email";

const STATUS_EMAIL_VARIANT: Partial<Record<ReservationStatus, ReservationEmailVariant>> = {
  CONTACTED: "contacted",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
};

async function sendWebReservationEmail(
  reservationId: string,
  variant: ReservationEmailVariant
) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: reservationEmailInclude,
  });

  if (!reservation || !reservation.schedule) return;

  const emailData = buildReservationEmailData({
    ...reservation,
    schedule: reservation.schedule,
  });
  try {
    await sendReservationStatusEmail(variant, emailData);
  } catch (error) {
    console.error("[mail] Rezervasyon e-postası gönderilemedi:", error);
  }
}

function revalidateReservationPaths() {
  revalidatePath("/reservations");
  revalidatePath("/schedules");
  revalidatePath("/");
}

export interface AdminReservation {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  adultCount: number;
  childCount: number;
  boardingPoint: string | null;
  note: string | null;
  totalPrice: number;
  status: ReservationStatus;
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

function mapReservation(
  reservation: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    adultCount: number;
    childCount: number;
    boardingPoint: string | null;
    note: string | null;
    totalPrice: Prisma.Decimal;
    status: ReservationStatus;
    createdAt: Date;
    tour: { id: string; title: string; slug: string };
    schedule: { id: string; startDate: Date; endDate: Date | null } | null;
  }
): AdminReservation {
  return {
    id: reservation.id,
    firstName: reservation.firstName,
    lastName: reservation.lastName,
    phone: reservation.phone,
    email: reservation.email,
    adultCount: reservation.adultCount,
    childCount: reservation.childCount,
    boardingPoint: reservation.boardingPoint,
    note: reservation.note,
    totalPrice: Number(reservation.totalPrice),
    status: reservation.status,
    createdAt: reservation.createdAt.toISOString(),
    tour: reservation.tour,
    schedule: reservation.schedule
      ? {
          id: reservation.schedule.id,
          startDate: reservation.schedule.startDate.toISOString(),
          endDate: reservation.schedule.endDate?.toISOString() ?? null,
        }
      : null,
  };
}

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

const reservationInclude = {
  tour: { select: { id: true, title: true, slug: true } },
  schedule: { select: { id: true, startDate: true, endDate: true } },
} as const;

export async function getReservations(): Promise<AdminReservation[]> {
  await requireAdmin();

  const reservations = await prisma.reservation.findMany({
    orderBy: { createdAt: "desc" },
    include: reservationInclude,
  });

  return reservations.map(mapReservation);
}

export async function updateReservationStatus(
  id: string,
  status: ReservationStatus
): Promise<ActionResult<void>> {
  try {
    await requireAdmin();

    const parsed = reservationStatusUpdateSchema.safeParse({ id, status });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
    }

    let statusChanged = false;

    await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: parsed.data.id },
        include: { schedule: true },
      });

      if (!reservation) {
        throw new Error("Rezervasyon bulunamadı");
      }

      if (reservation.status === parsed.data.status) {
        return;
      }

      statusChanged = true;

      const guestCount = reservation.adultCount + reservation.childCount;
      const wasConfirmed = reservation.status === "CONFIRMED";
      const willConfirm = parsed.data.status === "CONFIRMED";

      if (wasConfirmed && !willConfirm && reservation.scheduleId) {
        await tx.tourSchedule.update({
          where: { id: reservation.scheduleId },
          data: {
            reservedCount: { decrement: guestCount },
          },
        });
      }

      if (!wasConfirmed && willConfirm) {
        if (!reservation.scheduleId || !reservation.schedule) {
          throw new Error("Tur tarihi bulunamadı, onaylanamaz");
        }

        const schedule = reservation.schedule;
        const spotsLeft = schedule.capacity - schedule.reservedCount;
        if (guestCount > spotsLeft) {
          throw new Error(`Bu tarihte yalnızca ${spotsLeft} kişilik kontenjan kaldı`);
        }

        await tx.tourSchedule.update({
          where: { id: reservation.scheduleId },
          data: {
            reservedCount: { increment: guestCount },
          },
        });
      }

      await tx.reservation.update({
        where: { id: parsed.data.id },
        data: { status: parsed.data.status },
      });
    });

    const emailVariant = statusChanged
      ? STATUS_EMAIL_VARIANT[parsed.data.status]
      : undefined;
    if (emailVariant) {
      const reservation = await prisma.reservation.findUnique({
        where: { id: parsed.data.id },
        include: reservationEmailInclude,
      });

      if (reservation?.schedule) {
        const emailData = buildReservationEmailData({
          ...reservation,
          schedule: reservation.schedule,
        });
        try {
          await sendReservationStatusEmail(emailVariant, emailData);
        } catch (error) {
          console.error("[mail] Rezervasyon durum e-postası gönderilemedi:", error);
        }
      }
    }

    revalidateReservationPaths();

    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof Error && error.message) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Rezervasyon güncellenirken bir hata oluştu" };
  }
}

export async function updateWebReservation(
  data: import("@/lib/validations").WebReservationUpdateData
): Promise<ActionResult<void>> {
  try {
    await requireAdmin();

    const parsed = webReservationUpdateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
    }

    const input = parsed.data;
    let statusChanged = false;
    let fieldsChanged = false;
    let becameCancelled = false;

    await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: input.id },
        include: { schedule: true, tour: true },
      });

      if (!reservation) {
        throw new Error("Rezervasyon bulunamadı");
      }

      const oldGuestCount = reservation.adultCount + reservation.childCount;
      const newGuestCount = input.adultCount + input.childCount;
      const wasConfirmed = reservation.status === "CONFIRMED";
      const willConfirm = input.status === "CONFIRMED";

      if (reservation.status !== input.status) {
        statusChanged = true;
        becameCancelled = input.status === "CANCELLED";
      }

      fieldsChanged =
        reservation.firstName !== input.firstName.trim() ||
        reservation.lastName !== input.lastName.trim() ||
        reservation.phone !== input.phone.trim() ||
        reservation.email !== input.email.trim().toLowerCase() ||
        reservation.adultCount !== input.adultCount ||
        reservation.childCount !== input.childCount ||
        reservation.boardingPoint !== (input.boardingPoint?.trim() || null) ||
        reservation.note !== (input.note?.trim() || null) ||
        reservation.scheduleId !== input.scheduleId ||
        reservation.tourId !== input.tourId;

      if (
        reservation.scheduleId &&
        wasConfirmed &&
        (!willConfirm || reservation.scheduleId !== input.scheduleId)
      ) {
        await tx.tourSchedule.update({
          where: { id: reservation.scheduleId },
          data: { reservedCount: { decrement: oldGuestCount } },
        });
      }

      const schedule = await tx.tourSchedule.findFirst({
        where: { id: input.scheduleId, tourId: input.tourId, isActive: true },
        include: { tour: true },
      });

      if (!schedule) {
        throw new Error("Seçilen tur tarihi bulunamadı");
      }

      const adultPrice = Number(schedule.price ?? schedule.tour.price);
      const childPrice = Number(
        schedule.childPrice ?? schedule.tour.childPrice ?? adultPrice
      );
      const totalPrice =
        input.adultCount * adultPrice + input.childCount * childPrice;

      if (willConfirm && (!wasConfirmed || reservation.scheduleId !== input.scheduleId)) {
        const spotsLeft = schedule.capacity - schedule.reservedCount;
        if (newGuestCount > spotsLeft) {
          throw new Error(`Bu tarihte yalnızca ${spotsLeft} kişilik kontenjan kaldı`);
        }
        await tx.tourSchedule.update({
          where: { id: schedule.id },
          data: { reservedCount: { increment: newGuestCount } },
        });
      } else if (wasConfirmed && willConfirm && reservation.scheduleId === input.scheduleId) {
        const delta = newGuestCount - oldGuestCount;
        if (delta > 0) {
          const spotsLeft = schedule.capacity - schedule.reservedCount;
          if (delta > spotsLeft) {
            throw new Error(`Bu tarihte yalnızca ${spotsLeft} kişilik kontenjan kaldı`);
          }
          await tx.tourSchedule.update({
            where: { id: schedule.id },
            data: { reservedCount: { increment: delta } },
          });
        } else if (delta < 0) {
          await tx.tourSchedule.update({
            where: { id: schedule.id },
            data: { reservedCount: { decrement: Math.abs(delta) } },
          });
        }
      }

      await tx.reservation.update({
        where: { id: input.id },
        data: {
          tourId: input.tourId,
          scheduleId: input.scheduleId,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          phone: input.phone.trim(),
          email: input.email.trim().toLowerCase(),
          adultCount: input.adultCount,
          childCount: input.childCount,
          boardingPoint: input.boardingPoint?.trim() || null,
          note: input.note?.trim() || null,
          totalPrice: new Prisma.Decimal(totalPrice),
          status: input.status,
        },
      });
    });

    if (statusChanged) {
      const variant = becameCancelled
        ? "cancelled"
        : STATUS_EMAIL_VARIANT[parsed.data.status] ?? "updated";
      await sendWebReservationEmail(parsed.data.id, variant);
    } else if (fieldsChanged) {
      await sendWebReservationEmail(parsed.data.id, "updated");
    }

    revalidateReservationPaths();
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof Error && error.message) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Rezervasyon güncellenirken bir hata oluştu" };
  }
}

export async function deleteWebReservation(id: string): Promise<ActionResult<void>> {
  try {
    await requireAdmin();

    const reservationBeforeDelete = await prisma.reservation.findUnique({
      where: { id },
      include: reservationEmailInclude,
    });

    if (!reservationBeforeDelete) {
      return { success: false, error: "Rezervasyon bulunamadı" };
    }

    const shouldEmail =
      reservationBeforeDelete.status !== "CANCELLED" && !!reservationBeforeDelete.schedule;
    const emailData = reservationBeforeDelete.schedule
      ? buildReservationEmailData({
          ...reservationBeforeDelete,
          schedule: reservationBeforeDelete.schedule,
        })
      : null;

    await prisma.$transaction(async (tx) => {
      if (reservationBeforeDelete.status === "CONFIRMED" && reservationBeforeDelete.scheduleId) {
        const guestCount =
          reservationBeforeDelete.adultCount + reservationBeforeDelete.childCount;
        await tx.tourSchedule.update({
          where: { id: reservationBeforeDelete.scheduleId },
          data: { reservedCount: { decrement: guestCount } },
        });
      }

      await tx.reservation.delete({ where: { id } });
    });

    if (shouldEmail && emailData) {
      try {
        await sendReservationStatusEmail("cancelled", emailData);
      } catch (error) {
        console.error("[mail] Rezervasyon iptal e-postası gönderilemedi:", error);
      }
    }

    revalidateReservationPaths();
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof Error && error.message) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Rezervasyon silinirken bir hata oluştu" };
  }
}

export async function deleteReservationEntry(
  source: "WEB" | "MANUAL",
  id: string
): Promise<ActionResult<void>> {
  if (source === "WEB") {
    return deleteWebReservation(id);
  }

  const { deleteOrganization } = await import("@/actions/organizations");
  return deleteOrganization(id);
}
