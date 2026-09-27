import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, FileText, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartDrawer } from "@/components/CartDrawer";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getHomeLocaleLinks, getPrivacyPolicyPath } from "@/lib/i18n/paths";
import { getPublicLegalCenter, type PublicLegalDocument } from "@/lib/legal/public-legal-center";
import { absoluteUrl } from "@/lib/seo/urls";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dokumenty prawne LogiMarket",
  description: "Aktualne i wcześniejsze wersje dokumentów prawnych LogiMarket oraz dane integralności pakietu dokumentów.",
  alternates: { canonical: absoluteUrl("/dokumenty-prawne") },
};

const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Warsaw",
});

function EffectiveDate({ value }: { value: Date }) {
  return <time dateTime={value.toISOString()}>{dateFormatter.format(value)}</time>;
}

function Hash({ value }: { value: string }) {
  return <code className="block min-w-0 break-all font-mono text-xs leading-relaxed text-brand-navy select-text">{value}</code>;
}

function DocumentCard({ document }: { document: PublicLegalDocument }) {
  return (
    <li className="min-w-0 border border-[#d9dde2] bg-white p-5 sm:p-6">
      <h3 className="text-base font-bold text-brand-navy">{document.title}</h3>
      <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
        <div><dt className="text-muted-foreground">Wersja</dt><dd className="font-medium text-brand-navy">{document.version}</dd></div>
        <div><dt className="text-muted-foreground">Obowiązuje od</dt><dd className="font-medium text-brand-navy"><EffectiveDate value={document.effectiveFrom} /></dd></div>
        <div><dt className="text-muted-foreground">Język</dt><dd className="font-medium text-brand-navy">{document.language}</dd></div>
        <div className="min-w-0 sm:col-span-3">
          <dt className="text-muted-foreground">SHA-256</dt>
          <dd className="mt-1 min-w-0">{document.sha256 ? <Hash value={document.sha256} /> : <span className="text-muted-foreground">Niedostępny</span>}</dd>
        </div>
      </dl>
    </li>
  );
}

export default async function Page() {
  const [dict, center] = await Promise.all([getDictionary("pl"), getPublicLegalCenter()]);

  return (
    <div className="flex min-h-screen flex-col bg-brand-light-gray">
      <SiteHeader locale="pl" languageLinks={getHomeLocaleLinks()} navLabels={dict.nav} searchLabels={dict.search} />
      <div className="border-b border-border bg-white py-3">
        <nav aria-label="Ścieżka nawigacji" className="mx-auto flex max-w-7xl items-center gap-2 px-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <Link href="/" className="transition-colors hover:text-brand-teal">LogiMarket</Link>
          <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
          <span aria-current="page" className="font-semibold text-brand-navy">Dokumenty prawne</span>
        </nav>
      </div>

      <main className="flex-1 py-10">
        <div className="mx-auto max-w-5xl space-y-8 px-4 sm:px-6 lg:px-8">
          <header className="border border-[#d9dde2] bg-white p-6 md:p-8">
            <div className="flex items-center gap-2 text-brand-teal"><ShieldCheck aria-hidden="true" className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-wider">Centrum dokumentów</span></div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">Dokumenty prawne LogiMarket</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#2c3e50]">Sprawdź obowiązujące dokumenty, wcześniejsze wersje oraz dane służące do weryfikacji ich integralności.</p>
          </header>

          <section aria-labelledby="current-heading">
            <h2 id="current-heading" className="text-xl font-bold text-brand-navy">Aktualne dokumenty</h2>
            {center.currentDocuments.length > 0 ? (
              <ul className="mt-4 space-y-4">{center.currentDocuments.map((document) => <DocumentCard key={`${document.title}:${document.language}:${document.version}`} document={document} />)}</ul>
            ) : (
              <div className="mt-4 border border-[#d9dde2] bg-white p-6">
                <FileText aria-hidden="true" className="h-7 w-7 text-brand-teal" />
                <p className="mt-3 font-medium text-brand-navy">Brak obecnie opublikowanych dokumentów prawnych.</p>
                <p className="mt-1 text-sm text-muted-foreground">Wróć do tej strony później lub przejdź do katalogu.</p>
                <Link href="/" className="mt-4 inline-block text-sm font-semibold text-brand-teal hover:underline">Przejdź do katalogu</Link>
              </div>
            )}
          </section>

          <section aria-labelledby="history-heading">
            <h2 id="history-heading" className="text-xl font-bold text-brand-navy">Historia wersji</h2>
            {center.history.length > 0 ? (
              <details className="mt-4 border border-[#d9dde2] bg-white p-5 sm:p-6">
                <summary className="cursor-pointer text-sm font-semibold text-brand-teal">Pokaż wcześniejsze wersje ({center.history.length})</summary>
                <ul className="mt-5 space-y-4">{center.history.map((document) => <DocumentCard key={`${document.title}:${document.language}:${document.version}`} document={document} />)}</ul>
              </details>
            ) : <p className="mt-4 border border-[#d9dde2] bg-white p-5 text-sm text-muted-foreground">Nie ma jeszcze wcześniejszych publicznych wersji dokumentów.</p>}
          </section>

          <section aria-labelledby="pack-heading">
            <h2 id="pack-heading" className="text-xl font-bold text-brand-navy">Integralność / pakiet dokumentów</h2>
            {center.packs.length > 0 ? (
              <ul className="mt-4 space-y-4">{center.packs.map((pack) => (
                <li key={`${pack.language}:${pack.version}`} className="min-w-0 border border-[#d9dde2] bg-white p-5 sm:p-6">
                  <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                    <div><dt className="text-muted-foreground">Wersja pakietu</dt><dd className="font-medium text-brand-navy">{pack.version}</dd></div>
                    <div><dt className="text-muted-foreground">Język</dt><dd className="font-medium text-brand-navy">{pack.language}</dd></div>
                    <div><dt className="text-muted-foreground">Obowiązuje od</dt><dd className="font-medium text-brand-navy"><EffectiveDate value={pack.effectiveFrom} /></dd></div>
                    <div><dt className="text-muted-foreground">Algorytm skrótu</dt><dd className="font-medium text-brand-navy">{pack.hashAlgorithm}</dd></div>
                    <div><dt className="text-muted-foreground">Schemat kanonizacji</dt><dd className="font-medium text-brand-navy">{pack.canonicalizationScheme}</dd></div>
                    <div className="min-w-0 sm:col-span-2"><dt className="text-muted-foreground">Root SHA-256</dt><dd className="mt-1 min-w-0"><Hash value={pack.rootSha256} /></dd></div>
                  </dl>
                </li>
              ))}</ul>
            ) : <p className="mt-4 border border-[#d9dde2] bg-white p-5 text-sm text-muted-foreground">Brak obecnie opublikowanego pakietu dokumentów prawnych.</p>}
          </section>
        </div>
      </main>

      <SiteFooter locale="pl" navLabels={dict.nav} footerLabels={dict.footer} />
      <CartDrawer cartLabels={dict.cart} ctaLabels={dict.cta} checkoutLabels={dict.checkout} formLabels={dict.form} systemLabels={dict.system} offerLabels={dict.offers} closeLabel={dict.common.close} privacyPolicyHref={getPrivacyPolicyPath("pl")} />
    </div>
  );
}
