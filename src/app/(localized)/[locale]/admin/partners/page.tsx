import { AdminPartnersPage } from "@/app/_shared/AdminPartnersPage";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { type Locale, isLocale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  
  if (!isLocale(locale) || locale === "pl") {
    return {};
  }
  
  const dictionary = await getDictionary(locale as Locale);
  return {
    title: dictionary.adminPartners.metaTitle,
    description: dictionary.adminPartners.metaDescription,
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
  };
}

export default async function LocalizedAdminPartnersRoute({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<unknown>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;

  if (!isLocale(locale) || locale === "pl") {
    notFound();
  }

  const resolvedSearchParams = await searchParams;
  const rawParams = new URLSearchParams(resolvedSearchParams as Record<string, string>);
  
  return <AdminPartnersPage locale={locale as Locale} searchParams={rawParams} />;
}
