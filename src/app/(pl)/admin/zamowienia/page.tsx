import { AdminOrdersPage } from "@/app/_shared/AdminOrdersPage";
import { defaultLocale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function PlAdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<unknown>;
}) {
  const resolvedSearchParams = await searchParams;
  return <AdminOrdersPage locale={defaultLocale} searchParams={resolvedSearchParams} />;
}
