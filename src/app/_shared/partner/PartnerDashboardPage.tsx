import Link from "next/link";
import { ArrowRight, Clock, ClipboardList } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import type {
  DashboardOrderSummary,
  DashboardStatus,
  PartnerDashboardModelResult,
} from "@/lib/partner-dashboard/model-core";
import { formatPartnerOrderRemainingTime } from "@/lib/partner-orders/presentation";
import { PartnerActivityChart } from "./dashboard/PartnerActivityChart";
import { PartnerStatusChart } from "./dashboard/PartnerStatusChart";

type PartnerWorkspaceDictionary = Dictionary["PartnerWorkspace"];

const STATUS_BADGE_CLASSES: Record<DashboardStatus, string> = {
  pending_decision: "border-amber-200 bg-amber-50 text-amber-800",
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-800",
  fulfillment_in_progress: "border-sky-200 bg-sky-50 text-sky-800",
  fulfilled: "border-teal-200 bg-teal-50 text-teal-800",
  rejected: "border-slate-200 bg-slate-100 text-slate-700",
  expired: "border-rose-200 bg-rose-50 text-rose-800",
  cancelled: "border-gray-200 bg-gray-100 text-gray-700",
};

function getStatusLabels(dict: PartnerWorkspaceDictionary): Record<DashboardStatus, string> {
  return {
    pending_decision: dict.statusPending,
    accepted: dict.statusAccepted,
    fulfillment_in_progress: dict.statusFulfillmentInProgress,
    fulfilled: dict.statusFulfilled,
    rejected: dict.statusRejected,
    expired: dict.statusExpired,
    cancelled: dict.statusCancelled,
  };
}

