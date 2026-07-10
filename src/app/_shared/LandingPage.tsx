import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartDrawer } from "@/components/CartDrawer";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getHomePath } from "@/lib/i18n/paths";
import { locales, type Locale } from "@/lib/i18n/config";
import {
  getLandingLanguageLinks,
  getLandingPageByIntent,
  getCategoryLink,
  getGlossaryLink,
  type LandingPageContent,
} from "@/lib/landing";
import { absoluteUrl } from "@/lib/seo/urls";
import {
  JsonLdScript,
  createBreadcrumbListJsonLd,
  createCatalogItemListJsonLd,
  createFaqPageJsonLd,
  createLandingCollectionPageJsonLd,
} from "@/lib/seo/json-ld";

interface LandingPageProps {
  landing: LandingPageContent;
}

export async function LandingPage({ landing }: LandingPageProps) {
  const dict = await getDictionary(landing.locale);
  const pageUrl = absoluteUrl(landing.path);
  const homePath = getHomePath(landing.locale);
  const rawLanguageLinks = getLandingLanguageLinks(landing.intent);
  const headerLanguageLinks = Object.fromEntries(
    locales.map((locale) => [
      locale,
      rawLanguageLinks[locale] ?? getHomePath(locale),
    ]),
  ) as Record<Locale, string>;
  const primaryCategory = landing.relatedCategories[0];
  const relatedIntentPages = landing.relatedIntents?.map((intent) =>
    getLandingPageByIntent(intent, landing.locale),
  ) ?? [];

  const breadcrumbJsonLd = createBreadcrumbListJsonLd([
    {
      name: "LogiMarket",
      url: absoluteUrl(homePath),
    },
    {
      name: landing.title,
      url: pageUrl,
    },
  ]);

  const collectionJsonLd = createLandingCollectionPageJsonLd({
    pageUrl,
    name: landing.title,
    description: landing.seo.description,
    locale: landing.locale,
    about: "B2B purchase intent landing page for logistics, warehousing, intralogistics and warehouse equipment",
  });

  const itemListJsonLd = createCatalogItemListJsonLd(
    landing.relatedCategories.map((category) => ({
      name: category.label,
      url: absoluteUrl(getCategoryLink(landing.locale, category.categorySlug)),
    })),
  );

  const faqJsonLd = createFaqPageJsonLd({
    faq: landing.faq,
    pageUrl,
  });

  return (
    <div className="flex min-h-screen flex-col bg-brand-light-gray">
      <JsonLdScript data={breadcrumbJsonLd} />
      <JsonLdScript data={collectionJsonLd} />
      <JsonLdScript data={itemListJsonLd} />
      {faqJsonLd && <JsonLdScript data={faqJsonLd} />}

      <SiteHeader
        locale={landing.locale}
        languageLinks={headerLanguageLinks}
        navLabels={dict.nav}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
        >
          <Link href={homePath} className="transition-colors hover:text-foreground">
            LogiMarket
          </Link>
          <span>/</span>
          <span>{landing.sectionLabel}</span>
          <span>/</span>
          <span className="font-semibold text-foreground" aria-current="page">
            {landing.title}
          </span>
        </nav>

        <section className="border-b border-border pb-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] lg:items-end">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-teal">
                {landing.eyebrow}
              </span>
              <h1 className="mt-3 max-w-4xl text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl lg:text-5xl">
                {landing.title}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {landing.intro}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={landing.cta.primaryHref}
                  className="inline-flex items-center justify-center rounded-md bg-brand-teal px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0e5a6a]"
                >
                  {landing.cta.primaryLabel}
                </Link>
                {primaryCategory && (
                  <Link
                    href={getCategoryLink(landing.locale, primaryCategory.categorySlug)}
                    className="inline-flex items-center justify-center rounded-md border border-border bg-white px-5 py-3 text-sm font-semibold text-brand-navy transition-colors hover:border-brand-teal hover:text-brand-teal"
                  >
                    {landing.cta.secondaryLabel}
                  </Link>
                )}
              </div>
            </div>

            <div className="border border-border bg-white p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-navy">
                {landing.procurementContextTitle}
              </h2>
              <ul className="mt-4 space-y-3">
                {landing.procurementContext.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-teal" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="py-10">
          <h2 className="mb-5 text-xl font-bold tracking-tight text-brand-navy">
            {landing.decisionGuidanceTitle}
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            {landing.decisionFactors.map((factor) => (
              <article key={factor.title} className="border border-border bg-white p-5">
                <h3 className="text-sm font-bold text-brand-navy">{factor.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {factor.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-t border-border py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-brand-navy">
              {landing.relatedCategoriesTitle}
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {landing.relatedCategories.map((category) => (
                <Link
                  key={category.categorySlug}
                  href={getCategoryLink(landing.locale, category.categorySlug)}
                  className="group border border-border bg-white p-5 transition-colors hover:border-brand-teal"
                >
                  <h3 className="text-sm font-bold text-brand-navy group-hover:text-brand-teal">
                    {category.label}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {category.context}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold tracking-tight text-brand-navy">
              {landing.relatedGlossaryTitle}
            </h2>
            <div className="mt-5 space-y-3">
              {landing.relatedGlossaryTerms.map((term) => (
                <Link
                  key={term.glossarySlug}
                  href={getGlossaryLink(landing.locale, term.glossarySlug)}
                  className="block border border-border bg-white p-5 transition-colors hover:border-brand-teal"
                >
                  <h3 className="text-sm font-bold text-brand-navy">{term.label}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {term.context}
                  </p>
                </Link>
              ))}
            </div>

            {relatedIntentPages.length > 0 && landing.relatedIntentsTitle && (
              <div className="mt-8">
                <h2 className="text-xl font-bold tracking-tight text-brand-navy">
                  {landing.relatedIntentsTitle}
                </h2>
                <div className="mt-5 space-y-3">
                  {relatedIntentPages.map((intentPage) => (
                    <Link
                      key={intentPage.intent}
                      href={intentPage.path}
                      className="block border border-border bg-white p-5 transition-colors hover:border-brand-teal"
                    >
                      <h3 className="text-sm font-bold text-brand-navy">
                        {intentPage.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {intentPage.intro}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="border-t border-border py-10">
          <h2 className="text-xl font-bold tracking-tight text-brand-navy">
            {landing.faqTitle}
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {landing.faq.map((item) => (
              <article key={item.question} className="border border-border bg-white p-5">
                <h3 className="text-sm font-semibold text-brand-navy">
                  {item.question}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter
        locale={landing.locale}
        navLabels={dict.nav}
        footerLabels={dict.footer}
      />
      <CartDrawer
        cartLabels={dict.cart}
        ctaLabels={dict.cta}
        checkoutLabels={dict.checkout}
        formLabels={dict.form}
        systemLabels={dict.system}
        offerLabels={dict.offers}
        closeLabel={dict.common.close}
      />
    </div>
  );
}
