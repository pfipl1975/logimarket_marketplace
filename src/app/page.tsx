import { Suspense } from "react";
import { ShieldCheck, Info, Package } from "lucide-react";
import { getCategories, getOffers } from "./actions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartDrawer } from "@/components/CartDrawer";
import { CategoryFilter } from "@/components/CategoryFilter";
import { OfferCard } from "@/components/OfferCard";
import { Skeleton } from "@/components/ui/skeleton";

export default async function Home({ searchParams }: { searchParams: Promise<{ kategoria?: string }> }) {
  const { kategoria } = await searchParams;
  const [categories, offers] = await Promise.all([getCategories(), getOffers(kategoria)]);
  const activeCategory = categories.find((c) => c.slug === kategoria);

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "#f0f0f0" }}>
      <SiteHeader />

      <section className="relative overflow-hidden" style={{ backgroundColor: "#141c2c" }}>
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")` }} />
        <div className="relative mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border"
            style={{ backgroundColor: "#14748726", color: "#147487", borderColor: "#14748733" }}>
            <ShieldCheck className="h-3.5 w-3.5" />Zweryfikowani partnerzy B2B
          </span>
          <h1 className="mt-5 text-balance text-3xl font-bold leading-tight text-white md:text-5xl tracking-tight">
            Katalog sprzętu i <span style={{ color: "#147487" }}>wyposażenia magazynowego</span>
          </h1>
          <p className="mt-4 max-w-xl text-pretty leading-relaxed text-white/60 text-base md:text-lg">
            Wózki widłowe, regały, palety, opakowania i wyposażenie logistyczne w jednym miejscu.
            Model hybrydowy: RFQ dla ciężkiego sprzętu, E-Commerce dla artykułów powtarzalnych.
          </p>
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold" style={{ color: "#141c2c" }}>
            {activeCategory ? activeCategory.name : "Wszystkie oferty"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {offers.length} {offers.length === 1 ? "oferta" : "dostępnych ofert"}
          </p>
        </div>

        <div className="mt-5">
          <Suspense fallback={<div className="flex flex-wrap gap-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-32 rounded-full" />)}</div>}>
            <CategoryFilter categories={categories} />
          </Suspense>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#141c2c" }} />
            <span>RFQ — Zapytaj o wycenę</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#16a34a" }} />
            <span>E-Commerce — Dodaj do koszyka</span>
          </div>
        </div>

        {offers.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-3 py-16 text-center">
            <Package className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-semibold">Brak ofert w tej kategorii</p>
            <p className="text-sm text-muted-foreground max-w-xs">Sprawdź inne kategorie lub wróć później.</p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {offers.map((offer) => <OfferCard key={offer.id} offer={offer} />)}
          </div>
        )}

        <div className="mt-12 flex items-start gap-3 rounded-lg border bg-white p-4 text-sm text-muted-foreground" style={{ borderColor: "#d9dde2" }}>
          <Info className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "#147487" }} />
          <p className="leading-relaxed">
            LogiMarket.pl to hybrydowa platforma B2B. Dla ciężkiego sprzętu oferujemy model RFQ (zapytanie ofertowe),
            dla artykułów powtarzalnych — model E-Commerce z koszykiem. Sprzedaż i realizacja zamówień odbywa się
            bezpośrednio u partnera. LogiMarket.pl nie jest stroną transakcji.
          </p>
        </div>
      </main>

      <SiteFooter />
      <CartDrawer />
    </div>
  );
}
