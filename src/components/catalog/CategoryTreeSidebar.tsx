import Link from "next/link";
import { resolveCategoryName } from "@/lib/i18n/category-labels";
import type { CatalogCategoryNode } from "@/lib/catalog/tree";
import type { Locale } from "@/lib/i18n/types";

export interface CategoryTreeSidebarProps {
  tree: CatalogCategoryNode[];
  activeSlug: string;
  locale: Locale;
  categoryFilterBasePath: string;
  localeBySlug?: Record<string, string>;
  fallbackBySlug?: Record<string, string>;
}

function isNodeActiveOrParent(node: CatalogCategoryNode, activeSlug: string): boolean {
  if (node.slug === activeSlug) return true;
  if (!node.children) return false;
  return node.children.some((child) => isNodeActiveOrParent(child, activeSlug));
}

/**
 * CategoryTreeSidebar — server-rendered category navigation sidebar for desktop.
 *
 * NULL RENDERING GATE: returns null if the tree is empty.
 * Strictly local URLs: no absolute domains, no external URLs, no /go/[id] link generation.
 * Accessibility compliant: uses `<nav>` with `aria-label` and `aria-current="page"`.
 */
export function CategoryTreeSidebar({
  tree,
  activeSlug,
  locale,
  categoryFilterBasePath,
  localeBySlug,
  fallbackBySlug,
}: CategoryTreeSidebarProps) {
  if (!tree || tree.length === 0) return null;

  const basePath = categoryFilterBasePath === "/" ? "" : categoryFilterBasePath;

  return (
    <nav
      aria-label="Nawigacja katalogu"
      className="w-full rounded-lg border border-border bg-white p-5 shadow-sm"
    >
      <div className="mb-4 text-xs font-bold uppercase tracking-wider text-brand-navy border-b border-border pb-2">
        {locale === "pl" ? "Katalog kategorii" : "Catalog Navigation"}
      </div>
      <ul className="space-y-4">
        {tree.map((section) => {
          const sectionLabel = resolveCategoryName({
            slug: section.slug,
            dbName: section.name,
            localeBySlug,
            fallbackBySlug,
          });

          const isSectionActive = section.slug === activeSlug;
          const isSectionParent = isNodeActiveOrParent(section, activeSlug);

          return (
            <li key={section.id} className="space-y-2">
              <Link
                href={`${basePath}/katalog/c-${section.slug}`}
                aria-current={isSectionActive ? "page" : undefined}
                className={`block text-xs font-bold uppercase tracking-wide transition-colors hover:text-brand-teal ${
                  isSectionActive
                    ? "text-brand-teal border-l-2 border-brand-teal pl-2"
                    : isSectionParent
                      ? "text-brand-navy"
                      : "text-brand-navy/70"
                }`}
              >
                {sectionLabel}
              </Link>

              {section.children && section.children.length > 0 && isSectionParent && (
                <ul className="space-y-1.5 border-l border-gray-100 pl-3 ml-1">
                  {section.children.map((group) => {
                    const groupLabel = resolveCategoryName({
                      slug: group.slug,
                      dbName: group.name,
                      localeBySlug,
                      fallbackBySlug,
                    });

                    const isGroupActive = group.slug === activeSlug;
                    const isGroupParent = isNodeActiveOrParent(group, activeSlug);

                    return (
                      <li key={group.id} className="space-y-1">
                        <Link
                          href={`${basePath}/katalog/c-${group.slug}`}
                          aria-current={isGroupActive ? "page" : undefined}
                          className={`block text-sm font-medium transition-colors hover:text-brand-teal ${
                            isGroupActive
                              ? "text-brand-teal font-semibold"
                              : isGroupParent
                                ? "text-brand-navy"
                                : "text-brand-navy/70"
                          }`}
                        >
                          {groupLabel}
                        </Link>

                        {group.children && group.children.length > 0 && isGroupParent && (
                          <ul className="space-y-1 pl-3.5 border-l border-gray-50 ml-0.5 py-0.5">
                            {group.children.map((leaf) => {
                              const leafLabel = resolveCategoryName({
                                slug: leaf.slug,
                                dbName: leaf.name,
                                localeBySlug,
                                fallbackBySlug,
                              });

                              const isLeafActive = leaf.slug === activeSlug;

                              return (
                                <li key={leaf.id}>
                                  <Link
                                    href={`${basePath}/katalog/c-${leaf.slug}`}
                                    aria-current={isLeafActive ? "page" : undefined}
                                    className={`block text-xs transition-colors hover:text-brand-teal ${
                                      isLeafActive
                                        ? "text-brand-teal font-semibold"
                                        : "text-muted-foreground"
                                    }`}
                                  >
                                    {leafLabel}
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
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
