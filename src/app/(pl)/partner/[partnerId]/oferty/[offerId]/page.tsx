import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Image from "next/image";
import type { Dictionary } from "@/lib/i18n/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getLocalizedCategoryLabel } from "@/lib/i18n/category-labels";
import { getOfferPath } from "@/lib/i18n/paths";
import { db } from "@/lib/db";
import { PartnerOfferSubmitButton } from "@/components/partner/PartnerOfferSubmitButton";
import { parseStrictIdOrNotFound } from "@/lib/partner-orders/route-params";
import { getPartnerOfferDetailReadModel, type PartnerOfferDetailDto } from "@/lib/partner-offers/detail-read-model";
import type { PartnerOfferPublicationStatus } from "@/lib/partner-offers/model-core";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

type PartnerWorkspaceDictionary = Dictionary["PartnerWorkspace"];

const STATUS_CLASSES: Record<PartnerOfferPublicationStatus, string> = {
  draft: "border-slate-200 bg-slate-100 text-slate-700",
  pending_review: "border-amber-200 bg-amber-50 text-amber-800",
  published: "border-emerald-200 bg-emerald-50 text-emerald-800",
  hidden: "border-amber-200 bg-amber-50 text-amber-800",
  archived: "border-gray-200 bg-gray-100 text-gray-700",
};

function getStatusLabel(
  status: PartnerOfferPublicationStatus,
  dict: PartnerWorkspaceDictionary,
) {
  const labels: Record<PartnerOfferPublicationStatus, string> = {
    draft: dict.offersStatusDraft,
    pending_review: dict.offersStatusPendingReview,
    published: dict.offersStatusPublished,
    hidden: dict.offersStatusHidden,
    archived: dict.offersStatusArchived,
  };
  return labels[status];
}

function getModelLabel(
  model: string,
  dict: PartnerWorkspaceDictionary,
) {
  return {
    rfq: dict.offersModelRfq,
    ecommerce: dict.offersModelEcommerce,
    outbound: dict.offersModelOutbound,
    unknown: dict.offersModelUnknown,
  }[model] || model;
}

