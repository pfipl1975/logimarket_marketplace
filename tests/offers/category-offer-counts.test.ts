import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildCategoryTree, rollupCategoryOfferCounts } from "../../src/lib/catalog/tree";
import { buildCatalogHomeSections } from "../../src/lib/catalog/catalog-home";

const category = (id: number, parentId: number | null) =>
  ({ id, slug: "qa-" + id, name: "QA " + id, parentId });

const rows = [
  category(1, null), category(2, 1), category(3, 2),
  category(4, 2), category(5, null), category(6, 4),
];

test("one grouped result rolls direct and child offers up exactly once, including empty root", () => {
  const direct = [
    { categoryId: 1, offerCount: 1 },
    { categoryId: 2, offerCount: 1 },
    { categoryId: 3, offerCount: 2 },
    { categoryId: 4, offerCount: 1 },
    { categoryId: 6, offerCount: 2 },
  ];
  const counts = rollupCategoryOfferCounts(rows, direct);
  assert.deepEqual(counts, { 1: 7, 2: 6, 3: 2, 4: 3, 5: 0, 6: 2 });
  assert.equal(counts[1], direct.reduce((sum, value) => sum + value.offerCount, 0));
});

test("deep taxonomy, orphan, no categories and invalid hierarchy fail safely", () => {
  assert.deepEqual(rollupCategoryOfferCounts([], []), {});
  assert.deepEqual(rollupCategoryOfferCounts([category(3, 99)], [
    { categoryId: 3, offerCount: 1 }, { categoryId: 999, offerCount: 50 },
  ]), { 3: 1 });
  assert.throws(() => rollupCategoryOfferCounts([category(1, 2), category(2, 1)], []),
    /CATEGORY_TREE_CYCLE/);
  assert.throws(() => rollupCategoryOfferCounts([category(1, null), category(1, null)], []),
    /DUPLICATE_CATEGORY_ID/);
  assert.throws(() => rollupCategoryOfferCounts([category(1, null)], [
    { categoryId: 1, offerCount: -1 },
  ]), /INVALID_CATEGORY_OFFER_COUNT/);
});

test("projection retains existing categoryCount and exposes independent offerCount at every depth", () => {
  const tree = buildCategoryTree(rows);
  const offerCounts = rollupCategoryOfferCounts(rows, [
    { categoryId: 3, offerCount: 2 }, { categoryId: 4, offerCount: 1 },
  ]);
  const sections = buildCatalogHomeSections({
    categoryTree: tree, basePath: "/", routeableSlugSet: new Set(rows.map(r => r.slug)), offerCounts,
  });
  assert.equal(sections[0].offerCount, 3);
  assert.equal(sections[0].categoryCount, 3);
  assert.equal(sections[0].children[0].offerCount, 3);
  assert.equal(sections[0].children[0].children[0].offerCount, 2);
  assert.equal(sections[1].offerCount, 0);
  assert.equal(buildCatalogHomeSections({
    categoryTree: tree, basePath: "/", routeableSlugSet: new Set(),
  })[0].offerCount, 0);
});

test("single public SQL aggregation only counts published and active offers", () => {
  const actions = readFileSync(join(process.cwd(), "src/app/actions.ts"), "utf8");
  const method = actions.match(/export async function getPublishedCategoryOfferCounts\([\s\S]*?\n}\n/);
  assert.ok(method, "bulk counter action exists");
  assert.match(method[0], /eq\(offers\.isActive, true\)/);
  assert.match(method[0], /eq\(offers\.publicationStatus, "published"\)/);
  assert.match(method[0], /\.groupBy\(offers\.categoryId\)/);
  assert.match(method[0], /rollupCategoryOfferCounts/);
  assert.doesNotMatch(method[0], /getCategoryOffersCount|for\s*\(/);
});

test("all seven catalogs have offer count labels without new i18n keys", () => {
  for (const locale of ["pl", "en", "de", "fr", "es", "uk", "zh"]) {
    const dict = JSON.parse(readFileSync(join(process.cwd(), "src", "messages", locale + ".json"), "utf8"));
    for (const key of ["offerCountOne", "offerCountOther"]) {
      assert.ok(typeof dict.catalog[key] === "string" && dict.catalog[key].length > 0,
        locale + ".catalog." + key);
    }
  }
});
