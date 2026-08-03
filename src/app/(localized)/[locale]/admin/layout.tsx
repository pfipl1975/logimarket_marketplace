import { requireAdminPageAccess } from "@/lib/auth/admin-page-access";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { notFound } from "next/navigation";

export default async function LocalizedAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  
  if (!isLocale(resolvedParams.locale) || resolvedParams.locale === "pl") {
    notFound();
  }

  await requireAdminPageAccess(resolvedParams.locale as Locale);

  return <>{children}</>;
}
