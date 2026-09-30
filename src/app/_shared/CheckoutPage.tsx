import Link from "next/link";
import { redirect } from "next/navigation";
import { CartDrawer } from "@/components/CartDrawer";
import { CheckoutSubmitForm } from "@/components/checkout/CheckoutSubmitForm";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getCurrentUser } from "@/lib/auth/session";
import { accountLinkWithNext } from "@/lib/auth/account-paths";
import { buyerAccountPath } from "@/lib/buyer-account/paths";
import { resolveBuyerOrderIntentContext } from "@/lib/checkout/buyer-order-intent-resolver";
import { loadCheckoutReview, type CheckoutReview } from "@/lib/checkout/checkout-review";
import { checkoutPath } from "@/lib/checkout/paths";
import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPrivacyPolicyPath } from "@/lib/i18n/paths";

export async function CheckoutPage({ locale }: { locale: Locale }) {
  const path = checkoutPath(locale);
  const loginHref = accountLinkWithNext(locale, "login", path);
  const accountHref = `${buyerAccountPath(locale)}?${new URLSearchParams({ next: path })}`;
  const current = await getCurrentUser();
  if (current.status === "unauthenticated") redirect(loginHref);

  const dict = await getDictionary(locale);
  const labels = dict.checkoutFlow;
  const languageLinks = Object.fromEntries(locales.map(language => [language, checkoutPath(language)])) as Record<Locale, string>;
  let review: CheckoutReview | null = null;
  let buyer: Awaited<ReturnType<typeof resolveBuyerOrderIntentContext>> | null = null;
  if (current.status === "authenticated") {
    try {
      review = await loadCheckoutReview();
    } catch {
      review = null;
    }
    if (review && (review.sellers.length > 0 || review.cartChanged)) {
      buyer = await resolveBuyerOrderIntentContext(current.user.id);
      if (!buyer.ok && buyer.code === "BUYER_PROFILE_REQUIRED") redirect(accountHref);
    }
  }
  const currency = new Intl.NumberFormat(locale, { style: "currency", currency: "PLN" });
  const blocked = current.status === "unavailable" ? labels.unavailable
    : review === null ? labels.unavailable
    : review.cartChanged ? labels.cartChanged
    : review.sellers.length === 0 ? labels.cartEmpty
    : review.sellerNotReady ? labels.sellerNotReady
    : buyer && !buyer.ok ? ({
      ORGANIZATION_SELECTION_REQUIRED: labels.organizationSelectionRequired,
      BUYER_NOT_READY: labels.buyerNotReady,
      BUYER_ACCOUNT_UNAVAILABLE: labels.unavailable,
      BUYER_PROFILE_REQUIRED: labels.buyerProfileRequired,
    })[buyer.code]
    : null;
  const readyBuyer = buyer?.ok ? buyer.context : null;

  return <div className="flex min-h-screen flex-col bg-brand-light-gray">
    <SiteHeader locale={locale} languageLinks={languageLinks} navLabels={dict.nav} searchLabels={dict.search} />
    <main className="flex-1 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-teal">{labels.step}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy">{labels.title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#2c3e50]">{labels.intro}</p>
        {blocked && <section role="alert" className="mt-6 border border-[#b45b5b] bg-white p-5 text-sm text-red-800">
          <p>{blocked}</p>
          {buyer && !buyer.ok && buyer.code === "BUYER_NOT_READY" && <Link href={accountHref} className="mt-3 inline-block font-semibold underline focus:outline-none focus:ring-2 focus:ring-brand-teal">{labels.viewAccount}</Link>}
          {review?.cartChanged && <p className="mt-2">{labels.reviewCart}</p>}
        </section>}
        {review && review.sellers.length > 0 && <div className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:items-start">
          <div className="min-w-0 space-y-6">
            {readyBuyer && <section className="border border-[#d9dde2] bg-white p-5 sm:p-6" aria-labelledby="checkout-buyer-heading">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 id="checkout-buyer-heading" className="text-xl font-semibold text-brand-navy">{labels.buyer}</h2>
                <Link href={accountHref} className="text-sm font-semibold text-brand-teal underline focus:outline-none focus:ring-2 focus:ring-brand-teal">{labels.viewAccount}</Link>
              </div>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div className="min-w-0"><dt className="text-[#52606d]">{labels.company}</dt><dd className="break-words font-semibold text-brand-navy">{readyBuyer.invoice.legalName}</dd></div>
                <div className="min-w-0"><dt className="text-[#52606d]">{labels.nip}</dt><dd className="font-semibold text-brand-navy">{readyBuyer.invoice.taxIdentifierValue}</dd></div>
                <div className="min-w-0"><dt className="text-[#52606d]">{labels.invoiceAddress}</dt><dd className="break-words text-brand-navy">{readyBuyer.invoice.street} {readyBuyer.invoice.buildingNumber}{readyBuyer.invoice.unitNumber ? `/${readyBuyer.invoice.unitNumber}` : ""}, {readyBuyer.invoice.postalCode} {readyBuyer.invoice.city}, {readyBuyer.invoice.countryCode}</dd></div>
                <div className="min-w-0"><dt className="text-[#52606d]">{labels.contact}</dt><dd className="break-words text-brand-navy">{readyBuyer.contact.contactName}<br />{readyBuyer.contact.email}<br />{readyBuyer.contact.phone}</dd></div>
              </dl>
            </section>}
            <section className="space-y-4" aria-labelledby="checkout-sellers-heading">
              <h2 id="checkout-sellers-heading" className="text-xl font-semibold text-brand-navy">{labels.sellers}</h2>
              {review.sellers.map(seller => <article key={seller.partnerId} className="min-w-0 border border-[#d9dde2] bg-white p-5 sm:p-6">
                <h3 className="break-words text-lg font-semibold text-brand-navy">{seller.disclosure?.legalName ?? labels.sellerUnavailable}</h3>
                {seller.disclosure?.registeredOffice && <p className="mt-2 break-words text-sm text-[#2c3e50]">{seller.disclosure.registeredOffice.addressLine1} {seller.disclosure.registeredOffice.addressLine2} · {seller.disclosure.registeredOffice.postalCode} {seller.disclosure.registeredOffice.city} · {seller.disclosure.registeredOffice.countryCode}</p>}
                <p className="mt-3 text-sm leading-6 text-[#2c3e50]">{labels.sellerRole}</p>
                {seller.disclosure?.taxIdentifiers.map(identifier => <p key={`${identifier.countryCode}-${identifier.type}-${identifier.value}`} className="mt-1 break-words text-sm text-[#2c3e50]">{identifier.type}: {identifier.value}</p>)}
                {!seller.ready && <p className="mt-2 text-sm font-semibold text-red-700">{labels.sellerNotReady}</p>}
                <ul className="mt-4 divide-y divide-[#d9dde2] border-t border-[#d9dde2]">
                  {seller.items.map(item => <li key={item.id} className="flex min-w-0 items-start justify-between gap-3 py-3 text-sm">
                    <span className="min-w-0 break-words text-brand-navy">{item.title} · {labels.quantity}: {item.quantity}</span>
                    <span className="shrink-0 font-semibold text-brand-navy">{currency.format(Number(item.priceBrutto) * item.quantity)}</span>
                  </li>)}
                </ul>
              </article>)}
            </section>
          </div>
          <aside className="min-w-0 border border-[#d9dde2] bg-white p-5 sm:p-6 lg:sticky lg:top-6" aria-labelledby="checkout-summary-heading">
            <h2 id="checkout-summary-heading" className="text-xl font-semibold text-brand-navy">{labels.summary}</h2>
            <p className="mt-4 flex items-center justify-between gap-3 border-b border-[#d9dde2] pb-4 text-sm text-brand-navy"><span>{labels.total}</span><strong className="text-lg">{currency.format(review.total)}</strong></p>
            <p className="mt-4 text-sm leading-6 text-[#2c3e50]">{labels.platformRole}</p>
            {!blocked && readyBuyer && <div className="mt-5"><CheckoutSubmitForm locale={locale} labels={labels} accountHref={accountHref} loginHref={loginHref} /></div>}
          </aside>
        </div>}
      </div>
    </main>
    <SiteFooter locale={locale} navLabels={dict.nav} footerLabels={dict.footer} />
    <CartDrawer cartLabels={dict.cart} ctaLabels={dict.cta} checkoutLabels={dict.checkout} formLabels={dict.form} systemLabels={dict.system} offerLabels={dict.offers} closeLabel={dict.common.close} privacyPolicyHref={getPrivacyPolicyPath(locale)} />
  </div>;
}
