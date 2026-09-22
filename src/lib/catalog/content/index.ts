import type { Locale } from "@/lib/i18n/types";
import { plCategoryContent } from "./pl";
import { enCategoryContent } from "./en";
import { deCategoryContent } from "./de";
import type { CategoryContentSeed, CategoryContentMap } from "./types";

/**
 * Retrieve stateless static content for a category landing page.
 *
 * Supported locales:
 * - pl  → Polish content map
 * - en  → English content map
 * - de  → German content map
 * - fr, uk, es, zh → null (not yet supported)
 */
export function getCategoryContent(
  locale: Locale,
  slug: string
): CategoryContentSeed | null {
  const contentByLocale: Partial<Record<Locale, CategoryContentMap>> = {
    pl: plCategoryContent,
    en: enCategoryContent,
    de: deCategoryContent,
  };

  return contentByLocale[locale]?.[slug] ?? null;
}
