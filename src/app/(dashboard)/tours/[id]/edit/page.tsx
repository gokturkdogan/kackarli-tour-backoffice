import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
import { TourForm } from "@/components/admin/tour-form";
import { TourImageManager } from "@/components/admin/tour-image-manager";
import { getTourById } from "@/actions/tours";

interface EditTourPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTourPage({ params }: EditTourPageProps) {
  const { id } = await params;
  const tour = await getTourById(id);

  if (!tour) notFound();

  const formData = {
    id: tour.id,
    title: tour.title,
    slug: tour.slug,
    subtitle: tour.subtitle ?? "",
    description: tour.description,
    shortDescription: tour.shortDescription ?? "",
    type: tour.type,
    price: Number(tour.price),
    childPrice: tour.childPrice ? Number(tour.childPrice) : undefined,
    duration: tour.duration ?? "",
    distance: tour.distance ?? "",
    departureTime: tour.departureTime ?? "",
    returnTime: tour.returnTime ?? "",
    maxGroupSize: tour.maxGroupSize ?? undefined,
    highlights: tour.highlights ?? "",
    coverImageUrl: tour.coverImageUrl ?? undefined,
    includedServices: tour.includedServices ?? "",
    excludedServices: tour.excludedServices ?? "",
    boardingPoints: tour.boardingPoints ?? "",
    isActive: tour.isActive,
    sortOrder: tour.sortOrder,
    itinerary: tour.itinerary.map((item) => ({
      dayNumber: item.dayNumber,
      stopType: item.stopType,
      time: item.time ?? "",
      title: item.title,
      description: item.description,
      duration: item.duration ?? "",
      imageUrl: item.imageUrl ?? "",
      isFeatured: item.isFeatured,
      sortOrder: item.sortOrder,
    })),
  };

  return (
    <>
      <AdminHeader title="Tur Düzenle" description={tour.title} />
      <div className="p-6">
        <TourForm initialData={formData} />
        <TourImageManager tourId={tour.id} images={tour.images} />
      </div>
    </>
  );
}
