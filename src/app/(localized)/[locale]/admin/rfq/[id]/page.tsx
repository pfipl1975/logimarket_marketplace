import { AdminRfqDetailPage } from "@/app/_shared/AdminRfqDetailPage";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { type Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
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
    title: dict.detailMetaTitle,
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
  };
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;

  if (!isLocale(locale) || locale === "pl") {
    notFound();
  }

  return <AdminRfqDetailPage locale={locale} rawId={resolvedParams.id} />;
}
