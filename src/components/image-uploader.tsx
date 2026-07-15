"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ImageUploaderProps {
  folder?: string;
  onUpload: (result: { imageUrl: string; publicId: string }) => void;
  className?: string;
  label?: string;
}

export function ImageUploader({
  folder = "general",
  onUpload,
  className,
  label = "Görsel Yükle",
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setPreview(URL.createObjectURL(file));
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Yükleme başarısız");
        }

        onUpload(data);
        toast.success("Görsel başarıyla yüklendi");
      } catch (error) {
        setPreview(null);
        toast.error(
          error instanceof Error ? error.message : "Görsel yüklenemedi"
        );
      } finally {
        setIsUploading(false);
        e.target.value = "";
      }
    },
    [folder, onUpload]
  );

  return (
    <div className={cn("space-y-3", className)}>
      <label
        className={cn(
          "flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
          "border-earth-300 hover:border-forest-400 hover:bg-forest-50/50",
          isUploading && "pointer-events-none opacity-60"
        )}
      >
        {preview ? (
          <div className="relative w-full h-full">
            <Image
              src={preview}
              alt="Önizleme"
              fill
              className="object-cover rounded-lg"
            />
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6">
            <Upload className="h-8 w-8 text-forest-400 mb-2" />
            <p className="text-sm text-forest-700 font-medium">{label}</p>
            <p className="text-xs text-muted-foreground mt-1">
              JPEG, PNG, WebP — max 5MB
            </p>
          </div>
        )}
        <input
          type="file"
          className="hidden"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </label>
      {preview && !isUploading && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPreview(null)}
          className="w-full"
        >
          <X className="h-4 w-4 mr-2" />
          Önizlemeyi Temizle
        </Button>
      )}
    </div>
  );
}
