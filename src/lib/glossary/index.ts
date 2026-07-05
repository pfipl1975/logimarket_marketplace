import { plGlossaryContent } from "./pl";
import { enGlossaryContent } from "./en";
import { deGlossaryContent } from "./de";
import type { GlossaryTerm, GlossaryContentMap } from "./types";

export * from "./related";

export type GlossaryContentLocale = "pl" | "en" | "de";

const contentMaps: Record<GlossaryContentLocale, GlossaryContentMap> = {
  pl: plGlossaryContent,
  en: enGlossaryContent,
  de: deGlossaryContent,
};

/**
 * Retrieve a specific glossary term by its slug and optional locale.
 */
export function getGlossaryTerm(slug: string, locale: GlossaryContentLocale = "pl"): GlossaryTerm | null {
  const map = contentMaps[locale] || plGlossaryContent;
  return map[slug] ?? null;
}

/**
 * Retrieve all registered glossary terms for a specific locale.
 */
export function getGlossaryTerms(locale: GlossaryContentLocale = "pl"): GlossaryTerm[] {
  const map = contentMaps[locale] || plGlossaryContent;
  return Object.values(map);
}
