import Link from "next/link";
import { notFound } from "next/navigation";
import { getGlossaryTerm, type GlossaryContentLocale } from "@/lib/glossary";
import { getDictionary } from "@/lib/i18n/dictionaries";
import {
  JsonLdScript,
  createDefinedTermJsonLd,
  createFaqPageJsonLd,
} from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/urls";

interface GlossaryTermPageProps {
  locale: GlossaryContentLocale;
  slug: string;
  basePath: string; // e.g. "/slownik-branzowy", "/en/logistics-glossary", "/de/logistik-lexikon"
}

const labels = {
  pl: {
    breadcrumbsHome: "Słownik branżowy",
    tagline: "Słownik branżowy pojęć",
    detailsHeading: "Szczegółowe wyjaśnienie pojęcia",
    applicationsHeading: "Zastosowanie i rola w procesach B2B",
    faqHeading: "Najczęstsze pytania (FAQ)",
    synonymsHeading: "Synonimy i odmiany",
    relatedTermsHeading: "Powiązane pojęcia",
    relatedCategoriesHeading: "Kategorie w katalogu",
  },
  en: {
    breadcrumbsHome: "Logistics glossary",
    tagline: "Logistics Glossary Terms",
    detailsHeading: "Detailed definition & explanation",
    applicationsHeading: "Applications and Role in B2B Processes",
    faqHeading: "Frequently Asked Questions (FAQ)",
    synonymsHeading: "Synonyms & Variants",
    relatedTermsHeading: "Related Terms",
    relatedCategoriesHeading: "Catalog Categories",
  },
  de: {
    breadcrumbsHome: "Logistik-Lexikon",
    tagline: "Logistik-Lexikon Fachbegriffe",
    detailsHeading: "Detaillierte Definition & Erklärung",
    applicationsHeading: "Anwendungen und Rolle in B2B-Prozessen",
    faqHeading: "Häufig gestellte Fragen (FAQ)",
    synonymsHeading: "Synonyme & Varianten",
    relatedTermsHeading: "Verwandte Begriffe",
    relatedCategoriesHeading: "Katalog-Kategorien",
  }
};

const definedTermSetNames = {
  pl: "Słownik Branżowy LogiMarket",
  en: "LogiMarket Logistics Glossary",
  de: "LogiMarket Logistik-Lexikon",
};

export async function GlossaryTermPage({ locale, slug, basePath }: GlossaryTermPageProps) {
  const term = getGlossaryTerm(slug, locale);

  if (!term) {
    notFound();
  }

  const dict = await getDictionary(locale);
  const categoryLabels = (dict.categories?.bySlug || {}) as Record<string, string>;

  const pageUrl = absoluteUrl(`${basePath}/${term.slug}`);
  const setUrl = absoluteUrl(basePath);
  const localizedLabels = labels[locale] || labels.pl;

  const termJsonLd = createDefinedTermJsonLd({
    term: term.term,
    shortDefinition: term.shortDefinition,
    synonyms: term.synonyms,
    pageUrl,
    setUrl,
  });

  // Ensure JSON-LD set name is localized correctly
  if (termJsonLd && typeof termJsonLd === "object" && !Array.isArray(termJsonLd)) {
    const termNode = termJsonLd.inDefinedTermSet;
    if (termNode && typeof termNode === "object" && !Array.isArray(termNode)) {
      termNode.name = definedTermSetNames[locale] || definedTermSetNames.pl;
    }
  }

  const faqJsonLd = term.faq
    ? createFaqPageJsonLd({
        faq: term.faq,
        pageUrl,
      })
    : null;

  const breadcrumbsBasePath = locale === "pl" ? "" : `/${locale}`;
  const catalogFilterBasePath = locale === "pl" ? "" : `/${locale}`;

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
          <Link href={breadcrumbsBasePath || "/"} className="hover:text-foreground transition-colors">
            LogiMarket.pl
          </Link>
          <span>/</span>
          <Link href={basePath} className="hover:text-foreground transition-colors">
            {localizedLabels.breadcrumbsHome}
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
                {localizedLabels.tagline}
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
                {localizedLabels.detailsHeading}
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
                  {localizedLabels.applicationsHeading}
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
                  {localizedLabels.faqHeading}
                </h2>
                <div className="space-y-4">
                  {term.faq.map((item, idx) => (
                    <div key={idx} className="bg-slate-50/50 border border-slate-100 rounded-none p-5">
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
              <div className="rounded-none border border-border bg-white p-5 shadow-none">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-navy border-b border-border pb-2 mb-3">
                  {localizedLabels.synonymsHeading}
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
              <div className="rounded-none border border-border bg-white p-5 shadow-none">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-navy border-b border-border pb-2 mb-3">
                  {localizedLabels.relatedTermsHeading}
                </h3>
                <ul className="space-y-2">
                  {term.relatedTerms.map((tSlug) => {
                    const relatedObj = getGlossaryTerm(tSlug, locale);
                    const label = relatedObj ? relatedObj.term : tSlug;
                    return (
                      <li key={tSlug}>
                        <Link
                          href={`${basePath}/${tSlug}`}
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
              <div className="rounded-none border border-border bg-white p-5 shadow-none">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-navy border-b border-border pb-2 mb-3">
                  {localizedLabels.relatedCategoriesHeading}
                </h3>
                <ul className="space-y-2">
                  {term.relatedCategories.map((catSlug) => {
                    const label = categoryLabels[catSlug] || catSlug;
                    return (
                      <li key={catSlug}>
                        <Link
                          href={`${catalogFilterBasePath}/katalog/c-${catSlug}`}
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
