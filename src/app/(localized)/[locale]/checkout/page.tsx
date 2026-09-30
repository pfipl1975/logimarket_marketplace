import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutPage } from "@/app/_shared/CheckoutPage";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale) || locale === "pl") notFound();
  const dict = await getDictionary(locale);
  return { title: dict.checkoutFlow.title, robots: { index: false, follow: false, nocache: true } };
}

export default async function LocalizedCheckoutRoute({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === "pl") notFound();
  return <CheckoutPage locale={locale} />;
}
