import { requireAdminPageAccess } from "@/lib/auth/admin-page-access";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPageAccess("pl");

  return <>{children}</>;
}
