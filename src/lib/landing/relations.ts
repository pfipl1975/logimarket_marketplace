import { landingPages } from "./content";
import { getSolutionsIndexPath } from "./links";
import type { LandingIntent, LandingLocale } from "./types";

export interface ResolvedSolutionLink {
  href: string;
  intent?: LandingIntent;
  label?: string;
  isFallback: boolean;
}

type IntentRelations = readonly LandingIntent[];

const sectionIntentRelations: ReadonlyMap<string, IntentRelations> = new Map([
  ["regaly-i-systemy-skladowania", ["storage-systems"]],
  ["wozki-i-transport-wewnetrzny", ["intralogistics"]],
  ["wyposazenie-magazynu", ["warehouse-equipment"]],
  ["opakowania-i-materialy-eksploatacyjne", ["packaging-load-securing"]],
  ["systemy-bezpieczenstwa-i-oznakowanie", ["warehouse-safety"]],
  ["robotyzacja-magazynu", ["warehouse-robotics"]],
]);

const groupIntentRelations: ReadonlyMap<string, IntentRelations> = new Map([
  ["meble-magazynowe-i-warsztatowe", ["picking-packing", "warehouse-equipment"]],
  ["osprzet-do-wozkow-widlowych", ["forklift-attachments"]],
  ["bezpieczenstwo-i-praca-na-wysokosci", ["forklift-attachments", "warehouse-safety"]],
  ["roboty-mobilne-agv-amr", ["warehouse-robotics", "intralogistics"]],
  ["agv-amr-do-palet-i-ciezkich-ladunkow", ["warehouse-robotics", "intralogistics"]],
  ["goods-to-person-i-automatyzacja-kompletacji", [
    "warehouse-robotics",
    "picking-packing",
    "ecommerce-warehouse",
  ]],
  ["roboty-kompletacyjne-i-manipulacyjne", ["warehouse-robotics", "picking-packing"]],
  ["egzoszkielety-i-wspomaganie-pracy", ["warehouse-robotics"]],
  ["infrastruktura-do-robotyzacji-magazynu", ["warehouse-robotics"]],
  ["oprogramowanie-i-integracja-robotow", ["warehouse-robotics", "intralogistics"]],
  ["wdrozenie-i-utrzymanie-robotyzacji", ["warehouse-robotics"]],
]);

const categoryIntentOverrides: ReadonlyMap<string, IntentRelations> = new Map([
  ["systemy-bezpieczenstwa-dla-robotow", ["warehouse-robotics", "warehouse-safety"]],
]);

const glossaryIntentRelations: ReadonlyMap<string, IntentRelations> = new Map([
  ["pojemnik-euro", ["warehouse-equipment"]],
  ["regal-paletowy", ["storage-systems"]],
  ["antresola-magazynowa", ["storage-systems"]],
  ["stol-pakowy", ["picking-packing"]],
  ["wozek-widlowy", ["intralogistics", "forklift-attachments"]],
  ["nosnosc-regalu", ["storage-systems"]],
  ["kompletacja-zamowien", ["picking-packing"]],
  ["transport-wewnetrzny", ["intralogistics"]],
]);

function toLandingLinks(
  intents: readonly LandingIntent[],
  locale: LandingLocale,
): ResolvedSolutionLink[] {
  const uniqueIntents = [...new Set(intents)].slice(0, 3);

  return uniqueIntents.flatMap((intent) => {
    const landing = landingPages.find(
      (page) => page.locale === locale && page.intent === intent,
    );

    return landing
      ? [{ href: landing.path, intent, label: landing.title, isFallback: false }]
      : [];
  });
}

/**
 * Resolves category-to-solution links using explicit leaf overrides first,
 * then the nearest matching group or root section in the ancestor path.
 */
export function resolveCategorySolutionLinks({
  categorySlug,
  ancestorSlugs,
  locale,
}: {
  categorySlug: string;
  ancestorSlugs: readonly string[];
  locale: LandingLocale;
}): ResolvedSolutionLink[] {
  const candidates = [categorySlug, ...[...ancestorSlugs].reverse()];

  for (const slug of candidates) {
    const intents =
      categoryIntentOverrides.get(slug) ??
      groupIntentRelations.get(slug) ??
      sectionIntentRelations.get(slug);

    if (intents) {
      return toLandingLinks(intents, locale);
    }
  }

  return [{
    href: getSolutionsIndexPath(locale),
    isFallback: true,
  }];
}

/**
 * Glossary terms use a deliberately small explicit registry. Unmapped terms
 * render no panel rather than inferring a relation from runtime keywords.
 */
export function resolveGlossarySolutionLinks(
  glossarySlug: string,
  locale: LandingLocale,
): ResolvedSolutionLink[] {
  const intents = glossaryIntentRelations.get(glossarySlug);
  return intents ? toLandingLinks(intents, locale) : [];
}

export const categorySolutionRelationSlugs = {
  sections: [...sectionIntentRelations.keys()],
  groups: [...groupIntentRelations.keys()],
  categoryOverrides: [...categoryIntentOverrides.keys()],
};

export const glossarySolutionRelationSlugs = [...glossaryIntentRelations.keys()];
