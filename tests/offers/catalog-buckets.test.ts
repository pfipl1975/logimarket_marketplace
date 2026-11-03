import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildCategoryTree } from "../../src/lib/catalog/tree";
import { buildCatalogHomeSections } from "../../src/lib/catalog/catalog-home";
import { MVP_HOMEPAGE_ROOT_SLUGS, MVP_ROOT_SECTION_DISPLAY_LIMIT } from "../../src/lib/catalog/homepage-groups";
import { getSectionIconPath, getGroupIconPath } from "../../src/lib/catalog/group-icons";

const planned = [
  ["maszyny-i-urzadzenia", null],
  ["osprzet-do-maszyn-budowlanych", "maszyny-i-urzadzenia"],
  ["lyzki-do-koparek", "osprzet-do-maszyn-budowlanych"],
  ["lyzki-do-ladowarek", "osprzet-do-maszyn-budowlanych"],
  ["lyzki-skarpowe-i-profilujace", "osprzet-do-maszyn-budowlanych"],
] as const;

test("seventh root is included without reordering or replacing six established sections", () => {
  assert.equal(MVP_HOMEPAGE_ROOT_SLUGS.length, 7);
  assert.equal(MVP_HOMEPAGE_ROOT_SLUGS.at(-1), planned[0][0]);
  assert.equal(MVP_ROOT_SECTION_DISPLAY_LIMIT >= 7, true);
  assert.equal(new Set(MVP_HOMEPAGE_ROOT_SLUGS).size, 7);
  assert.ok(MVP_HOMEPAGE_ROOT_SLUGS.includes("wozki-i-transport-wewnetrzny"));
});

test("catalog hierarchy has one independent section, group, and three bucket leaf categories", () => {
  const rows = planned.map(([slug, parentSlug], index) => ({
    id: 300 + index,
    slug,
    name: slug,
    parentId: parentSlug === null ? null : 300 + planned.findIndex(([s]) => s === parentSlug),
  }));
  const tree = buildCategoryTree(rows);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].children.length, 1);
  assert.equal(tree[0].children[0].children.length, 3);
  const sections = buildCatalogHomeSections({
    categoryTree: tree,
    basePath: "/en",
    routeableSlugSet: new Set(planned.map(([slug]) => slug)),
  });
  assert.equal(sections[0].slug, "maszyny-i-urzadzenia");
  assert.equal(sections[0].categoryCount, 3);
  assert.equal(sections[0].offerCount, 0);
  assert.equal(sections[0].children[0].categoryCount, 3);
  assert.equal(sections[0].children[0].children[0].href, "/en/katalog/c-lyzki-do-koparek");
});

test("all 7 existing locale dictionaries contain new names and first-party category introductions", () => {
  for (const locale of ["pl", "en", "de", "fr", "es", "uk", "zh"]) {
    const dict = JSON.parse(readFileSync(join(process.cwd(), "src/messages", locale + ".json"), "utf8"));
    for (const [slug] of planned) {
      assert.ok(typeof dict.categories.bySlug[slug] === "string" && dict.categories.bySlug[slug].length > 2,
        locale + "." + slug + " label");
      assert.ok(typeof dict.categories.introsBySlug[slug] === "string" && dict.categories.introsBySlug[slug].length > 10,
        locale + "." + slug + " intro");
    }
    assert.ok(dict.categories.bySlug["osprzet-do-wozkow-widlowych"],
      "forklift attachment category remains intact");
  }
});

test("new section and group have branded SVG icon mappings, without changes to forklift attachments", () => {
  assert.equal(getSectionIconPath("maszyny-i-urzadzenia"),
    "/images/catalog/sections/maszyny-i-urzadzenia.svg");
  assert.equal(getGroupIconPath("osprzet-do-maszyn-budowlanych"),
    "/images/catalog/groups/osprzet-do-maszyn-budowlanych.svg");
  assert.equal(getGroupIconPath("osprzet-do-wozkow-widlowych"),
    "/images/catalog/groups/osprzet-do-wozkow-widlowych.svg");
});

test("staged data SQL changes categories only and checks safety gates", () => {
  const read = (suffix: string) => readFileSync(
    join(process.cwd(), "scripts/sql/production", "lm-catalog-buckets-01-" + suffix + ".sql"), "utf8");
  const precheck = read("precheck"), apply = read("apply"), verify = read("verify"), rollback = read("rollback");
  assert.match(precheck, /BEGIN TRANSACTION READ ONLY/);
  assert.match(precheck, /v_roots <> 6/);
  assert.match(precheck, /v_roots <> 7/);
  assert.match(apply, /INSERT INTO public\.categories/);
  assert.match(apply, /v_existing NOT IN \(0, 5\)/);
  assert.match(apply, /pg_advisory_xact_lock/);
  assert.doesNotMatch(apply, /\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+public\.(?:offers|partners|category_attribute_assignments)\b/i);
  assert.doesNotMatch(apply, /\b(?:ALTER|CREATE|DROP)\s+TABLE\b/i);
  assert.match(verify, /BEGIN TRANSACTION READ ONLY/);
  assert.match(rollback, /categories have offers/);
  assert.match(rollback, /categories have attribute assignments/);
  assert.match(rollback, /unplanned descendants exist/);
});
