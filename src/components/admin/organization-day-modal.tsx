"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { AdminOrganization } from "@/actions/organizations";
import { deleteOrganization } from "@/actions/organizations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateLabel } from "@/lib/date-helpers";
import {
  formatPrice,
  organizationLeadSourceBadgeClass,
  organizationLeadSourceLabel,
  organizationStatusBadgeClass,
  organizationStatusLabel,
} from "@/lib/utils-helpers";

interface OrganizationDayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateKey: string | null;
  organizations: AdminOrganization[];
  onCreate: () => void;
  onEdit: (organization: AdminOrganization) => void;
}

export function OrganizationDayModal({
  open,
  onOpenChange,
  dateKey,
  organizations,
  onCreate,
  onEdit,
}: OrganizationDayModalProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<AdminOrganization | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const totalGuests = organizations.reduce(
    (sum, org) => sum + org.adultCount + org.childCount,
    0
  );

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const result = await deleteOrganization(deleteTarget.id);
    setIsDeleting(false);

    if (result.success) {
      toast.success("Organizasyon silindi");
      setDeleteTarget(null);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-md:max-h-[90vh] max-md:overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dateKey ? formatDateLabel(dateKey) : "Organizasyonlar"}
            </DialogTitle>
            <DialogDescription>
              {organizations.length} organizasyon · {totalGuests} kişi
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {organizations.length === 0 ? (
              <div className="rounded-lg border border-dashed border-forest-200 bg-forest-50/40 p-8 text-center text-muted-foreground">
                Bu tarihte henüz organizasyon yok.
              </div>
            ) : (
              organizations.map((organization) => {
                const guestCount = organization.adultCount + organization.childCount;

                return (
                  <div
                    key={organization.id}
                    className="rounded-xl border border-forest-100 bg-white p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-forest-900">
                          {organization.firstName} {organization.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {organization.phone}
                          {organization.email ? ` · ${organization.email}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => onEdit(organization)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-rose-600 hover:text-rose-700"
                          onClick={() => setDeleteTarget(organization)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="bg-forest-50 text-forest-900">
                        {organization.tour.title}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={organizationLeadSourceBadgeClass(organization.leadSource)}
                      >
                        {organizationLeadSourceLabel(organization.leadSource)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={organizationStatusBadgeClass(organization.status)}
                      >
                        {organizationStatusLabel(organization.status)}
                      </Badge>
                    </div>

                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <p>
                        <span className="text-muted-foreground">Kişi:</span>{" "}
                        {guestCount} ({organization.adultCount} yetişkin
                        {organization.childCount > 0
                          ? `, ${organization.childCount} çocuk`
                          : ""}
                        )
                      </p>
                      <p>
                        <span className="text-muted-foreground">Toplam:</span>{" "}
                        {formatPrice(organization.totalPrice)}
                      </p>
                      {organization.boardingPoint ? (
                        <p className="sm:col-span-2">
                          <span className="text-muted-foreground">Biniş:</span>{" "}
                          {organization.boardingPoint}
                        </p>
                      ) : null}
                      {organization.note ? (
                        <p className="sm:col-span-2">
                          <span className="text-muted-foreground">Not:</span>{" "}
                          {organization.note}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              className="bg-forest-600 hover:bg-forest-700"
              onClick={onCreate}
            >
              <Plus className="size-4" />
              Yeni Organizasyon
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Organizasyonu sil</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `${deleteTarget.firstName} ${deleteTarget.lastName} kaydı kalıcı olarak silinecek.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700"
              onClick={handleDelete}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
