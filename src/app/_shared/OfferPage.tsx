import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Wrench, Package, ShieldCheck } from "lucide-react";
import { getOfferById } from "@/app/actions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartDrawer } from "@/components/CartDrawer";
import { RfqDialog } from "@/components/RfqDialog";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { AddToCartButton } from "@/components/AddToCartButton";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getCategoryFilterPath, getOfferLocaleLinks } from "@/lib/i18n/paths";
import type { Locale } from "@/lib/i18n/types";

interface OfferPageProps {
  locale: Locale;
  offerId: string;
}

export async function OfferPage({ locale, offerId }: OfferPageProps) {
  const numericOfferId = Number(offerId);
  if (isNaN(numericOfferId)) notFound();

  const [dict, offer] = await Promise.all([getDictionary(locale), getOfferById(numericOfferId)]);
  if (!offer) notFound();

  const attributes = Object.entries(offer.technicalAttributes);
  const isEcommerce = offer.offerModel === "ecommerce";

  return (
    <div className="flex min-h-screen flex-col bg-brand-light-gray">
      <SiteHeader
        locale={locale}
        languageLinks={getOfferLocaleLinks(offerId)}
        navLabels={dict.nav}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">
        <Link href={getCategoryFilterPath(locale, offer.categorySlug)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />{dict.nav.backToCatalog}
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="overflow-hidden rounded-lg border border-[#d9dde2] bg-gray-100">
            {offer.imageUrl ? (
              <img src={offer.imageUrl} alt={offer.title} className="h-full w-full object-cover aspect-[4/3]" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center">
                <Package className="h-20 w-20 text-[#5a64724d]" />
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex flex-wrap gap-2">
              <Badge className="border-0 bg-[#147487] text-[10px] font-semibold uppercase tracking-wider text-white">{offer.categoryName}</Badge>
              {offer.isFeatured && <Badge className="border-0 bg-amber-500 text-[10px] font-semibold uppercase tracking-wider text-white">{dict.offers.featured}</Badge>}
              <Badge className={`border-0 text-[10px] font-semibold uppercase tracking-wider text-white ${isEcommerce ? "bg-green-600" : "bg-brand-navy"}`}>{isEcommerce ? dict.offers.ecommerceModel : dict.offers.rfqModel}</Badge>
            </div>

            <h1 className="mt-4 text-2xl font-bold leading-tight text-[#141c2c] md:text-3xl">{offer.title}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Wrench className="h-4 w-4" />
              <span className="font-medium">{offer.partnerName}</span>
              {offer.partnerWebsite && <a href={offer.partnerWebsite} target="_blank" rel="noopener noreferrer" className="ml-1 text-[#147487] hover:underline">(www)</a>}
            </p>

            <div className="mt-6 rounded-lg border border-[#d9dde2] bg-white p-4">
              <p className="text-sm text-muted-foreground">{dict.offers.price}</p>
              <p className="mt-1 text-3xl font-bold text-brand-navy">{formatPrice(offer.priceBrutto, offer.priceOnRequest, dict.offers.priceOnRequest)}</p>
            </div>

            <div className="mt-4">
              {isEcommerce ? (
                <AddToCartButton offerId={offer.id} label={dict.cta.addToCart} />
              ) : offer.conversionType === "rfq" ? (
                <RfqDialog
                  offerId={offer.id}
                  offerTitle={offer.title}
                  partnerName={offer.partnerName}
                  className="w-full h-12 text-base"
                  rfqLabels={dict.rfq}
                  formLabels={dict.form}
                  systemLabels={dict.system}
                  ctaLabels={dict.cta}
                />
              ) : (
                <a
                  href={`/go/${offer.id}`}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border-0 bg-brand-navy px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-[#1e2940]"
                >
                  {dict.offers.externalOffer} <ExternalLink className="h-5 w-5" />
                </a>
              )}
            </div>

            {offer.description && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{dict.offers.description}</h3>
                <p className="mt-2 text-sm leading-relaxed">{offer.description}</p>
              </div>
            )}

            <div className="mt-6 flex items-center gap-2 rounded-lg border border-[#14748733] bg-[#1474870d] p-3">
              <ShieldCheck className="h-5 w-5 shrink-0 text-[#147487]" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isEcommerce ? dict.offers.ecommerceNotice : dict.offers.rfqNotice}
              </p>
            </div>
          </div>
        </div>

        {attributes.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-bold mb-4 text-brand-navy">{dict.offers.technicalParameters}</h2>
            <div className="overflow-hidden rounded-lg border border-[#d9dde2]">
              <table className="w-full text-sm">
                <tbody>
                  {attributes.map(([key, value], idx) => (
                    <tr key={key} className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      <td className="w-1/3 border-r border-[#d9dde2] px-4 py-3 font-medium text-muted-foreground">{key}</td>
                      <td className="px-4 py-3 font-bold text-[#141c2c]">{String(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
      />
    </div>
  );
}
