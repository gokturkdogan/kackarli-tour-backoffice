import Link from "next/link";
import { AdminHeader } from "@/components/admin/admin-header";
import { ScheduleCalendarForm } from "@/components/admin/schedule-calendar-form";
import { getExistingSchedulesByDate, getToursForScheduleSelect } from "@/actions/schedules";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function SchedulesPage() {
  const [tours, existingSchedulesByDate] = await Promise.all([
    getToursForScheduleSelect(),
    getExistingSchedulesByDate(),
  ]);

  return (
    <>
      <AdminHeader
        title="Tur Tarihleri"
        description="Takvimden gün seçin, kontenjan ve fiyatları yönetin"
      />
      <div className="p-6">
        {tours.length === 0 ? (
          <div className="rounded-lg border border-forest-100 bg-white p-8 text-center max-w-lg">
            <p className="text-muted-foreground mb-4">
              Tur tarihi eklemek için önce aktif bir tur oluşturmalısınız.
            </p>
            <Link
              href="/admin/tours/new"
              className={cn(buttonVariants(), "bg-forest-600 hover:bg-forest-700")}
            >
              Yeni Tur Oluştur
            </Link>
          </div>
        ) : (
          <ScheduleCalendarForm tours={tours} existingSchedulesByDate={existingSchedulesByDate} />
        )}
      </div>
    </>
  );
}
