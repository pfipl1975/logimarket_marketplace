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
import { CatalogCategoryExplorer, type CatalogExplorerNode } from "@/components/catalog/CatalogCategoryExplorer";
import type { Locale } from "@/lib/i18n/types";

interface CatalogPageProps {
  locale: Locale;
}

type DirectoryLink = {
  id: number;
  label: string;
  href: string;
  depth: number;
};

type DirectoryGroup = {
  id: number;
  label: string;
  href: string | null;
  categoryLinks: DirectoryLink[];
};

type DirectorySection = {
  id: number;
  label: string;
  href: string | null;
  groups: DirectoryGroup[];
  terminalLinks: DirectoryLink[];
};

function getCatalogCategoryHref(
  categoryFilterBasePath: string,
  slug: string,
  routeableSlugSet: Set<string>,
): string | null {
  if (!routeableSlugSet.has(slug)) return null;
  const basePath = categoryFilterBasePath === "/" ? "" : categoryFilterBasePath;
  return `${basePath}/katalog/c-${slug}`;
}

function resolveDirectoryLabel(
  node: CatalogCategoryNode,
  localeBySlug: Record<string, string> | undefined,
  fallbackBySlug: Record<string, string> | undefined,
): string {
  return resolveCategoryName({
    slug: node.slug,
    dbName: node.name,
    localeBySlug,
    fallbackBySlug,
  });
}

function collectDirectoryCategoryLinks(
  nodes: CatalogCategoryNode[],
  categoryFilterBasePath: string,
  routeableSlugSet: Set<string>,
  localeBySlug: Record<string, string> | undefined,
  fallbackBySlug: Record<string, string> | undefined,
  depth = 0,
): DirectoryLink[] {
  const links: DirectoryLink[] = [];

  for (const node of nodes) {
    const href = getCatalogCategoryHref(categoryFilterBasePath, node.slug, routeableSlugSet);
    if (href) {
      links.push({
        id: node.id,
        label: resolveDirectoryLabel(node, localeBySlug, fallbackBySlug),
        href,
        depth,
      });
    }

    if (node.children.length > 0) {
      links.push(...collectDirectoryCategoryLinks(
        node.children,
        categoryFilterBasePath,
        routeableSlugSet,
        localeBySlug,
        fallbackBySlug,
        depth + 1,
      ));
    }
  }

  return links;
}

function buildDirectorySections({
  categoryTree,
  categoryFilterBasePath,
  routeableSlugSet,
  localeBySlug,
  fallbackBySlug,
}: {
  categoryTree: CatalogCategoryNode[];
  categoryFilterBasePath: string;
  routeableSlugSet: Set<string>;
  localeBySlug: Record<string, string> | undefined;
  fallbackBySlug: Record<string, string> | undefined;
}): DirectorySection[] {
  return categoryTree.map((section) => ({
    id: section.id,
    label: resolveDirectoryLabel(section, localeBySlug, fallbackBySlug),
    href: getCatalogCategoryHref(categoryFilterBasePath, section.slug, routeableSlugSet),
    groups: section.children.map((group) => ({
      id: group.id,
      label: resolveDirectoryLabel(group, localeBySlug, fallbackBySlug),
      href: getCatalogCategoryHref(categoryFilterBasePath, group.slug, routeableSlugSet),
      categoryLinks: collectDirectoryCategoryLinks(
        group.children,
        categoryFilterBasePath,
        routeableSlugSet,
        localeBySlug,
        fallbackBySlug,
      ),
    })),
    terminalLinks: section.children.length === 0
      ? collectDirectoryCategoryLinks(
        [section],
        categoryFilterBasePath,
        routeableSlugSet,
        localeBySlug,
        fallbackBySlug,
      )
      : [],
  }));
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
  const routeableSlugSet = new Set(allCategories.map((category) => category.slug));
  const directorySections = buildDirectorySections({
    categoryTree,
    categoryFilterBasePath,
    routeableSlugSet,
    localeBySlug,
    fallbackBySlug,
  });

  const mapExplorerNode = (node: CatalogCategoryNode): CatalogExplorerNode => ({
    id: node.id,
    slug: node.slug,
    label: resolveCategoryName({
      slug: node.slug,
      dbName: node.name,
      localeBySlug,
      fallbackBySlug,
    }),
    href: `${categoryFilterBasePath === "/" ? "" : categoryFilterBasePath}/katalog/c-${node.slug}`,
    children: node.children.map(mapExplorerNode),
  });

  const explorerTree = categoryTree.map(mapExplorerNode);

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

              <section
                aria-labelledby="catalog-directory-heading"
                className="border-t border-border pt-8"
              >
                <div className="max-w-3xl">
                  <h2
                    id="catalog-directory-heading"
                    className="text-2xl font-bold tracking-tight text-brand-navy"
                  >
                    {dict.catalog.directoryHeading}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {dict.catalog.directoryIntro}
                  </p>
                </div>

                <div className="mt-6 grid gap-5">
                  {directorySections.map((section) => (
                    <section
                      key={section.id}
                      className="rounded border border-border bg-white p-5 shadow-sm"
                    >
                      <div className="border-b border-border pb-4">
                        {section.href ? (
                          <Link
                            href={section.href}
                            className="text-lg font-bold text-brand-navy transition-colors hover:text-brand-teal"
                          >
                            {section.label}
                          </Link>
                        ) : (
                          <h3 className="text-lg font-bold text-brand-navy">
                            {section.label}
                          </h3>
                        )}
                        {section.groups.length > 0 && (
                          <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            {dict.catalog.directoryGroupsHeading}
                          </p>
                        )}
                      </div>

                      {section.groups.length > 0 && (
                        <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                          {section.groups.map((group) => (
                            <div key={group.id} className="min-w-0">
                              {group.href ? (
                                <Link
                                  href={group.href}
                                  className="text-sm font-bold text-brand-navy transition-colors hover:text-brand-teal"
                                >
                                  {group.label}
                                </Link>
                              ) : (
                                <h4 className="text-sm font-bold text-brand-navy">
                                  {group.label}
                                </h4>
                              )}

                              {group.categoryLinks.length > 0 && (
                                <ul className="mt-2 space-y-1.5 border-l border-border pl-3">
                                  {group.categoryLinks.map((categoryLink) => (
                                    <li
                                      key={categoryLink.id}
                                      className={categoryLink.depth > 0 ? "pl-3" : undefined}
                                    >
                                      <Link
                                        href={categoryLink.href}
                                        className={`text-xs leading-relaxed transition-colors hover:text-brand-teal ${
                                          categoryLink.depth === 0
                                            ? "font-semibold text-brand-navy/80"
                                            : "text-muted-foreground"
                                        }`}
                                      >
                                        {categoryLink.label}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {section.terminalLinks.length > 0 && (
                        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {section.terminalLinks.map((leaf) => (
                            <li key={leaf.id}>
                              <Link
                                href={leaf.href}
                                className="text-sm font-semibold text-brand-navy transition-colors hover:text-brand-teal"
                              >
                                {leaf.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  ))}
                </div>
              </section>
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
