import { getGlossaryTerm, type GlossaryContentLocale } from "./index";

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

const glossaryBasePaths: Record<"pl" | "en" | "de", string> = {
  pl: "/slownik-branzowy",
  en: "/en/logistics-glossary",
  de: "/de/logistik-lexikon",
};

/**
 * Returns a list of glossary terms related to the given category slug and locale.
 * Excludes terms that do not exist, limits to 6 terms max, and generates local links.
 */
export function resolveGlossaryLinksForCategory(
  categorySlug: string,
  locale: GlossaryContentLocale = "pl"
): ResolvedGlossaryLink[] {
  // Support only PL, EN, DE
  if (locale !== "pl" && locale !== "en" && locale !== "de") {
    return [];
  }

  const termSlugs = glossaryTermsByCategorySlug[categorySlug];
  if (!termSlugs) {
    return [];
  }

  const basePath = glossaryBasePaths[locale];
  const results: ResolvedGlossaryLink[] = [];

  for (const slug of termSlugs) {
    const term = getGlossaryTerm(slug, locale);
    if (term) {
      results.push({
        slug: term.slug,
        term: term.term,
        shortDefinition: term.shortDefinition,
        href: `${basePath}/${term.slug}`,
      });
    }
  }

  return results.slice(0, 6);
}
