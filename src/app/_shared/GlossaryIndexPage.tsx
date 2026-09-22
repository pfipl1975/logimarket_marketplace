import Link from "next/link";
import { getGlossaryTerms, type GlossaryContentLocale } from "@/lib/glossary";
import { JsonLdScript, createDefinedTermSetJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/urls";

interface GlossaryIndexPageProps {
  locale: GlossaryContentLocale;
  basePath: string; // e.g. "/slownik-branzowy", "/en/logistics-glossary", "/de/logistik-lexikon"
}

const labels = {
  pl: {
    title: "Słownik branżowy",
    breadcrumbs: "Słownik branżowy",
    tagline: "Baza wiedzy B2B",
    description: "Semantyczna baza pojęć technicznych, norm oraz terminologii stosowanej w nowoczesnej logistyce, intralogistyce, systemach składowania i wyposażeniu magazynów. Słownik stanowi praktyczne kompendium dla menedżerów logistyki, działów zakupów procurement i inżynierów procesu.",
    termType: "Pojęcie techniczne",
    viewDefinition: "Zobacz definicję",
  },
  en: {
    title: "Logistics Glossary",
    breadcrumbs: "Logistics glossary",
    tagline: "B2B Knowledge Base",
    description: "A semantic database of technical terms, standards, and terminology used in modern logistics, warehousing, material handling, and storage systems. This glossary serves as a practical reference for logistics managers, procurement departments, and process engineers.",
    termType: "Technical Term",
    viewDefinition: "View definition",
  },
  de: {
    title: "Logistik-Lexikon",
    breadcrumbs: "Logistik-Lexikon",
    tagline: "B2B-Wissensdatenbank",
    description: "Eine semantische Datenbank technischer Begriffe, Normen und Fachbegriffe der modernen Logistik, Intralogistik, Lagersysteme und Betriebsausstattungen. Dieses Lexikon dient als praktisches Nachschlagewerk für Logistikleiter, Einkäufer und Prozessingenieure.",
    termType: "Fachbegriff",
    viewDefinition: "Definition anzeigen",
  }
};

const definedTermSetNames = {
  pl: "Słownik Branżowy LogiMarket",
  en: "LogiMarket Logistics Glossary",
  de: "LogiMarket Logistik-Lexikon",
};

export function GlossaryIndexPage({ locale, basePath }: GlossaryIndexPageProps) {
  const terms = getGlossaryTerms(locale);
  const pageUrl = absoluteUrl(basePath);
  const localizedLabels = labels[locale] || labels.pl;

  const jsonLdData = createDefinedTermSetJsonLd({
    terms: terms.map((t) => ({
      term: t.term,
      slug: t.slug,
      description: t.shortDefinition,
    })),
    pageUrl,
  });

  // Ensure JSON-LD set name is localized correctly
  if (jsonLdData && typeof jsonLdData === "object" && !Array.isArray(jsonLdData)) {
    jsonLdData.name = definedTermSetNames[locale] || definedTermSetNames.pl;
    if (Array.isArray(jsonLdData.hasDefinedTerm)) {
      jsonLdData.hasDefinedTerm = jsonLdData.hasDefinedTerm.map((item: any, idx: number) => {
        const term = terms[idx];
        return {
          ...item,
          url: `${pageUrl}/${term.slug}`,
        };
      });
    }
  }

  const breadcrumbsBasePath = locale === "pl" ? "" : `/${locale}`;

  return (
    <>
      <JsonLdScript data={jsonLdData} />
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
          <span className="font-semibold text-foreground" aria-current="page">
            {localizedLabels.breadcrumbs}
          </span>
        </nav>

        {/* Hero Section */}
        <div className="border-b border-border pb-8 mb-10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-teal">
            {localizedLabels.tagline}
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-brand-navy mt-1">
            {localizedLabels.title}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-relaxed">
            {localizedLabels.description}
          </p>
        </div>

        {/* Terms list grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {terms.map((t) => (
            <div
              key={t.slug}
              className="rounded-none border border-border bg-white p-5 shadow-none hover:border-brand-teal transition-all flex flex-col justify-between"
            >
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 block mb-1">
                  {localizedLabels.termType}
                </span>
                <h2 className="text-lg font-bold text-brand-navy mb-2">
                  <Link
                    href={`${basePath}/${t.slug}`}
                    className="hover:text-brand-teal transition-colors"
                  >
                    {t.term}
                  </Link>
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {t.shortDefinition}
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-50 flex justify-end">
                <Link
                  href={`${basePath}/${t.slug}`}
                  className="text-xs font-semibold text-brand-teal hover:underline flex items-center gap-1"
                >
                  {localizedLabels.viewDefinition}
                  <span>→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
