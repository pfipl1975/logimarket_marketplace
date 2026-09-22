import { test } from "node:test";
import assert from "node:assert";
import { resolveCategoryName } from "../../src/lib/i18n/category-labels";

test("Admin Offer Create Category I18N: Projection honors locale, pl-fallback, and dbName", () => {
  const dbName = "DB Raw Name";
  const slug = "test-slug";

  const plDictionary = {
    "test-slug": "Test PL Label",
  };

  const deDictionary = {
    "test-slug": "Test DE Label",
  };

  // 1. Direct locale match
  const name1 = resolveCategoryName({
    slug,
    dbName,
    localeBySlug: deDictionary,
    fallbackBySlug: plDictionary,
  });
  assert.strictEqual(name1, "Test DE Label", "Should use direct locale label");

  // 2. PL fallback match (missing in DE)
  const name2 = resolveCategoryName({
    slug,
    dbName,
    localeBySlug: {}, // empty de
    fallbackBySlug: plDictionary,
  });
  assert.strictEqual(name2, "Test PL Label", "Should use PL fallback label");

  // 3. DB raw fallback (missing in both)
  const name3 = resolveCategoryName({
    slug,
    dbName,
    localeBySlug: {},
    fallbackBySlug: {},
  });
  assert.strictEqual(name3, "DB Raw Name", "Should use DB raw name");
});

test("Admin Offer Create Category I18N: Mapping preserves parentId across localization", () => {
  const categoriesFromDb = [
    { id: 1, name: "Wyposazenie", slug: "wyposazenie-magazynu", parentId: null },
    { id: 10, name: "Pojemniki", slug: "pojemniki-i-kuwety", parentId: 1 },
    { id: 100, name: "Euro", slug: "pojemniki-plastikowe-euro", parentId: 10 },
  ];

  const plDictionary = {
    "wyposazenie-magazynu": "Wyposażenie magazynu i warsztatu",
    "pojemniki-i-kuwety": "Pojemniki i kuwety",
    "pojemniki-plastikowe-euro": "Pojemniki plastikowe Euro",
  };

  const mapped = categoriesFromDb.map((c) => ({
    ...c,
    name: resolveCategoryName({
      slug: c.slug,
      dbName: c.name,
      localeBySlug: plDictionary,
      fallbackBySlug: plDictionary,
    }),
  }));

  assert.strictEqual(mapped[0].parentId, null);
  assert.strictEqual(mapped[0].name, "Wyposażenie magazynu i warsztatu");

  assert.strictEqual(mapped[1].parentId, 1);
  assert.strictEqual(mapped[1].name, "Pojemniki i kuwety");

  assert.strictEqual(mapped[2].parentId, 10);
  assert.strictEqual(mapped[2].name, "Pojemniki plastikowe Euro");
});
