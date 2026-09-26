import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, ShieldCheck } from "lucide-react";
import { getOfferById } from "@/app/actions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartDrawer } from "@/components/CartDrawer";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { OfferModelBadge } from "@/components/offers/OfferModelBadge";
import { OfferAction } from "@/components/OfferAction";
import { PublicOfferMediaGallery } from "@/components/offers/PublicOfferMediaGallery";
import { getLocalizedCategoryLabel } from "@/lib/i18n/category-labels";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getCategoryFilterPath, getOfferLocaleLinks, getPrivacyPolicyPath } from "@/lib/i18n/paths";
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
  const privacyPolicyHref = getPrivacyPolicyPath(locale);

  const categoryLabels = dict.categories.bySlug as Record<string, string>;
  const categoryLabel = getLocalizedCategoryLabel(
    categoryLabels,
    offer.categorySlug,
    offer.categoryName,
  );

  const isArchived = offer.publicationStatus === "archived";
  const isOperationallyUnavailable = offer.publicationStatus === "published" && !offer.isActive;

  const isSellerTemporarilyUnavailable =
    offer.publicationStatus === "published" &&
    offer.offerModel === "ecommerce" &&
    offer.purchaseAvailability === "temporarily_unavailable";

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

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 md:py-8">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link
            href={getCategoryFilterPath(locale, offer.categorySlug)}
            className="inline-flex min-h-10 items-center gap-1.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {dict.nav.backToCatalog}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="min-w-0 break-words font-medium text-brand-navy">
            {categoryLabel}
          </span>
        </div>

        {isArchived && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
            <p className="font-semibold text-base">
              {dict.offers.archivedTitle}
            </p>
            <p className="mt-1 text-sm">{dict.offers.archivedDescription}</p>
          </div>
        )}

        {(isOperationallyUnavailable || isSellerTemporarilyUnavailable) && (
          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-gray-800">
            <p className="font-semibold text-base">
              {dict.offers.unavailableTitle}
            </p>
            <p className="mt-1 text-sm">{dict.offers.unavailableDescription}</p>
          </div>
        )}

        <header className="mt-5">
          <div className="flex flex-wrap items-center gap-2">
            {offer.isFeatured && (
              <Badge className="border-0 bg-brand-teal text-[10px] font-semibold uppercase tracking-wider text-white">
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
              className="rounded px-2.5 py-1 text-[10px]"
            />
          </div>
          <h1 className="mt-3 max-w-4xl break-words text-2xl font-bold leading-tight text-brand-navy sm:text-3xl">
            {offer.title}
          </h1>
        </header>

        <div className="mt-6 grid grid-cols-1 items-start gap-5 lg:grid-cols-12 lg:gap-6">
          <div className="order-2 min-w-0 lg:order-1 lg:col-span-7">
            <PublicOfferMediaGallery
              key={offer.id}
              media={offer.media}
              offerTitle={offer.title}
              imageUnavailableLabel={dict.offers.imageUnavailable}
            />
          </div>

          <div className="order-1 min-w-0 rounded-lg border border-border bg-white p-5 shadow-sm sm:p-6 lg:order-2 lg:col-span-5">
            <p className="text-sm font-medium text-muted-foreground">
              {dict.offers.price}
            </p>
            <p className="mt-1 break-words text-2xl font-bold leading-tight text-brand-navy sm:text-3xl">
              {formatPrice(
                offer.priceBrutto,
                offer.priceOnRequest,
                dict.offers.priceOnRequest,
              )}
            </p>

            <div className="mt-5">
              {isArchived ? (
                <div className="flex h-12 w-full items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-base font-semibold text-gray-500 cursor-not-allowed">
                  {dict.offers.archivedCtaDisabled}
                </div>
              ) : isOperationallyUnavailable ? (
                <div className="flex h-12 w-full items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-base font-semibold text-gray-500 cursor-not-allowed">
                  {dict.offers.unavailableCtaDisabled}
                </div>
              ) : isSellerTemporarilyUnavailable ? (
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
                      purchaseAvailability: offer.purchaseAvailability,
                    }}
                    unavailableCtaDisabled={dict.offers.unavailableCtaDisabled}
                  ctaLabels={dict.cta}
                  rfqLabels={dict.rfq}
                  formLabels={dict.form}
                  systemLabels={dict.system}
                  closeLabel={dict.common.close}
                  externalOfferLabel={dict.offers.externalOffer}
                  verificationRequiredLabel={dict.offers.verificationRequired}
                  privacyPolicyHref={privacyPolicyHref}
                  variant="detail"
                />
              )}
            </div>

            {(isEcommerce || isRfq) && (
              <div className="mt-5 flex items-start gap-2 border-t border-border pt-4">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal" aria-hidden="true" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {isEcommerce && dict.offers.ecommerceNotice}
                  {isRfq && dict.offers.rfqNotice}
                </p>
              </div>
            )}
          </div>
        </div>

        {(offer.attributes || []).length > 0 && (
          <section className="mt-8" aria-labelledby="offer-parameters-heading">
            <h2 id="offer-parameters-heading" className="mb-4 text-lg font-bold text-brand-navy">
              {dict.offers.technicalParameters}
            </h2>
            <div className="overflow-hidden rounded-lg border border-border bg-white">
              <table className="w-full table-fixed text-sm">
                <tbody>
                  {(offer.attributes || []).map((attr, idx) => (
                    <tr
                      key={attr.attributeId}
                      className={idx % 2 === 0 ? "bg-white" : "bg-brand-light-gray"}
                    >
                      <th scope="row" className="w-2/5 break-words border-r border-border px-3 py-2.5 text-left align-top font-medium text-muted-foreground sm:w-1/3 sm:px-4">
                        {attr.name}
                      </th>
                      <td className="break-words px-3 py-2.5 align-top font-semibold text-brand-navy sm:px-4">
                        {attr.values.join(", ")} {attr.unitCode ?? ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section aria-labelledby="offer-partner-heading" className="mt-8 rounded-lg border border-border bg-white p-4 sm:p-5">
          <h2 id="offer-partner-heading" className="text-sm font-semibold text-muted-foreground">
            {dict.offers.partner}
          </h2>
          <p className="mt-2 flex min-w-0 items-center gap-2 text-base font-semibold text-brand-navy">
            <Building2 className="h-5 w-5 shrink-0 text-brand-teal" aria-hidden="true" />
            <span className="min-w-0 break-words">{offer.partnerName}</span>
          </p>
        </section>

        {offer.description && (
          <section aria-labelledby="offer-description-heading" className="mt-8">
            <h2 id="offer-description-heading" className="mb-4 text-lg font-bold text-brand-navy">
              {dict.offers.description}
            </h2>
            <div className="rounded-lg border border-border bg-white p-4 sm:p-5">
              <p className="max-w-3xl whitespace-pre-line break-words text-sm leading-7 text-foreground">
                {offer.description}
              </p>
            </div>
          </section>
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
        privacyPolicyHref={privacyPolicyHref}
      />
    </div>
  );
}
