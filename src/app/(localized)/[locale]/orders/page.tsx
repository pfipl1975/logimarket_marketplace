import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BuyerOrdersPage } from "@/app/_shared/BuyerOrdersPage";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale) || locale === "pl") notFound();
  const dict = await getDictionary(locale);
  return {
    title: dict.BuyerOrders.title,
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function LocalizedBuyerOrdersRoute({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === "pl") notFound();
  return <BuyerOrdersPage locale={locale} />;
}