import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Inbox } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getLocalizedCategoryLabel } from "@/lib/i18n/category-labels";
import { getOfferPath } from "@/lib/i18n/paths";
import {
  buildPartnerOffersListModel,
  type PartnerOfferFilter,
  type PartnerOfferListItem,
  type PartnerOfferPublicationStatus,
} from "@/lib/partner-offers/model-core";
import { getPartnerOffersList } from "@/lib/partner-offers/read-model";
import { parseStrictIdOrNotFound } from "@/lib/partner-orders/route-params";

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
  model: PartnerOfferListItem["canonicalModel"],
  dict: PartnerWorkspaceDictionary,
) {
  return {
    rfq: dict.offersModelRfq,
    ecommerce: dict.offersModelEcommerce,
    outbound: dict.offersModelOutbound,
    unknown: dict.offersModelUnknown,
  }[model];
}

function formatOfferDate(value: Date, locale: Locale) {
  return value.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function OfferStatus({
  item,
  dict,
}: {
  item: PartnerOfferListItem;
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
  item: PartnerOfferListItem;
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

function PublicPreviewLink({
  item,
  locale,
  dict,
}: {
  item: PartnerOfferListItem;
  locale: Locale;
  dict: PartnerWorkspaceDictionary;
}) {
  if (!item.publicPreviewAllowed) return null;

  return (
    <Link
      href={getOfferPath(locale, String(item.offerId))}
      className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-brand-teal hover:text-brand-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
    >
      {dict.offersPublicPreview}
      <ExternalLink className="size-4" aria-hidden="true" />
    </Link>
  );
}

function OffersUnavailable({ dict }: { dict: PartnerWorkspaceDictionary }) {
  return (
    <section className="border border-border-industrial bg-white px-6 py-10 text-center shadow-soft">
      <h1 className="text-xl font-bold text-brand-navy">{dict.offersUnavailableTitle}</h1>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        {dict.offersUnavailableDescription}
      </p>
    </section>
  );
}

export default async function PartnerOffersPage({
  params,
  searchParams,
}: {
  params: Promise<{ partnerId: string; locale?: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { partnerId, locale } = await params;
  const { filter } = await searchParams;
  const resolvedLocale = typeof locale === "string" && isLocale(locale) ? locale : "pl";
  const dictionary = await getDictionary(resolvedLocale);
  const dict = dictionary.PartnerWorkspace;
  const parsedPartnerId = parseStrictIdOrNotFound(partnerId);
  const result = await getPartnerOffersList(parsedPartnerId);

  if (!result.ok) {
    if (result.code === "UNAUTHORIZED") notFound();
    return <OffersUnavailable dict={dict} />;
  }

  const listModel = buildPartnerOffersListModel(result.items, filter);
  const basePath = locale
    ? `/${resolvedLocale}/partner/${parsedPartnerId}/offers`
    : `/partner/${parsedPartnerId}/oferty`;
  const filters: Array<{ id: PartnerOfferFilter; label: string }> = [
    { id: "all", label: dict.offersFilterAll },
    { id: "draft", label: dict.offersFilterDraft },
    { id: "pending_review", label: dict.offersStatusPendingReview },
    { id: "published", label: dict.offersFilterPublished },
    { id: "hidden", label: dict.offersFilterHidden },
    { id: "archived", label: dict.offersFilterArchived },
  ];
  const categoryLabels = dictionary.categories.bySlug;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">{dict.offersTitle}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            {dict.offersIntro}
          </p>
        </div>
        <div className="flex shrink-0">
          <Link
            href={locale ? `/${resolvedLocale}/partner/${parsedPartnerId}/offers/new` : `/partner/${parsedPartnerId}/oferty/nowa`}
            className="inline-flex items-center justify-center rounded-industrial bg-brand-navy px-4 py-2 text-sm font-medium text-white shadow-soft transition-colors hover:bg-brand-navy/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
          >
            {dict.offersAddButton || "Dodaj nową ofertę"}
          </Link>
        </div>
      </header>

      <section className="overflow-hidden border border-border-industrial bg-white shadow-soft">
        <nav
          aria-label={dict.offersFiltersLabel}
          className="grid grid-cols-2 gap-2 border-b border-border-industrial bg-brand-light-gray/30 p-3 sm:grid-cols-6 sm:gap-1 sm:p-4"
        >
          {filters.map((entry) => {
            const active = entry.id === listModel.activeFilter;
            return (
              <Link
                key={entry.id}
                href={`${basePath}?filter=${entry.id}`}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 items-center justify-between gap-2 border px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 ${
                  active
                    ? "border-brand-teal bg-brand-teal/10 text-brand-navy"
                    : "border-border-industrial bg-white text-muted-foreground hover:border-brand-teal hover:text-brand-navy"
                }`}
              >
                <span>{entry.label}</span>
                <span className="border-l border-current/20 pl-2 tabular-nums">
                  {listModel.counts[entry.id]}
                </span>
              </Link>
            );
          })}
        </nav>

        {listModel.filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-10 text-center sm:py-12">
            <span className="flex size-10 items-center justify-center border border-brand-teal/20 bg-brand-teal/10 text-brand-teal">
              <Inbox className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-brand-navy">
              {dict.offersEmptyTitle}
            </h2>
            <p className="mt-1 max-w-lg text-sm leading-6 text-muted-foreground">
              {dict.offersEmptyDescription}
            </p>
          </div>
        ) : (
          <>
            <ul className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:hidden">
              {listModel.filteredItems.map((item) => {
                const category = getLocalizedCategoryLabel(
                  categoryLabels,
                  item.categorySlug,
                  item.categoryName,
                );
                return (
                  <li key={item.offerId} className="min-w-0 border border-border-industrial bg-white p-4">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-brand-navy">
                          <Link href={`${basePath}/${item.offerId}`} className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-1">
                            {item.title}
                          </Link>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{category}</p>
                      </div>
                      <OfferStatus item={item} dict={dict} />
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">{dict.offersColumnModel}</dt>
                        <dd className="mt-1 font-medium text-brand-navy">{getModelLabel(item.canonicalModel, dict)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">{dict.offersColumnPrice}</dt>
                        <dd className="mt-1"><OfferPrice item={item} dict={dict} /></dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-xs text-muted-foreground">{dict.offersColumnUpdated}</dt>
                        <dd className="mt-1 font-medium text-brand-navy">
                          {formatOfferDate(item.updatedAt ?? item.createdAt, resolvedLocale)}
                        </dd>
                      </div>
                    </dl>
                      <div className="mt-4 flex flex-col gap-2 border-t border-border-industrial pt-3 sm:flex-row sm:items-center sm:justify-end">
                        <Link href={`${basePath}/${item.offerId}`} className="inline-flex min-h-10 items-center text-sm font-semibold text-brand-navy hover:text-brand-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2">
                          {dict.offerDetailReadMore || "View details"}
                        </Link>
                        <PublicPreviewLink item={item} locale={resolvedLocale} dict={dict} />
                      </div>
                  </li>
                );
              })}
            </ul>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full divide-y divide-border-industrial">
                <thead className="bg-brand-light-gray/50">
                  <tr>
                    {[
                      dict.offersColumnOffer,
                      dict.offersColumnCategory,
                      dict.offersColumnModel,
                      dict.offersColumnStatus,
                      dict.offersColumnPrice,
                      dict.offersColumnUpdated,
                    ].map((label) => (
                      <th key={label} scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {label}
                      </th>
                    ))}
                    <th scope="col" className="px-5 py-3 text-right">
                      <span className="sr-only">{dict.offersPublicPreview}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-industrial bg-white">
                  {listModel.filteredItems.map((item) => (
                    <tr key={item.offerId} className="align-top hover:bg-brand-light-gray/20">
                      <td className="max-w-xs px-5 py-4 font-semibold text-brand-navy">
                        <Link href={`${basePath}/${item.offerId}`} className="break-words hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-1">
                          {item.title}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">
                        {getLocalizedCategoryLabel(categoryLabels, item.categorySlug, item.categoryName)}
                      </td>
                      <td className="px-5 py-4 text-sm text-brand-navy">{getModelLabel(item.canonicalModel, dict)}</td>
                      <td className="px-5 py-4"><OfferStatus item={item} dict={dict} /></td>
                      <td className="px-5 py-4 text-sm"><OfferPrice item={item} dict={dict} /></td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-muted-foreground">
                        {formatOfferDate(item.updatedAt ?? item.createdAt, resolvedLocale)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex flex-col gap-2 items-end justify-center">
                          <Link href={`${basePath}/${item.offerId}`} className="inline-flex min-h-10 items-center text-sm font-semibold text-brand-navy hover:text-brand-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2">
                            {dict.offerDetailReadMore || "View details"}
                          </Link>
                          <PublicPreviewLink item={item} locale={resolvedLocale} dict={dict} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
