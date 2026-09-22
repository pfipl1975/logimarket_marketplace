import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { locales } from "@/lib/i18n/config";
import type { Locale } from "@/lib/i18n/types";
import { GlossaryTermPage } from "@/app/_shared/GlossaryTermPage";
import { getGlossaryTerm, getGlossaryTerms } from "@/lib/glossary";
import { absoluteUrl } from "@/lib/seo/urls";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export const revalidate = 86400; // Cache for 24h

export async function generateStaticParams() {
  const terms = getGlossaryTerms("de");
  // Next.js App Router static params for dynamic segments with locale
  return terms.map((t) => ({
    locale: "de",
    slug: t.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (locale !== "de") return {};

  const term = getGlossaryTerm(slug, "de");

  if (!term) {
    return {
      title: "Begriff nicht gefunden | LogiMarket",
    };
  }

  return {
    title: `${term.term} — Technische Definition & Anwendung | LogiMarket`,
    description: term.shortDefinition,
    alternates: {
      canonical: absoluteUrl(`/de/logistik-lexikon/${term.slug}`),
    },
  };
}

export default async function Page({ params }: Props) {
  const { locale, slug } = await params;
  if (!locales.includes(locale as Locale) || locale !== "de") {
    notFound();
  }

  return <GlossaryTermPage locale="de" slug={slug} basePath="/de/logistik-lexikon" />;
}
