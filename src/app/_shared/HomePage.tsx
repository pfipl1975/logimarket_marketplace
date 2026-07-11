import Link from "next/link";
import Image from "next/image";
import { getOffers } from "@/app/actions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartDrawer } from "@/components/CartDrawer";
import { OfferCard } from "@/components/OfferCard";
import { OfferListItem } from "@/components/offers/OfferListItem";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getHomeLocaleLinks, getHomePath, getOfferPath } from "@/lib/i18n/paths";
import { HomepageSolutionsDiscovery } from "@/components/home/HomepageSolutionsDiscovery";
import { ProductGroupTiles } from "@/components/home/ProductGroupTiles";
import type { Locale } from "@/lib/i18n/types";

const VIEW_OFFER_LABELS: Record<Locale, string> = {
  pl: "Zobacz ofertę",
  en: "View offer",
  de: "Angebot ansehen",
  fr: "Voir l'offre",
  uk: "Переглянути пропозицію",
  es: "Ver oferta",
  zh: "查看报价",
};

interface HomePageProps {
  locale: Locale;
  view?: "grid" | "list";
}

function ShieldCheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        className="fill-none stroke-current"
        d="M12 3 19 6v5c0 4.2-2.8 7.7-7 10-4.2-2.3-7-5.8-7-10V6l7-3Z"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className="fill-none stroke-current"
        d="m8.8 12.1 2.1 2.1 4.4-4.6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        className="fill-none stroke-current"
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 8h.01"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PackageIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        className="fill-none stroke-current"
        d="m3 7 9-4 9 4-9 4-9-4ZM3 7v10l9 4 9-4V7M12 11v10"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export async function HomePage({ locale, view = "grid" }: HomePageProps) {
  const [dict, offers] = await Promise.all([getDictionary(locale), getOffers()]);
  const categoryLabels = dict.categories.bySlug as Record<string, string>;
  const technicalAttributeLabels = dict.technicalAttributes.labels as Record<string, string>;
  const heroTitleAccent = dict.hero.titleAccent;
  const heroTitleLead = dict.hero.title.endsWith(heroTitleAccent)
    ? dict.hero.title.slice(0, -heroTitleAccent.length)
    : dict.hero.title;

  const homePath = getHomePath(locale);
  const gridHref = `${homePath}?view=grid`;
  const listHref = `${homePath}?view=list`;
  const catalogHref = locale === "pl" ? "/katalog" : `/${locale}/katalog`;
  const viewOfferLabel = VIEW_OFFER_LABELS[locale];

  return (
    <div className="flex min-h-screen flex-col bg-brand-light-gray">
      <SiteHeader
        locale={locale}
        languageLinks={getHomeLocaleLinks()}
        navLabels={dict.nav}
      />

      <section className="relative overflow-hidden bg-brand-navy">
        <Image
          src="/images/hero/backgroundheader.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-brand-navy/80" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-teal/20 bg-brand-teal/15 px-3 py-1.5 text-xs font-semibold text-brand-teal">
            <ShieldCheckIcon className="h-3.5 w-3.5" />{dict.hero.badge}
          </span>
          <h1 className="mt-5 text-balance text-3xl font-bold leading-tight text-white md:text-5xl tracking-tight">
            {heroTitleLead}<span className="text-brand-teal">{heroTitleAccent}</span>
          </h1>
          <p className="mt-4 max-w-xl text-pretty leading-relaxed text-white/60 text-base md:text-lg">
            {dict.hero.description} {dict.hero.modelDescription}
          </p>
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">
        <ProductGroupTiles locale={locale} />
        <HomepageSolutionsDiscovery
          locale={locale}
          labels={dict.home.solutionsDiscovery}
        />

        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-brand-navy">
            {dict.catalog.allOffers}
          </h2>
          <p className="text-sm text-muted-foreground">
            {offers.length} {offers.length === 1 ? dict.catalog.offerCountOne : dict.catalog.offerCountOther}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-navy" />
              <span>{dict.catalog.rfqLegend}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
              <span>{dict.catalog.ecommerceLegend}</span>
            </div>
          </div>

          {/* View switcher — URL-driven, locale-aware */}
          <nav aria-label="Zmień widok ofert" className="flex overflow-hidden rounded border border-border">
            <Link
              href={gridHref}
              aria-current={view === "grid" ? "page" : undefined}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === "grid"
                  ? "bg-brand-navy text-white"
                  : "bg-white text-brand-navy hover:bg-gray-50"
              }`}
            >
              {dict.offers.gridView}
            </Link>
            <Link
              href={listHref}
              aria-current={view === "list" ? "page" : undefined}
              className={`border-l border-border px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === "list"
                  ? "bg-brand-navy text-white"
                  : "bg-white text-brand-navy hover:bg-gray-50"
              }`}
            >
              {dict.offers.listView}
            </Link>
          </nav>
        </div>

        {offers.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-4 py-16 text-center">
            <PackageIcon className="h-12 w-12 text-muted-foreground/40" />
            <div>
              <p className="text-lg font-semibold">{dict.catalog.allOffers}</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs">{dict.catalog.emptyDescription}</p>
            </div>
            <Link
              href={catalogHref}
              className="mt-2 inline-flex items-center rounded border border-brand-navy px-4 py-2 text-sm font-semibold text-brand-navy transition-colors hover:border-brand-teal hover:text-brand-teal"
            >
              {dict.nav.catalog}
            </Link>
          </div>
        ) : view === "list" ? (
          <div className="mt-6 flex flex-col gap-3">
            {offers.map((offer) => (
              <OfferListItem
                key={offer.id}
                offer={offer}
                detailHref={getOfferPath(locale, String(offer.id))}
                offerLabels={dict.offers}
                categoryLabels={categoryLabels}
                viewOfferLabel={viewOfferLabel}
              />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {offers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                detailHref={getOfferPath(locale, String(offer.id))}
                offerLabels={dict.offers}
                ctaLabels={dict.cta}
                rfqLabels={dict.rfq}
                formLabels={dict.form}
                systemLabels={dict.system}
                closeLabel={dict.common.close}
                categoryLabels={categoryLabels}
                technicalAttributeLabels={technicalAttributeLabels}
              />
            ))}
          </div>
        )}

        <div className="mt-12 flex items-start gap-3 rounded-lg border border-border bg-white p-4 text-sm text-muted-foreground">
          <InfoIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-teal" />
          <p className="leading-relaxed">
            {dict.catalog.platformNotice}
          </p>
        </div>
      </main>

      <SiteFooter
        locale={locale}
        navLabels={dict.nav}
        footerLabels={dict.footer}
      />
      <CartDrawer
        cartLabels={dict.cart}
        ctaLabels={dict.cta}
        checkoutLabels={dict.checkout}
        formLabels={dict.form}
        systemLabels={dict.system}
        offerLabels={dict.offers}
        closeLabel={dict.common.close}
      />
    </div>
  );
}
