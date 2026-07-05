import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { locales } from "@/lib/i18n/config";
import type { Locale } from "@/lib/i18n/types";
import { GlossaryIndexPage } from "@/app/_shared/GlossaryIndexPage";
import { absoluteUrl } from "@/lib/seo/urls";

type Props = {
  params: Promise<{ locale: string }>;
};

export const revalidate = 86400; // Cache for 24h

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "en") return {};

  return {
    title: "B2B Logistics Glossary — Warehouse Terminology | LogiMarket",
    description: "Industrial database and dictionary of technical terms for warehouse equipment, intralogistics, packaging, and supply processes.",
    alternates: {
      canonical: absoluteUrl("/en/logistics-glossary"),
    },
  };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale) || locale !== "en") {
    notFound();
  }

  return <GlossaryIndexPage locale="en" basePath="/en/logistics-glossary" />;
}
