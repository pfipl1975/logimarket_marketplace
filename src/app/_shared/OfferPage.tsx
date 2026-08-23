import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Wrench, Package, ShieldCheck } from "lucide-react";
import { getOfferById } from "@/app/actions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartDrawer } from "@/components/CartDrawer";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { OfferModelBadge } from "@/components/offers/OfferModelBadge";
import { OfferAction } from "@/components/OfferAction";
import { getLocalizedCategoryLabel } from "@/lib/i18n/category-labels";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getCategoryFilterPath, getOfferLocaleLinks } from "@/lib/i18n/paths";
import {
  JsonLdScript,
  createOfferJsonLd,
  createOfferBreadcrumbJsonLd,
} from "@/lib/seo/json-ld";
import type { Locale } from "@/lib/i18n/types";

interface OfferPageProps {
  locale: Locale;
  offerId: string;
}

export async function OfferPage({ locale, offerId }: OfferPageProps) {
  const numericOfferId = Number(offerId);
  if (isNaN(numericOfferId)) notFound();

  const [dict, offer] = await Promise.all([
    getDictionary(locale),
    getOfferById(numericOfferId, locale),
  ]);
  if (!offer) notFound();

  const isEcommerce = offer.offerModel === "ecommerce";
  const isRfq = offer.offerModel === "rfq";

  const categoryLabels = dict.categories.bySlug as Record<string, string>;
  const categoryLabel = getLocalizedCategoryLabel(
    categoryLabels,
    offer.categorySlug,
    offer.categoryName,
  );

  const isArchived = offer.publicationStatus === "archived";
  const isOperationallyUnavailable =
    offer.publicationStatus === "published" && !offer.isActive;

  const offerImageUrl =
    typeof offer.imageUrl === "string" && offer.imageUrl.trim().length > 0
      ? offer.imageUrl.trim()
      : null;

  return (
    <div className="flex min-h-screen flex-col bg-brand-light-gray">
      <JsonLdScript data={createOfferJsonLd(locale, offer, dict)} />
      <JsonLdScript data={createOfferBreadcrumbJsonLd(locale, offer)} />
      <SiteHeader
        locale={locale}
        languageLinks={getOfferLocaleLinks(offerId)}
        navLabels={dict.nav}
        searchLabels={dict.search}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">
        <Link
          href={getCategoryFilterPath(locale, offer.categorySlug)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {dict.nav.backToCatalog}
        </Link>

        {isArchived && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
            <p className="font-semibold text-base">
              {dict.offers.archivedTitle}
            </p>
            <p className="mt-1 text-sm">{dict.offers.archivedDescription}</p>
          </div>
        )}

        {isOperationallyUnavailable && (
          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-gray-800">
            <p className="font-semibold text-base">
              {dict.offers.unavailableTitle}
            </p>
            <p className="mt-1 text-sm">{dict.offers.unavailableDescription}</p>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-lg border border-[#d9dde2] bg-gray-100 aspect-[4/3]">
            {offerImageUrl ? (
              <Image
                src={offerImageUrl}
                alt={offer.title}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
                unoptimized
                preload
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package className="h-20 w-20 text-[#5a64724d]" />
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex flex-wrap gap-2">
              <Badge className="border-0 bg-[#147487] text-[10px] font-semibold uppercase tracking-wider text-white">
                {categoryLabel}
              </Badge>
              {offer.isFeatured && (
                <Badge className="border-0 bg-amber-500 text-[10px] font-semibold uppercase tracking-wider text-white">
                  {dict.offers.featured}
                </Badge>
              )}
              <OfferModelBadge
                offerModel={offer.offerModel}
                labels={{
                  rfqModel: dict.offers.rfqModel,
                  ecommerceModel: dict.offers.ecommerceModel,
                  outboundModel: dict.offers.outboundModel,
                }}
                className="border-0 text-[10px]"
              />
            </div>

            <h1 className="mt-4 text-2xl font-bold leading-tight text-[#141c2c] md:text-3xl">
              {offer.title}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Wrench className="h-4 w-4" />
              <span className="font-medium">{offer.partnerName}</span>
            </p>

            <div className="mt-6 rounded-lg border border-[#d9dde2] bg-white p-4">
              <p className="text-sm text-muted-foreground">
                {dict.offers.price}
              </p>
              <p className="mt-1 text-3xl font-bold text-brand-navy">
                {formatPrice(
                  offer.priceBrutto,
                  offer.priceOnRequest,
                  dict.offers.priceOnRequest,
                )}
              </p>
            </div>

            <div className="mt-4">
              {isArchived ? (
                <div className="flex h-12 w-full items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-base font-semibold text-gray-500 cursor-not-allowed">
                  {dict.offers.archivedCtaDisabled}
                </div>
              ) : isOperationallyUnavailable ? (
                <div className="flex h-12 w-full items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-base font-semibold text-gray-500 cursor-not-allowed">
                  {dict.offers.unavailableCtaDisabled}
                </div>
              ) : (
                <OfferAction
                  offer={{
                    id: offer.id,
                    title: offer.title,
                    offerModel: offer.offerModel,
                    partnerName: offer.partnerName,
                  }}
                  ctaLabels={dict.cta}
                  rfqLabels={dict.rfq}
                  formLabels={dict.form}
                  systemLabels={dict.system}
                  closeLabel={dict.common.close}
                  externalOfferLabel={dict.offers.externalOffer}
                  variant="detail"
                />
              )}
            </div>

            {offer.description && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {dict.offers.description}
                </h3>
                <p className="mt-2 text-sm leading-relaxed">
                  {offer.description}
                </p>
              </div>
            )}

            {(isEcommerce || isRfq) && (
              <div className="mt-6 flex items-center gap-2 rounded-lg border border-[#14748733] bg-[#1474870d] p-3">
                <ShieldCheck className="h-5 w-5 shrink-0 text-[#147487]" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isEcommerce && dict.offers.ecommerceNotice}
                  {isRfq && dict.offers.rfqNotice}
                </p>
              </div>
            )}
          </div>
        </div>

        {(offer.attributes || []).length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-bold mb-4 text-brand-navy">
              {dict.offers.technicalParameters}
            </h2>
            <div className="overflow-hidden rounded-lg border border-[#d9dde2]">
              <table className="w-full text-sm">
                <tbody>
                  {(offer.attributes || []).map((attr, idx) => (
                    <tr
                      key={attr.attributeId}
                      className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}
                    >
                      <td className="w-1/3 border-r border-[#d9dde2] px-4 py-3 font-medium text-muted-foreground">
                        {attr.name}
                      </td>
                      <td className="px-4 py-3 font-bold text-[#141c2c]">
                        {attr.values.join(", ")} {attr.unitCode ?? ""}
                      </td>
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
        closeLabel={dict.common.close}
      />
    </div>
  );
}
