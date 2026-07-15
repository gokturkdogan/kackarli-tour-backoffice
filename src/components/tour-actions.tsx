"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteTour, toggleTourActive } from "@/actions/tours";
import { toast } from "sonner";

interface Tour {
  id: string;
  title: string;
  isActive: boolean;
}

export function TourActions({ tour }: { tour: Tour }) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleToggle() {
    const result = await toggleTourActive(tour.id);
    if (result.success) {
      toast.success(tour.isActive ? "Tur pasife alındı" : "Tur aktifleştirildi");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleDelete() {
    const result = await deleteTour(tour.id);
    if (result.success) {
      toast.success("Tur silindi");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setDeleteOpen(false);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
          İşlemler
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={`/admin/tours/${tour.id}/edit`} />}>
            <Pencil className="h-4 w-4 mr-2" />
            Düzenle
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggle}>
            <Power className="h-4 w-4 mr-2" />
            {tour.isActive ? "Pasife Al" : "Aktifleştir"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Sil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turu sil</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{tour.title}&quot; turunu silmek istediğinize emin misiniz?
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
