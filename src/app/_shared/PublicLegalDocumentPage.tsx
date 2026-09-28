import Link from "next/link";
import { ChevronRight, FileText, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartDrawer } from "@/components/CartDrawer";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getHomeLocaleLinks, getPrivacyPolicyPath } from "@/lib/i18n/paths";
import type { PublicLegalDocument } from "@/lib/legal/public-legal-center";
import type { PublicLegalDelivery } from "@/lib/legal/public-legal-documents";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Warsaw" });

export async function PublicLegalDocumentPage({ document, delivery, status }: {
  document: PublicLegalDocument;
  delivery: PublicLegalDelivery;
  status: "current" | "upcoming";
}) {
  const dict = await getDictionary("pl");
  return (
    <div className="flex min-h-screen flex-col bg-brand-light-gray">
      <SiteHeader locale="pl" languageLinks={getHomeLocaleLinks()} navLabels={dict.nav} searchLabels={dict.search} />
      <div className="border-b border-border bg-white py-3">
        <nav aria-label="Ścieżka nawigacji" className="mx-auto flex max-w-7xl items-center gap-2 px-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <Link href="/" className="hover:text-brand-teal">LogiMarket</Link>
          <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
          <Link href="/dokumenty-prawne" className="hover:text-brand-teal">Dokumenty prawne</Link>
          <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
          <span aria-current="page" className="font-semibold text-brand-navy">{document.title}</span>
        </nav>
      </div>
      <main className="flex-1 py-10">
        <article className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="min-w-0 border border-[#d9dde2] bg-white p-6 md:p-8">
            <div className="flex items-center gap-2 text-brand-teal"><ShieldCheck aria-hidden="true" className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-wider">Dokument prawny</span></div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">{document.title}</h1>
            <p className="mt-3 text-sm font-semibold text-brand-navy">{status === "current" ? "Obowiązuje" : "Obowiązuje od 1 października 2026"}</p>
            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
              <div><dt className="text-muted-foreground">Wersja</dt><dd className="font-medium text-brand-navy">{document.version}</dd></div>
              <div><dt className="text-muted-foreground">Obowiązuje od</dt><dd className="font-medium text-brand-navy"><time dateTime={document.effectiveFrom.toISOString()}>{dateFormatter.format(document.effectiveFrom)}</time></dd></div>
              <div><dt className="text-muted-foreground">Język</dt><dd className="font-medium text-brand-navy">{document.language}</dd></div>
              <div className="min-w-0 sm:col-span-3"><dt className="text-muted-foreground">SHA-256</dt><dd className="mt-1 min-w-0"><code className="block break-all font-mono text-xs leading-relaxed text-brand-navy select-text">{document.sha256}</code></dd></div>
            </dl>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href={delivery.pdfPath} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-brand-teal px-5 py-3 text-sm font-semibold text-white hover:bg-brand-navy"><FileText aria-hidden="true" className="h-4 w-4" />Otwórz PDF</a>
              <a href={delivery.pdfPath} download className="inline-flex items-center border border-brand-teal px-5 py-3 text-sm font-semibold text-brand-teal hover:bg-brand-light-gray">Pobierz PDF</a>
            </div>
            <Link href="/dokumenty-prawne" className="mt-7 inline-block text-sm font-semibold text-brand-teal hover:underline">← Wróć do dokumentów prawnych</Link>
          </div>
        </article>
      </main>
      <SiteFooter locale="pl" navLabels={dict.nav} footerLabels={dict.footer} />
      <CartDrawer cartLabels={dict.cart} ctaLabels={dict.cta} checkoutLabels={dict.checkout} formLabels={dict.form} systemLabels={dict.system} offerLabels={dict.offers} closeLabel={dict.common.close} privacyPolicyHref={getPrivacyPolicyPath("pl")} />
    </div>
  );
}
