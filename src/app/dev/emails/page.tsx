import { notFound } from "next/navigation";
import {
  renderReservationEmailHtml,
  SAMPLE_RESERVATION_EMAIL_DATA,
  type ReservationEmailVariant,
} from "@/lib/emails/reservation-email";

const VARIANTS: { id: ReservationEmailVariant; label: string }[] = [
  { id: "created", label: "Talep Alındı" },
  { id: "contacted", label: "İletişimde" },
  { id: "confirmed", label: "Onaylandı" },
  { id: "cancelled", label: "İptal" },
  { id: "completed", label: "Tamamlandı" },
];

export default async function EmailPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const params = await searchParams;
  const active =
    VARIANTS.find((v) => v.id === params.type)?.id ?? ("created" as ReservationEmailVariant);

  const html = renderReservationEmailHtml(active, SAMPLE_RESERVATION_EMAIL_DATA);

  return (
    <div className="min-h-screen bg-mist">
      <div className="border-b border-forest-100 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-sage-600 mb-1">
            Dev only
          </p>
          <h1 className="text-xl font-bold text-forest-900">E-posta Şablon Önizleme</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Şablon dosyası:{" "}
            <code className="text-xs bg-forest-50 px-1.5 py-0.5 rounded">
              src/lib/emails/reservation-email.ts
            </code>
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {VARIANTS.map((variant) => (
            <a
              key={variant.id}
              href={`/dev/emails?type=${variant.id}`}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                active === variant.id
                  ? "bg-forest-600 text-white"
                  : "bg-white border border-forest-100 text-forest-700 hover:bg-forest-50"
              }`}
            >
              {variant.label}
            </a>
          ))}
        </div>

        <div className="rounded-2xl border border-forest-100 bg-white overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-forest-100 bg-forest-50/50 text-xs text-muted-foreground">
            Tarayıcı önizlemesi — gerçek e-posta istemcilerinde küçük farklar olabilir
          </div>
          <iframe
            title="E-posta önizleme"
            srcDoc={html}
            className="w-full min-h-[960px] border-0 bg-[#eef3ee]"
          />
        </div>
      </div>
    </div>
  );
}