function formatOfferDate(value: string | Date, locale: Locale) {
  const d = new Date(value);
  return d.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function OfferStatus({
  item,
  dict,
}: {
  item: PartnerOfferDetailDto;
  dict: PartnerWorkspaceDictionary;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex border px-2 py-1 text-xs font-semibold ${STATUS_CLASSES[item.publicationStatus]}`}
      >
        {getStatusLabel(item.publicationStatus, dict)}
      </span>
      {!item.isActive ? (
        <span className="text-xs font-medium text-muted-foreground">
          {dict.offersInactive}
        </span>
      ) : null}
    </div>
  );
}

function OfferPrice({
  item,
  dict,
}: {
  item: PartnerOfferDetailDto;
  dict: PartnerWorkspaceDictionary;
}) {
  return (
    <span className="font-medium tabular-nums text-brand-navy">
      {item.priceOnRequest || item.priceBrutto === null
        ? dict.offersPriceOnRequest
        : item.priceBrutto}
    </span>
  );
}

export default async function PartnerOfferDetailPage({
  params,
}: {
  params: Promise<{ partnerId: string; offerId: string; locale?: string }>;
}) {
  const { partnerId, offerId, locale } = await params;
  const resolvedLocale = typeof locale === "string" && isLocale(locale) ? locale : "pl";
  const dictionary = await getDictionary(resolvedLocale);
  const dict = dictionary.PartnerWorkspace;
  const parsedPartnerId = parseStrictIdOrNotFound(partnerId);
  
  const result = await getPartnerOfferDetailReadModel(db, parsedPartnerId, offerId, resolvedLocale);

  if (!result.ok) {
    notFound();
  }

  const offer = result.data;
  const categoryLabels = dictionary.categories.bySlug;
  const categoryLabel = getLocalizedCategoryLabel(categoryLabels, offer.categorySlug, offer.categoryName);
  
  const basePath = locale
    ? `/${resolvedLocale}/partner/${parsedPartnerId}/offers`
    : `/partner/${parsedPartnerId}/oferty`;

  const backHref = basePath;

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-brand-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {dict.offerDetailBackToOffers || "Back to offers"}
        </Link>
        <div className="flex items-center gap-4">
          {offer.publicationStatus === "draft" && (
            <>
              <Link
                href={locale ? `${basePath}/${offer.offerId}/edit` : `${basePath}/${offer.offerId}/edytuj`}
                className="inline-flex items-center justify-center bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
              >
                {dict.offerDetailEditDraft || "Edytuj ofertę"}
              </Link>
              <PartnerOfferSubmitButton
                partnerId={parsedPartnerId}
                offerId={offer.offerId}
                locale={resolvedLocale}
                label={dict.submitToModeration || "Prześlij do moderacji"}
                confirmMessage={dict.submitToModerationConfirm || "Czy na pewno chcesz przesłać tę ofertę do moderacji?"}
                successMessage={dict.submitSuccess || "Oferta została przesłana do moderacji"}
                errorMessage={dict.submitError || "Nie udało się przesłać oferty"}
              />
            </>
          )}
          {offer.publicPreviewAllowed && (
            <Link
              href={getOfferPath(resolvedLocale, String(offer.offerId))}
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-teal hover:text-brand-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
            >
              {dict.offersPublicPreview}
              <ExternalLink className="size-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>

      <header className="border border-border-industrial bg-white p-5 shadow-soft sm:p-8">
        {offer.publicationStatus === "pending_review" && (
          <div className="mb-6 rounded-md bg-amber-50 p-4 border border-amber-200">
            <h3 className="text-sm font-medium text-amber-800">
              {dict.moderationNotice || "Ta oferta oczekuje na weryfikację przez administratora i nie może być w tej chwili edytowana."}
            </h3>
          </div>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-xl font-bold text-brand-navy sm:text-2xl">
              {offer.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {categoryLabel}
            </p>
          </div>
          <div className="shrink-0">
            <OfferStatus item={offer} dict={dict} />
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border-industrial pt-6 sm:grid-cols-4">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">{dict.offersColumnModel}</dt>
            <dd className="mt-1 text-sm font-semibold text-brand-navy">{getModelLabel(offer.canonicalModel, dict)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">{dict.offersColumnPrice}</dt>
            <dd className="mt-1 text-sm"><OfferPrice item={offer} dict={dict} /></dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">{dict.offersColumnUpdated}</dt>
            <dd className="mt-1 text-sm font-semibold text-brand-navy">
              {formatOfferDate(offer.updatedAt ?? offer.createdAt, resolvedLocale)}
            </dd>
          </div>
        </dl>
      </header>

      <div className="grid gap-6 xl:grid-cols-3 xl:items-start">
        <div className="xl:col-span-2 space-y-6">
          <section className="border border-border-industrial bg-white shadow-soft">
            <h2 className="border-b border-border-industrial bg-brand-light-gray/30 px-5 py-4 text-sm font-bold text-brand-navy">
              {dict.offerDetailDescriptionTitle || "Description"}
            </h2>
            <div className="p-5 sm:p-6 text-sm text-brand-navy whitespace-pre-wrap">
              {offer.description ? offer.description : <span className="text-muted-foreground">{dict.offerDetailDescriptionEmpty || "Brak opisu."}</span>}
            </div>
          </section>

          <section className="border border-border-industrial bg-white shadow-soft">
            <h2 className="border-b border-border-industrial bg-brand-light-gray/30 px-5 py-4 text-sm font-bold text-brand-navy">
              {dict.offerDetailAttributesTitle || "Technical parameters"}
            </h2>
            {offer.relationalAttributes.length === 0 ? (
              <div className="p-5 sm:p-6 text-sm text-muted-foreground">
                {dict.offerDetailAttributesEmpty || "Brak parametrów technicznych."}
              </div>
            ) : (
              <dl className="divide-y divide-border-industrial">
                {offer.relationalAttributes.map((attr) => (
                  <div key={attr.attributeId} className="grid grid-cols-1 gap-1 p-5 sm:grid-cols-3 sm:gap-4 sm:p-6">
                    <dt className="text-sm font-medium text-muted-foreground">
                      {attr.name}
                    </dt>
                    <dd className="text-sm font-semibold text-brand-navy sm:col-span-2">
                      {attr.values.join(", ")}
                      {attr.unitCode ? ` ${attr.unitCode}` : ""}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="border border-border-industrial bg-white shadow-soft">
            <h2 className="border-b border-border-industrial bg-brand-light-gray/30 px-5 py-4 text-sm font-bold text-brand-navy">
              {dict.offerDetailMediaTitle || "Media"}
            </h2>
            <div className="p-5 sm:p-6">
              {offer.media.length === 0 ? (
                <p className="text-sm text-muted-foreground">{dict.offerDetailMediaEmpty || "Brak zdjęć."}</p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {offer.media.map((m) => (
                    m.publicUrl && (
                      <div key={m.mediaId} className={`relative aspect-square border border-border-industrial bg-brand-light-gray/10 ${m.isPrimary ? "col-span-2" : ""}`}>
                        <Image
                          src={m.publicUrl}
                          alt={m.altText ?? ""}
                          fill
                          className="object-contain p-2"
                          sizes={m.isPrimary ? "(max-width: 768px) 100vw, 33vw" : "(max-width: 768px) 50vw, 16vw"}
                        />
                        {m.isPrimary && (
                          <span className="absolute top-2 left-2 bg-brand-navy text-white text-xs font-semibold px-2 py-1">
                            {dict.offerDetailMediaPrimary || "Główne"}
                          </span>
                        )}
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

