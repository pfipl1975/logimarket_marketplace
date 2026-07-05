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
  const terms = getGlossaryTerms("en");
  // Next.js App Router static params for dynamic segments with locale
  return terms.map((t) => ({
    locale: "en",
    slug: t.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (locale !== "en") return {};

  const term = getGlossaryTerm(slug, "en");

  if (!term) {
    return {
      title: "Term Not Found | LogiMarket",
    };
  }

  return {
    title: `${term.term} — Technical Definition & Application | LogiMarket`,
    description: term.shortDefinition,
    alternates: {
      canonical: absoluteUrl(`/en/logistics-glossary/${term.slug}`),
    },
  };
}

export default async function Page({ params }: Props) {
  const { locale, slug } = await params;
  if (!locales.includes(locale as Locale) || locale !== "en") {
    notFound();
  }

  return <GlossaryTermPage locale="en" slug={slug} basePath="/en/logistics-glossary" />;
}
