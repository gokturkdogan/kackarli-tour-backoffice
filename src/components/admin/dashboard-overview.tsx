import Link from "next/link";
import { BookOpen, Calendar, Map, Users } from "lucide-react";
import type { DashboardStats } from "@/actions/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardOverviewProps {
  stats: DashboardStats;
}

interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

function DonutChart({
  segments,
  size = 132,
  stroke = 14,
  centerLabel,
  centerValue,
}: {
  segments: DonutSegment[];
  size?: number;
  stroke?: number;
  centerLabel: string;
  centerValue: string | number;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  if (total === 0) {
    return (
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-forest-100"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
          <span className="text-2xl font-bold text-forest-900 tabular-nums">0</span>
          <span className="text-[10px] text-muted-foreground mt-0.5">{centerLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-forest-50"
        />
        {segments.map((segment) => {
          if (segment.value <= 0) return null;
          const length = (segment.value / total) * circumference;
          const dashArray = `${length} ${circumference - length}`;
          const circle = (
            <circle
              key={segment.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={stroke}
              strokeDasharray={dashArray}
              strokeDashoffset={-offset}
              strokeLinecap="round"
            />
          );
          offset += length;
          return circle;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        <span className="text-2xl font-bold text-forest-900 tabular-nums">{centerValue}</span>
        <span className="text-[10px] text-muted-foreground mt-0.5">{centerLabel}</span>
      </div>
    </div>
  );
}

function LegendRow({
  color,
  label,
  value,
  hint,
}: {
  color: string;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-forest-800 truncate">{label}</span>
      </div>
      <div className="text-right shrink-0">
        <span className="font-semibold text-forest-900 tabular-nums">{value}</span>
        {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

function StatCard({
  title,
  shortTitle,
  value,
  description,
  icon: Icon,
  href,
}: {
  title: string;
  shortTitle: string;
  value: number;
  description: string;
  icon: typeof Map;
  href: string;
}) {
  return (
    <Link href={href} className="min-w-0">
      <Card className="hover:shadow-md transition-shadow border-forest-100 h-full">
        <CardContent className="p-2.5 sm:p-4">
          <div className="flex items-start justify-between gap-1 mb-1.5 sm:mb-2">
            <p className="text-[10px] sm:text-sm font-medium text-muted-foreground leading-tight line-clamp-2">
              <span className="sm:hidden">{shortTitle}</span>
              <span className="hidden sm:inline">{title}</span>
            </p>
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-forest-500 shrink-0" />
          </div>
          <div className="text-lg sm:text-2xl font-bold text-forest-900 tabular-nums leading-none">
            {value}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 line-clamp-2 leading-tight hidden sm:block">
            {description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function DashboardOverview({ stats }: DashboardOverviewProps) {
  const { reservations, tourPlan } = stats;
  const fillPct =
    tourPlan.totalCapacity > 0
      ? Math.min(100, Math.round((tourPlan.reservedSpots / tourPlan.totalCapacity) * 100))
      : 0;
  const maxMonthCount = Math.max(...tourPlan.schedulesByMonth.map((item) => item.count), 1);

  const statusTotal =
    reservations.pending + reservations.confirmed + reservations.completed;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        <StatCard
          title="Toplam Tur"
          shortTitle="Tur"
          value={stats.tours.total}
          description={`${stats.tours.active} aktif`}
          icon={Map}
          href="/tours"
        />
        <StatCard
          title="Toplam Kayıt"
          shortTitle="Kayıt"
          value={reservations.total}
          description={`${reservations.confirmedGuests} onaylı kişi`}
          icon={BookOpen}
          href="/reservations"
        />
        <StatCard
          title="Bekleyen"
          shortTitle="Bekleyen"
          value={reservations.pending}
          description="Onay veya plan bekliyor"
          icon={Users}
          href="/reservations"
        />
        <StatCard
          title="Tur Planı"
          shortTitle="Plan"
          value={tourPlan.upcomingSchedules}
          description={`${tourPlan.activeSchedules} aktif plan`}
          icon={Calendar}
          href="/schedules"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-forest-100 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-forest-900">Rezervasyon Kaynakları</CardTitle>
            <p className="text-sm text-muted-foreground">
              Site talepleri ve manuel kayıtların dağılımı
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <DonutChart
                centerValue={reservations.total}
                centerLabel="toplam kayıt"
                segments={[
                  { value: reservations.fromWeb, color: "#0ea5e9", label: "Site" },
                  { value: reservations.manual, color: "#7c3aed", label: "Manuel" },
                ]}
              />
              <div className="flex-1 w-full space-y-3">
                <LegendRow color="#0ea5e9" label="Siteden" value={reservations.fromWeb} />
                <LegendRow color="#7c3aed" label="Manuel" value={reservations.manual} />
                <div className="pt-2 border-t border-forest-50">
                  <LegendRow
                    color="#2d5a44"
                    label="Onaylı kişi"
                    value={reservations.confirmedGuests}
                    hint="Yalnızca onaylanan kayıtlar"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-forest-100 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-forest-900">Kayıt Durumları</CardTitle>
            <p className="text-sm text-muted-foreground">
              Bekleyen, onaylanan ve tamamlanan kayıtlar
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <DonutChart
                centerValue={statusTotal}
                centerLabel="aktif kayıt"
                segments={[
                  { value: reservations.pending, color: "#f59e0b", label: "Bekleyen" },
                  { value: reservations.confirmed, color: "#2d5a44", label: "Onaylı" },
                  { value: reservations.completed, color: "#94a3b8", label: "Tamamlanan" },
                ]}
              />
              <div className="flex-1 w-full space-y-3">
                <LegendRow color="#f59e0b" label="Bekleyen" value={reservations.pending} />
                <LegendRow color="#2d5a44" label="Onaylı" value={reservations.confirmed} />
                <LegendRow color="#94a3b8" label="Tamamlanan" value={reservations.completed} />
                {statusTotal > 0 ? (
                  <div className="h-2.5 rounded-full bg-forest-50 overflow-hidden flex pt-1">
                    <div
                      className="h-full bg-amber-400"
                      style={{ width: `${(reservations.pending / statusTotal) * 100}%` }}
                    />
                    <div
                      className="h-full bg-forest-600"
                      style={{ width: `${(reservations.confirmed / statusTotal) * 100}%` }}
                    />
                    <div
                      className="h-full bg-slate-300"
                      style={{ width: `${(reservations.completed / statusTotal) * 100}%` }}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-forest-100 overflow-hidden lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-forest-900">Tur Planı Özeti</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Yaklaşan turlar, kontenjan doluluğu ve aylık plan yoğunluğu
                </p>
              </div>
              <Link
                href="/schedules"
                className="text-sm font-medium text-forest-700 hover:text-forest-900"
              >
                Planı yönet →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="rounded-xl border border-forest-100 bg-forest-50/50 p-2.5 sm:p-4 min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight line-clamp-2">
                  Yaklaşan gün
                </p>
                <p className="text-lg sm:text-2xl font-bold text-forest-900 tabular-nums mt-1">
                  {tourPlan.upcomingSchedules}
                </p>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-2.5 sm:p-4 min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight line-clamp-2">
                  Dolu kontenjan
                </p>
                <p className="text-lg sm:text-2xl font-bold text-rose-900 tabular-nums mt-1 leading-none">
                  {tourPlan.reservedSpots}
                  <span className="text-[10px] sm:text-sm font-medium text-rose-700/80 block sm:inline">
                    / {tourPlan.totalCapacity}
                  </span>
                </p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-2.5 sm:p-4 min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
                  Doluluk
                </p>
                <p className="text-lg sm:text-2xl font-bold text-emerald-900 tabular-nums mt-1">
                  %{fillPct}
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Kontenjan doluluğu</span>
                <span className="tabular-nums">
                  {tourPlan.reservedSpots}/{tourPlan.totalCapacity} yer
                </span>
              </div>
              <div className="h-3 rounded-full bg-rose-100 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    fillPct >= 90 ? "bg-rose-500" : fillPct >= 60 ? "bg-amber-500" : "bg-forest-600"
                  )}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3">
                Önümüzdeki aylar — planlanan tur günü
              </p>
              <div className="grid grid-cols-4 gap-2 items-end h-28">
                {tourPlan.schedulesByMonth.map((month) => {
                  const heightPct = Math.max(12, (month.count / maxMonthCount) * 100);
                  return (
                    <div key={month.label} className="flex flex-col items-center gap-2 h-full">
                      <span className="text-xs font-semibold text-forest-800 tabular-nums">
                        {month.count}
                      </span>
                      <div className="flex-1 w-full flex items-end">
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-forest-700 to-forest-500 min-h-3"
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground capitalize">
                        {month.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
