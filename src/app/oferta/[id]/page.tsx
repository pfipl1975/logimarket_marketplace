import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Wrench, Package, ShieldCheck } from "lucide-react";
import { getOfferById } from "@/app/actions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartDrawer } from "@/components/CartDrawer";
import { RfqDialog } from "@/components/RfqDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { AddToCartButton } from "@/components/AddToCartButton";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function OfferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const offerId = Number(id);
  if (isNaN(offerId)) notFound();

  const [dict, offer] = await Promise.all([getDictionary("pl"), getOfferById(offerId)]);
  if (!offer) notFound();

  const attributes = Object.entries(offer.technicalAttributes);
  const isEcommerce = offer.offerModel === "ecommerce";

  return (
    <div className="flex min-h-screen flex-col bg-brand-light-gray">
      <SiteHeader navLabels={dict.nav} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">
        <Link href={`/?kategoria=${offer.categorySlug}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />Wróć do katalogu
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="overflow-hidden rounded-lg border bg-gray-100" style={{ borderColor: "#d9dde2" }}>
            {offer.imageUrl ? (
              <img src={offer.imageUrl} alt={offer.title} className="h-full w-full object-cover aspect-[4/3]" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center">
                <Package className="h-20 w-20" style={{ color: "#5a64724d" }} />
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex flex-wrap gap-2">
              <Badge className="text-[10px] uppercase tracking-wider font-semibold text-white border-0" style={{ backgroundColor: "#147487" }}>{offer.categoryName}</Badge>
              {offer.isFeatured && <Badge className="text-[10px] uppercase tracking-wider font-semibold text-white border-0" style={{ backgroundColor: "#f59e0b" }}>Wyróżnione</Badge>}
              <Badge className="text-[10px] uppercase tracking-wider font-semibold text-white border-0"
                style={{ backgroundColor: isEcommerce ? "#16a34a" : "#141c2c" }}>{isEcommerce ? "E-Commerce" : "RFQ"}</Badge>
            </div>

            <h1 className="mt-4 text-2xl font-bold leading-tight md:text-3xl" style={{ color: "#141c2c" }}>{offer.title}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Wrench className="h-4 w-4" />
              <span className="font-medium">{offer.partnerName}</span>
              {offer.partnerWebsite && <a href={offer.partnerWebsite} target="_blank" rel="noopener noreferrer" className="hover:underline ml-1" style={{ color: "#147487" }}>(www)</a>}
            </p>

            <div className="mt-6 rounded-lg border bg-white p-4" style={{ borderColor: "#d9dde2" }}>
              <p className="text-sm text-muted-foreground">Cena</p>
              <p className="mt-1 text-3xl font-bold" style={{ color: "#141c2c" }}>{formatPrice(offer.priceBrutto, offer.priceOnRequest)}</p>
            </div>

            <div className="mt-4">
              {isEcommerce ? (
                <AddToCartButton offerId={offer.id} />
              ) : offer.conversionType === "rfq" ? (
                <RfqDialog offerId={offer.id} offerTitle={offer.title} partnerName={offer.partnerName} className="w-full h-12 text-base" />
              ) : (
                <a
                  href={`/go/${offer.id}`}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="inline-flex items-center justify-center w-full gap-2 rounded-md px-4 py-2 text-base font-semibold text-white border-0 transition-colors h-12"
                  style={{ backgroundColor: "#141c2c" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1e2940"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#141c2c"; }}
                >
                  Zobacz ofertę u Partnera <ExternalLink className="h-5 w-5" />
                </a>
              )}
            </div>

            {offer.description && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Opis</h3>
                <p className="mt-2 text-sm leading-relaxed">{offer.description}</p>
              </div>
            )}

            <div className="mt-6 flex items-center gap-2 rounded-lg border p-3" style={{ backgroundColor: "#1474870d", borderColor: "#14748733" }}>
              <ShieldCheck className="h-5 w-5 shrink-0" style={{ color: "#147487" }} />
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isEcommerce ? "Ten produkt jest dostępny w modelu E-Commerce. Dodaj do koszyka i złóż zamówienie B2B."
                  : "Ta oferta wymaga indywidualnej wyceny. Wyślij zapytanie RFQ, a partner przygotuje ofertę."}
              </p>
            </div>
          </div>
        </div>

        {attributes.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-bold mb-4" style={{ color: "#141c2c" }}>Parametry techniczne</h2>
            <div className="overflow-hidden rounded-lg border" style={{ borderColor: "#d9dde2" }}>
              <table className="w-full text-sm">
                <tbody>
                  {attributes.map(([key, value], idx) => (
                    <tr key={key} className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      <td className="px-4 py-3 font-medium text-muted-foreground w-1/3 border-r" style={{ borderColor: "#d9dde2" }}>{key}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: "#141c2c" }}>{String(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <SiteFooter navLabels={dict.nav} footerLabels={dict.footer} />
      <CartDrawer />
    </div>
  );
}
