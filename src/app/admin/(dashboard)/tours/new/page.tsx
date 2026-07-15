import { AdminHeader } from "@/components/admin/admin-header";
import { TourForm } from "@/components/admin/tour-form";

export default function NewTourPage() {
  return (
    <>
      <AdminHeader title="Yeni Tur" description="Yeni bir tur oluşturun" />
      <div className="p-6">
        <TourForm />
      </div>
    </>
  );
}
