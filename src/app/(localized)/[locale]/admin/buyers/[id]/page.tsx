import { AdminBuyerDetailPage } from "@/app/_shared/AdminBuyerDetailPage";
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

export default async function LocalizedAdminBuyerDetailRoute({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const resolvedParams = await params;
  return <AdminBuyerDetailPage locale={resolvedParams.locale as Locale} id={parseInt(resolvedParams.id, 10)} />;
}
