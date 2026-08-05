import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { AdminEntryPage } from "@/app/_shared/AdminEntryPage";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  
  if (!isLocale(resolvedParams.locale) || resolvedParams.locale === "pl") {
    notFound();
  }
  
  const dictionary = await getDictionary(resolvedParams.locale as Locale);
  
  return {
    title: dictionary.admin.metaTitle,
    description: dictionary.admin.metaDescription,
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
  };
}

export default async function LocalizedAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  
  if (!isLocale(resolvedParams.locale) || resolvedParams.locale === "pl") {
    notFound();
  }

  const locale = resolvedParams.locale as Locale;
  const dictionary = await getDictionary(locale);

  return <AdminEntryPage dictionary={dictionary.admin} />;
}
