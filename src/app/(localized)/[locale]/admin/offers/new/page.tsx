import { AdminOfferCreatePage } from "@/app/_shared/AdminOfferCreatePage";
import { type Locale, isLocale } from "@/lib/i18n/config";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface LocalizedNewOfferPageProps {
  params: Promise<{ locale: string }>;
}

export default async function LocalizedNewOfferPage({ params }: LocalizedNewOfferPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  return <AdminOfferCreatePage locale={locale as Locale} />;
}
