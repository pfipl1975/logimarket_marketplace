import { getPartnerOrderDetail } from "@/lib/partner-orders/read-model";
import { requirePartnerOrderDecisionAuthority } from "@/lib/auth/partner-membership";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, Clock, Info } from "lucide-react";
import { PartnerOrderDecisionPanel } from "@/components/partner-orders/PartnerOrderDecisionPanel";
import { PartnerOrderFulfillmentPanel } from "@/components/partner-orders/PartnerOrderFulfillmentPanel";
import { formatPartnerInvoiceStreetLine } from "@/lib/partner-orders/read-model-core";

import { formatPartnerOrderRemainingTime } from "@/lib/partner-orders/presentation";
import { buildPartnerOrderDetailProgress, getPartnerOrderDetailStatusLabel } from "@/lib/partner-orders/detail-presentation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/config";
import { parseStrictIdOrNotFound } from "@/lib/partner-orders/route-params";

export default async function PartnerOrderDetailPage({
  params,
}: {
  params: Promise<{ partnerId: string; sellerOrderId: string; locale?: string }>;
}) {
  const { partnerId, sellerOrderId, locale } = await params;
  const resolvedLocale =
    typeof locale === "string" && isLocale(locale)
      ? locale
      : "pl";
  const { PartnerWorkspace: dict } = await getDictionary(resolvedLocale);
  const parsedPartnerId = parseStrictIdOrNotFound(partnerId);
  const parsedSellerOrderId = parseStrictIdOrNotFound(sellerOrderId);

  let canMakeDecision = false;
  try {
    await requirePartnerOrderDecisionAuthority(parsedPartnerId);
    canMakeDecision = true;
  } catch {
    canMakeDecision = false;
  }

  const result = await getPartnerOrderDetail(parsedPartnerId, parsedSellerOrderId);
  
  if (!result.ok) {
    if (result.code === "NOT_FOUND") notFound();
    if (result.code === "UNAUTHORIZED") notFound();
    return (
      <div className="bg-white p-8 rounded-industrial border border-border-industrial text-center">
        <h2 className="text-xl font-bold text-brand-navy mb-2">{dict.error}</h2>
        <p className="text-muted-foreground">{dict.errorDetail}</p>
      </div>
    );
  }

  const basePath = locale ? `/${locale}/partner/${partnerId}/orders` : `/partner/${partnerId}/zamowienia`;

  const order = result.data;
  const showContact = order.buyerContactName || order.buyerEmail || order.buyerPhone;

  const statusLabel = getPartnerOrderDetailStatusLabel(order.effectiveStatus, dict);
  const progress = buildPartnerOrderDetailProgress(order);
  const date = (value: Date) => value.toLocaleString(resolvedLocale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="min-w-0 space-y-6">
      <header className="min-w-0 rounded-industrial border border-border-industrial bg-white p-4 shadow-soft sm:p-6">
        <Link href={basePath} aria-label={dict.backToListAria} className="inline-flex min-h-11 items-center gap-2 rounded-industrial text-sm font-medium text-brand-teal hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2">
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          {dict.backToListAria}
        </Link>
        <div className="mt-3 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="wrap-anywhere text-2xl font-bold text-brand-navy">{dict.orderRef} {order.publicOrderReference}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{dict.placedOnDate} <time dateTime={order.createdAt.toISOString()}>{date(order.createdAt)}</time></p>
          </div>
          <div className="min-w-0 space-y-2 sm:text-right">
            <span role="status" aria-label={dict.currentStatus} className={`inline-flex max-w-full rounded-industrial border px-3 py-1.5 text-sm font-semibold ${order.effectiveStatus === "invalid_order_state" || order.effectiveStatus === "expired" ? "border-rose-200 bg-rose-50 text-rose-800" : order.effectiveStatus === "pending_decision" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-border-industrial bg-brand-light-gray text-brand-navy"}`}>
              {statusLabel}
            </span>
            <div><p className="text-xs text-muted-foreground">{dict.totalToPay}</p><p className="mt-1 wrap-anywhere text-2xl font-bold tabular-nums text-brand-navy">{order.orderTotal} {order.currency}</p></div>
          </div>
        </div>
      </header>

      <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-5">
        <section aria-labelledby="order-items-title" className="min-w-0 overflow-hidden rounded-industrial border border-border-industrial bg-white shadow-soft xl:col-span-3">
          <h2 id="order-items-title" className="border-b border-border-industrial bg-brand-light-gray/30 px-5 py-4 font-semibold text-brand-navy">{dict.orderItems}</h2>
          <ul className="divide-y divide-border-industrial">
            {order.items.map(item => (
              <li key={item.id} className="min-w-0 p-5">
                <h3 className="wrap-anywhere font-medium text-brand-navy">{item.offerTitle}</h3>
                {(item.manufacturer || item.model) && <p className="mt-1 wrap-anywhere text-sm text-muted-foreground">{item.manufacturer} {item.model}</p>}
                <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3 text-sm">
                  <p className="text-muted-foreground"><span className="sr-only">{dict.quantity}: </span><span>{item.quantity}</span> × <span className="sr-only">{dict.unitPrice} </span><span>{item.unitPrice} {item.currency}</span></p>
                  <p className="wrap-anywhere font-semibold tabular-nums text-brand-navy">{item.lineTotal} {item.currency}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-border-industrial bg-brand-light-gray/30 px-5 py-4">
            <span className="text-sm font-medium text-muted-foreground">{dict.totalToPay}</span>
            <span className="wrap-anywhere text-xl font-bold tabular-nums text-brand-navy">{order.orderTotal} {order.currency}</span>
          </div>
        </section>

        <div className="min-w-0 space-y-4 xl:col-span-2 [&>div]:mt-0 [&_button]:min-h-11 [&_button]:min-w-0 [&_button]:wrap-anywhere">
          <section aria-labelledby="order-progress-title" className="min-w-0 rounded-industrial border border-border-industrial bg-white p-5 shadow-soft">
            <h2 id="order-progress-title" className="font-semibold text-brand-navy">{dict.orderProgress}</h2>
            {progress.length > 0 ? (
              <ol className="mt-4 space-y-3">
                {progress.map(step => (
                  <li key={step.key} aria-current={step.current ? "step" : undefined} className="flex min-w-0 items-start gap-3">
                    {step.current ? <Circle className="mt-1 h-5 w-5 shrink-0 text-brand-teal" aria-hidden="true" /> : <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-brand-teal" aria-hidden="true" />}
                    <div className="min-w-0">
                      {step.current ? <p className="text-xs font-medium text-muted-foreground">{dict.currentStatus}</p> : <span className="sr-only">{dict.progressCompleted} </span>}
                      <p className={step.current ? "wrap-anywhere font-semibold text-brand-navy" : "wrap-anywhere text-sm text-brand-navy"}>{dict[step.labelKey]}</p>
                      {step.timestamp !== null && <time dateTime={step.timestamp.toISOString()} className="mt-0.5 block text-xs text-muted-foreground">{date(step.timestamp)}</time>}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 flex items-start gap-2 rounded-industrial border border-border-industrial bg-brand-light-gray p-3 font-semibold text-brand-navy"><Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /><span className="wrap-anywhere">{statusLabel}</span></p>
            )}
            {order.effectiveStatus === "pending_decision" && order.expiresAt && (
              <div className="mt-4 space-y-2 rounded-industrial border border-orange-200 bg-orange-50 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-orange-800"><Clock className="h-4 w-4 shrink-0" aria-hidden="true" />{dict.awaitingDecision}</p>
                <p className="text-xl font-bold text-orange-900">{formatPartnerOrderRemainingTime(order.expiresAt, order.serverNow, dict)}</p>
                <p className="text-xs text-orange-700">{dict.decisionDeadline} {date(order.expiresAt)}</p>
              </div>
            )}
            {order.effectiveStatus === "expired" && (
              <div className="mt-4 space-y-2 rounded-industrial border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p className="font-medium">{dict.decisionExpired}</p>
                {order.expiresAt && <p className="text-xs">{dict.decisionDeadline} {date(order.expiresAt)}</p>}
              </div>
            )}
          </section>
          {order.effectiveStatus === "pending_decision" && order.decisionWindowOpen && (
            <PartnerOrderDecisionPanel sellerOrderId={order.sellerOrderId} dict={dict} canMakeDecision={canMakeDecision} />
          )}
          {(order.effectiveStatus === "accepted" || order.effectiveStatus === "fulfillment_in_progress") && (
            <PartnerOrderFulfillmentPanel sellerOrderId={order.sellerOrderId} dict={dict} canMakeDecision={canMakeDecision} effectiveStatus={order.effectiveStatus} />
          )}
        </div>
      </div>

      <div className={`grid min-w-0 grid-cols-1 items-start gap-6 ${order.buyerDetailsDisclosed ? "lg:grid-cols-2" : ""}`}>
        <section aria-labelledby="order-buyer-title" className="min-w-0 rounded-industrial border border-border-industrial bg-white p-5 shadow-soft sm:p-6">
          <h2 id="order-buyer-title" className="font-semibold text-brand-navy">{dict.colBuyer}</h2>
          <p className="mt-4 wrap-anywhere font-medium text-brand-navy">{order.buyerBusinessName}</p>
          <dl className="mt-3 space-y-2 text-sm">
            {order.buyerTaxId && <div className="flex flex-wrap gap-x-2"><dt className="text-muted-foreground">{dict.vatLabel}</dt><dd className="wrap-anywhere font-medium">{order.buyerTaxId}</dd></div>}
            {order.buyerRegistryId && <div className="flex flex-wrap gap-x-2"><dt className="text-muted-foreground">{dict.registryIdLabel}</dt><dd className="wrap-anywhere font-medium">{order.buyerRegistryId}</dd></div>}
            {(!order.buyerInvoice || order.buyerCountryCode !== order.buyerInvoice.countryCode) && <div className="flex flex-wrap gap-x-2"><dt className="text-muted-foreground">{dict.registrationCountry}</dt><dd>{order.buyerCountryCode}</dd></div>}
            {order.customerPoNumber && <div className="border-t border-border-industrial pt-3"><dt className="text-xs text-muted-foreground">{dict.buyerPo}</dt><dd className="mt-1 wrap-anywhere font-medium">{order.customerPoNumber}</dd></div>}
          </dl>
          {!showContact && order.effectiveStatus === "pending_decision" && <p className="mt-4 rounded-industrial bg-brand-light-gray p-3 text-xs leading-5 text-muted-foreground">{dict.contactHidden}</p>}
          {showContact && (
            <div className="mt-4 space-y-2 border-t border-border-industrial pt-4 text-sm">
              <h3 className="font-semibold text-brand-navy">{dict.contactPerson}</h3>
              {order.buyerContactName && <p className="wrap-anywhere">{order.buyerContactName}</p>}
              {order.buyerEmail && <p><a href={`mailto:${order.buyerEmail}`} className="inline-block max-w-full wrap-anywhere rounded text-brand-teal underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal">{order.buyerEmail}</a></p>}
              {order.buyerPhone && <p><a href={`tel:${order.buyerPhone}`} className="inline-block max-w-full wrap-anywhere rounded text-brand-navy underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal">{order.buyerPhone}</a></p>}
            </div>
          )}
        </section>

        {order.buyerDetailsDisclosed && (
          <section aria-labelledby="buyer-invoice-title" className="min-w-0 rounded-industrial border border-border-industrial bg-white p-5 shadow-soft sm:p-6">
            <h2 id="buyer-invoice-title" className="font-semibold text-brand-navy">{dict.invoiceDataTitle}</h2>
            {order.invoiceDataAvailable && order.buyerInvoice ? (
              <>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{dict.invoiceSnapshotNotice}</p>
                <dl className="mt-4 space-y-4 text-sm">
                  <div><dt className="text-xs text-muted-foreground">{dict.invoiceLegalName}</dt><dd className="mt-1 break-words wrap-anywhere font-medium text-brand-navy">{order.buyerInvoice.legalName}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">{dict.invoiceTaxId}</dt><dd className="mt-1 break-words wrap-anywhere font-medium tabular-nums text-brand-navy">{order.buyerInvoice.taxIdentifierValue}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">{dict.invoiceAddress}</dt><dd className="mt-1 break-words wrap-anywhere leading-6 text-brand-navy">
                    <span className="block">{formatPartnerInvoiceStreetLine(order.buyerInvoice)}</span>
                    <span className="block">{order.buyerInvoice.postalCode} {order.buyerInvoice.city}</span>
                    <span className="block">{order.buyerInvoice.countryCode}</span>
                  </dd></div>
                </dl>
              </>
            ) : <p className="mt-3 text-sm leading-6 text-muted-foreground">{dict.invoiceUnavailable}</p>}
          </section>
        )}
      </div>
    </div>
  );
}
