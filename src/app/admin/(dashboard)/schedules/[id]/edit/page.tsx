import { redirect } from "next/navigation";

interface EditSchedulePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSchedulePage({ params }: EditSchedulePageProps) {
  await params;
  redirect("/admin/schedules");
}
