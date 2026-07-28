import assert from "node:assert/strict";
import { buildCategoryTree, type CatalogCategoryRow } from "../src/lib/catalog/tree";
import {
  buildCatalogHomeSections,
  buildCatalogHomeBreadcrumbItems,
  buildCatalogHomeCollectionPageJsonLd,
  createCatalogSectionAnchorId,
  flattenCatalogHomeItemListEntries,
  type CatalogHomeSectionNode,
} from "../src/lib/catalog/catalog-home";
import { createBreadcrumbListJsonLd } from "../src/lib/seo/json-ld";

// ─── Synthetic fixtures (deterministic, DB-independent, intentionally NOT
//     mirroring production taxonomy counts) ──────────────────────────────────

const NOW = new Date("2026-01-01T00:00:00.000Z");

function row(id: number, slug: string, name: string, parentId: number | null): CatalogCategoryRow {
  return { id, name, slug, parentId, createdAt: NOW };
}

const rows: CatalogCategoryRow[] = [
  row(1, "regaly-i-systemy-skladowania", "Regały DB", null),
  row(2, "regaly-paletowe", "Regały paletowe DB", 1),
  row(3, "kategoria-plytka", "Kategoria płytka DB", 2),
  row(4, "kategoria-z-dziecmi", "Kategoria z dziećmi DB", 2),
  row(5, "kategoria-gleboka", "Kategoria głęboka DB", 4),
  row(6, "kategoria-najglebsza", "Kategoria najgłębsza DB", 5),
  row(7, "grupa-pusta", "Grupa pusta DB", 1),
  row(8, "sekcja-pusta", "Sekcja pusta DB", null),
  row(9, "sekcja-druga", "Sekcja druga DB", null),
  row(10, "grupa-sekcji-drugiej", "Grupa sekcji drugiej DB", 9),
  row(11, "kategoria-nieroutowalna", "Kategoria nieroutowalna DB", 10),
  row(12, "sekcja-dup", "Sekcja duplikat A DB", null),
  row(13, "sekcja-dup", "Sekcja duplikat B DB", null),
  row(14, "wezel-sierota", "Węzeł sierota DB", 999),
];

const tree = buildCategoryTree(rows);

const ALL_SLUGS = rows.map((r) => r.slug);
const routeableSlugSet = new Set(
  ALL_SLUGS.filter((slug) => slug !== "kategoria-nieroutowalna" && slug !== "sekcja-pusta"),
);

const localeBySlug: Record<string, string> = {
  "regaly-i-systemy-skladowania": "Regale und Lagersysteme",
};
const fallbackBySlug: Record<string, string> = {
  "regaly-i-systemy-skladowania": "Regały i systemy składowania PL",
  "regaly-paletowe": "Regały paletowe PL",
};

const sections = buildCatalogHomeSections({
  categoryTree: tree,
  basePath: "/",
  routeableSlugSet,
  localeBySlug,
  fallbackBySlug,
});

const localizedSections = buildCatalogHomeSections({
  categoryTree: tree,
  basePath: "/de",
  routeableSlugSet,
  localeBySlug,
  fallbackBySlug,
});

function findBySlug<T extends { slug: string }>(nodes: T[], slug: string): T | undefined {
  return nodes.find((node) => node.slug === slug);
}

function countViewModelNodes(nodes: readonly { children: readonly unknown[] }[]): number {
  return nodes.reduce(
    (sum, node) => sum + 1 + countViewModelNodes(node.children as readonly { children: readonly unknown[] }[]),
    0,
  );
}

const sectionOne = findBySlug(sections, "regaly-i-systemy-skladowania")!;
const groupOne = findBySlug(sectionOne.children, "regaly-paletowe")!;
const emptyGroup = findBySlug(sectionOne.children, "grupa-pusta")!;
const emptySection = findBySlug(sections, "sekcja-pusta")!;
const secondSection = findBySlug(sections, "sekcja-druga")!;
const secondGroup = findBySlug(secondSection.children, "grupa-sekcji-drugiej")!;
const nonRouteableCategory = findBySlug(secondGroup.children, "kategoria-nieroutowalna")!;
const orphanSection = findBySlug(sections, "wezel-sierota")!;
const deepCategory = findBySlug(groupOne.children, "kategoria-z-dziecmi")!;
const deeperCategory = findBySlug(deepCategory.children, "kategoria-gleboka")!;
const deepestCategory = findBySlug(deeperCategory.children, "kategoria-najglebsza")!;

// ─── 1. locale label ────────────────────────────────────────────────────────
assert.equal(sectionOne.label, "Regale und Lagersysteme", "locale label wins");

// ─── 2. PL fallback ─────────────────────────────────────────────────────────
assert.equal(groupOne.label, "Regały paletowe PL", "PL fallback when locale misses");

// ─── 3. DB-name fallback ────────────────────────────────────────────────────
assert.equal(findBySlug(groupOne.children, "kategoria-plytka")!.label, "Kategoria płytka DB", "DB name fallback");

// ─── 4. routeable href ──────────────────────────────────────────────────────
assert.equal(sectionOne.href, "/katalog/c-regaly-i-systemy-skladowania", "routeable section href");

