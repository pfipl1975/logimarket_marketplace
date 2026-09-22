import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, Inbox } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/config";
import {
  buildPartnerOrdersListModel,
  type PartnerOrderFilter,
  type ValidPartnerOrderStatus,
} from "@/lib/partner-orders/list-presentation";
import {
  formatPartnerOrderRemainingTime,
  getPartnerOrderStatusLabel,
} from "@/lib/partner-orders/presentation";
import {
  getPartnerOrdersList,
  type PartnerOrderListItem,
} from "@/lib/partner-orders/read-model";
import { parseStrictIdOrNotFound } from "@/lib/partner-orders/route-params";

type PartnerWorkspaceDictionary = Dictionary["PartnerWorkspace"];

const STATUS_BADGE_CLASSES: Record<ValidPartnerOrderStatus, string> = {
  pending_decision: "border-amber-200 bg-amber-50 text-amber-800",
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-800",
  fulfillment_in_progress: "border-sky-200 bg-sky-50 text-sky-800",
  fulfilled: "border-teal-200 bg-teal-50 text-teal-800",
  rejected: "border-slate-200 bg-slate-100 text-slate-700",
  expired: "border-rose-200 bg-rose-50 text-rose-800",
  cancelled: "border-gray-200 bg-gray-100 text-gray-700",
};

function StatusBadge({
  status,
  dict,
}: {
  status: ValidPartnerOrderStatus;
  dict: PartnerWorkspaceDictionary;
}) {
  const label = getPartnerOrderStatusLabel(status, dict);
  if (!label) return null;

  return (
    <span
      className={`inline-flex border px-2 py-1 text-xs font-semibold ${STATUS_BADGE_CLASSES[status]}`}
    >
      {label}
    </span>
  );
}

