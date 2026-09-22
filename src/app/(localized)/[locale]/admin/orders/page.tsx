import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { AdminOrdersPage } from "@/app/_shared/AdminOrdersPage";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { type Metadata } from "next";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<unknown>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;

  if (!isLocale(resolvedParams.locale) || resolvedParams.locale === "pl") {
    notFound();
  }

  const dictionary = await getDictionary(resolvedParams.locale);

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

export default async function LocalizedAdminOrdersPage({
  params,
  searchParams,
}: PageProps) {
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
