import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CartDrawer } from "@/components/CartDrawer";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { loadBuyerOrderDetail } from "@/lib/buyer-orders/detail-read-model";
import {
  parseBuyerOrderDetailId,
  type BuyerDetailDecisionPresentation,
  type BuyerDetailSellerStatus,
} from "@/lib/buyer-orders/detail-read-model-core";
import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPrivacyPolicyPath } from "@/lib/i18n/paths";

function ordersPath(locale: Locale): string {
  return locale === "pl" ? "/zamowienia" : `/${locale}/orders`;
}

function detailPath(locale: Locale, orderId: number): string {
  return `${ordersPath(locale)}/${orderId}`;
}

export async function BuyerOrderDetailPage({
  locale,
  orderIdParam,
}: {
  locale: Locale;
  orderIdParam: string;
}) {
  const orderId = parseBuyerOrderDetailId(orderIdParam);
  if (orderId === null) notFound();

  const path = detailPath(locale, orderId);
  const result = await loadBuyerOrderDetail(orderId);
  if (result.status === "unauthenticated") {
    const loginPath = locale === "pl" ? "/login" : `/${locale}/login`;
    redirect(`${loginPath}?next=${path}`);
  }
  if (result.status === "not_found") notFound();

  const dict = await getDictionary(locale);
  const labels = dict.BuyerOrderDetail;
  const order = result.detail;
  const languageLinks = Object.fromEntries(
    locales.map((language) => [language, detailPath(language, order.orderId)]),
  ) as Record<Locale, string>;
  const dateTime = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const statusLabels: Record<BuyerDetailSellerStatus, string> = {
    submitted: labels.statusSubmitted,
    seller_accepted: labels.statusAccepted,
    fulfillment_in_progress: labels.statusFulfillmentInProgress,
    fulfilled: labels.statusFulfilled,
    seller_rejected: labels.statusRejected,
    cancelled: labels.statusCancelled,
    expired: labels.statusExpired,
  };
  const decisionLabels: Record<BuyerDetailDecisionPresentation, string> = {
    pending_seller_review: labels.decisionAwaiting,
    seller_accepted: labels.decisionAccepted,
    seller_rejected: labels.decisionRejected,
    expired: labels.decisionExpired,
    not_routed: labels.decisionNotRouted,
    unavailable: labels.decisionUnavailable,
  };

  return (
    <div className="flex min-h-screen flex-col bg-brand-light-gray">
      <SiteHeader
        locale={locale}
        languageLinks={languageLinks}
        navLabels={dict.nav}
        searchLabels={dict.search}
      />
      <main className="flex-1 py-8 sm:py-12">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
          <Link
            href={ordersPath(locale)}
            className="text-sm font-semibold text-brand-teal hover:underline focus:outline-none focus:ring-2 focus:ring-brand-teal"
          >
            {labels.backToOrders}
          </Link>

          <header className="mt-5 border border-[#d9dde2] bg-white p-5 sm:p-7">
            <h1 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
              {labels.order} #{order.orderId}
            </h1>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[#52606d]">{labels.created}</dt>
                <dd className="mt-1 font-medium text-brand-navy">
                  <time dateTime={order.createdAt.toISOString()}>{dateTime.format(order.createdAt)}</time>
                </dd>
              </div>
              {order.customerPoNumber && (
                <div>
                  <dt className="text-[#52606d]">{labels.customerPo}</dt>
                  <dd className="mt-1 font-medium text-brand-navy">{order.customerPoNumber}</dd>
                </div>
              )}
            </dl>
          </header>

          <section className="mt-6 border border-[#d9dde2] bg-white p-5 sm:p-7" aria-labelledby="buyer-contact">
            <h2 id="buyer-contact" className="text-lg font-semibold text-brand-navy">
              {labels.buyerContact}
            </h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[#52606d]">{labels.contactName}</dt>
                <dd className="mt-1 font-medium text-brand-navy">{order.buyerContact.contactName}</dd>
              </div>
              <div>
                <dt className="text-[#52606d]">{labels.email}</dt>
                <dd className="mt-1 break-all">
                  <a className="font-medium text-brand-teal hover:underline" href={`mailto:${order.buyerContact.email}`}>
                    {order.buyerContact.email}
                  </a>
                </dd>
              </div>
              {order.buyerContact.phone && (
                <div>
                  <dt className="text-[#52606d]">{labels.phone}</dt>
                  <dd className="mt-1">
                    <a className="font-medium text-brand-teal hover:underline" href={`tel:${order.buyerContact.phone}`}>
                      {order.buyerContact.phone}
                    </a>
                  </dd>
                </div>
              )}
              {order.buyerContact.message && (
                <div className="sm:col-span-2">
                  <dt className="text-[#52606d]">{labels.message}</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-brand-navy">{order.buyerContact.message}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="mt-8" aria-labelledby="seller-orders">
            <h2 id="seller-orders" className="text-xl font-bold text-brand-navy">{labels.sellers}</h2>
            <div className="mt-4 space-y-6">
              {order.sellers.map((sellerOrder) => (
                <article key={sellerOrder.sellerOrderId} className="border border-[#d9dde2] bg-white">
                  <div className="border-b border-[#d9dde2] p-5 sm:p-6">
                    <h3 className="text-lg font-semibold text-brand-navy">{sellerOrder.seller.displayName}</h3>
                    <p className="mt-1 text-sm text-[#52606d]">{sellerOrder.seller.legalName}</p>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-[#52606d]">{labels.registeredAddress}</dt>
                        <dd className="mt-1 text-brand-navy">{sellerOrder.seller.registeredAddress}</dd>
                      </div>
                      <div>
                        <dt className="text-[#52606d]">{labels.jurisdiction}</dt>
                        <dd className="mt-1 text-brand-navy">{sellerOrder.seller.jurisdictionCountry}</dd>
                      </div>
                      <div>
                        <dt className="text-[#52606d]">{labels.firmEmail}</dt>
                        <dd className="mt-1 break-all">
                          <a className="text-brand-teal hover:underline" href={`mailto:${sellerOrder.seller.firmContactEmail}`}>
                            {sellerOrder.seller.firmContactEmail}
                          </a>
                        </dd>
                      </div>
                      {sellerOrder.seller.taxIdentifier && (
                        <div>
                          <dt className="text-[#52606d]">{labels.taxIdentifier}</dt>
                          <dd className="mt-1 text-brand-navy">
                            {sellerOrder.seller.taxIdentifier.type}: {sellerOrder.seller.taxIdentifier.value}
                          </dd>
                        </div>
                      )}
                      {sellerOrder.seller.registryIdentifier && (
                        <div>
                          <dt className="text-[#52606d]">{labels.registryIdentifier}</dt>
                          <dd className="mt-1 text-brand-navy">
                            {sellerOrder.seller.registryIdentifier.type}: {sellerOrder.seller.registryIdentifier.value}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div className="border-b border-[#d9dde2] bg-brand-light-gray/50 p-5 sm:p-6">
                    <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <dt className="text-[#52606d]">{labels.sellerOrderState}</dt>
                        <dd className="mt-1 font-semibold text-brand-navy">{statusLabels[sellerOrder.status]}</dd>
                      </div>
                      <div>
                        <dt className="text-[#52606d]">{labels.sellerDecision}</dt>
                        <dd className="mt-1 font-semibold text-brand-navy">{decisionLabels[sellerOrder.decision]}</dd>
                      </div>
                      {sellerOrder.routedAt && (
                        <div>
                          <dt className="text-[#52606d]">{labels.routedAt}</dt>
                          <dd className="mt-1 text-brand-navy">{dateTime.format(sellerOrder.routedAt)}</dd>
                        </div>
                      )}
                      {sellerOrder.decisionResolvedAt && (
                        <div>
                          <dt className="text-[#52606d]">{labels.resolvedAt}</dt>
                          <dd className="mt-1 text-brand-navy">{dateTime.format(sellerOrder.decisionResolvedAt)}</dd>
                        </div>
                      )}
                      {sellerOrder.acceptedAt && (
                        <div>
                          <dt className="text-[#52606d]">{labels.acceptedAt}</dt>
                          <dd className="mt-1 text-brand-navy">{dateTime.format(sellerOrder.acceptedAt)}</dd>
                        </div>
                      )}
                      {sellerOrder.expiresAt && (
                        <div>
                          <dt className="text-[#52606d]">{labels.expiresAt}</dt>
                          <dd className="mt-1 text-brand-navy">{dateTime.format(sellerOrder.expiresAt)}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div className="p-5 sm:p-6">
                    <h4 className="font-semibold text-brand-navy">{labels.items}</h4>
                    <div className="mt-3 divide-y divide-[#d9dde2] border-y border-[#d9dde2]">
                      {sellerOrder.items.map((item) => (
                        <div key={item.itemId} className="grid gap-3 py-4 text-sm sm:grid-cols-[minmax(0,1fr)_auto]">
                          <div className="min-w-0">
                            <p className="font-medium text-brand-navy">{item.offerTitle}</p>
                            {(item.manufacturer || item.model) && (
                              <p className="mt-1 text-[#52606d]">
                                {item.manufacturer && `${labels.manufacturer}: ${item.manufacturer}`}
                                {item.manufacturer && item.model && " · "}
                                {item.model && `${labels.model}: ${item.model}`}
                              </p>
                            )}
                          </div>
                          <dl className="grid grid-cols-2 gap-x-5 gap-y-1 sm:text-right">
                            <div>
                              <dt className="text-[#52606d]">{labels.quantity}</dt>
                              <dd className="font-medium text-brand-navy">{item.quantity}</dd>
                            </div>
                            <div>
                              <dt className="text-[#52606d]">{labels.unitPrice}</dt>
                              <dd className="whitespace-nowrap font-medium text-brand-navy">
                                {item.unitPrice} {item.currency}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter locale={locale} navLabels={dict.nav} footerLabels={dict.footer} />
      <CartDrawer
        cartLabels={dict.cart}
        ctaLabels={dict.cta}
        checkoutLabels={dict.checkout}
        formLabels={dict.form}
        systemLabels={dict.system}
        offerLabels={dict.offers}
        closeLabel={dict.common.close}
        privacyPolicyHref={getPrivacyPolicyPath(locale)}
      />
    </div>
  );
}
