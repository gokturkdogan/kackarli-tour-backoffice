"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ReservationEntry } from "@/actions/reservation-hub";
import { updateWebReservation } from "@/actions/reservations";
import {
  calculateOrganizationPrice,
  createOrganization,
  getSchedulesForOrganizationForm,
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
import {
  organizationLeadSourceLabel,
  organizationStatusLabel,
  reservationStatusLabel,
} from "@/lib/utils-helpers";
import {
  organizationSchema,
  type OrganizationFormData,
} from "@/lib/validations";
import { z } from "zod";

interface TourOption {
  id: string;
  title: string;
}

const webEditSchema = z.object({
  tourId: z.string().min(1, "Tur seçimi gereklidir"),
  tourDate: z.string().min(1, "Tur tarihi gereklidir"),
  firstName: z.string().min(2, "Ad en az 2 karakter olmalıdır"),
  lastName: z.string().min(2, "Soyad en az 2 karakter olmalıdır"),
  phone: z
    .string()
    .min(10, "Geçerli bir telefon numarası giriniz")
    .regex(/^[\d\s+()-]+$/, "Geçerli bir telefon numarası giriniz"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  adultCount: z.number().int().min(1, "En az 1 yetişkin olmalıdır"),
  childCount: z.number().int().min(0),
  boardingPoint: z.string().optional(),
  note: z.string().max(2000).optional(),
  status: z.enum(["PENDING", "CONTACTED", "CONFIRMED", "CANCELLED", "COMPLETED"]),
});

type WebEditFormData = z.infer<typeof webEditSchema>;

interface ReservationEntryFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tours: TourOption[];
  entry: ReservationEntry | null;
  mode: "create-manual" | "edit";
  initialDateKey?: string | null;
  initialTourId?: string | null;
  initialFocus?: boolean;
  finalFocus?: boolean;
}

async function resolveScheduleId(tourId: string, tourDate: string) {
  const schedules = await getSchedulesForOrganizationForm(tourId);
  return schedules.find((schedule) => schedule.startDate.slice(0, 10) === tourDate)?.id ?? null;
}

export function ReservationEntryFormModal({
  open,
  onOpenChange,
  tours,
  entry,
  mode,
  initialDateKey,
  initialTourId,
  initialFocus = true,
  finalFocus = true,
}: ReservationEntryFormModalProps) {
  const router = useRouter();
  const isWeb = entry?.source === "WEB";
  const [isSubmitting, setIsSubmitting] = useState(false);

  const manualForm = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
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
    },
  });

  const webForm = useForm<WebEditFormData>({
    resolver: zodResolver(webEditSchema),
  });

  const activeTourId = isWeb ? webForm.watch("tourId") : manualForm.watch("tourId");
  const activeTourDate = isWeb ? webForm.watch("tourDate") : manualForm.watch("tourDate");
  const activeAdults = isWeb ? webForm.watch("adultCount") : manualForm.watch("adultCount");
  const activeChildren = isWeb ? webForm.watch("childCount") : manualForm.watch("childCount");

  useEffect(() => {
    if (!open) return;

    if (entry?.source === "WEB") {
      webForm.reset({
        tourId: entry.tour.id,
        tourDate: entry.tourDateKey,
        firstName: entry.firstName,
        lastName: entry.lastName,
        phone: entry.phone,
        email: entry.email ?? "",
        adultCount: entry.adultCount,
        childCount: entry.childCount,
        boardingPoint: entry.boardingPoint ?? "",
        note: entry.note ?? "",
        status: entry.status as WebEditFormData["status"],
      });
      return;
    }

    if (entry?.source === "MANUAL") {
      manualForm.reset({
        tourId: entry.tour.id,
        scheduleId: "",
        tourDate: entry.tourDateKey,
        firstName: entry.firstName,
        lastName: entry.lastName,
        phone: entry.phone,
        email: entry.email ?? "",
        adultCount: entry.adultCount,
        childCount: entry.childCount,
        boardingPoint: entry.boardingPoint ?? "",
        note: entry.note ?? "",
        totalPrice: entry.totalPrice,
        leadSource: entry.leadSource ?? "PHONE",
        status: entry.status as OrganizationFormData["status"],
      });
      return;
    }

    manualForm.reset({
      tourId: initialTourId ?? tours[0]?.id ?? "",
      tourDate: initialDateKey ?? "",
      scheduleId: "",
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
    });
  }, [open, entry, initialDateKey, initialTourId, tours, manualForm, webForm]);

  useEffect(() => {
    if (!open || isWeb || !activeTourId || !activeTourDate) return;

    const timer = window.setTimeout(async () => {
      const result = await calculateOrganizationPrice({
        tourId: activeTourId,
        tourDate: activeTourDate,
        adultCount: activeAdults,
        childCount: activeChildren,
      });
      if (result.success && result.data) {
        manualForm.setValue("totalPrice", result.data.totalPrice);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [open, isWeb, activeTourId, activeTourDate, activeAdults, activeChildren, manualForm]);

  async function onSubmitManual(data: OrganizationFormData) {
    setIsSubmitting(true);
    const payload = { ...data, scheduleId: "" };
    const result =
      entry?.source === "MANUAL"
        ? await updateOrganization({ ...payload, id: entry.id })
        : await createOrganization(payload);
    setIsSubmitting(false);

    if (result.success) {
      toast.success(entry ? "Kayıt güncellendi" : "Manuel kayıt oluşturuldu");
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function onSubmitWeb(data: WebEditFormData) {
    if (!entry) return;

    const scheduleId = await resolveScheduleId(data.tourId, data.tourDate);
    if (!scheduleId) {
      toast.error("Seçilen tur ve tarih için aktif bir tur programı bulunamadı");
      return;
    }

    setIsSubmitting(true);
    const result = await updateWebReservation({
      id: entry.id,
      tourId: data.tourId,
      scheduleId,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      adultCount: data.adultCount,
      childCount: data.childCount,
      boardingPoint: data.boardingPoint,
      note: data.note,
      status: data.status,
    });
    setIsSubmitting(false);

    if (result.success) {
      toast.success("Rezervasyon güncellendi");
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const title =
    mode === "create-manual"
      ? "Manuel Rezervasyon Ekle"
      : isWeb
        ? "Site Rezervasyonunu Düzenle"
        : "Manuel Kaydı Düzenle";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xl max-md:max-h-[90vh] max-md:overflow-y-auto"
        initialFocus={initialFocus}
        finalFocus={finalFocus}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isWeb
              ? "Değişiklikler müşteriye e-posta ile bildirilir."
              : "Telefon veya sosyal medya üzerinden gelen kayıtlar"}
          </DialogDescription>
        </DialogHeader>

        {isWeb ? (
          <form onSubmit={webForm.handleSubmit(onSubmitWeb)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Tur</Label>
                <Select
                  value={webForm.watch("tourId")}
                  onValueChange={(value) => value && webForm.setValue("tourId", value)}
                >
                  <SelectTrigger className="w-full">
                    {tours.find((tour) => tour.id === webForm.watch("tourId"))?.title ??
                      "Tur seçin"}
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
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="webTourDate">Tur tarihi</Label>
                <Input id="webTourDate" type="date" {...webForm.register("tourDate")} />
              </div>
              <div className="space-y-2">
                <Label>Ad</Label>
                <Input {...webForm.register("firstName")} />
              </div>
              <div className="space-y-2">
                <Label>Soyad</Label>
                <Input {...webForm.register("lastName")} />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input {...webForm.register("phone")} />
              </div>
              <div className="space-y-2">
                <Label>E-posta</Label>
                <Input type="email" {...webForm.register("email")} />
              </div>
              <div className="space-y-2">
                <Label>Yetişkin</Label>
                <Input
                  type="number"
                  min={1}
                  {...webForm.register("adultCount", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label>Çocuk</Label>
                <Input
                  type="number"
                  min={0}
                  {...webForm.register("childCount", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Durum</Label>
                <Select
                  value={webForm.watch("status")}
                  onValueChange={(value) =>
                    value &&
                    webForm.setValue("status", value as WebEditFormData["status"])
                  }
                >
                  <SelectTrigger className="w-full">
                    {reservationStatusLabel(webForm.watch("status"))}
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      ["PENDING", "CONTACTED", "CONFIRMED", "COMPLETED", "CANCELLED"] as const
                    ).map((status) => (
                      <SelectItem key={status} value={status}>
                        {reservationStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Biniş noktası</Label>
                <Input {...webForm.register("boardingPoint")} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Not</Label>
                <Textarea rows={3} {...webForm.register("note")} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Vazgeç
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-forest-600 hover:bg-forest-700"
              >
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Kaydet"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={manualForm.handleSubmit(onSubmitManual)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Tur</Label>
                <Select
                  value={manualForm.watch("tourId")}
                  onValueChange={(value) => value && manualForm.setValue("tourId", value)}
                >
                  <SelectTrigger className="w-full">
                    {tours.find((tour) => tour.id === manualForm.watch("tourId"))?.title ??
                      "Tur seçin"}
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
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="manualTourDate">Tur tarihi</Label>
                <Input id="manualTourDate" type="date" {...manualForm.register("tourDate")} />
              </div>
              <div className="space-y-2">
                <Label>Ad</Label>
                <Input {...manualForm.register("firstName")} />
              </div>
              <div className="space-y-2">
                <Label>Soyad</Label>
                <Input {...manualForm.register("lastName")} />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input {...manualForm.register("phone")} />
              </div>
              <div className="space-y-2">
                <Label>E-posta</Label>
                <Input type="email" {...manualForm.register("email")} />
              </div>
              <div className="space-y-2">
                <Label>Yetişkin</Label>
                <Input
                  type="number"
                  min={1}
                  {...manualForm.register("adultCount", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label>Çocuk</Label>
                <Input
                  type="number"
                  min={0}
                  {...manualForm.register("childCount", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label>Kaynak</Label>
                <Select
                  value={manualForm.watch("leadSource")}
                  onValueChange={(value) =>
                    value &&
                    manualForm.setValue(
                      "leadSource",
                      value as OrganizationFormData["leadSource"]
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    {organizationLeadSourceLabel(manualForm.watch("leadSource"))}
                  </SelectTrigger>
                  <SelectContent>
                    {(["PHONE", "WHATSAPP", "INSTAGRAM", "FACEBOOK", "OTHER"] as const).map(
                      (source) => (
                        <SelectItem key={source} value={source}>
                          {organizationLeadSourceLabel(source)}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Durum</Label>
                <Select
                  value={manualForm.watch("status")}
                  onValueChange={(value) =>
                    value &&
                    manualForm.setValue("status", value as OrganizationFormData["status"])
                  }
                >
                  <SelectTrigger className="w-full">
                    {organizationStatusLabel(manualForm.watch("status"))}
                  </SelectTrigger>
                  <SelectContent>
                    {(["PLANNED", "CONFIRMED", "COMPLETED", "CANCELLED"] as const).map(
                      (status) => (
                        <SelectItem key={status} value={status}>
                          {organizationStatusLabel(status)}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Toplam tutar</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  {...manualForm.register("totalPrice", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Not</Label>
                <Textarea rows={3} {...manualForm.register("note")} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Vazgeç
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-forest-600 hover:bg-forest-700"
              >
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Kaydet"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
