import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { AdminOrdersPage } from "@/app/_shared/AdminOrdersPage";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function LocalizedAdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<unknown>;
}) {
  const resolvedParams = await params;
  if (!isLocale(resolvedParams.locale)) {
    notFound();
  }
  if (resolvedParams.locale === "pl") {
    notFound();
  }
  const resolvedSearchParams = await searchParams;
  return <AdminOrdersPage locale={resolvedParams.locale} searchParams={resolvedSearchParams} />;
}
