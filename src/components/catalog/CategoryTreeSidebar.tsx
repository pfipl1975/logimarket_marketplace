import Link from "next/link";
import { resolveCategoryName } from "@/lib/i18n/category-labels";
import { cn } from "@/lib/utils";
import type { CatalogCategoryNode } from "@/lib/catalog/tree";

export interface CategoryTreeSidebarProps {
  tree: CatalogCategoryNode[];
  activeSlug: string;
  categoryFilterBasePath: string;
  navigationLabel: string;
  headingLabel: string;
  className?: string;
  localeBySlug?: Record<string, string>;
  fallbackBySlug?: Record<string, string>;
}

/**
 * Builds a Set of category slugs containing the active category and all its ancestors.
 * This represents the path/trail from root to active category.
 */
function buildActiveTrail(tree: CatalogCategoryNode[], activeSlug: string): Set<string> {
  const trail = new Set<string>();

  function find(nodes: CatalogCategoryNode[]): boolean {
    for (const node of nodes) {
      if (node.slug === activeSlug) {
        trail.add(node.slug);
        return true;
      }
      if (node.children && node.children.length > 0) {
        if (find(node.children)) {
          trail.add(node.slug);
          return true;
        }
      }
    }
    return false;
  }

  find(tree);
  return trail;
}

/**
 * CategoryTreeSidebar — server-rendered category navigation for catalog pages.
 *
 * UX Refinements:
 * - Employs a native HTML <details> and <summary> disclosure pattern.
 * - Stateless active trail compression: active branches are open by default (`open={isInTrail}`).
 * - All links remain fully present in the SSR HTML for SEO crawler discoverability.
 * - High-end B2B industrial design: clean borders, indicator lines, micro-spacing.
 *
 * Accessibility compliant: uses `<nav>` with `aria-label` and `aria-current="page"`.
 */
export function CategoryTreeSidebar({
  tree,
  activeSlug,
  categoryFilterBasePath,
  navigationLabel,
  headingLabel,
  className,
  localeBySlug,
  fallbackBySlug,
}: CategoryTreeSidebarProps) {
  if (!tree || tree.length === 0) return null;

  const basePath = categoryFilterBasePath === "/" ? "" : categoryFilterBasePath;
  const activeTrail = buildActiveTrail(tree, activeSlug);

  return (
    <nav
      aria-label={navigationLabel}
      className={cn("w-full rounded-lg border border-border bg-white p-5 shadow-sm", className)}
    >
      <div className="mb-4 text-xs font-bold uppercase tracking-wider text-brand-navy border-b border-border pb-2">
        {headingLabel}
      </div>
      <ul className="space-y-3">
        {tree.map((section) => {
          const sectionLabel = resolveCategoryName({
            slug: section.slug,
            dbName: section.name,
            localeBySlug,
            fallbackBySlug,
          });

          const isSectionActive = section.slug === activeSlug;
          const isSectionInTrail = activeTrail.has(section.slug);
          const hasGroups = section.children && section.children.length > 0;

          if (hasGroups) {
            return (
              <li key={section.id} className="space-y-1">
                <details open={isSectionInTrail} className="group/section-details">
                  <summary className="list-none outline-none cursor-pointer flex items-center justify-between text-xs font-bold uppercase tracking-wide transition-colors hover:text-brand-teal text-brand-navy select-none">
                    <Link
                      href={`${basePath}/katalog/c-${section.slug}`}
                      aria-current={isSectionActive ? "page" : undefined}
                      className={`flex-1 py-0.5 ${
                        isSectionActive
                          ? "text-brand-teal border-l-2 border-brand-teal pl-2"
                          : isSectionInTrail
                            ? "text-brand-navy"
                            : "text-brand-navy/70"
                      }`}
                    >
                      {sectionLabel}
                    </Link>
                    <span className="text-[8px] text-muted-foreground/60 transition-transform duration-200 group-open/section-details:rotate-180 mr-1">
                      ▼
                    </span>
                  </summary>
                  <ul className="space-y-2 border-l border-gray-100 pl-3 ml-1 mt-2 mb-2">
                    {section.children.map((group) => {
                      const groupLabel = resolveCategoryName({
                        slug: group.slug,
                        dbName: group.name,
                        localeBySlug,
                        fallbackBySlug,
                      });

                      const isGroupActive = group.slug === activeSlug;
                      const isGroupInTrail = activeTrail.has(group.slug);
                      const hasLeaves = group.children && group.children.length > 0;

                      if (hasLeaves) {
                        return (
                          <li key={group.id} className="space-y-1">
                            <details open={isGroupInTrail} className="group/group-details">
                              <summary className="list-none outline-none cursor-pointer flex items-center justify-between text-sm font-medium transition-colors hover:text-brand-teal text-brand-navy select-none">
                                <Link
                                  href={`${basePath}/katalog/c-${group.slug}`}
                                  aria-current={isGroupActive ? "page" : undefined}
                                  className={`flex-1 py-0.5 ${
                                    isGroupActive
                                      ? "text-brand-teal font-semibold"
                                      : isGroupInTrail
                                        ? "text-brand-navy"
                                        : "text-brand-navy/70"
                                  }`}
                                >
                                  {groupLabel}
                                </Link>
                                <span className="text-[7px] text-muted-foreground/50 transition-transform duration-200 group-open/group-details:rotate-180 mr-1">
                                  ▼
                                </span>
                              </summary>
                              <ul className="space-y-1.5 pl-3 border-l border-gray-50 ml-0.5 py-0.5 mt-1.5 mb-1.5">
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
                                        className={`block py-0.5 text-xs transition-colors hover:text-brand-teal ${
                                          isLeafActive
                                            ? "text-brand-teal font-semibold border-l border-brand-teal pl-1.5 -ml-3"
                                            : "text-muted-foreground"
                                        }`}
                                      >
                                        {leafLabel}
                                      </Link>
                                    </li>
                                  );
                                })}
                              </ul>
                            </details>
                          </li>
                        );
                      }

                      return (
                        <li key={group.id}>
                          <Link
                            href={`${basePath}/katalog/c-${group.slug}`}
                            aria-current={isGroupActive ? "page" : undefined}
                            className={`block py-0.5 text-sm font-medium transition-colors hover:text-brand-teal ${
                              isGroupActive
                                ? "text-brand-teal font-semibold"
                                : "text-brand-navy/70"
                            }`}
                          >
                            {groupLabel}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              </li>
            );
          }

          return (
            <li key={section.id}>
              <Link
                href={`${basePath}/katalog/c-${section.slug}`}
                aria-current={isSectionActive ? "page" : undefined}
                className={`block py-0.5 text-xs font-bold uppercase tracking-wide transition-colors hover:text-brand-teal ${
                  isSectionActive
                    ? "text-brand-teal border-l-2 border-brand-teal pl-2"
                    : "text-brand-navy/70"
                }`}
              >
                {sectionLabel}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
