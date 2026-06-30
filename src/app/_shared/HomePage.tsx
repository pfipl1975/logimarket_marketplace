import { Suspense } from "react";
import Image from "next/image";
import { getCategories, getOffers } from "@/app/actions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartDrawer } from "@/components/CartDrawer";
import { CategoryFilter } from "@/components/CategoryFilter";
import { OfferCard } from "@/components/OfferCard";
import { Skeleton } from "@/components/ui/skeleton";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";

type PublicSearchParams = { [key: string]: string | string[] | undefined };

interface HomePageProps {
  locale: Locale;
  searchParams: PublicSearchParams;
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

export async function HomePage({ locale, searchParams }: HomePageProps) {
  const categoryParam = searchParams.kategoria;
  const kategoria = Array.isArray(categoryParam) ? categoryParam[0] : categoryParam;
  const [dict, categories, offers] = await Promise.all([getDictionary(locale), getCategories(), getOffers(kategoria)]);
  const activeCategory = categories.find((c) => c.slug === kategoria);
  const heroTitleAccent = dict.hero.titleAccent;
  const heroTitleLead = dict.hero.title.endsWith(heroTitleAccent)
    ? dict.hero.title.slice(0, -heroTitleAccent.length)
    : dict.hero.title;

  return (
    <div className="flex min-h-screen flex-col bg-brand-light-gray">
      <SiteHeader navLabels={dict.nav} />

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
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-brand-navy">
            {activeCategory ? activeCategory.name : dict.catalog.allOffers}
          </h2>
          <p className="text-sm text-muted-foreground">
            {offers.length} {offers.length === 1 ? dict.catalog.offerCountOne : dict.catalog.offerCountOther}
          </p>
        </div>

        <div className="mt-5">
          <Suspense fallback={<div className="flex flex-wrap gap-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-32 rounded-full" />)}</div>}>
            <CategoryFilter categories={categories} catalogLabels={dict.catalog} />
          </Suspense>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-navy" />
            <span>{dict.catalog.rfqLegend}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
            <span>{dict.catalog.ecommerceLegend}</span>
          </div>
        </div>

        {offers.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-3 py-16 text-center">
            <PackageIcon className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-semibold">{dict.catalog.emptyTitle}</p>
            <p className="text-sm text-muted-foreground max-w-xs">{dict.catalog.emptyDescription}</p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {offers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                offerLabels={dict.offers}
                ctaLabels={dict.cta}
                rfqLabels={dict.rfq}
                formLabels={dict.form}
                systemLabels={dict.system}
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

      <SiteFooter navLabels={dict.nav} footerLabels={dict.footer} />
      <CartDrawer
        cartLabels={dict.cart}
        ctaLabels={dict.cta}
        checkoutLabels={dict.checkout}
        formLabels={dict.form}
        systemLabels={dict.system}
        offerLabels={dict.offers}
      />
    </div>
  );
}
