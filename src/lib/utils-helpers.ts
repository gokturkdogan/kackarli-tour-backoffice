export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatPrice(price: number | string): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(num);
}

export function tourTypeLabel(type: "DAY_TRIP" | "ACCOMMODATION"): string {
  return type === "DAY_TRIP" ? "Günübirlik" : "Konaklamalı";
}

export type ReservationStatusValue =
  | "PENDING"
  | "CONTACTED"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED";

export function reservationStatusLabel(status: ReservationStatusValue): string {
  const labels: Record<ReservationStatusValue, string> = {
    PENDING: "Bekliyor",
    CONTACTED: "İletişime Geçildi",
    CONFIRMED: "Onaylandı",
    CANCELLED: "İptal",
    COMPLETED: "Tamamlandı",
  };
  return labels[status];
}

export function reservationStatusBadgeClass(status: ReservationStatusValue): string {
  const classes: Record<ReservationStatusValue, string> = {
    PENDING: "bg-amber-100 text-amber-900 hover:bg-amber-100 border-amber-200",
    CONTACTED: "bg-sky-100 text-sky-900 hover:bg-sky-100 border-sky-200",
    CONFIRMED: "bg-forest-600 text-white hover:bg-forest-600 border-transparent",
    CANCELLED: "bg-rose-100 text-rose-900 hover:bg-rose-100 border-rose-200",
    COMPLETED: "bg-sage-100 text-sage-900 hover:bg-sage-100 border-sage-200",
  };
  return classes[status];
}

export type OrganizationLeadSourceValue =
  | "PHONE"
  | "WHATSAPP"
  | "INSTAGRAM"
  | "FACEBOOK"
  | "OTHER";

export type OrganizationStatusValue =
  | "PLANNED"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED";

export function organizationLeadSourceLabel(source: OrganizationLeadSourceValue): string {
  const labels: Record<OrganizationLeadSourceValue, string> = {
    PHONE: "Telefon",
    WHATSAPP: "WhatsApp",
    INSTAGRAM: "Instagram",
    FACEBOOK: "Facebook",
    OTHER: "Diğer",
  };
  return labels[source];
}

export function organizationLeadSourceBadgeClass(source: OrganizationLeadSourceValue): string {
  const classes: Record<OrganizationLeadSourceValue, string> = {
    PHONE: "bg-sky-100 text-sky-900 border-sky-200",
    WHATSAPP: "bg-emerald-100 text-emerald-900 border-emerald-200",
    INSTAGRAM: "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200",
    FACEBOOK: "bg-blue-100 text-blue-900 border-blue-200",
    OTHER: "bg-stone-100 text-stone-900 border-stone-200",
  };
  return classes[source];
}

export function organizationStatusLabel(status: OrganizationStatusValue): string {
  const labels: Record<OrganizationStatusValue, string> = {
    PLANNED: "Planlandı",
    CONFIRMED: "Onaylandı",
    CANCELLED: "İptal",
    COMPLETED: "Tamamlandı",
  };
  return labels[status];
}

export function organizationStatusBadgeClass(status: OrganizationStatusValue): string {
  const classes: Record<OrganizationStatusValue, string> = {
    PLANNED: "bg-amber-100 text-amber-900 border-amber-200",
    CONFIRMED: "bg-forest-600 text-white border-transparent",
    CANCELLED: "bg-rose-100 text-rose-900 border-rose-200",
    COMPLETED: "bg-sage-100 text-sage-900 border-sage-200",
  };
  return classes[status];
}

export function reservationSourceLabel(source: "WEB" | "MANUAL"): string {
  return source === "WEB" ? "Site talebi" : "Manuel kayıt";
}

export function reservationSourceBadgeClass(source: "WEB" | "MANUAL"): string {
  return source === "WEB"
    ? "bg-sky-100 text-sky-900 border-sky-200"
    : "bg-violet-100 text-violet-900 border-violet-200";
}

export function unifiedStatusLabel(
  source: "WEB" | "MANUAL",
  status: string
): string {
  if (source === "WEB") {
    return reservationStatusLabel(status as ReservationStatusValue);
  }
  return organizationStatusLabel(status as OrganizationStatusValue);
}

export function unifiedStatusBadgeClass(
  source: "WEB" | "MANUAL",
  status: string
): string {
  if (source === "WEB") {
    return reservationStatusBadgeClass(status as ReservationStatusValue);
  }
  return organizationStatusBadgeClass(status as OrganizationStatusValue);
}

export function isConfirmedReservationEntry(entry: { status: string }): boolean {
  return entry.status === "CONFIRMED";
}

export function confirmedGuestCount(entry: {
  status: string;
  adultCount: number;
  childCount: number;
}): number {
  if (!isConfirmedReservationEntry(entry)) return 0;
  return entry.adultCount + entry.childCount;
}
