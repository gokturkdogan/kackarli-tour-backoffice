"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteImage } from "@/lib/cloudinary";
import { tourSchema, type TourFormData } from "@/lib/validations";
import type { ActionResult } from "@/actions/types";

export async function getTours() {
  return prisma.tour.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: {
      _count: { select: { images: true, schedules: true, reservations: true } },
    },
  });
}

export async function getTourById(id: string) {
  return prisma.tour.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      itinerary: { orderBy: [{ dayNumber: "asc" }, { sortOrder: "asc" }] },
      schedules: { orderBy: { startDate: "asc" } },
    },
  });
}

export async function createTour(
  data: TourFormData
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    const parsed = tourSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
    }

    const existing = await prisma.tour.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (existing) {
      return { success: false, error: "Bu slug zaten kullanılıyor" };
    }

    const { itinerary, childPrice, coverImageUrl, maxGroupSize, ...tourData } = parsed.data;

    const tour = await prisma.tour.create({
      data: {
        ...tourData,
        price: new Prisma.Decimal(tourData.price),
        childPrice: childPrice ? new Prisma.Decimal(childPrice) : null,
        coverImageUrl: coverImageUrl || null,
        maxGroupSize: maxGroupSize ?? null,
        itinerary: itinerary?.length
          ? {
              create: itinerary.map((item) => ({
                dayNumber: item.dayNumber,
                stopType: item.stopType,
                time: item.time || null,
                title: item.title,
                description: item.description,
                duration: item.duration || null,
                imageUrl: item.imageUrl || null,
                isFeatured: item.isFeatured,
                sortOrder: item.sortOrder,
              })),
            }
          : undefined,
      },
    });

    revalidatePath("/admin/tours");
    revalidatePath("/");
    revalidatePath("/turlar");
    return { success: true, data: { id: tour.id } };
  } catch {
    return { success: false, error: "Tur oluşturulurken bir hata oluştu" };
  }
}

export async function updateTour(
  id: string,
  data: TourFormData
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = tourSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Geçersiz veri" };
    }

    const existing = await prisma.tour.findFirst({
      where: { slug: parsed.data.slug, NOT: { id } },
    });
    if (existing) {
      return { success: false, error: "Bu slug zaten kullanılıyor" };
    }

    const { itinerary, childPrice, coverImageUrl, maxGroupSize, ...tourData } = parsed.data;

    await prisma.$transaction(async (tx) => {
      await tx.tourItineraryItem.deleteMany({ where: { tourId: id } });
      await tx.tour.update({
        where: { id },
        data: {
          ...tourData,
          price: new Prisma.Decimal(tourData.price),
          childPrice: childPrice ? new Prisma.Decimal(childPrice) : null,
          coverImageUrl: coverImageUrl || null,
          maxGroupSize: maxGroupSize ?? null,
          itinerary: itinerary?.length
            ? {
                create: itinerary.map((item) => ({
                  dayNumber: item.dayNumber,
                  stopType: item.stopType,
                  time: item.time || null,
                  title: item.title,
                  description: item.description,
                  duration: item.duration || null,
                  imageUrl: item.imageUrl || null,
                  isFeatured: item.isFeatured,
                  sortOrder: item.sortOrder,
                })),
              }
            : undefined,
        },
      });
    });

    revalidatePath("/admin/tours");
    revalidatePath(`/admin/tours/${id}/edit`);
    revalidatePath("/");
    revalidatePath("/turlar");
    revalidatePath(`/turlar/${parsed.data.slug}`);
    return { success: true };
  } catch {
    return { success: false, error: "Tur güncellenirken bir hata oluştu" };
  }
}

export async function toggleTourActive(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const tour = await prisma.tour.findUnique({ where: { id } });
    if (!tour) {
      return { success: false, error: "Tur bulunamadı" };
    }
    await prisma.tour.update({
      where: { id },
      data: { isActive: !tour.isActive },
    });
    revalidatePath("/admin/tours");
    return { success: true };
  } catch {
    return { success: false, error: "Durum güncellenirken bir hata oluştu" };
  }
}

export async function deleteTour(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const images = await prisma.tourImage.findMany({ where: { tourId: id } });
    await prisma.tour.delete({ where: { id } });

    for (const image of images) {
      if (image.publicId) {
        try {
          await deleteImage(image.publicId);
        } catch {
          // Cloudinary deletion is best-effort
        }
      }
    }

    revalidatePath("/admin/tours");
    return { success: true };
  } catch {
    return { success: false, error: "Tur silinirken bir hata oluştu" };
  }
}

export async function addTourImage(
  tourId: string,
  imageUrl: string,
  publicId: string,
  altText?: string,
  isCover = false
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();

    const imageCount = await prisma.tourImage.count({ where: { tourId } });

    const image = await prisma.$transaction(async (tx) => {
      if (isCover) {
        await tx.tourImage.updateMany({
          where: { tourId },
          data: { isCover: false },
        });
        await tx.tour.update({
          where: { id: tourId },
          data: { coverImageUrl: imageUrl },
        });
      }

      return tx.tourImage.create({
        data: {
          tourId,
          imageUrl,
          publicId,
          altText,
          isCover: isCover || imageCount === 0,
          sortOrder: imageCount,
        },
      });
    });

    revalidatePath(`/admin/tours/${tourId}/edit`);
    return { success: true, data: { id: image.id } };
  } catch {
    return { success: false, error: "Görsel eklenirken bir hata oluştu" };
  }
}

export async function deleteTourImage(imageId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const image = await prisma.tourImage.findUnique({ where: { id: imageId } });
    if (!image) {
      return { success: false, error: "Görsel bulunamadı" };
    }

    await prisma.tourImage.delete({ where: { id: imageId } });

    if (image.publicId) {
      try {
        await deleteImage(image.publicId);
      } catch {
        // best-effort
      }
    }

    if (image.isCover) {
      const nextImage = await prisma.tourImage.findFirst({
        where: { tourId: image.tourId },
        orderBy: { sortOrder: "asc" },
      });
      if (nextImage) {
        await prisma.$transaction([
          prisma.tourImage.update({
            where: { id: nextImage.id },
            data: { isCover: true },
          }),
          prisma.tour.update({
            where: { id: image.tourId },
            data: { coverImageUrl: nextImage.imageUrl },
          }),
        ]);
      } else {
        await prisma.tour.update({
          where: { id: image.tourId },
          data: { coverImageUrl: null },
        });
      }
    }

    revalidatePath(`/admin/tours/${image.tourId}/edit`);
    return { success: true };
  } catch {
    return { success: false, error: "Görsel silinirken bir hata oluştu" };
  }
}

export async function setTourCoverImage(imageId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const image = await prisma.tourImage.findUnique({ where: { id: imageId } });
    if (!image) {
      return { success: false, error: "Görsel bulunamadı" };
    }

    await prisma.$transaction([
      prisma.tourImage.updateMany({
        where: { tourId: image.tourId },
        data: { isCover: false },
      }),
      prisma.tourImage.update({
        where: { id: imageId },
        data: { isCover: true },
      }),
      prisma.tour.update({
        where: { id: image.tourId },
        data: { coverImageUrl: image.imageUrl },
      }),
    ]);

    revalidatePath(`/admin/tours/${image.tourId}/edit`);
    return { success: true };
  } catch {
    return { success: false, error: "Kapak görseli güncellenirken bir hata oluştu" };
  }
}
