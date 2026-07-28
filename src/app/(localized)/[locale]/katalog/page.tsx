import { notFound } from "next/navigation";
import { locales } from "@/lib/i18n/config";
import { CatalogPage } from "@/app/_shared/CatalogPage";
import { generateCatalogMetadata } from "@/lib/seo/metadata";
import type { Locale } from "@/lib/i18n/types";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  return generateCatalogMetadata(locale as Locale);
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();

  return <CatalogPage locale={locale as Locale} />;
}
