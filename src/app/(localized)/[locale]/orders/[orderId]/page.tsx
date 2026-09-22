import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BuyerOrderDetailPage } from "@/app/_shared/BuyerOrderDetailPage";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ locale: string; orderId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale) || locale === "pl") notFound();
  const dict = await getDictionary(locale);
  return {
    title: dict.BuyerOrderDetail.title,
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function LocalizedBuyerOrderDetailRoute({ params }: PageProps) {
  const { locale, orderId } = await params;
  if (!isLocale(locale) || locale === "pl") notFound();
  return <BuyerOrderDetailPage locale={locale} orderIdParam={orderId} />;
}
