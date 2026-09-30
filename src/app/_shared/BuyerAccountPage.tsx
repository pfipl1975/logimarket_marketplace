import Link from "next/link";
import { redirect } from "next/navigation";
import { CartDrawer } from "@/components/CartDrawer";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { PublicLogoutForm } from "@/components/auth/PublicLogoutForm";
import { BuyerOnboardingForm } from "@/components/buyer-account/BuyerOnboardingForm";
import { getCurrentUser } from "@/lib/auth/session";
import { buyerAccountPath, buyerOrdersPath, accountLoginPath } from "@/lib/buyer-account/paths";
import { accountLandingPath } from "@/lib/buyer-account/paths";
import { accountLinkWithNext } from "@/lib/auth/account-paths";
import { loadBuyerAccountOrganizations } from "@/lib/buyer-account/service";
import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPrivacyPolicyPath } from "@/lib/i18n/paths";
import type { BuyerAccountOrganization } from "@/lib/buyer-account/service";
import type { Dictionary } from "@/lib/i18n/types";

function statusLabel(organization: BuyerAccountOrganization, labels: Dictionary["buyerAccount"]): string {
  const status = {
    pending: labels.statusPending,
    verified: labels.statusVerified,
    rejected: labels.statusRejected,
    revoked: labels.statusRevoked,
  };
  return status[organization.verificationStatus];
}

