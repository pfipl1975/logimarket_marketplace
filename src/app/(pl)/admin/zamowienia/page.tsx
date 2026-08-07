import { AdminOrdersPage } from "@/app/_shared/AdminOrdersPage";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { defaultLocale } from "@/lib/i18n/config";
import { type Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = await getDictionary("pl");

  return {
    title: dictionary.adminOrders.metaTitle,
    description: dictionary.adminOrders.metaDescription,
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
  };
}

export default async function PlAdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<unknown>;
}) {
  const resolvedSearchParams = await searchParams;
  return <AdminOrdersPage locale={defaultLocale} searchParams={resolvedSearchParams} />;
}
