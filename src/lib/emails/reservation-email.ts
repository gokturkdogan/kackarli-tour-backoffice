import { formatScheduleLabel } from "@/lib/date-helpers";
import { parseMultilineList } from "@/lib/tour-mapper";
import { sendMail } from "@/lib/mail/send-mail";
import { formatPrice } from "@/lib/utils-helpers";

export interface ReservationEmailItineraryStop {
  time?: string;
  title: string;
  duration?: string;
  stopLabel?: string;
}

export interface ReservationEmailData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tourTitle: string;
  tourSubtitle?: string | null;
  scheduleLabel: string;
  tourDuration?: string | null;
  tourTimeRange?: string | null;
  adultCount: number;
  childCount: number;
  totalPrice: number;
  boardingPoint?: string | null;
  note?: string | null;
  itineraryStops: ReservationEmailItineraryStop[];
  includedHighlights: string[];
}

export type ReservationEmailVariant =
  | "created"
  | "contacted"
  | "confirmed"
  | "cancelled"
  | "completed";

const VARIANT_CONFIG: Record<
  ReservationEmailVariant,
  { title: string; intro: string; subject: string; accent: string; badge: string; badgeBg: string }
> = {
  created: {
    title: "Rezervasyon Talebiniz Alındı",
    intro:
      "rezervasyon talebiniz başarıyla oluşturuldu. En kısa sürede sizinle iletişime geçeceğiz.",
    subject: "Rezervasyon talebiniz alındı — Kaçkarlı Tur",
    accent: "#1e3d2f",
    badge: "Beklemede",
    badgeBg: "#d4a574",
  },
  contacted: {
    title: "Rezervasyonunuzla İlgileniyoruz",
    intro:
      "rezervasyon talebinizle ilgili ekibimiz sizinle iletişime geçti veya en kısa sürede dönüş yapacaktır.",
    subject: "Rezervasyonunuzla ilgileniyoruz — Kaçkarlı Tur",
    accent: "#1e4a6b",
    badge: "İletişimde",
    badgeBg: "#a8cce8",
  },
  confirmed: {
    title: "Rezervasyonunuz Onaylandı",
    intro: "rezervasyonunuz onaylandı. Tur günü görüşmek üzere!",
    subject: "Rezervasyonunuz onaylandı — Kaçkarlı Tur",
    accent: "#1f6b3a",
    badge: "Onaylandı",
    badgeBg: "#7cb87c",
  },
  cancelled: {
    title: "Rezervasyonunuz İptal Edildi",
    intro: "rezervasyonunuz iptal edilmiştir. Detaylar aşağıdadır.",
    subject: "Rezervasyonunuz iptal edildi — Kaçkarlı Tur",
    accent: "#7a2e2e",
    badge: "İptal",
    badgeBg: "#e8a0a0",
  },
  completed: {
    title: "Turunuz Tamamlandı",
    intro: "bizimle gezindiğiniz için teşekkür ederiz. Bir sonraki macerada görüşmek üzere!",
    subject: "Teşekkürler — Kaçkarlı Tur",
    accent: "#2d5a3d",
    badge: "Tamamlandı",
    badgeBg: "#b8d4b8",
  },
};

function guestSummary(adultCount: number, childCount: number): string {
  if (childCount > 0) {
    return `${adultCount} yetişkin, ${childCount} çocuk`;
  }
  return `${adultCount} yetişkin`;
}

const STOP_TYPE_LABELS: Record<string, string> = {
  BOARDING: "Hareket",
  STOP: "Durak",
  REST: "Mola",
  VIEWPOINT: "Manzara",
  MEAL: "Yemek",
};

