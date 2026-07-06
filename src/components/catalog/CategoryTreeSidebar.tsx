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

interface CategoryTreeBranchProps {
  nodes: CatalogCategoryNode[];
  activeSlug: string;
  activeTrail: Set<string>;
  basePath: string;
  level?: number;
  localeBySlug?: Record<string, string>;
  fallbackBySlug?: Record<string, string>;
}

function CategoryTreeBranch({
  nodes,
  activeSlug,
  activeTrail,
  basePath,
  level = 0,
  localeBySlug,
  fallbackBySlug,
}: CategoryTreeBranchProps) {
  return (
    <ul className={level === 0 ? "space-y-3" : "mt-2 space-y-2 border-l border-gray-100 pl-3"}>
      {nodes.map((node) => {
        const label = resolveCategoryName({
          slug: node.slug,
          dbName: node.name,
          localeBySlug,
          fallbackBySlug,
        });

        const isActive = node.slug === activeSlug;
        const isInTrail = activeTrail.has(node.slug);
        const hasChildren = node.children.length > 0;
        const linkClassName = `${
          level === 0
            ? "text-xs font-bold uppercase tracking-wide"
            : level === 1
              ? "text-sm font-medium"
              : "text-xs"
        } transition-colors hover:text-brand-teal ${
          isActive
            ? level === 0
              ? "text-brand-teal border-l-2 border-brand-teal pl-2"
              : "text-brand-teal font-semibold"
            : isInTrail
              ? "text-brand-navy"
              : level >= 2
                ? "text-muted-foreground"
                : "text-brand-navy/70"
        }`;

        if (hasChildren) {
          return (
            <li key={node.id} className="space-y-1">
              <details open={isInTrail} className="group/category-details">
                <summary className="flex cursor-pointer list-none items-center justify-between text-brand-navy outline-none transition-colors hover:text-brand-teal">
                  <Link
                    href={`${basePath}/katalog/c-${node.slug}`}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex-1 py-0.5 ${linkClassName}`}
                  >
                    {label}
                  </Link>
                  <span className="mr-1 text-[8px] text-muted-foreground/60 transition-transform duration-200 group-open/category-details:rotate-180">
                    ▼
                  </span>
                </summary>
                <CategoryTreeBranch
                  nodes={node.children}
                  activeSlug={activeSlug}
                  activeTrail={activeTrail}
                  basePath={basePath}
                  level={level + 1}
                  localeBySlug={localeBySlug}
                  fallbackBySlug={fallbackBySlug}
                />
              </details>
            </li>
          );
        }

        return (
          <li key={node.id}>
            <Link
              href={`${basePath}/katalog/c-${node.slug}`}
              aria-current={isActive ? "page" : undefined}
              className={`block py-0.5 ${linkClassName}`}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
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
      <CategoryTreeBranch
        nodes={tree}
        activeSlug={activeSlug}
        activeTrail={activeTrail}
        basePath={basePath}
        localeBySlug={localeBySlug}
        fallbackBySlug={fallbackBySlug}
      />
    </nav>
  );
}
