import Link from "next/link";
import { redirect } from "next/navigation";
import { CartDrawer } from "@/components/CartDrawer";
import { PostCheckoutCartSync } from "@/components/cart/PostCheckoutCartSync";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPrivacyPolicyPath } from "@/lib/i18n/paths";
import { loadBuyerOrders } from "@/lib/buyer-orders/read-model";
import { BUYER_SELLER_LIFECYCLE_STATUSES, type BuyerSellerLifecycleStatus } from "@/lib/buyer-orders/read-model-core";

function ordersPath(locale: Locale): string {
  return locale === "pl" ? "/zamowienia" : '/' + locale + '/orders';
}

function orderDetailPath(locale: Locale, orderId: number): string {
  return ordersPath(locale) + '/' + orderId;
}

export async function BuyerOrdersPage({ locale, submitted = false }: { locale: Locale; submitted?: boolean }) {
  const path = ordersPath(locale);
  const result = await loadBuyerOrders();
  if (result.status === "unauthenticated") {
    const loginPath = locale === "pl" ? "/login" : '/' + locale + '/login';
    redirect(loginPath + '?next=' + path);
  }

  const dict = await getDictionary(locale);
  const labels = dict.BuyerOrders;
  const languageLinks = Object.fromEntries(locales.map((language) => [language, ordersPath(language)])) as Record<Locale, string>;
  const catalogPath = locale === "pl" ? "/katalog" : '/' + locale + '/katalog';
  const lifecycleLabels: Record<BuyerSellerLifecycleStatus, string> = {
    pending_seller_review: labels.awaiting,
    seller_accepted: labels.accepted,
    fulfillment_in_progress: labels.fulfillmentInProgress,
    fulfilled: labels.fulfilled,
    seller_rejected: labels.rejected,
    expired: labels.expired,
    cancelled: labels.cancelled,
    not_routed: labels.notRouted,
    unavailable: labels.unavailable,
  };
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <div className="flex min-h-screen flex-col bg-brand-light-gray">
      {submitted && <PostCheckoutCartSync />}
      <SiteHeader locale={locale} languageLinks={languageLinks} navLabels={dict.nav} searchLabels={dict.search} />
      <main className="flex-1 py-8 sm:py-12">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">{labels.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#2c3e50] sm:text-base">{labels.intro}</p>
          {submitted && <p role="status" aria-live="polite" className="mt-6 border border-brand-teal bg-white px-4 py-3 text-sm font-medium text-brand-navy">{dict.checkoutFlow.successNotice}</p>}

          {result.orders.length === 0 ? (
            <section className="mt-8 border border-[#d9dde2] bg-white px-5 py-10 text-center sm:px-8" aria-labelledby="empty-orders-title">
              <h2 id="empty-orders-title" className="text-xl font-semibold text-brand-navy">{labels.noOrders}</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#2c3e50]">{labels.noOrdersDescription}</p>
              <Link href={catalogPath} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-brand-teal px-5 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-navy focus:ring-offset-2">
                {labels.browseCatalog}
              </Link>
            </section>
          ) : (
            <div className="mt-8 space-y-4">
              {result.orders.map((order) => (
                <article key={order.orderId} className="border border-[#d9dde2] bg-white p-5 sm:p-6" aria-labelledby={'order-' + order.orderId}>
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#d9dde2] pb-4">
                    <h2 id={'order-' + order.orderId} className="text-lg font-semibold text-brand-navy">
                      <Link
                        href={orderDetailPath(locale, order.orderId)}
                        className="text-brand-navy hover:text-brand-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
                      >
                        {labels.order} #{order.orderId}
                      </Link>
                    </h2>
                    <p className="text-sm text-[#2c3e50]">
                      <span className="font-medium">{labels.created}:</span>{' '}
                      <time dateTime={order.createdAt.toISOString()}>{dateFormatter.format(order.createdAt)}</time>
                    </p>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-brand-navy">{labels.sellerOrderStatuses}</h3>
                  <p className="mt-1 text-sm text-[#2c3e50]">{labels.sellerOrders}: {order.sellerOrderCount}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                    {BUYER_SELLER_LIFECYCLE_STATUSES.map((status) => (
                      <div key={status} className="min-w-0 rounded-md bg-brand-light-gray px-3 py-2">
                        <dt className="break-words text-[#2c3e50]">{lifecycleLabels[status]}</dt>
                        <dd className="mt-1 font-semibold tabular-nums text-brand-navy">{order.lifecycle[status]}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-5 flex border-t border-[#d9dde2] pt-4 sm:justify-end">
                    <Link
                      href={orderDetailPath(locale, order.orderId)}
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-industrial bg-brand-teal px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy focus-visible:ring-offset-2 sm:w-auto"
                    >
                      <span>{labels.viewDetails}<span className="sr-only"> — {labels.order} #{order.orderId}</span></span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
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
