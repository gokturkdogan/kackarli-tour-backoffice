"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { AdminOrganization } from "@/actions/organizations";
import {
  calculateOrganizationPrice,
  createOrganization,
  updateOrganization,
} from "@/actions/organizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { formatDateLabel } from "@/lib/date-helpers";
import {
  formatPrice,
  organizationLeadSourceLabel,
  organizationStatusLabel,
} from "@/lib/utils-helpers";
import {
  organizationSchema,
  type OrganizationFormData,
} from "@/lib/validations";

interface TourOption {
  id: string;
  title: string;
  type: "DAY_TRIP" | "ACCOMMODATION";
  price: number;
  childPrice: number | null;
}

interface ScheduleOption {
  id: string;
  startDate: string;
  endDate: string | null;
  spotsLeft: number;
  price: number;
  childPrice: number | null;
}

interface OrganizationFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tours: TourOption[];
  initialDateKey?: string | null;
  initialTourId?: string | null;
  organization?: AdminOrganization | null;
  schedules: ScheduleOption[];
  onSchedulesNeeded: (tourId: string) => Promise<ScheduleOption[]>;
}

const defaultValues: OrganizationFormData = {
  tourId: "",
  scheduleId: "",
  tourDate: "",
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  adultCount: 2,
  childCount: 0,
  boardingPoint: "",
  note: "",
  totalPrice: 0,
  leadSource: "PHONE",
  status: "CONFIRMED",
};

