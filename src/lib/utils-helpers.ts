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
