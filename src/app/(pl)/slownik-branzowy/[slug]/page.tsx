import type { Metadata } from "next";
import { GlossaryTermPage } from "@/app/_shared/GlossaryTermPage";
import { getGlossaryTerm, getGlossaryTerms } from "@/lib/glossary";
import { absoluteUrl } from "@/lib/seo/urls";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 86400; // Cache for 24h

export async function generateStaticParams() {
  const terms = getGlossaryTerms("pl");
  return terms.map((t) => ({
    slug: t.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const term = getGlossaryTerm(slug, "pl");

  if (!term) {
    return {
      title: "Pojęcie nieodnalezione | LogiMarket.pl",
    };
  }

  return {
    title: `${term.term} — Definicja, Zastosowanie | Słownik Branżowy`,
    description: term.shortDefinition,
    alternates: {
      canonical: absoluteUrl(`/slownik-branzowy/${term.slug}`),
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <GlossaryTermPage locale="pl" slug={slug} basePath="/slownik-branzowy" />;
}
