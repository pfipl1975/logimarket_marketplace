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
  if (locale !== "de") return {};

  return {
    title: "B2B Logistik-Lexikon — Lagertechnik & Fachbegriffe | LogiMarket",
    description: "Industrielle Datenbank und Fachwörterbuch für Lagerausstattung, Intralogistik, Verpackungsmaterialien und B2B-Einkaufsprozesse.",
    alternates: {
      canonical: absoluteUrl("/de/logistik-lexikon"),
    },
  };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale) || locale !== "de") {
    notFound();
  }

  return <GlossaryIndexPage locale="de" basePath="/de/logistik-lexikon" />;
}
