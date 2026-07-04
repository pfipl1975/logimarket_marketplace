import Link from "next/link";
import { Package } from "lucide-react";
import { absoluteUrl } from "@/lib/seo/urls";
import { getCategories } from "@/app/actions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartDrawer } from "@/components/CartDrawer";
import { resolveCategoryName } from "@/lib/i18n/category-labels";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getHomePath } from "@/lib/i18n/paths";
import { buildCategoryTree, type CatalogCategoryNode } from "@/lib/catalog/tree";
import { JsonLdScript } from "@/lib/seo/json-ld";
import { defaultLocale } from "@/lib/i18n/config";
import { CatalogCategoryExplorer } from "@/components/catalog/CatalogCategoryExplorer";
import type { Locale } from "@/lib/i18n/types";

interface CatalogPageProps {
  locale: Locale;
}

export async function CatalogPage({ locale }: CatalogPageProps) {
  const dict = await getDictionary(locale);
  const fallbackDict = locale === defaultLocale ? dict : await getDictionary(defaultLocale);
  const allCategories = await getCategories();

  const localeBySlug = dict.categories?.bySlug as Record<string, string> | undefined;
  const fallbackBySlug = fallbackDict.categories?.bySlug as Record<string, string> | undefined;

  const categoryFilterBasePath = getHomePath(locale);

  // Build category hierarchy
  const categoryTree = buildCategoryTree(allCategories);

  // Map tree to explorer format
  const explorerTree = categoryTree.map((section) => ({
    id: section.id,
    slug: section.slug,
    label: resolveCategoryName({
      slug: section.slug,
      dbName: section.name,
      localeBySlug,
      fallbackBySlug,
    }),
    href: `${categoryFilterBasePath === "/" ? "" : categoryFilterBasePath}/katalog/c-${section.slug}`,
    children: section.children.map((group) => ({
      id: group.id,
      slug: group.slug,
      label: resolveCategoryName({
        slug: group.slug,
        dbName: group.name,
        localeBySlug,
        fallbackBySlug,
      }),
      href: `${categoryFilterBasePath === "/" ? "" : categoryFilterBasePath}/katalog/c-${group.slug}`,
      children: group.children.map((cat) => ({
        id: cat.id,
        slug: cat.slug,
        label: resolveCategoryName({
          slug: cat.slug,
          dbName: cat.name,
          localeBySlug,
          fallbackBySlug,
        }),
        href: `${categoryFilterBasePath === "/" ? "" : categoryFilterBasePath}/katalog/c-${cat.slug}`,
        children: [],
      })),
    })),
  }));

  const explorerLabels = {
    trigger: dict.catalog.categoriesAria,
    close: dict.common.close,
    allCategories: dict.catalog.allCategories,
  };

  // Generate BreadcrumbList JSON-LD
  const catalogPath = `${categoryFilterBasePath === "/" ? "" : categoryFilterBasePath}/katalog`;
  const breadcrumbItems = [
    {
      "@type": "ListItem",
      position: 1,
      name: dict.nav.catalog,
      item: absoluteUrl(catalogPath),
    },
  ];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbItems,
  };

  return (
    <div className="flex min-h-screen flex-col bg-brand-light-gray">
      <JsonLdScript data={breadcrumbJsonLd} />
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
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-brand-navy">
              {dict.nav.catalog}
            </h1>
            <p className="text-muted-foreground max-w-xl">
              {dict.meta.description}
            </p>
          </div>

          {categoryTree.length === 0 ? (
            <div className="mt-12 flex flex-col items-center gap-3 py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-lg font-semibold">{dict.catalog.emptyTitle}</p>
              <p className="text-sm text-muted-foreground max-w-xs">{dict.catalog.emptyDescription}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {/* Category Explorer Trigger and Mega-menu */}
              <div className="z-30">
                <CatalogCategoryExplorer tree={explorerTree} labels={explorerLabels} />
              </div>
            </div>
          )}
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
      />
    </div>
  );
}
