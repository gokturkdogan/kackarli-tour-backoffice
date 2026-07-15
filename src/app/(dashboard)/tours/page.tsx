import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { PageContent } from "@/components/admin/page-content";
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
      <PageContent>
        <div className="flex justify-end">
          <Link
            href="/tours/new"
            className={cn(buttonVariants(), "bg-forest-600 hover:bg-forest-700 w-full sm:w-auto")}
          >
            <Plus className="h-4 w-4 mr-2" />
            Yeni Tur
          </Link>
        </div>

        {tours.length === 0 ? (
          <div className="rounded-lg border border-forest-100 bg-white p-8 text-center text-muted-foreground">
            Henüz tur eklenmemiş
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {tours.map((tour) => (
                <div
                  key={tour.id}
                  className="rounded-lg border border-forest-100 bg-white p-4 space-y-3"
                >
                  <div className="flex gap-3">
                    <div className="relative h-16 w-20 shrink-0 rounded overflow-hidden bg-forest-100">
                      {tour.coverImageUrl ? (
                        <Image
                          src={tour.coverImageUrl}
                          alt={tour.title}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                          —
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-forest-900">{tour.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{tour.slug}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge variant="outline">{tourTypeLabel(tour.type)}</Badge>
                        <Badge
                          variant={tour.isActive ? "default" : "secondary"}
                          className={tour.isActive ? "bg-forest-600" : undefined}
                        >
                          {tour.isActive ? "Aktif" : "Pasif"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-forest-50">
                    <span className="font-medium text-forest-900">
                      {formatPrice(tour.price.toString())}
                    </span>
                    <TourActions tour={tour} />
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block rounded-lg border border-forest-100 bg-white overflow-hidden">
              <div className="overflow-x-auto">
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
                    {tours.map((tour) => (
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
                          <Badge variant="outline">{tourTypeLabel(tour.type)}</Badge>
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
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </PageContent>
    </>
  );
}
