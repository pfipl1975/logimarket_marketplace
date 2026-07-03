import Link from "next/link";
import { Package } from "lucide-react";
import { absoluteUrl } from "@/lib/seo/urls";
import { getCategories } from "@/app/actions";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CartDrawer } from "@/components/CartDrawer";
import { getLocalizedCategoryLabel } from "@/lib/i18n/category-labels";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getHomePath } from "@/lib/i18n/paths";
import { buildCategoryTree, type CatalogCategoryNode } from "@/lib/catalog/tree";
import { JsonLdScript } from "@/lib/seo/json-ld";
import type { Locale } from "@/lib/i18n/types";

interface CatalogPageProps {
  locale: Locale;
}

export async function CatalogPage({ locale }: CatalogPageProps) {
  const [dict, allCategories] = await Promise.all([
    getDictionary(locale),
    getCategories(),
  ]);

  const categoryLabels = dict.categories.bySlug as Record<string, string>;
  const categoryFilterBasePath = getHomePath(locale);

  // Build category hierarchy
  const categoryTree = buildCategoryTree(allCategories);

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
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {categoryTree.map((section: CatalogCategoryNode) => {
              const sectionLabel = getLocalizedCategoryLabel(categoryLabels, section.slug, section.name);
              return (
                <div key={section.id} className="rounded-lg border border-border bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-brand-navy mb-4">
                    <Link
                      href={`${categoryFilterBasePath === "/" ? "" : categoryFilterBasePath}/katalog/c-${section.slug}`}
                      className="hover:text-brand-teal transition-colors"
                    >
                      {sectionLabel}
                    </Link>
                  </h2>
                  
                  {section.children.length > 0 && (
                    <ul className="space-y-2.5 border-t border-gray-100 pt-3">
                      {section.children.map((group: CatalogCategoryNode) => {
                        const groupLabel = getLocalizedCategoryLabel(categoryLabels, group.slug, group.name);
                        return (
                          <li key={group.id} className="text-sm font-medium text-muted-foreground">
                            <Link
                              href={`${categoryFilterBasePath === "/" ? "" : categoryFilterBasePath}/katalog/c-${group.slug}`}
                              className="text-brand-navy hover:text-brand-teal transition-colors"
                            >
                              {groupLabel}
                            </Link>

                            {group.children.length > 0 && (
                              <ul className="mt-1.5 ml-4 space-y-1.5 border-l border-gray-100 pl-3">
                                {group.children.map((cat: CatalogCategoryNode) => {
                                  const catLabel = getLocalizedCategoryLabel(categoryLabels, cat.slug, cat.name);
                                  return (
                                    <li key={cat.id} className="text-xs font-normal text-muted-foreground">
                                      <Link
                                        href={`${categoryFilterBasePath === "/" ? "" : categoryFilterBasePath}/katalog/c-${cat.slug}`}
                                        className="hover:text-brand-teal transition-colors"
                                      >
                                        {catLabel}
                                      </Link>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
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