export function OrganizationFormModal({
  open,
  onOpenChange,
  tours,
  initialDateKey,
  initialTourId,
  organization,
  schedules,
  onSchedulesNeeded,
}: OrganizationFormModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableSchedules, setAvailableSchedules] = useState<ScheduleOption[]>(
    schedules
  );

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues,
  });

  const watchTourId = form.watch("tourId");
  const watchScheduleId = form.watch("scheduleId");
  const watchTourDate = form.watch("tourDate");
  const watchAdultCount = form.watch("adultCount");
  const watchChildCount = form.watch("childCount");

  useEffect(() => {
    if (!open) return;

    if (organization) {
      form.reset({
        tourId: organization.tour.id,
        scheduleId: organization.schedule?.id ?? "",
        tourDate: organization.tourDate.slice(0, 10),
        firstName: organization.firstName,
        lastName: organization.lastName,
        phone: organization.phone,
        email: organization.email ?? "",
        adultCount: organization.adultCount,
        childCount: organization.childCount,
        boardingPoint: organization.boardingPoint ?? "",
        note: organization.note ?? "",
        totalPrice: organization.totalPrice,
        leadSource: organization.leadSource,
        status: organization.status,
      });
      void onSchedulesNeeded(organization.tour.id).then(setAvailableSchedules);
      return;
    }

    form.reset({
      ...defaultValues,
      tourId: initialTourId ?? tours[0]?.id ?? "",
      tourDate: initialDateKey ?? "",
      scheduleId: "",
    });
  }, [open, organization, initialDateKey, initialTourId, tours, form, onSchedulesNeeded]);

  useEffect(() => {
    if (!open || !watchTourId) return;
    void onSchedulesNeeded(watchTourId).then(setAvailableSchedules);
  }, [open, watchTourId, onSchedulesNeeded]);

  useEffect(() => {
    if (!open || !watchTourId || !watchTourDate) return;

    const timer = window.setTimeout(async () => {
      const result = await calculateOrganizationPrice({
        tourId: watchTourId,
        scheduleId: watchScheduleId || undefined,
        tourDate: watchTourDate,
        adultCount: watchAdultCount,
        childCount: watchChildCount,
      });

      if (result.success && result.data) {
        form.setValue("totalPrice", result.data.totalPrice, { shouldDirty: true });
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [
    open,
    watchTourId,
    watchScheduleId,
    watchTourDate,
    watchAdultCount,
    watchChildCount,
    form,
  ]);

  async function onSubmit(data: OrganizationFormData) {
    setIsSubmitting(true);
    const result = organization
      ? await updateOrganization({ ...data, id: organization.id })
      : await createOrganization(data);
    setIsSubmitting(false);

    if (result.success) {
      toast.success(organization ? "Organizasyon güncellendi" : "Organizasyon oluşturuldu");
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const selectedTour = tours.find((tour) => tour.id === watchTourId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-md:max-h-[90vh] max-md:overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {organization ? "Organizasyonu Düzenle" : "Yeni Organizasyon"}
          </DialogTitle>
          <DialogDescription>
            Telefon, WhatsApp veya sosyal medya üzerinden gelen kayıtlar
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Tur</Label>
              <Select
                value={watchTourId}
                onValueChange={(value) => {
                  if (!value) return;
                  form.setValue("tourId", value);
                  form.setValue("scheduleId", "");
                }}
              >
                <SelectTrigger className="w-full">
                  {selectedTour?.title ?? "Tur seçin"}
                </SelectTrigger>
                <SelectContent>
                  {tours.map((tour) => (
                    <SelectItem key={tour.id} value={tour.id}>
                      {tour.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tourDate">Tur tarihi</Label>
              <Input id="tourDate" type="date" {...form.register("tourDate")} />
            </div>

            <div className="space-y-2">
              <Label>Tur programı (opsiyonel)</Label>
              <Select
                value={watchScheduleId || "none"}
                onValueChange={(value) => {
                  if (!value) return;
                  form.setValue("scheduleId", value === "none" ? "" : value);
                }}
              >
                <SelectTrigger className="w-full">
                  {watchScheduleId
                    ? formatDateLabel(
                        availableSchedules
                          .find((schedule) => schedule.id === watchScheduleId)
                          ?.startDate.slice(0, 10) ?? watchTourDate
                      )
                    : "Program seçin"}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Program seçme</SelectItem>
                  {availableSchedules.map((schedule) => (
                    <SelectItem key={schedule.id} value={schedule.id}>
                      {formatDateLabel(schedule.startDate.slice(0, 10))} ·{" "}
                      {schedule.spotsLeft} kontenjan
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstName">Ad</Label>
              <Input id="firstName" {...form.register("firstName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Soyad</Label>
              <Input id="lastName" {...form.register("lastName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" {...form.register("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-posta (opsiyonel)</Label>
              <Input id="email" type="email" {...form.register("email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adultCount">Yetişkin</Label>
              <Input
                id="adultCount"
                type="number"
                min={1}
                {...form.register("adultCount", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="childCount">Çocuk</Label>
              <Input
                id="childCount"
                type="number"
                min={0}
                {...form.register("childCount", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label>Kaynak</Label>
              <Select
                value={form.watch("leadSource")}
                onValueChange={(value) => {
                  if (!value) return;
                  form.setValue(
                    "leadSource",
                    value as OrganizationFormData["leadSource"]
                  );
                }}
              >
                <SelectTrigger className="w-full">
                  {organizationLeadSourceLabel(form.watch("leadSource"))}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHONE">Telefon</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                  <SelectItem value="FACEBOOK">Facebook</SelectItem>
                  <SelectItem value="OTHER">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Durum</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(value) => {
                  if (!value) return;
                  form.setValue("status", value as OrganizationFormData["status"]);
                }}
              >
                <SelectTrigger className="w-full">
                  {organizationStatusLabel(form.watch("status"))}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNED">Planlandı</SelectItem>
                  <SelectItem value="CONFIRMED">Onaylandı</SelectItem>
                  <SelectItem value="COMPLETED">Tamamlandı</SelectItem>
                  <SelectItem value="CANCELLED">İptal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="boardingPoint">Biniş noktası</Label>
              <Input id="boardingPoint" {...form.register("boardingPoint")} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="note">Not</Label>
              <Textarea id="note" rows={3} {...form.register("note")} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="totalPrice">Toplam tutar</Label>
              <Input
                id="totalPrice"
                type="number"
                min={0}
                step="0.01"
                {...form.register("totalPrice", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                Otomatik hesaplanır, gerekirse düzenleyebilirsiniz.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-forest-600 hover:bg-forest-700">
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : organization ? (
                "Güncelle"
              ) : (
                "Oluştur"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
