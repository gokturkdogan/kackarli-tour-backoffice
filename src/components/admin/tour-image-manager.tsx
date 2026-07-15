"use client";

import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/admin/image-uploader";
import { TourImageGallery } from "@/components/admin/tour-image-gallery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addTourImage } from "@/actions/tours";
import { toast } from "sonner";

interface TourImage {
  id: string;
  imageUrl: string;
  altText: string | null;
  isCover: boolean;
  sortOrder: number;
}

interface TourImageManagerProps {
  tourId: string;
  images: TourImage[];
}

export function TourImageManager({ tourId, images }: TourImageManagerProps) {
  const router = useRouter();

  async function handleUpload(result: { imageUrl: string; publicId: string }) {
    const uploadResult = await addTourImage(
      tourId,
      result.imageUrl,
      result.publicId,
      undefined,
      images.length === 0
    );

    if (uploadResult.success) {
      toast.success("Görsel eklendi");
      router.refresh();
    } else {
      toast.error(uploadResult.error);
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Tur Görselleri</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <ImageUploader folder="tours" onUpload={handleUpload} />
        <TourImageGallery tourId={tourId} images={images} />
      </CardContent>
    </Card>
  );
}
