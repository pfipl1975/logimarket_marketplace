import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartDrawer } from "@/components/CartDrawer";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { getPartnerRecruitmentLocaleLinks, getPrivacyPolicyPath } from "@/lib/i18n/paths";
import { getPartnerRecruitmentContactHref, PARTNER_RECRUITMENT_AUDIENCES, PARTNER_RECRUITMENT_BENEFITS, PARTNER_RECRUITMENT_CONTACTS, PARTNER_RECRUITMENT_STEPS } from "@/lib/partner-recruitment";

const contactClass = "inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-industrial bg-brand-teal px-5 py-3 text-center font-semibold text-white transition-colors hover:bg-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy focus-visible:ring-offset-2 sm:w-fit";

export async function PartnerRecruitmentPage({ locale }: { locale: Locale }) {
  const dict = await getDictionary(locale);
  const labels = dict.partnerRecruitment;
  const contactHref = getPartnerRecruitmentContactHref(labels);
  return (
    <div className="flex min-h-screen flex-col bg-brand-light-gray">
      <SiteHeader locale={locale} languageLinks={getPartnerRecruitmentLocaleLinks()} navLabels={dict.nav} searchLabels={dict.search} />
      <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-10 md:px-6 md:py-16">
        <section aria-labelledby="partner-recruitment-title" className="min-w-0 border-b border-border-industrial pb-10 md:pb-14">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-teal">{labels.landingOverline}</p>
          <h1 id="partner-recruitment-title" className="mt-4 max-w-3xl text-balance text-3xl font-bold leading-tight text-brand-navy md:text-5xl">{labels.landingHeroTitle}</h1>
          <p className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">{labels.landingHeroDescription}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href={contactHref} aria-describedby="partner-hero-contact-notice" className={contactClass}>{labels.becomePartner}<ArrowRight aria-hidden="true" className="size-4 shrink-0" /></a>
            <a href="#jak-to-dziala" className="inline-flex min-h-11 items-center justify-center rounded-industrial border border-brand-navy px-5 py-3 text-center font-semibold text-brand-navy transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2">{labels.seeHowItWorks}</a>
          </div>
          <p id="partner-hero-contact-notice" className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">{labels.contactProcessNotice}</p>
        </section>

        <section aria-labelledby="partner-value-title" className="py-10 md:py-14">
          <h2 id="partner-value-title" className="text-2xl font-bold text-brand-navy">{labels.valueTitle}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {PARTNER_RECRUITMENT_BENEFITS.map(benefit => <article key={benefit.title} className="min-w-0 rounded-industrial border border-border-industrial bg-white p-6"><h3 className="text-lg font-semibold text-brand-navy">{labels[benefit.title]}</h3><p className="mt-3 leading-relaxed text-muted-foreground">{labels[benefit.description]}</p></article>)}
          </div>
        </section>

        <section id="jak-to-dziala" aria-labelledby="partner-process-title" className="scroll-mt-40 rounded-industrial border border-border-industrial bg-white p-5 sm:p-8">
          <h2 id="partner-process-title" className="text-2xl font-bold text-brand-navy">{labels.howItWorksTitle}</h2>
          <ol className="mt-6 grid list-decimal gap-6 pl-6 text-brand-navy sm:grid-cols-2 lg:grid-cols-4">
            {PARTNER_RECRUITMENT_STEPS.map(step => <li key={step} className="pl-1 pr-3 leading-relaxed marker:font-bold marker:text-brand-teal">{labels[step]}</li>)}
          </ol>
        </section>

        <section aria-labelledby="partner-audience-title" className="py-10 md:py-14">
          <h2 id="partner-audience-title" className="text-2xl font-bold text-brand-navy">{labels.whoForTitle}</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">{PARTNER_RECRUITMENT_AUDIENCES.map(audience => <li key={audience} className="min-w-0 border-l-2 border-brand-teal bg-white p-4 font-medium text-brand-navy">{labels[audience]}</li>)}</ul>
        </section>

        <section aria-labelledby="partner-conditions-title" className="rounded-industrial border border-border-industrial bg-white p-5 sm:p-8">
          <h2 id="partner-conditions-title" className="text-2xl font-bold text-brand-navy">{labels.conditionsTitle}</h2>
          <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">{labels.conditionsDescription}</p>
          <ul className="mt-5 max-w-3xl list-disc space-y-3 pl-5 leading-relaxed text-brand-navy">
            <li>{labels.conditionsSeller}</li><li>{labels.conditionsFulfillment}</li><li>{labels.conditionsPlatform}</li><li>{labels.conditionsAgreement}</li>
          </ul>
          <Link href="/dokumenty-prawne" className="mt-5 inline-flex min-h-11 items-center rounded-industrial text-sm font-semibold text-brand-teal underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2">{labels.publicLegalDocuments}</Link>
        </section>

        <section aria-labelledby="partner-contact-title" className="mt-10 border-t-4 border-brand-teal bg-white p-5 sm:p-8 md:mt-14">
          <h2 id="partner-contact-title" className="text-balance text-2xl font-bold text-brand-navy">{labels.finalTitle}</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">{labels.finalDescription}</p>
          <a href={contactHref} aria-describedby="partner-final-contact-notice" className={`${contactClass} mt-6`}>{labels.becomePartner}<ArrowRight aria-hidden="true" className="size-4 shrink-0" /></a>
          <p id="partner-final-contact-notice" className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">{labels.contactProcessNotice}</p>
          <section aria-labelledby="partner-direct-contact-title" className="mt-6 border-t border-border-industrial pt-5">
            <h3 id="partner-direct-contact-title" className="text-sm font-semibold text-brand-navy">{labels.directContactTitle}</h3>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {PARTNER_RECRUITMENT_CONTACTS.map(person => (
                <li key={person.phoneHref} className="min-w-0">
                  <a href={person.phoneHref} className="inline-flex min-h-11 w-full flex-col items-start rounded-industrial px-3 py-2 transition-colors hover:bg-brand-light-gray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2">
                    <span className="font-medium text-brand-navy">{person.name}</span>
                    <span className="mt-1 text-brand-teal underline underline-offset-4">{person.phoneDisplay}</span>
                  </a>
                </li>
              ))}
            </ul>
            <a href={`mailto:${labels.contactEmail}`} className="mt-3 inline-flex min-h-11 max-w-full items-center rounded-industrial wrap-anywhere text-brand-teal underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2">{labels.contactEmail}</a>
          </section>
        </section>
      </main>
      <SiteFooter locale={locale} navLabels={dict.nav} footerLabels={dict.footer} />
      <CartDrawer cartLabels={dict.cart} ctaLabels={dict.cta} checkoutLabels={dict.checkout} formLabels={dict.form} systemLabels={dict.system} offerLabels={dict.offers} closeLabel={dict.common.close} privacyPolicyHref={getPrivacyPolicyPath(locale)} />
    </div>
  );
}
