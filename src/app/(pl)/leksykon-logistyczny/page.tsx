import Link from "next/link";
import type { Metadata } from "next";
import { getGlossaryTerms } from "@/lib/glossary";
import { JsonLdScript, createDefinedTermSetJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/urls";

export const revalidate = 86400; // Cache for 24h

export const metadata: Metadata = {
  title: "Leksykon Logistyczny — Pojęcia B2B | LogiMarket.pl",
  description: "Baza wiedzy i słownik pojęć z logistyki, magazynowania, intralogistyki, opakowań oraz maszyn transportowych. Poznaj definicje techniczne B2B.",
  alternates: {
    canonical: absoluteUrl("/leksykon-logistyczny"),
  },
};

export default async function GlossaryIndexPage() {
  const terms = getGlossaryTerms();
  const pageUrl = absoluteUrl("/leksykon-logistyczny");

  const jsonLdData = createDefinedTermSetJsonLd({
    terms: terms.map((t) => ({
      term: t.term,
      slug: t.slug,
      description: t.shortDefinition,
    })),
    pageUrl,
  });

  return (
    <>
      <JsonLdScript data={jsonLdData} />
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
          <span className="font-semibold text-foreground" aria-current="page">
            Leksykon logistyczny
          </span>
        </nav>

        {/* Hero Section */}
        <div className="border-b border-border pb-8 mb-10">
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-teal">
            Baza wiedzy B2B
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-brand-navy mt-1">
            Leksykon logistyczny
          </h1>
          <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-relaxed">
            Semantyczna baza pojęć technicznych, norm oraz terminologii stosowanej w nowoczesnej logistyce, intralogistyce, systemach składowania i wyposażeniu magazynów. Słownik stanowi praktyczne kompendium dla menedżerów logistyki, działów zakupów procurement i inżynierów procesu.
          </p>
        </div>

        {/* Terms list grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {terms.map((t) => (
            <div
              key={t.slug}
              className="rounded-lg border border-border bg-white p-5 shadow-sm hover:border-brand-teal transition-all flex flex-col justify-between"
            >
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 block mb-1">
                  Pojęcie techniczne
                </span>
                <h2 className="text-lg font-bold text-brand-navy mb-2">
                  <Link
                    href={`/leksykon-logistyczny/${t.slug}`}
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
                  href={`/leksykon-logistyczny/${t.slug}`}
                  className="text-xs font-semibold text-brand-teal hover:underline flex items-center gap-1"
                >
                  Zobacz definicję
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