// ─── 5. non-routeable href=null ─────────────────────────────────────────────
assert.equal(nonRouteableCategory.href, null, "non-routeable category href=null");
assert.equal(emptySection.href, null, "non-routeable section href=null");

// ─── 6. PL path ─────────────────────────────────────────────────────────────
assert.equal(groupOne.href, "/katalog/c-regaly-paletowe", "PL path has no locale prefix");

// ─── 7. localized path ──────────────────────────────────────────────────────
const deSection = findBySlug(localizedSections, "regaly-i-systemy-skladowania")!;
assert.equal(deSection.href, "/de/katalog/c-regaly-i-systemy-skladowania", "localized path prefix");

// ─── 8. stable source ordering ──────────────────────────────────────────────
assert.deepEqual(
  sections.map((section) => section.slug),
  ["regaly-i-systemy-skladowania", "sekcja-pusta", "sekcja-druga", "sekcja-dup", "sekcja-dup", "wezel-sierota"],
  "root order preserved",
);
assert.deepEqual(
  sectionOne.children.map((group) => group.slug),
  ["regaly-paletowe", "grupa-pusta"],
  "group order preserved",
);
assert.deepEqual(
  groupOne.children.map((category) => category.slug),
  ["kategoria-plytka", "kategoria-z-dziecmi"],
  "category order preserved",
);

// ─── 9. section projection ──────────────────────────────────────────────────
assert.equal(sectionOne.role, "section", "section role");
assert.equal(sectionOne.depth, 0, "section depth");
assert.equal(sectionOne.parentId, null, "section parentId");
assert.ok(sectionOne.anchorId.length > 0, "section anchorId present");

// ─── 10. group projection ───────────────────────────────────────────────────
assert.equal(groupOne.role, "group", "group role");
assert.equal(groupOne.depth, 1, "group depth");
assert.equal(groupOne.parentId, 1, "group parentId");

// ─── 11. category depth 2 ───────────────────────────────────────────────────
assert.equal(deepCategory.role, "category", "category role");
assert.equal(deepCategory.depth, 2, "category depth 2");
assert.equal(deepCategory.parentId, 2, "category parentId");

// ─── 12. category depth 3+ ──────────────────────────────────────────────────
assert.equal(deeperCategory.depth, 3, "category depth 3");
assert.equal(deepestCategory.depth, 4, "category depth 4");
assert.equal(deepestCategory.parentId, 5, "deep category parentId");

// ─── 13. recursive hierarchy preserved (no flattening) ─────────────────────
assert.equal(countViewModelNodes(sections), rows.length, "all nodes preserved");
assert.equal(deepCategory.children[0], deeperCategory, "nested children structure");
assert.equal(deeperCategory.children[0], deepestCategory, "deep nesting not flattened");

// ─── 14. empty section ──────────────────────────────────────────────────────
assert.equal(emptySection.groupCount, 0, "empty section groupCount=0");
assert.equal(emptySection.categoryCount, 0, "empty section categoryCount=0");
assert.equal(emptySection.children.length, 0, "empty section has no children");

// ─── 15. empty group ────────────────────────────────────────────────────────
assert.equal(emptyGroup.categoryCount, 0, "empty group categoryCount=0");
assert.equal(emptyGroup.children.length, 0, "empty group has no children");

// ─── 16. section groupCount ─────────────────────────────────────────────────
assert.equal(sectionOne.groupCount, 2, "section groupCount");

// ─── 17. section categoryCount ──────────────────────────────────────────────
assert.equal(sectionOne.categoryCount, 4, "section categoryCount = all descendants depth>=2");

// ─── 18. group categoryCount ────────────────────────────────────────────────
assert.equal(groupOne.categoryCount, 4, "group categoryCount");

// ─── 19. unique stable anchor IDs ───────────────────────────────────────────
assert.equal(
  createCatalogSectionAnchorId("regaly-i-systemy-skladowania", 1),
  "catalog-section-regaly-i-systemy-skladowania-1",
  "anchor ID format",
);
const anchorIds = sections.map((section) => section.anchorId);
assert.equal(new Set(anchorIds).size, anchorIds.length, "anchor IDs unique even with duplicate slugs");
assert.notEqual(
  findBySlug(sections, "sekcja-dup")!.anchorId,
  sections.filter((section) => section.slug === "sekcja-dup")[1].anchorId,
  "duplicate slugs get distinct anchors",
);

// ─── 20. empty taxonomy ─────────────────────────────────────────────────────
assert.deepEqual(
  buildCatalogHomeSections({ categoryTree: [], basePath: "/", routeableSlugSet: new Set() }),
  [],
  "empty taxonomy yields empty sections",
);

// ─── 21. section icon ───────────────────────────────────────────────────────
assert.equal(
  sectionOne.iconPath,
  "/images/catalog/sections/regaly-i-systemy-skladowania.svg",
  "mapped section icon",
);
assert.equal(
  emptySection.iconPath,
  "/images/catalog/groups/package-fallback.svg",
  "unmapped section icon falls back",
);

