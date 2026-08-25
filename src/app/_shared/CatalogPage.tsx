import Link from "next/link";
import { Package } from "lucide-react";
import { absoluteUrl } from "@/lib/seo/urls";
import { getCachedCategories } from "@/lib/catalog/navigation.server";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartDrawer } from "@/components/CartDrawer";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getHomePath, getPrivacyPolicyPath } from "@/lib/i18n/paths";
import { buildCategoryTree } from "@/lib/catalog/tree";
import { JsonLdScript, createBreadcrumbListJsonLd } from "@/lib/seo/json-ld";
import { defaultLocale } from "@/lib/i18n/config";
import { getSolutionsIndexPath } from "@/lib/landing";
import {
  buildCatalogHomeBreadcrumbItems,
  buildCatalogHomeCollectionPageJsonLd,
  buildCatalogHomeSections,
} from "@/lib/catalog/catalog-home";
import { CatalogHomeHero } from "@/components/catalog/CatalogHomeHero";
import { CatalogSectionIndex } from "@/components/catalog/CatalogSectionIndex";
import { CatalogSectionDirectory } from "@/components/catalog/CatalogSectionDirectory";
import type { Locale } from "@/lib/i18n/types";

interface CatalogPageProps {
  locale: Locale;
}

export async function CatalogPage({ locale }: CatalogPageProps) {
  const dict = await getDictionary(locale);
  const fallbackDict = locale === defaultLocale ? dict : await getDictionary(defaultLocale);
  const allCategories = await getCachedCategories();

  const localeBySlug = dict.categories?.bySlug as Record<string, string> | undefined;
  const fallbackBySlug = fallbackDict.categories?.bySlug as Record<string, string> | undefined;

  const categoryFilterBasePath = getHomePath(locale);

  // Single existing category read → tree → routeable set → catalog home view model
  const categoryTree = buildCategoryTree(allCategories);
  const routeableSlugSet = new Set(allCategories.map((category) => category.slug));
  const sections = buildCatalogHomeSections({
    categoryTree,
    basePath: categoryFilterBasePath,
    routeableSlugSet,
    localeBySlug,
    fallbackBySlug,
  });

  const catalogPath = `${categoryFilterBasePath === "/" ? "" : categoryFilterBasePath}/katalog`;

  const breadcrumbJsonLd = createBreadcrumbListJsonLd(
    buildCatalogHomeBreadcrumbItems({
      homeUrl: absoluteUrl(categoryFilterBasePath),
      catalogUrl: absoluteUrl(catalogPath),
      homeName: "LogiMarket.pl",
      catalogName: dict.nav.catalog,
    }),
  );

  const collectionPageJsonLd = buildCatalogHomeCollectionPageJsonLd({
    sections,
    pageUrl: absoluteUrl(catalogPath),
    name: dict.catalogHome.metaTitle,
    description: dict.catalogHome.metaDescription,
    locale,
  });

  return (
    <div className="flex min-h-screen flex-col bg-brand-light-gray">
      <JsonLdScript data={breadcrumbJsonLd} />
      <JsonLdScript data={collectionPageJsonLd} />
      <SiteHeader
        locale={locale}
        languageLinks={{
          pl: "/katalog",
          en: "/en/katalog",
          de: "/de/katalog",
          fr: "/fr/katalog",
          es: "/es/katalog",
          uk: "/uk/katalog",
          zh: "/zh/katalog",
        }}
        navLabels={dict.nav}
        searchLabels={dict.search}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">
        <div className="flex flex-col gap-8">
          <CatalogHomeHero labels={dict.catalogHome} />

          <section className="border-l-2 border-brand-teal bg-white px-5 py-4" aria-labelledby="catalog-solutions-heading">
            <h2 id="catalog-solutions-heading" className="text-base font-bold text-brand-navy">
              {dict.solutions.catalogHeading}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {dict.solutions.catalogIntro}
            </p>
            <Link
              href={getSolutionsIndexPath(locale)}
              className="mt-3 inline-flex text-sm font-semibold text-brand-teal transition-colors hover:text-brand-navy"
            >
              {dict.solutions.catalogCta} <span aria-hidden="true">→</span>
            </Link>
          </section>

          {sections.length === 0 ? (
            <div className="mt-12 flex flex-col items-center gap-3 py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-lg font-semibold">{dict.catalog.emptyTitle}</p>
              <p className="text-sm text-muted-foreground max-w-xs">{dict.catalog.emptyDescription}</p>
            </div>
          ) : (
            <>
              <CatalogSectionIndex sections={sections} labels={dict.catalogHome} />
              <CatalogSectionDirectory sections={sections} labels={dict.catalogHome} />
            </>
          )}

          <section
            aria-labelledby="catalog-procurement-guide-heading"
            className="border-t border-border pt-8"
          >
            <div className="max-w-3xl">
              <h2
                id="catalog-procurement-guide-heading"
                className="text-2xl font-bold tracking-tight text-brand-navy"
              >
                {dict.catalogHome.procurementGuideHeading}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {dict.catalogHome.procurementGuideIntro}
              </p>
            </div>
            <div className="mt-5 grid gap-px overflow-hidden rounded-[2px] border border-border bg-border md:grid-cols-3">
              <div className="bg-white p-5">
                <h3 className="text-sm font-bold text-brand-navy">
                  {dict.catalogHome.rfqHeading}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {dict.catalogHome.rfqDescription}
                </p>
              </div>
              <div className="bg-white p-5">
                <h3 className="text-sm font-bold text-brand-navy">
                  {dict.catalogHome.ecommerceHeading}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {dict.catalogHome.ecommerceDescription}
                </p>
              </div>
              <div className="bg-white p-5">
                <h3 className="text-sm font-bold text-brand-navy">
                  {dict.catalogHome.outboundHeading}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {dict.catalogHome.outboundDescription}
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter
        locale={locale}
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
        privacyPolicyHref={getPrivacyPolicyPath(locale)}
      />
    </div>
  );
}
