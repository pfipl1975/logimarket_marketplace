import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGlossaryTerm, getGlossaryTerms } from "@/lib/glossary";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { defaultLocale } from "@/lib/i18n/config";
import {
  JsonLdScript,
  createDefinedTermJsonLd,
  createFaqPageJsonLd,
} from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/urls";

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 86400; // Cache for 24h

export async function generateStaticParams() {
  const terms = getGlossaryTerms();
  return terms.map((t) => ({
    slug: t.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const term = getGlossaryTerm(slug);

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

export default async function GlossaryTermPage({ params }: Props) {
  const { slug } = await params;
  const term = getGlossaryTerm(slug);

  if (!term) {
    notFound();
  }

  const dict = await getDictionary(defaultLocale);
  const categoryLabels = (dict.categories?.bySlug || {}) as Record<string, string>;

  const pageUrl = absoluteUrl(`/slownik-branzowy/${term.slug}`);
  const setUrl = absoluteUrl("/slownik-branzowy");

  const termJsonLd = createDefinedTermJsonLd({
    term: term.term,
    shortDefinition: term.shortDefinition,
    synonyms: term.synonyms,
    pageUrl,
    setUrl,
  });

  const faqJsonLd = term.faq
    ? createFaqPageJsonLd({
        faq: term.faq,
        pageUrl,
      })
    : null;

  return (
    <>
      <JsonLdScript data={termJsonLd} />
      {faqJsonLd && <JsonLdScript data={faqJsonLd} />}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground select-none"
        >
          <Link href="/" className="hover:text-foreground transition-colors">
            LogiMarket.pl
          </Link>
          <span>/</span>
          <Link href="/slownik-branzowy" className="hover:text-foreground transition-colors">
            Słownik branżowy
          </Link>
          <span>/</span>
          <span className="font-semibold text-foreground" aria-current="page">
            {term.term}
          </span>
        </nav>

        {/* Main Content Layout */}
        <div className="flex flex-col lg:flex-row gap-10 items-start">
          
          {/* Left Column - Main Details */}
          <main className="min-w-0 flex-1 w-full space-y-8">
            <div className="border-b border-border pb-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-teal">
                Słownik branżowy pojęć
              </span>
              <h1 className="text-3xl font-bold tracking-tight text-brand-navy mt-1">
                {term.term}
              </h1>
              <p className="text-sm text-muted-foreground mt-3 font-medium leading-relaxed border-l-2 border-brand-teal pl-3">
                {term.shortDefinition}
              </p>
            </div>

            {/* Detailed Definition */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy">
                Szczegółowe wyjaśnienie pojęcia
              </h2>
              <div className="space-y-3.5 text-sm text-muted-foreground leading-relaxed">
                {term.definition.map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>
            </div>

            {/* Applications List */}
            {term.applications && term.applications.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-border">
                <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy">
                  Zastosowanie i rola w procesach B2B
                </h2>
                <ul className="space-y-2.5">
                  {term.applications.map((app, idx) => (
                    <li key={idx} className="flex gap-2.5 items-start text-sm text-muted-foreground">
                      <span className="text-brand-teal font-bold select-none">•</span>
                      <span>{app}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* FAQ Block */}
            {term.faq && term.faq.length >= 2 && (
              <div className="space-y-5 pt-6 border-t border-border">
                <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy">
                  Najczęstsze pytania (FAQ)
                </h2>
                <div className="space-y-4">
                  {term.faq.map((item, idx) => (
                    <div key={idx} className="bg-slate-50/50 border border-slate-100 rounded-lg p-5">
                      <h3 className="text-sm font-semibold text-brand-navy mb-2">
                        {item.question}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>

          {/* Right Column - Side Panel */}
          <aside className="w-full lg:w-72 shrink-0 space-y-6 lg:sticky lg:top-24">
            
            {/* Synonyms */}
            {term.synonyms && term.synonyms.length > 0 && (
              <div className="rounded-lg border border-border bg-white p-5 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-navy border-b border-border pb-2 mb-3">
                  Synonimy i odmiany
                </h3>
                <ul className="space-y-1.5">
                  {term.synonyms.map((syn, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground">
                      {syn}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Related Terms */}
            {term.relatedTerms && term.relatedTerms.length > 0 && (
              <div className="rounded-lg border border-border bg-white p-5 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-navy border-b border-border pb-2 mb-3">
                  Powiązane pojęcia
                </h3>
                <ul className="space-y-2">
                  {term.relatedTerms.map((tSlug) => {
                    const relatedObj = getGlossaryTerm(tSlug);
                    const label = relatedObj ? relatedObj.term : tSlug;
                    return (
                      <li key={tSlug}>
                        <Link
                          href={`/slownik-branzowy/${tSlug}`}
                          className="text-xs font-medium text-brand-teal hover:underline block"
                        >
                          {label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Related Categories */}
            {term.relatedCategories && term.relatedCategories.length > 0 && (
              <div className="rounded-lg border border-border bg-white p-5 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-navy border-b border-border pb-2 mb-3">
                  Kategorie w katalogu
                </h3>
                <ul className="space-y-2">
                  {term.relatedCategories.map((catSlug) => {
                    const label = categoryLabels[catSlug] || catSlug;
                    return (
                      <li key={catSlug}>
                        <Link
                          href={`/katalog/c-${catSlug}`}
                          className="text-xs font-medium text-brand-teal hover:underline block"
                        >
                          {label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </aside>

        </div>
      </div>
    </>
  );
}
