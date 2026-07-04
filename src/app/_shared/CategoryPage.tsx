import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getCategoryBySlug, getCategoryOffers } from "@/app/actions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartDrawer } from "@/components/CartDrawer";
import { OfferCard } from "@/components/OfferCard";
import { resolveCategoryName, resolveCategoryIntro } from "@/lib/i18n/category-labels";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getHomePath, getOfferPath } from "@/lib/i18n/paths";
import { absoluteUrl } from "@/lib/seo/urls";
import { getCategoryBreadcrumbs, buildCategoryTree, type CatalogCategoryNode } from "@/lib/catalog/tree";
import { JsonLdScript } from "@/lib/seo/json-ld";
import { defaultLocale } from "@/lib/i18n/config";
import type { Locale } from "@/lib/i18n/types";

interface CategoryPageProps {
  locale: Locale;
  categorySlug: string; // dbSlug (without 'c-' prefix)
}

function PackageIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        className="fill-none stroke-current"
        d="m3 7 9-4 9 4-9 4-9-4ZM3 7v10l9 4 9-4V7M12 11v10"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export async function CategoryPage({ locale, categorySlug }: CategoryPageProps) {
  const [dict, category, allCategories, offers] = await Promise.all([
    getDictionary(locale),
    getCategoryBySlug(categorySlug),
    getCategories(),
    getCategoryOffers(categorySlug),
  ]);

  const fallbackDict =
    locale === defaultLocale ? dict : await getDictionary(defaultLocale);

  if (!category) {
    notFound();
  }

  const localeBySlug = dict.categories?.bySlug as Record<string, string> | undefined;
  const fallbackBySlug = fallbackDict.categories?.bySlug as Record<string, string> | undefined;
  const localeIntrosBySlug = dict.categories?.introsBySlug as Record<string, string> | undefined;
  const fallbackIntrosBySlug = fallbackDict.categories?.introsBySlug as Record<string, string> | undefined;

  const activeCategoryLabel = resolveCategoryName({
    slug: category.slug,
    dbName: category.name,
    localeBySlug,
    fallbackBySlug,
  });

  const activeCategoryIntro = resolveCategoryIntro({
    slug: category.slug,
    localeIntrosBySlug,
    fallbackIntrosBySlug,
    fallbackIntro: "",
  });

  const technicalAttributeLabels = dict.technicalAttributes.labels as Record<string, string>;

  // Build tree to find subcategories of the active category
  const categoryTree = buildCategoryTree(allCategories);
  
  // Find active node in the tree to display its direct children
  const findNode = (nodes: CatalogCategoryNode[], targetId: number): CatalogCategoryNode | null => {
    for (const node of nodes) {
      if (node.id === targetId) return node;
      const found = findNode(node.children, targetId);
      if (found) return found;
    }
    return null;
  };
  const activeNode = findNode(categoryTree, category.id);
  const subcategories = activeNode ? activeNode.children : [];

  // Breadcrumbs trail
  const breadcrumbs = getCategoryBreadcrumbs(allCategories, category.id);

  // Generate BreadcrumbList JSON-LD
  const categoryFilterBasePath = getHomePath(locale);
  const catalogPath = `${categoryFilterBasePath === "/" ? "" : categoryFilterBasePath}/katalog`;
  const canonicalPath = `${catalogPath}/c-${category.slug}`;
  const canonicalUrl = absoluteUrl(canonicalPath);

  const breadcrumbItems = [
    {
      "@type": "ListItem",
      position: 1,
      name: dict.nav.catalog,
      item: absoluteUrl(catalogPath),
    },
    ...breadcrumbs.map((bc, idx) => ({
      "@type": "ListItem",
      position: idx + 2,
      name: resolveCategoryName({
        slug: bc.slug,
        dbName: bc.name,
        localeBySlug,
        fallbackBySlug,
      }),
      item: absoluteUrl(`${catalogPath}/c-${bc.slug}`),
    })),
  ];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbItems,
  };

  // Generate CollectionPage JSON-LD
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${canonicalUrl}#collection`,
    "url": canonicalUrl,
    "name": activeCategoryLabel,
    "description": activeCategoryIntro || `${activeCategoryLabel} - ${dict.meta.description}`,
  };

  return (
    <div className="flex min-h-screen flex-col bg-brand-light-gray">
      <JsonLdScript data={breadcrumbJsonLd} />
      <JsonLdScript data={collectionJsonLd} />
      <SiteHeader
        locale={locale}
        languageLinks={{
          pl: `/katalog/c-${category.slug}`,
          en: `/en/katalog/c-${category.slug}`,
          de: `/de/katalog/c-${category.slug}`,
          fr: `/fr/katalog/c-${category.slug}`,
          es: `/es/katalog/c-${category.slug}`,
          uk: `/uk/katalog/c-${category.slug}`,
          zh: `/zh/katalog/c-${category.slug}`,
        }}
        navLabels={dict.nav}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">
        {/* Breadcrumbs Navigation */}
        <nav aria-label="Breadcrumbs" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <Link href={categoryFilterBasePath === "/" ? "/katalog" : `${categoryFilterBasePath}/katalog`} className="hover:text-foreground transition-colors">
            {dict.nav.catalog}
          </Link>
          {breadcrumbs.map((bc, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            const bcLabel = resolveCategoryName({
              slug: bc.slug,
              dbName: bc.name,
              localeBySlug,
              fallbackBySlug,
            });
            return (
              <span key={bc.id} className="flex items-center gap-1.5">
                <span>/</span>
                {isLast ? (
                  <span className="font-semibold text-foreground" aria-current="page">
                    {bcLabel}
                  </span>
                ) : (
                  <Link href={`${categoryFilterBasePath === "/" ? "" : categoryFilterBasePath}/katalog/c-${bc.slug}`} className="hover:text-foreground transition-colors">
                    {bcLabel}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-brand-navy">
            {activeCategoryLabel}
          </h1>
          <p className="text-sm text-muted-foreground">
            {offers.length} {offers.length === 1 ? dict.catalog.offerCountOne : dict.catalog.offerCountOther}
          </p>
          {activeCategoryIntro && (
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
              {activeCategoryIntro}
            </p>
          )}
        </div>

        {/* Subcategories links */}
        {subcategories.length > 0 && (
          <div className="mt-6">
            <div className="flex flex-wrap gap-2">
              {subcategories.map((sub: CatalogCategoryNode) => {
                const subLabel = resolveCategoryName({
                  slug: sub.slug,
                  dbName: sub.name,
                  localeBySlug,
                  fallbackBySlug,
                });
                return (
                  <Link
                    key={sub.id}
                    href={`${categoryFilterBasePath === "/" ? "" : categoryFilterBasePath}/katalog/c-${sub.slug}`}
                    className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-brand-navy transition-all hover:border-brand-teal hover:text-brand-teal"
                  >
                    {subLabel}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Offers listings */}
        {offers.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-3 py-16 text-center">
            <PackageIcon className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-semibold">{dict.catalog.emptyTitle}</p>
            <p className="text-sm text-muted-foreground max-w-xs">{dict.catalog.emptyDescription}</p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {offers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                detailHref={getOfferPath(locale, String(offer.id))}
                offerLabels={dict.offers}
                ctaLabels={dict.cta}
                rfqLabels={dict.rfq}
                formLabels={dict.form}
                systemLabels={dict.system}
                closeLabel={dict.common.close}
                categoryLabels={localeBySlug || {}}
                technicalAttributeLabels={technicalAttributeLabels}
              />
            ))}
          </div>
        )}
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
      />
    </div>
  );
}
