import { requireAdminPageAccess } from "@/lib/auth/admin-page-access";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPageAccess("pl");

  return <AdminShell locale="pl">{children}</AdminShell>;
}
