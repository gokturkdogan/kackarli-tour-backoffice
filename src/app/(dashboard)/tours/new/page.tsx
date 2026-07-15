import { AdminHeader } from "@/components/admin/admin-header";
import { PageContent } from "@/components/admin/page-content";
import { TourForm } from "@/components/admin/tour-form";

export default function NewTourPage() {
  return (
    <>
      <AdminHeader title="Yeni Tur" description="Yeni bir tur oluşturun" />
      <PageContent>
        <TourForm />
      </PageContent>
    </>
  );
}
