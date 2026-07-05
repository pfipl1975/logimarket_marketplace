import type { Locale } from "@/lib/i18n/types";
import { plCategoryContent } from "./pl";
import type { CategoryContentSeed } from "./types";

/**
 * Retrieve stateless static content for a category landing page.
 *
 * NULL RENDERING GATE:
 * - Returns null if the locale is not "pl" (currently PL-only pilot seed)
 * - Returns null if no content seed exists for the given slug
 */
export function getCategoryContent(
  locale: Locale,
  slug: string
): CategoryContentSeed | null {
  if (locale !== "pl") {
    return null;
  }
  return plCategoryContent[slug] ?? null;
}
