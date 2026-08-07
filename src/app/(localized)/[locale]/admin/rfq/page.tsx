import { AdminRfqPage } from "@/app/_shared/AdminRfqPage";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { type Metadata } from "next";
import { type Locale, isLocale } from "@/lib/i18n/config";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<unknown>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;

  if (!isLocale(locale) || locale === "pl") {
    notFound();
  }

  const dictionary = await getDictionary(locale);
  const dict = dictionary.adminRfq;
  return {
    title: dict.metaTitle,
    description: dict.metaDescription,
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
}: PageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;

  if (!isLocale(locale) || locale === "pl") {
    notFound();
  }

  const resolvedSearchParams = await searchParams;
  return <AdminRfqPage locale={locale} searchParams={resolvedSearchParams} />;
}