// ─── 22. group icon ─────────────────────────────────────────────────────────
assert.equal(
  groupOne.iconPath,
  "/images/catalog/groups/regaly-paletowe.svg",
  "mapped group icon",
);
assert.equal(
  emptyGroup.iconPath,
  "/images/catalog/groups/package-fallback.svg",
  "unmapped group icon falls back",
);

// ─── 23. category iconPath=null ─────────────────────────────────────────────
assert.equal(deepCategory.iconPath, null, "category iconPath null");
assert.equal(deepestCategory.iconPath, null, "deep category iconPath null");

// ─── 24. ItemList contains only routeable top-level sections ────────────────
const itemListEntries = flattenCatalogHomeItemListEntries(sections);
assert.equal(itemListEntries.length, 5, "non-routeable section excluded from ItemList");
assert.ok(
  itemListEntries.every((entry) => !entry.url.includes("sekcja-pusta")),
  "ItemList has no non-routeable section",
);
assert.ok(
  itemListEntries.every((entry) => entry.url.startsWith("https://")),
  "ItemList URLs absolute",
);

// ─── 25. ItemList order stable ──────────────────────────────────────────────
assert.deepEqual(
  itemListEntries.map((entry) => entry.url),
  sections
    .filter((section) => section.href !== null)
    .map((section) => `https://www.logimarket.eu${section.href}`),
  "ItemList order matches section order",
);

// ─── 26. CollectionPage mainEntity type=ItemList ────────────────────────────
const collectionPage = buildCatalogHomeCollectionPageJsonLd({
  sections,
  pageUrl: "https://www.logimarket.eu/katalog",
  name: "Katalog test",
  description: "Opis testowy katalogu",
  locale: "de",
}) as Record<string, unknown>;
const mainEntity = collectionPage["mainEntity"] as Record<string, unknown>;
assert.equal(mainEntity["@type"], "ItemList", "mainEntity is ItemList");
assert.equal(collectionPage["@type"], "CollectionPage", "root type CollectionPage");
assert.equal(collectionPage["inLanguage"], "de", "inLanguage localized");

// ─── 27. exactly one ItemList object in CollectionPage ──────────────────────
const collectionJson = JSON.stringify(collectionPage);
assert.equal(
  collectionJson.split('"@type":"ItemList"').length - 1,
  1,
  "exactly one ItemList in CollectionPage projection",
);

// ─── 28. BreadcrumbList contains exactly Home and Catalog ───────────────────
const breadcrumbItems = buildCatalogHomeBreadcrumbItems({
  homeUrl: "https://www.logimarket.eu/",
  catalogUrl: "https://www.logimarket.eu/katalog",
  homeName: "LogiMarket.pl",
  catalogName: "Katalog ofert",
});
assert.equal(breadcrumbItems.length, 2, "breadcrumb has exactly 2 items");
const breadcrumbJsonLd = createBreadcrumbListJsonLd(breadcrumbItems) as {
  itemListElement: { position: number; name: string; item: string }[];
};
assert.equal(breadcrumbJsonLd.itemListElement[0].name, "LogiMarket.pl", "breadcrumb Home first");
assert.equal(breadcrumbJsonLd.itemListElement[1].name, "Katalog ofert", "breadcrumb Catalog second");
assert.equal(breadcrumbJsonLd.itemListElement[0].position, 1, "breadcrumb position 1");
assert.equal(breadcrumbJsonLd.itemListElement[1].position, 2, "breadcrumb position 2");

// ─── 29. no standalone ItemList contract ────────────────────────────────────
assert.ok(
  !("@type" in itemListEntries[0]),
  "flattened entries are plain data, not a standalone ItemList",
);
assert.equal(
  collectionJson.split('"@type":"ListItem"').length - 1,
  itemListEntries.length,
  "ListItem entries live only inside the inline ItemList",
);

// ─── 30. no offer/partner/price fields in JSON-LD ───────────────────────────
assert.ok(!/"price"/.test(collectionJson), "no price in JSON-LD");
assert.ok(!/"offers"/.test(collectionJson), "no offers in JSON-LD");
assert.ok(!/"partner"/i.test(collectionJson), "no partner data in JSON-LD");
assert.ok(!/"Organization"/.test(collectionJson), "no re-declared Organization");
assert.ok(!/"WebSite"/.test(collectionJson), "no re-declared WebSite");

// ─── orphan handling (root fallback from buildCategoryTree) ────────────────
assert.equal(orphanSection.role, "section", "orphan node surfaced as root section");
assert.equal(orphanSection.parentId, 999, "orphan keeps source parentId");

// ─── long name preserved ────────────────────────────────────────────────────
const longNameSections = buildCatalogHomeSections({
  categoryTree: buildCategoryTree([
    row(100, "bardzo-dluga-nazwa", "X".repeat(100), null),
  ]),
  basePath: "/",
  routeableSlugSet: new Set(["bardzo-dluga-nazwa"]),
});
assert.equal(longNameSections[0].label.length, 100, "long names are not truncated");

const assertionCount = 68;
console.log(`lm69-catalog-home-projection-test: ALL PASSED (${assertionCount} assertions)`);
