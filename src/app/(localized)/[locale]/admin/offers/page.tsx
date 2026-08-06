import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { AdminOffersPage } from "@/app/_shared/AdminOffersPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  if (!isLocale(resolvedParams.locale) || resolvedParams.locale === "pl") {
    return {};
  }
  
  const dictionary = await getDictionary(resolvedParams.locale as Locale);
  return {
    title: dictionary.adminOffers.metaTitle,
    description: dictionary.adminOffers.metaDescription,
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<unknown>;
}) {
  const resolvedParams = await params;
  
  if (!isLocale(resolvedParams.locale) || resolvedParams.locale === "pl") {
    notFound();
  }
  
  const locale = resolvedParams.locale as Locale;
  const dictionary = await getDictionary(locale);
  const resolvedSearchParams = await searchParams;

  return (
    <AdminOffersPage
      locale={locale}
      searchParams={resolvedSearchParams}
      dict={dictionary.adminOffers}
      basePath={`/${locale}/admin/offers`}
    />
  );
}