export async function BuyerAccountPage({ locale, created, next }: { locale: Locale; created: boolean; next?: string }) {
  const safeNext = accountLandingPath(next, locale);
  const user = await getCurrentUser();
  if (user.status === "unauthenticated") redirect(next ? accountLinkWithNext(locale, "login", safeNext) : accountLoginPath(locale));
  const dict = await getDictionary(locale);
  const labels = dict.buyerAccount;
  const languageLinks = Object.fromEntries(locales.map((language) => [language, buyerAccountPath(language)])) as Record<Locale, string>;
  let organizations: BuyerAccountOrganization[] | null = null;
  if (user.status === "authenticated") {
    try {
      organizations = await loadBuyerAccountOrganizations(user.user.id);
    } catch {
      organizations = null;
    }
  }

  return <div className="flex min-h-screen flex-col bg-brand-light-gray">
    <SiteHeader locale={locale} languageLinks={languageLinks} navLabels={dict.nav} searchLabels={dict.search} />
    <main className="flex-1 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">{labels.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#2c3e50] sm:text-base">{labels.intro}</p>
        {created && organizations && organizations.length > 0 && <p role="status" aria-live="polite" className="mt-6 rounded-md border border-brand-teal bg-white px-4 py-3 text-sm font-medium text-brand-navy">{labels.created}</p>}

        <section className="mt-8 rounded-md border border-[#d9dde2] bg-white p-5 sm:p-6" aria-labelledby="account-identity-heading">
          <h2 id="account-identity-heading" className="text-lg font-semibold text-brand-navy">{labels.signedInAs}</h2>
          <p className="mt-2 break-all text-sm text-[#2c3e50]">{user.status === "authenticated" ? user.user.email : labels.unavailable}</p>
        </section>

        <section className="mt-6 rounded-md border border-[#d9dde2] bg-white p-5 sm:p-6" aria-labelledby="buyer-organization-heading">
          <h2 id="buyer-organization-heading" className="text-xl font-semibold text-brand-navy">{labels.organizationTitle}</h2>
          {organizations === null ? <p role="alert" className="mt-4 text-sm text-red-700">{labels.unavailable}</p>
            : organizations.length === 0 ? <div className="mt-4">
              <h3 className="text-lg font-semibold text-brand-navy">{labels.emptyTitle}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#2c3e50]">{labels.emptyDescription}</p>
              <BuyerOnboardingForm locale={locale} labels={labels} authEmail={user.status === "authenticated" ? user.user.email : null} next={safeNext} />
            </div>
              : <div className="mt-5 space-y-4">{organizations.map((organization) => <article key={organization.id} className="rounded-md border border-[#d9dde2] bg-brand-light-gray p-4 sm:p-5">
                <h3 className="break-words text-lg font-semibold text-brand-navy">{organization.legalName}</h3>
                <p className="mt-2 text-sm font-semibold text-brand-navy">{organization.profileComplete ? labels.profileComplete : labels.profileIncomplete}</p>
                {organization.verificationStatus === "pending" && <p className="mt-1 text-sm text-[#2c3e50]">{labels.declaredIdentity}</p>}
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-[#2c3e50]">{labels.jurisdiction}</dt><dd className="font-medium text-brand-navy">{organization.jurisdictionCountry}</dd></div>
                  {organization.nip && <div><dt className="text-[#2c3e50]">{labels.nip}</dt><dd className="font-medium text-brand-navy">{organization.nip}</dd></div>}
                  <div><dt className="text-[#2c3e50]">{labels.role}</dt><dd className="font-medium text-brand-navy">{organization.membershipRole === "organization_admin" ? labels.roleAdmin : labels.roleBuyer}</dd></div>
                  <div><dt className="text-[#2c3e50]">{labels.status}</dt><dd className="font-medium text-brand-navy">{statusLabel(organization, labels)}</dd></div>
                </dl>
                <div className="mt-5 grid gap-5 border-t border-[#d9dde2] pt-4 sm:grid-cols-2">
                  <section aria-label={labels.addressData}>
                    <h4 className="text-sm font-semibold text-brand-navy">{labels.addressData}</h4>
                    {organization.registeredAddress ? <address className="mt-2 break-words text-sm not-italic leading-6 text-[#2c3e50]">
                      {organization.registeredAddress.street} {organization.registeredAddress.buildingNumber}{organization.registeredAddress.unitNumber ? `/${organization.registeredAddress.unitNumber}` : ""}<br />
                      {organization.registeredAddress.postalCode} {organization.registeredAddress.city}<br />
                      {organization.registeredAddress.countryCode}
                    </address> : <p className="mt-2 text-sm text-[#2c3e50]">{labels.profileIncomplete}</p>}
                  </section>
                  <section aria-label={labels.contactData}>
                    <h4 className="text-sm font-semibold text-brand-navy">{labels.contactData}</h4>
                    {organization.contactProfile ? <dl className="mt-2 space-y-1 break-words text-sm text-[#2c3e50]">
                      <div><dt className="sr-only">{labels.firstName} {labels.lastName}</dt><dd>{organization.contactProfile.firstName} {organization.contactProfile.lastName}</dd></div>
                      <div><dt className="sr-only">{labels.contactEmail}</dt><dd>{organization.contactProfile.contactEmail}</dd></div>
                      <div><dt className="sr-only">{labels.phone}</dt><dd>{organization.contactProfile.phone}</dd></div>
                    </dl> : <p className="mt-2 text-sm text-[#2c3e50]">{labels.profileIncomplete}</p>}
                  </section>
                </div>
              </article>)}</div>}
        </section>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <section className="rounded-md border border-[#d9dde2] bg-white p-5 sm:p-6" aria-labelledby="account-orders-heading">
            <h2 id="account-orders-heading" className="text-xl font-semibold text-brand-navy">{labels.ordersTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-[#2c3e50]">{labels.ordersDescription}</p>
            <Link href={buyerOrdersPath(locale)} className="mt-5 inline-flex min-h-11 items-center rounded-md bg-brand-teal px-5 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-navy focus:ring-offset-2">{labels.ordersLink}</Link>
          </section>
          <section className="rounded-md bg-brand-navy p-5 text-white sm:p-6" aria-labelledby="account-security-heading">
            <h2 id="account-security-heading" className="text-xl font-semibold">{labels.securityTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-white/90">{labels.securityDescription}</p>
            <div className="mt-4"><PublicLogoutForm locale={locale} label={dict.nav.logout} /></div>
          </section>
        </div>
      </div>
    </main>
    <SiteFooter locale={locale} navLabels={dict.nav} footerLabels={dict.footer} />
    <CartDrawer cartLabels={dict.cart} ctaLabels={dict.cta} checkoutLabels={dict.checkout} formLabels={dict.form} systemLabels={dict.system} offerLabels={dict.offers} closeLabel={dict.common.close} privacyPolicyHref={getPrivacyPolicyPath(locale)} />
  </div>;
}
