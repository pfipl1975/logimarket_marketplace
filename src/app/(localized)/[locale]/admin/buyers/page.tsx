import { AdminBuyersPage } from "@/app/_shared/AdminBuyersPage";
import type { Locale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Buyers | LogiMarket Admin",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  }
};

export default async function LocalizedAdminBuyersRoute({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<unknown>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  return <AdminBuyersPage locale={resolvedParams.locale as Locale} searchParams={resolvedSearchParams} />;
}
