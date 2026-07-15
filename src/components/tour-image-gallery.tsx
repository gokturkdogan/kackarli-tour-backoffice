"use client";

import Image from "next/image";
import { Star, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteTourImage, setTourCoverImage } from "@/actions/tours";
import { toast } from "sonner";
import { useState } from "react";

interface TourImage {
  id: string;
  imageUrl: string;
  altText: string | null;
  isCover: boolean;
  sortOrder: number;
}

interface TourImageGalleryProps {
  tourId: string;
  images: TourImage[];
}

export function TourImageGallery({ images }: TourImageGalleryProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleSetCover(imageId: string) {
    setLoadingId(imageId);
    const result = await setTourCoverImage(imageId);
    setLoadingId(null);
    if (result.success) {
      toast.success("Kapak görseli güncellendi");
    } else {
      toast.error(result.error);
    }
  }

  async function handleDelete(imageId: string) {
    if (!confirm("Bu görseli silmek istediğinize emin misiniz?")) return;
    setLoadingId(imageId);
    const result = await deleteTourImage(imageId);
    setLoadingId(null);
    if (result.success) {
      toast.success("Görsel silindi");
    } else {
      toast.error(result.error);
    }
  }

  if (images.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Henüz görsel eklenmemiş
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {images.map((image) => (
        <div
          key={image.id}
          className="relative group rounded-lg overflow-hidden border border-border aspect-[4/3]"
        >
          <Image
            src={image.imageUrl}
            alt={image.altText || "Tur görseli"}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
          {image.isCover && (
            <Badge className="absolute top-2 left-2 bg-forest-600">
              Kapak
            </Badge>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            {loadingId === image.id ? (
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            ) : (
              <>
                {!image.isCover && (
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => handleSetCover(image.id)}
                    title="Kapak yap"
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => handleDelete(image.id)}
                  title="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