function formatOrderDate(value: Date, locale: string) {
  return value.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function MobileOrderCard({
  item,
  basePath,
  locale,
  dict,
}: {
  item: PartnerOrderListItem;
  basePath: string;
  locale: string;
  dict: PartnerWorkspaceDictionary;
}) {
  const status = item.effectiveStatus as ValidPartnerOrderStatus;
  const remaining =
    status === "pending_decision"
      ? formatPartnerOrderRemainingTime(item.expiresAt, item.serverNow, dict)
      : null;

  return (
    <li className="min-w-0 border border-border-industrial bg-white p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`${basePath}/${item.sellerOrderId}`}
            className="font-semibold text-brand-teal hover:text-brand-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
          >
            {item.publicOrderReference}
          </Link>
          <p className="mt-1 break-words text-sm font-medium text-brand-navy">
            {item.buyerBusinessName}
          </p>
        </div>
        <StatusBadge status={status} dict={dict} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border-industrial pt-4 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {dict.colDate}
          </dt>
          <dd className="mt-1 text-brand-navy">{formatOrderDate(item.createdAt, locale)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {dict.colValue}
          </dt>
          <dd className="mt-1 font-semibold text-brand-navy">
            {item.orderTotal} {item.currency}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {dict.productsCount}
          </dt>
          <dd className="mt-1 text-brand-navy">
            {item.itemCount} {dict.itemsLabel}
          </dd>
        </div>
        {remaining ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {dict.decisionDeadline}
            </dt>
            <dd className="mt-1 inline-flex items-center gap-1.5 font-semibold text-amber-700">
              <Clock className="size-3.5" aria-hidden="true" />
              {remaining}
            </dd>
          </div>
        ) : null}
      </dl>

      <Link
        href={`${basePath}/${item.sellerOrderId}`}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-between border-t border-border-industrial pt-3 text-sm font-semibold text-brand-teal hover:text-brand-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
      >
        {dict.orderDetails}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </li>
  );
}

function getEmptyDescription(
  filter: PartnerOrderFilter,
  dict: PartnerWorkspaceDictionary
) {
  const descriptions: Record<PartnerOrderFilter, string> = {
    pending: dict.emptyPendingOrders,
    accepted: dict.emptyAcceptedOrders,
    rejected: dict.emptyRejectedOrders,
    expired: dict.emptyExpiredOrders,
    all: dict.emptyAllOrders,
  };
  return descriptions[filter];
}

export default async function PartnerOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ partnerId: string; locale?: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { partnerId, locale } = await params;
  const { filter } = await searchParams;
  const resolvedLocale = typeof locale === "string" && isLocale(locale) ? locale : "pl";
  const { PartnerWorkspace: dict } = await getDictionary(resolvedLocale);
  const parsedPartnerId = parseStrictIdOrNotFound(partnerId);
  const result = await getPartnerOrdersList(parsedPartnerId);

  if (!result.ok) {
    if (result.code === "UNAUTHORIZED") notFound();
    return <OrdersUnavailable dict={dict} />;
  }

  const listModel = buildPartnerOrdersListModel(result.items, filter);
  if (!listModel.ok) return <OrdersUnavailable dict={dict} />;

  const basePath = locale
    ? `/${locale}/partner/${parsedPartnerId}/orders`
    : `/partner/${parsedPartnerId}/zamowienia`;
  const filterTabs: Array<{ id: PartnerOrderFilter; label: string }> = [
    { id: "pending", label: dict.statusPending },
    { id: "accepted", label: dict.statusAccepted },
    { id: "rejected", label: dict.statusRejected },
    { id: "expired", label: dict.statusExpired },
    { id: "all", label: dict.tabAll },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-brand-navy">{dict.titleOrders}</h1>
        <p className="mt-1 text-muted-foreground">{dict.manageOrders}</p>
      </header>

      <section className="overflow-hidden border border-border-industrial bg-white shadow-soft">
        <nav
          aria-label={dict.orderFiltersLabel}
          className="grid grid-cols-2 gap-2 border-b border-border-industrial bg-brand-light-gray/30 p-3 sm:grid-cols-5 sm:gap-1 sm:p-4"
        >
          {filterTabs.map((tab) => {
            const isActive = listModel.activeFilter === tab.id;
            return (
              <Link
                key={tab.id}
                href={`${basePath}?filter=${tab.id}`}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-12 items-center justify-between gap-2 border px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 ${
                  tab.id === "all" ? "col-span-2 sm:col-span-1" : ""
                } ${
                  isActive
                    ? "border-brand-teal bg-brand-teal/10 text-brand-navy"
                    : "border-border-industrial bg-white text-muted-foreground hover:border-brand-teal hover:text-brand-navy"
                }`}
              >
                <span>{tab.label}</span>
                <span className="border-l border-current/20 pl-2 tabular-nums">
                  {listModel.counts[tab.id]}
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
              {dict.emptyListTitle}
            </h2>
            <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
              {getEmptyDescription(listModel.activeFilter, dict)}
            </p>
            {listModel.activeFilter !== "all" ? (
              <Link
                href={`${basePath}?filter=all`}
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-teal hover:text-brand-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
              >
                {dict.viewAllOrders}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        ) : (
          <>
            <ul className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:hidden">
              {listModel.filteredItems.map((item) => (
                <MobileOrderCard
                  key={item.sellerOrderId}
                  item={item}
                  basePath={basePath}
                  locale={resolvedLocale}
                  dict={dict}
                />
              ))}
            </ul>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full divide-y divide-border-industrial">
                <thead className="bg-brand-light-gray/50">
                  <tr>
                    {[dict.colOrder, dict.colBuyer, dict.colDate, dict.colValue, dict.colStatus].map(
                      (label) => (
                        <th
                          key={label}
                          scope="col"
                          className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          {label}
                        </th>
                      )
                    )}
                    <th scope="col" className="px-5 py-3 text-right">
                      <span className="sr-only">{dict.orderDetails}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-industrial bg-white">
                  {listModel.filteredItems.map((item) => {
                    const status = item.effectiveStatus as ValidPartnerOrderStatus;
                    const remaining =
                      status === "pending_decision"
                        ? formatPartnerOrderRemainingTime(item.expiresAt, item.serverNow, dict)
                        : null;
                    return (
                      <tr key={item.sellerOrderId} className="transition-colors hover:bg-brand-light-gray/40">
                        <td className="whitespace-nowrap px-5 py-4">
                          <Link
                            href={`${basePath}/${item.sellerOrderId}`}
                            className="font-semibold text-brand-teal hover:text-brand-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
                          >
                            {item.publicOrderReference}
                          </Link>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {item.itemCount} {dict.itemsLabel}
                          </span>
                        </td>
                        <td className="max-w-64 px-5 py-4 text-sm font-medium text-brand-navy">
                          <span className="line-clamp-2" title={item.buyerBusinessName}>
                            {item.buyerBusinessName}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-muted-foreground">
                          {formatOrderDate(item.createdAt, resolvedLocale)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-brand-navy">
                          {item.orderTotal} {item.currency}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <div className="flex flex-col items-start gap-1.5">
                            <StatusBadge status={status} dict={dict} />
                            {remaining ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                                <Clock className="size-3.5" aria-hidden="true" />
                                {remaining}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-right">
                          <Link
                            href={`${basePath}/${item.sellerOrderId}`}
                            className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-brand-teal hover:text-brand-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
                          >
                            {dict.orderDetails}
                            <ArrowRight className="size-4" aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function OrdersUnavailable({ dict }: { dict: PartnerWorkspaceDictionary }) {
  return (
    <div className="border border-border-industrial bg-white p-8 text-center">
      <h2 className="mb-2 text-xl font-bold text-brand-navy">{dict.error}</h2>
      <p className="text-muted-foreground">{dict.errorList}</p>
    </div>
  );
}
