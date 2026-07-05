import { plGlossaryContent } from "./pl";
import type { GlossaryTerm } from "./types";

/**
 * Retrieve a specific glossary term by its slug.
 *
 * Supported locales: PL (currently Polish-only pilot foundation)
 */
export function getGlossaryTerm(slug: string): GlossaryTerm | null {
  return plGlossaryContent[slug] ?? null;
}

/**
 * Retrieve all registered glossary terms.
 *
 * Supported locales: PL
 */
export function getGlossaryTerms(): GlossaryTerm[] {
  return Object.values(plGlossaryContent);
}
