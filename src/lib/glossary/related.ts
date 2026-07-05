import { getGlossaryTerm } from "./index";

export const glossaryTermsByCategorySlug: Record<string, string[]> = {
  "pojemniki-plastikowe-euro": ["pojemnik-euro"],
  "regaly-i-systemy-skladowania": ["regal-paletowy", "nosnosc-regalu"],
  "antresole-i-podesty-magazynowe": ["antresola-magazynowa"],
  "stoly-pakowe-i-kompletacyjne": ["stol-pakowy", "kompletacja-zamowien"],
  "wozki-i-transport-wewnetrzny": ["wozek-widlowy", "transport-wewnetrzny"],
};

export interface ResolvedGlossaryLink {
  slug: string;
  term: string;
  shortDefinition: string;
  href: string;
}

/**
 * Returns a list of glossary terms related to the given category slug.
 * Excludes terms that do not exist, limits to 6 terms max, and generates local links.
 */
export function resolveGlossaryLinksForCategory(categorySlug: string): ResolvedGlossaryLink[] {
  const termSlugs = glossaryTermsByCategorySlug[categorySlug];
  if (!termSlugs) {
    return [];
  }

  const results: ResolvedGlossaryLink[] = [];

  for (const slug of termSlugs) {
    const term = getGlossaryTerm(slug);
    if (term) {
      results.push({
        slug: term.slug,
        term: term.term,
        shortDefinition: term.shortDefinition,
        href: `/slownik-branzowy/${term.slug}`,
      });
    }
  }

  return results.slice(0, 6);
}
