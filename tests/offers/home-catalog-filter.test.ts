import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { parseFilterQueryInput } from "../../src/lib/filters/parser";
import { normalizeFilterQuery } from "../../src/lib/filters/validation-core";
import { buildFilterPredicates } from "../../src/lib/catalog/filter-query-core";
import { buildCategoryOfferQueryHref, resolveHomeOfferQueryState } from "../../src/lib/catalog/query";

test("homepage filters accept global model/condition/sort but reject unscoped attribute filters", () => {
  const parsed = parseFilterQueryInput({ offerModel: "ecommerce", productCondition: "used", sort: "newest" });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const normalized = normalizeFilterQuery(parsed.value);
  assert.equal(normalized.ok, true);
  if (normalized.ok) {
    assert.equal(normalized.value.categoryId, undefined);
    assert.equal(normalized.value.offerModel, "ecommerce");
    assert.equal(normalized.value.productCondition, "used");
  }
  assert.equal(parseFilterQueryInput({ categoryId: 0, offerModel: "rfq" }).ok, false);
  assert.equal(parseFilterQueryInput({ controlled: [{ attributeId: 1, optionIds: [2] }] }).ok, false);
  assert.equal(normalizeFilterQuery({ numbers: [{ attributeId: 3, min: 1 }] }).ok, false);
  assert.equal(parseFilterQueryInput({ offerModel: "marketplace" }).ok, false);
  assert.equal(parseFilterQueryInput({ productCondition: "other" }).ok, false);
});

test("canonical model filter SQL matches legacy pair and preserves public-only restriction", () => {
  const db = {} as Parameters<typeof buildFilterPredicates>[0];
  const dialect = new PgDialect();
  const cases = [
    ["rfq", ["rfq", "inbound"], ["marketplace", "outbound"]],
    ["ecommerce", ["marketplace", "inbound"], ["rfq", "outbound"]],
    ["outbound", ["rfq", "outbound", "marketplace", "outbound"], ["inbound"]],
  ] as const;
  for (const [model, included, excluded] of cases) {
    const normalized = normalizeFilterQuery({ offerModel: model });
    assert.equal(normalized.ok, true);
    if (!normalized.ok) continue;
    const predicates = buildFilterPredicates(db, normalized.value, undefined, new Map());
    const query = dialect.sqlToQuery(and(...predicates)!);
    assert.match(query.sql, /publication_status/);
    assert.match(query.sql, /is_active/);
    assert.match(query.sql, /conversion_type/);
    assert.doesNotMatch(query.sql, /category_id/);
    for (const value of included) assert.ok(query.params.includes(value), model + " lacks " + value);
    if (model !== "outbound") assert.ok(!query.params.includes("outbound"), model + " includes outbound");
    if (model === "ecommerce") assert.ok(!query.params.includes("ecommerce"), "must not compare raw offer_model to canonical value");
    if (model === "rfq") assert.ok(!query.params.includes("marketplace"));
    assert.ok(!query.params.includes("draft"));
    assert.ok(query.params.includes("published"));
    void excluded;
  }
});

test("home URL chips, sort and grid/list preserve state and sanitize category-only attributes", () => {
  const state = resolveHomeOfferQueryState({
    view: "list", model: "ecommerce", condition: "used", featured: "1", sort: "newest", af_9: "3",
  });
  assert.deepEqual(state.filters, { model: "ecommerce", condition: "used", featured: true });
  assert.equal(state.view, "list");
  const grid = buildCategoryOfferQueryHref("/en", state, { view: "grid" });
  assert.equal(grid, "/en?sort=newest&model=ecommerce&condition=used&featured=1");
  const rfq = buildCategoryOfferQueryHref("/", state, { model: "rfq" });
  assert.equal(rfq, "/?view=list&sort=newest&model=rfq&condition=used&featured=1");
  assert.equal(resolveHomeOfferQueryState({ model: "invalid", condition: "other", view: "x" }).view, "grid");
  assert.deepEqual(resolveHomeOfferQueryState({ model: "invalid", condition: "other" }).filters, {});
});

test("existing seven locale dictionaries provide the shared homepage filtering and badge labels", () => {
  const keys = ["filtersHeading", "filtersSummary", "filtersAll", "filtersModelHeading", "filtersModelRfq",
    "filtersModelEcommerce", "filtersModelOutbound", "filtersFeaturedOnly", "productConditionLabel",
    "productConditionNew", "productConditionUsed", "productConditionRefurbished",
    "sortLabel", "sortDefault", "sortPriceAsc", "sortPriceDesc", "sortNewest", "attributeFiltersApply"];
  for (const locale of ["pl", "en", "de", "fr", "es", "uk", "zh"]) {
    const dict = JSON.parse(readFileSync(join(process.cwd(), "src", "messages", locale + ".json"), "utf8"));
    for (const key of keys) assert.ok(typeof dict.catalog[key] === "string" && dict.catalog[key].length > 0, locale + "." + key);
    for (const key of ["productConditionNew", "productConditionUsed", "productConditionRefurbished"]) {
      assert.ok(typeof dict.offers[key] === "string" && dict.offers[key].length > 0, locale + ".offers." + key);
    }
  }
});
