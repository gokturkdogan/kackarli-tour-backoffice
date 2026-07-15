import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTours } from "@/actions/tours";
import { formatPrice, tourTypeLabel } from "@/lib/utils-helpers";
import { TourActions } from "@/components/admin/tour-actions";

export default async function ToursPage() {
  const tours = await getTours();

  return (
    <>
      <AdminHeader title="Turlar" description="Turları yönetin" />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <Link
            href="/admin/tours/new"
            className={cn(buttonVariants(), "bg-forest-600 hover:bg-forest-700")}
          >
            <Plus className="h-4 w-4 mr-2" />
            Yeni Tur
          </Link>
        </div>

        <div className="rounded-lg border border-forest-100 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Görsel</TableHead>
                <TableHead>Başlık</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Fiyat</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tours.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Henüz tur eklenmemiş
                  </TableCell>
                </TableRow>
              ) : (
                tours.map((tour) => (
                  <TableRow key={tour.id}>
                    <TableCell>
                      <div className="relative h-10 w-14 rounded overflow-hidden bg-forest-100">
                        {tour.coverImageUrl ? (
                          <Image
                            src={tour.coverImageUrl}
                            alt={tour.title}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                            —
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{tour.title}</p>
                        <p className="text-xs text-muted-foreground">{tour.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {tourTypeLabel(tour.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatPrice(tour.price.toString())}</TableCell>
                    <TableCell>
                      <Badge
                        variant={tour.isActive ? "default" : "secondary"}
                        className={tour.isActive ? "bg-forest-600" : undefined}
                      >
                        {tour.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <TourActions tour={tour} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
