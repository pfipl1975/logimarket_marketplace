import { AdminDashboardPage } from "@/app/_shared/AdminDashboardPage";

export const dynamic = "force-dynamic";

export default function AdminRootLocalized({
  params: { locale },
}: {
  params: { locale: string };
}) {
  return <AdminDashboardPage locale={locale} />;
}