function formatOrderDate(value: Date, locale: Locale) {
  return value.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatOrderValue(order: DashboardOrderSummary) {
  return `${order.orderTotal} ${order.currency}`;
}

function StatusBadge({
  status,
  label,
}: {
  status: DashboardStatus;
  label: string;
}) {
  return (
    <span className={`inline-flex border px-2 py-1 text-xs font-semibold ${STATUS_BADGE_CLASSES[status]}`}>
      {label}
    </span>
  );
}

export function PartnerDashboardPage({
  ordersHref,
  orderDetailBaseHref,
  locale,
  model,
  dict,
}: {
  ordersHref: string;
  orderDetailBaseHref: string;
  locale: Locale;
  model: PartnerDashboardModelResult;
  dict: PartnerWorkspaceDictionary;
}) {
  const statusLabels = getStatusLabels(dict);

  if (!model.ok) {
    return (
      <section className="space-y-6" aria-labelledby="partner-dashboard-title">
        <DashboardHeader ordersHref={ordersHref} dict={dict} />
        <div className="border border-border-industrial bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-brand-navy">{dict.dashboardUnavailableTitle}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {dict.dashboardUnavailableDescription}
          </p>
        </div>
      </section>
    );
  }

  const kpis = [
    {
      label: dict.dashboardKpiPending,
      value: model.kpis.pending,
      href: `${ordersHref}?filter=pending`,
      accent: "border-l-amber-500",
    },
    {
      label: dict.dashboardKpiAccepted,
      value: model.kpis.accepted,
      href: ordersHref,
      accent: "border-l-emerald-600",
    },
    {
      label: dict.dashboardKpiRejected,
      value: model.kpis.rejected,
      href: ordersHref,
      accent: "border-l-slate-500",
    },
    {
      label: dict.dashboardKpiExpired,
      value: model.kpis.expired,
      href: `${ordersHref}?filter=expired`,
      accent: "border-l-rose-600",
    },
  ];

  return (
    <section className="space-y-8" aria-labelledby="partner-dashboard-title">
      <DashboardHeader ordersHref={ordersHref} dict={dict} />

      <section aria-labelledby="dashboard-kpis-title">
        <h2 id="dashboard-kpis-title" className="sr-only">{dict.dashboardKpiSectionTitle}</h2>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <Link
              key={kpi.label}
              href={kpi.href}
              className={`border border-l-4 border-border-industrial bg-white p-4 shadow-soft transition-colors hover:border-brand-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 sm:p-5 ${kpi.accent}`}
            >
              <span className="block text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {kpi.label}
              </span>
              <span className="mt-2 block text-3xl font-bold tabular-nums text-brand-navy">
                {kpi.value}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {dict.dashboardKpiCurrentState}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <PartnerActivityChart
          activity={model.activity}
          locale={locale}
          title={dict.dashboardActivityTitle}
          summary={dict.dashboardActivitySummary}
          emptyLabel={dict.dashboardActivityEmpty}
          ordersLabel={dict.dashboardOrdersCountLabel}
        />
        <PartnerStatusChart
          distribution={model.statusDistribution}
          labels={statusLabels}
          title={dict.dashboardStatusTitle}
          summary={dict.dashboardStatusSummary}
          emptyLabel={dict.dashboardStatusEmpty}
        />
      </div>

      <section className="border border-border-industrial bg-white shadow-soft" aria-labelledby="dashboard-attention-title">
        <div className="border-b border-border-industrial px-5 py-4 sm:px-6">
          <h2 id="dashboard-attention-title" className="text-lg font-semibold text-brand-navy">
            {dict.dashboardAttentionTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{dict.dashboardAttentionDescription}</p>
        </div>
        {model.attention.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground sm:px-6">
            {dict.dashboardAttentionEmpty}
          </p>
        ) : (
          <ul className="divide-y divide-border-industrial">
            {model.attention.map((order) => {
              const remaining = formatPartnerOrderRemainingTime(order.expiresAt, order.serverNow, dict);
              return (
                <li key={order.sellerOrderId} className="grid gap-4 px-5 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
                  <div className="min-w-0">
                    <Link
                      href={`${orderDetailBaseHref}/${order.sellerOrderId}`}
                      className="font-semibold text-brand-teal hover:text-brand-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
                    >
                      {order.publicOrderReference}
                    </Link>
                    <p className="mt-1 truncate text-sm text-brand-navy" title={order.buyerBusinessName}>
                      {order.buyerBusinessName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {order.itemCount} {dict.itemsLabel}
                    </p>
                  </div>
                  <div className="text-sm font-semibold text-brand-navy">
                    {formatOrderValue(order)}
                  </div>
                  <div className="flex items-center justify-between gap-4 lg:justify-end">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700">
                      <Clock className="size-4" aria-hidden="true" />
                      <span>{dict.dashboardDeadline}: {remaining}</span>
                    </span>
                    <Link
                      href={`${orderDetailBaseHref}/${order.sellerOrderId}`}
                      className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-brand-teal hover:text-brand-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
                    >
                      {dict.dashboardViewOrder}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="border border-border-industrial bg-white shadow-soft" aria-labelledby="dashboard-latest-title">
        <div className="flex items-center justify-between gap-4 border-b border-border-industrial px-5 py-4 sm:px-6">
          <h2 id="dashboard-latest-title" className="text-lg font-semibold text-brand-navy">
            {dict.dashboardLatestTitle}
          </h2>
          <Link
            href={ordersHref}
            className="text-sm font-semibold text-brand-teal hover:text-brand-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
          >
            {dict.dashboardAllOrders}
          </Link>
        </div>
        {model.latest.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground sm:px-6">
            {dict.dashboardLatestEmpty}
          </p>
        ) : (
          <ul className="divide-y divide-border-industrial">
            {model.latest.map((order) => (
              <li key={order.sellerOrderId} className="grid gap-3 px-5 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto] lg:items-center">
                <Link
                  href={`${orderDetailBaseHref}/${order.sellerOrderId}`}
                  className="font-semibold text-brand-teal hover:text-brand-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
                >
                  {order.publicOrderReference}
                </Link>
                <span className="truncate text-sm text-brand-navy" title={order.buyerBusinessName}>
                  {order.buyerBusinessName}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatOrderDate(order.createdAt, locale)}
                </span>
                <span className="text-sm font-semibold text-brand-navy">
                  {formatOrderValue(order)}
                </span>
                <div className="flex items-center justify-between gap-3 sm:col-span-2 lg:col-span-1">
                  <StatusBadge status={order.effectiveStatus} label={statusLabels[order.effectiveStatus]} />
                  <Link
                    href={`${orderDetailBaseHref}/${order.sellerOrderId}`}
                    className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-brand-teal hover:text-brand-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
                  >
                    {dict.dashboardViewOrder}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

function DashboardHeader({
  ordersHref,
  dict,
}: {
  ordersHref: string;
  dict: PartnerWorkspaceDictionary;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-border-industrial pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-teal">
          {dict.workspaceLabel}
        </p>
        <h1 id="partner-dashboard-title" className="mt-2 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
          {dict.dashboardTitle}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
          {dict.dashboardIntro}
        </p>
      </div>
      <Link
        href={ordersHref}
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 border border-brand-teal bg-brand-teal px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
      >
        <ClipboardList className="size-4" aria-hidden="true" />
        {dict.dashboardOrdersCta}
      </Link>
    </header>
  );
}
