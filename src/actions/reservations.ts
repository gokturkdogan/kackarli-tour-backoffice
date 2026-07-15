"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import type { ReservationStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { reservationStatusUpdateSchema } from "@/lib/validations";
import type { ActionResult } from "@/actions/types";

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
  };
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
    schedule: { id: string; startDate: Date; endDate: Date | null };
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
    schedule: {
      id: reservation.schedule.id,
      startDate: reservation.schedule.startDate.toISOString(),
      endDate: reservation.schedule.endDate?.toISOString() ?? null,
    },
  };
}

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

      const guestCount = reservation.adultCount + reservation.childCount;
      const wasCancelled = reservation.status === "CANCELLED";
      const willCancel = parsed.data.status === "CANCELLED";

      if (!wasCancelled && willCancel) {
        await tx.tourSchedule.update({
          where: { id: reservation.scheduleId },
          data: {
            reservedCount: { decrement: guestCount },
          },
        });
      }

      if (wasCancelled && !willCancel) {
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

    revalidatePath("/admin/reservations");
    revalidatePath("/admin/schedules");
    revalidatePath("/admin");

    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof Error && error.message) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Rezervasyon güncellenirken bir hata oluştu" };
  }
}
