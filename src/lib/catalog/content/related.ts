import type { RelatedCategoryEdge, RelatedCategoryRelationType } from "./types";
import type { CatalogCategoryRow } from "@/lib/catalog/tree";
import type { Locale } from "@/lib/i18n/types";
import { resolveCategoryName } from "@/lib/i18n/category-labels";

export interface ResolvedRelatedCategoryLink {
  label: string;
  href: string;
  relationType: RelatedCategoryRelationType;
  context: string | undefined;
  priority: number;
}

interface ResolveRelatedCategoryLinksInput {
  edges: RelatedCategoryEdge[] | null | undefined;
  allCategories: CatalogCategoryRow[];
  locale: Locale;
  categoryFilterBasePath: string;
  localeBySlug?: Record<string, string>;
  fallbackBySlug?: Record<string, string>;
}

/**
 * Resolve related category edges into fully localized, filtered, sorted, and limited links.
 *
 * Guarantees:
 * - Stateless and synchronous execution
 * - No DB queries or async operations
 * - Strictly local URLs in the format /katalog/c-{slug} or /{locale}/katalog/c-{slug}
 * - Runtime filtering against active DB categories to prevent 404 links
 * - Priority-based sorting (ascending, priority > 0)
 * - Safe limits (maximum 6 links)
 * - Zero external or direct outbound partner URLs
 */
export function resolveRelatedCategoryLinks({
  edges,
  allCategories,
  locale,
  categoryFilterBasePath,
  localeBySlug,
  fallbackBySlug,
}: ResolveRelatedCategoryLinksInput): ResolvedRelatedCategoryLink[] {
  if (!edges || edges.length === 0) {
    return [];
  }

  const links = edges
    .map((edge) => {
      // Priority guard
      if (edge.priority <= 0) {
        return null;
      }

      // Runtime taksonomy guard: target category must exist in DB
      const targetCategory = allCategories.find((c) => c.slug === edge.targetSlug);
      if (!targetCategory) {
        return null;
      }

      // Localized name resolution
      const label = resolveCategoryName({
        slug: edge.targetSlug,
        dbName: targetCategory.name,
        localeBySlug,
        fallbackBySlug,
      });

      if (!label) {
        return null;
      }

      // Construct local path only
      const basePath = categoryFilterBasePath === "/" ? "" : categoryFilterBasePath;
      const href = `${basePath}/katalog/c-${edge.targetSlug}`;

      return {
        label,
        href,
        relationType: edge.relationType,
        context: edge.context,
        priority: edge.priority,
      };
    })
    .filter((link): link is ResolvedRelatedCategoryLink => link !== null)
    // Sort by priority ascending (1, 2, 3...)
    .sort((a, b) => a.priority - b.priority)
    // Hard limit: max 6 links
    .slice(0, 6);

  return links;
}
