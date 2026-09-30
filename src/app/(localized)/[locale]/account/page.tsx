import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BuyerAccountPage } from "@/app/_shared/BuyerAccountPage";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ locale: string }>; searchParams: Promise<{ created?: string; next?: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale) || locale === "pl") notFound();
  const dict = await getDictionary(locale);
  return { title: dict.buyerAccount.title, robots: { index: false, follow: false, nocache: true } };
}

export default async function LocalizedAccountRoute({ params, searchParams }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale) || locale === "pl") notFound();
  const { created, next } = await searchParams;
  return <BuyerAccountPage locale={locale} created={created === "1"} next={next} />;
}
