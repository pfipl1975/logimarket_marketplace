import { Info, ShieldCheck } from 'lucide-react'
import { CategoryFilter } from '@/components/category-filter'
import { OfferCard } from '@/components/offer-card'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getCategories, getOffers } from '@/lib/queries'

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ kategoria?: string }>
}) {
  const { kategoria } = await searchParams
  const [categories, offers] = await Promise.all([
    getCategories(),
    getOffers(kategoria),
  ])

  const activeCategory = categories.find((c) => c.slug === kategoria)

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <section className="bg-navy text-navy-foreground">
        <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal/15 px-3 py-1 text-xs font-medium text-teal">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Zweryfikowani partnerzy B2B
          </span>
          <h1 className="mt-4 max-w-2xl text-balance text-3xl font-bold leading-tight md:text-4xl">
            Katalog sprzętu i wyposażenia magazynowego
          </h1>
          <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-navy-foreground/70">
            Wózki widłowe, regały, palety, opakowania i wyposażenie logistyczne
            w jednym miejscu. Porównuj oferty i kontaktuj się bezpośrednio ze
            sprawdzonymi dostawcami.
          </p>
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-foreground">
            {activeCategory ? activeCategory.name : 'Wszystkie oferty'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {offers.length}{' '}
            {offers.length === 1 ? 'oferta' : 'dostępnych ofert'}
          </p>
        </div>

        <div className="mt-5">
          <CategoryFilter categories={categories} active={kategoria} />
        </div>

        {offers.length === 0 ? (
          <p className="mt-12 text-center text-muted-foreground">
            Brak ofert w tej kategorii.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        )}

        <div className="mt-12 flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          <Info
            className="mt-0.5 h-5 w-5 shrink-0 text-teal"
            aria-hidden="true"
          />
          <p className="leading-relaxed">
            LogiMarket.pl pełni rolę katalogu ofertowego. Sprzedaż i realizacja
            zamówień odbywa się{' '}
            <strong className="font-semibold text-foreground">
              bezpośrednio u partnera
            </strong>{' '}
            poza portalem. LogiMarket.pl nie jest stroną transakcji.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