function formatTourTimeRange(
  departureTime?: string | null,
  returnTime?: string | null
): string | null {
  if (departureTime && returnTime) return `${departureTime} – ${returnTime}`;
  if (departureTime) return `Hareket ${departureTime}`;
  if (returnTime) return `Dönüş ${returnTime}`;
  return null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderItinerarySection(stops: ReservationEmailItineraryStop[]): string {
  if (stops.length === 0) return "";

  const items = stops
    .map((stop, index) => {
      const isLast = index === stops.length - 1;
      const meta = [stop.time, stop.duration, stop.stopLabel].filter(Boolean).join(" · ");
      return `
        <tr>
          <td style="padding:0 0 ${isLast ? "0" : "14px"};vertical-align:top;width:28px;">
            <div style="width:10px;height:10px;border-radius:999px;background:#2d5a3d;margin-top:4px;"></div>
            ${!isLast ? '<div style="width:2px;height:calc(100% - 6px);background:#d6e4d6;margin:4px auto 0;"></div>' : ""}
          </td>
          <td style="padding:0 0 ${isLast ? "0" : "14px"};vertical-align:top;">
            <p style="margin:0;font-size:14px;font-weight:700;color:#1a2e1a;line-height:1.4;">${escapeHtml(stop.title)}</p>
            ${meta ? `<p style="margin:4px 0 0;font-size:12px;color:#6b7a6b;line-height:1.5;">${escapeHtml(meta)}</p>` : ""}
          </td>
        </tr>`;
    })
    .join("");

  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:28px;">
      <tr>
        <td>
          <p style="margin:0 0 14px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7a6b;font-weight:700;">Tur Günü Akışı</p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f9fbf9;border:1px solid #e2ebe2;border-radius:14px;">
            <tr>
              <td style="padding:18px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">${items}</table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

function renderIncludedSection(items: string[]): string {
  if (items.length === 0) return "";

  const list = items
    .map(
      (item) => `
        <tr>
          <td style="padding:6px 0;vertical-align:top;width:18px;">
            <span style="color:#2d5a3d;font-size:14px;line-height:1.4;">✓</span>
          </td>
          <td style="padding:6px 0;font-size:13px;color:#334433;line-height:1.5;">${escapeHtml(item)}</td>
        </tr>`
    )
    .join("");

  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:20px;">
      <tr>
        <td>
          <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7a6b;font-weight:700;">Tura Dahil</p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">${list}</table>
        </td>
      </tr>
    </table>`;
}

export function renderReservationEmailHtml(
  variant: ReservationEmailVariant,
  data: ReservationEmailData
): string {
  const config = VARIANT_CONFIG[variant];
  const fullName = escapeHtml(`${data.firstName} ${data.lastName}`);

  const detailRows = [
    ["Tur", escapeHtml(data.tourTitle)],
    ["Tur tarihi", escapeHtml(data.scheduleLabel)],
    ...(data.tourDuration ? [["Süre", escapeHtml(data.tourDuration)] as const] : []),
    ...(data.tourTimeRange ? [["Saatler", escapeHtml(data.tourTimeRange)] as const] : []),
    ["Kişi sayısı", escapeHtml(guestSummary(data.adultCount, data.childCount))],
    ["Telefon", escapeHtml(data.phone)],
    ["E-posta", escapeHtml(data.email)],
    ...(data.boardingPoint
      ? [["Biniş noktası", escapeHtml(data.boardingPoint)] as const]
      : []),
    ...(data.note?.trim() ? [["Notunuz", escapeHtml(data.note.trim())] as const] : []),
  ];

  const detailRowsHtml = detailRows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e8efe8;color:#5c6b5c;font-size:13px;width:130px;vertical-align:top;">${label}</td>
          <td style="padding:12px 0;border-bottom:1px solid #e8efe8;color:#1a2e1a;font-size:14px;font-weight:600;line-height:1.5;">${value}</td>
        </tr>`
    )
    .join("");

  const itineraryHtml = renderItinerarySection(data.itineraryStops);
  const includedHtml = renderIncludedSection(data.includedHighlights);
  const subtitleHtml = data.tourSubtitle?.trim()
    ? `<p style="margin:0 0 20px;font-size:14px;color:#5c6b5c;line-height:1.6;font-style:italic;">${escapeHtml(data.tourSubtitle.trim())}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(config.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#eef3ee;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#eef3ee;padding:40px 16px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:580px;">
            <tr>
              <td style="padding:0 0 16px;text-align:center;">
                <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#2d5a3d;">Kaçkarlı Tur</p>
                <p style="margin:4px 0 0;font-size:12px;color:#6b7a6b;">Rize Yayla Turları</p>
              </td>
            </tr>
            <tr>
              <td>
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #d6e4d6;box-shadow:0 8px 30px rgba(30,61,47,0.08);">
                  <tr>
                    <td style="background:linear-gradient(135deg, ${config.accent} 0%, #2d5a3d 100%);padding:32px 36px 28px;">
                      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                        <tr>
                          <td>
                            <span style="display:inline-block;padding:6px 12px;border-radius:999px;background:${config.badgeBg};color:#1a2e1a;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">${config.badge}</span>
                            <h1 style="margin:14px 0 0;color:#ffffff;font-size:26px;line-height:1.25;font-weight:700;">${escapeHtml(config.title)}</h1>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:32px 36px 8px;">
                      <p style="margin:0 0 24px;color:#334433;font-size:15px;line-height:1.7;">
                        Merhaba <strong style="color:#1a2e1a;">${fullName}</strong>,<br />
                        ${escapeHtml(config.intro)}
                      </p>
                      ${subtitleHtml}
                      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f7faf7;border:1px solid #e2ebe2;border-radius:14px;margin-bottom:24px;">
                        <tr>
                          <td style="padding:18px 20px;text-align:center;">
                            <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7a6b;font-weight:600;">Toplam Tutar</p>
                            <p style="margin:0;font-size:28px;font-weight:700;color:#1e3d2f;line-height:1.2;">${escapeHtml(formatPrice(data.totalPrice))}</p>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7a6b;font-weight:700;">Rezervasyon Özeti</p>
                      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">${detailRowsHtml}</table>
                      ${itineraryHtml}
                      ${includedHtml}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 36px 32px;">
                      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f4f7f4;border-radius:12px;">
                        <tr>
                          <td style="padding:16px 18px;">
                            <p style="margin:0;font-size:13px;color:#4a5c4a;line-height:1.6;">
                              Sorularınız için bize ulaşabilirsiniz. Tur günü görüşmek üzere!
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 8px 0;text-align:center;">
                <p style="margin:0;font-size:11px;color:#8a968a;line-height:1.6;">
                  © Kaçkarlı Tur · Rize, Türkiye<br />
                  Bu e-posta rezervasyon sistemi tarafından otomatik gönderilmiştir.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export const SAMPLE_RESERVATION_EMAIL_DATA: ReservationEmailData = {
  firstName: "Ayşe",
  lastName: "Yılmaz",
  email: "ayse@ornek.com",
  phone: "0532 123 45 67",
  tourTitle: "Rize Yayla Günübirlik Turu",
  tourSubtitle: "Fırtına Vadisi · Ayder · Pokut · Sal",
  scheduleLabel: "Cumartesi, 26 Temmuz 2026",
  tourDuration: "Günübirlik · ~12 saat",
  tourTimeRange: "08:00 – 20:00",
  adultCount: 2,
  childCount: 1,
  totalPrice: 4200,
  boardingPoint: "Rize Merkez — Belediye Önü",
  note: "Çocuk koltuğu gerekiyor.",
  itineraryStops: [
    { time: "08:00", title: "Rize Merkez — Hareket", duration: "15 dk", stopLabel: "Hareket" },
    { time: "09:00", title: "Fırtına Vadisi", duration: "20 dk", stopLabel: "Manzara" },
    { time: "11:00", title: "Ayder Yaylası", duration: "1,5 saat", stopLabel: "Durak" },
    { time: "14:00", title: "Pokut Yaylası", duration: "45 dk", stopLabel: "Manzara" },
    { time: "15:15", title: "Sal Yaylası", duration: "30 dk", stopLabel: "Mola" },
    { time: "20:00", title: "Rize Merkez — Varış", stopLabel: "Hareket" },
  ],
  includedHighlights: [
    "Profesyonel rehberlik",
    "Araç içi ikram",
    "Tur sigortası",
    "Fotoğraf molaları",
  ],
};

export function buildReservationEmailData(reservation: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  adultCount: number;
  childCount: number;
  totalPrice: number | { toString(): string };
  boardingPoint: string | null;
  note: string | null;
  tour: {
    title: string;
    subtitle?: string | null;
    duration?: string | null;
    departureTime?: string | null;
    returnTime?: string | null;
    includedServices?: string | null;
    itinerary?: Array<{
      time?: string | null;
      title: string;
      duration?: string | null;
      stopType: string;
      sortOrder: number;
      dayNumber: number;
    }>;
  };
  schedule: { startDate: Date; endDate: Date | null };
}): ReservationEmailData {
  const itineraryStops = (reservation.tour.itinerary ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.dayNumber - b.dayNumber)
    .slice(0, 8)
    .map((stop) => ({
      time: stop.time ?? undefined,
      title: stop.title,
      duration: stop.duration ?? undefined,
      stopLabel: STOP_TYPE_LABELS[stop.stopType],
    }));

  const includedHighlights = parseMultilineList(reservation.tour.includedServices).slice(0, 5);

  return {
    firstName: reservation.firstName,
    lastName: reservation.lastName,
    email: reservation.email,
    phone: reservation.phone,
    tourTitle: reservation.tour.title,
    tourSubtitle: reservation.tour.subtitle,
    scheduleLabel: formatScheduleLabel(
      reservation.schedule.startDate,
      reservation.schedule.endDate
    ),
    tourDuration: reservation.tour.duration,
    tourTimeRange: formatTourTimeRange(
      reservation.tour.departureTime,
      reservation.tour.returnTime
    ),
    adultCount: reservation.adultCount,
    childCount: reservation.childCount,
    totalPrice: Number(reservation.totalPrice),
    boardingPoint: reservation.boardingPoint,
    note: reservation.note,
    itineraryStops,
    includedHighlights,
  };
}

export async function sendReservationCreatedEmail(data: ReservationEmailData) {
  return sendReservationStatusEmail("created", data);
}

export async function sendReservationContactedEmail(data: ReservationEmailData) {
  return sendReservationStatusEmail("contacted", data);
}

export async function sendReservationConfirmedEmail(data: ReservationEmailData) {
  return sendReservationStatusEmail("confirmed", data);
}

export async function sendReservationCancelledEmail(data: ReservationEmailData) {
  return sendReservationStatusEmail("cancelled", data);
}

export async function sendReservationCompletedEmail(data: ReservationEmailData) {
  return sendReservationStatusEmail("completed", data);
}

export async function sendReservationStatusEmail(
  variant: ReservationEmailVariant,
  data: ReservationEmailData
) {
  const config = VARIANT_CONFIG[variant];
  return sendMail({
    to: data.email,
    subject: config.subject,
    html: renderReservationEmailHtml(variant, data),
  });
}
