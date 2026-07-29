import assert from "node:assert/strict";
import { resolveAttributeFilterUrlState } from "../src/lib/catalog/attribute-filter-url";
import { buildCategoryOfferQueryHref, resolveCategoryOfferFilters } from "../src/lib/catalog/query";
import { buildFilterPredicates } from "../src/lib/catalog/filter-query-core";
import { PgDialect } from "drizzle-orm/pg-core";

function runTests() {
  const definitions = [
    { attributeId: 1, stableKey: "num", dataType: "number", name: "Num", isFilterable: true, options: [] },
    { attributeId: 2, stableKey: "year", dataType: "year", name: "Year", isFilterable: true, options: [] },
    { attributeId: 3, stableKey: "bool", dataType: "boolean", name: "Bool", isFilterable: true, options: [] },
    { attributeId: 4, stableKey: "en", dataType: "enum", name: "Enum", isFilterable: true, options: [{ optionId: 10, stableKey: "opt1", label: "" }] },
    { attributeId: 5, stableKey: "men", dataType: "multi_enum", name: "MEnum", isFilterable: true, options: [{ optionId: 20, stableKey: "optA", label: "" }, { optionId: 21, stableKey: "optB", label: "" }] },
  ] as any[];

  // Resolver tests
  let res = resolveAttributeFilterUrlState(definitions, {});
  assert.equal(res.isCanonical, true, "empty input canonical");

  res = resolveAttributeFilterUrlState(definitions, { af_num_min: ["10"] });
  assert.equal(res.isCanonical, true, "number min");
  
  res = resolveAttributeFilterUrlState(definitions, { af_num_max: ["20"] });
  assert.equal(res.isCanonical, true, "number max");
  
  res = resolveAttributeFilterUrlState(definitions, { af_num_min: ["10"], af_num_max: ["20"] });
  assert.equal(res.isCanonical, true, "number range");
  
  res = resolveAttributeFilterUrlState(definitions, { af_num_min: ["abc"] });
  assert.equal(res.isCanonical, false, "invalid number");
  
  res = resolveAttributeFilterUrlState(definitions, { af_num_min: ["Infinity"] });
  assert.equal(res.isCanonical, false, "non-finite number");
  
  res = resolveAttributeFilterUrlState(definitions, { af_num_min: ["10", "20"] });
  assert.equal(res.isCanonical, false, "multiple numeric values");
  
  res = resolveAttributeFilterUrlState(definitions, { af_num_min: ["20"], af_num_max: ["10"] });
  assert.equal(res.isCanonical, false, "min > max");
  
  res = resolveAttributeFilterUrlState(definitions, { af_num_min: ["010.0"] });
  assert.equal(res.isCanonical, false, "numeric canonical representation");
  assert.deepEqual(res.params, { af_num_min: ["10"] });
  
  res = resolveAttributeFilterUrlState(definitions, { af_year_min: ["2020"], af_year_max: ["2024"] });
  assert.equal(res.isCanonical, true, "year min/max");
  
  res = resolveAttributeFilterUrlState(definitions, { af_year_min: ["2020.5"] });
  assert.equal(res.isCanonical, false, "fractional year rejected");
  
  res = resolveAttributeFilterUrlState(definitions, { af_year_min: ["2020", "2021"] });
  assert.equal(res.isCanonical, false, "multiple year values");
  
  res = resolveAttributeFilterUrlState(definitions, { af_bool: ["true"] });
  assert.equal(res.isCanonical, true, "boolean true");
  
  res = resolveAttributeFilterUrlState(definitions, { af_bool: ["false"] });
  assert.equal(res.isCanonical, true, "boolean false");
  
  res = resolveAttributeFilterUrlState(definitions, { af_bool: ["yes"] });
  assert.equal(res.isCanonical, false, "invalid boolean");
  
  res = resolveAttributeFilterUrlState(definitions, { af_en: ["opt1"] });
  assert.equal(res.isCanonical, true, "enum valid");
  
  res = resolveAttributeFilterUrlState(definitions, { af_en: ["opt1", "opt1"] });
  assert.equal(res.isCanonical, false, "enum multiple values rejected");
  
  res = resolveAttributeFilterUrlState(definitions, { af_men: ["optA", "optB"] });
  assert.equal(res.isCanonical, true, "multi_enum multiple distinct values accepted");
  
  res = resolveAttributeFilterUrlState(definitions, { af_men: ["optB", "optA"] });
  assert.equal(res.isCanonical, false, "multi_enum deterministic ordering");
  assert.deepEqual(res.params, { af_men: ["optA", "optB"] });
  
  res = resolveAttributeFilterUrlState(definitions, { af_men: ["optA", "optA"] });
  assert.equal(res.isCanonical, false, "multi_enum duplicate values canonicalized");
  
  res = resolveAttributeFilterUrlState(definitions, { af_men: ["optA", "unknown"] });
  assert.equal(res.isCanonical, false, "multi_enum unknown option removed");
  
  res = resolveAttributeFilterUrlState(definitions, { af_num_min: ["10"], af_unknown: ["xyz"] });
  assert.equal(res.isCanonical, false, "unknown af_* removed");
  
  res = resolveAttributeFilterUrlState(definitions, { af_num_min: [""] });
  assert.equal(res.isCanonical, false, "empty af_* removed");

  // URL builders
  let filters = resolveCategoryOfferFilters({ view: "list", model: "ecommerce", featured: "1", af_men: ["optB", "optA"] });
  let href = buildCategoryOfferQueryHref("/katalog", { view: "list", sort: "newest", filters }, { view: "grid" });
  assert.equal(href, "/katalog?sort=newest&model=ecommerce&featured=1&af_men=optA&af_men=optB", "view=grid omitted, others preserved, deterministic");
  
  href = buildCategoryOfferQueryHref("/katalog", { view: "grid", sort: "default", filters: {} }, { view: "list", sort: "price-asc" });
  assert.equal(href, "/katalog?view=list&sort=price-asc", "view=list preserved, non-default sort preserved");
  
  href = buildCategoryOfferQueryHref("/katalog", { view: "grid", sort: "default", filters: {} }, {});
  assert.equal(href, "/katalog", "empty query returns basePath");

  // SQL compilation
  const dialect = new PgDialect();
  const dbMock = { select: () => ({ from: () => ({ where: (c: any) => c }) }) } as any;
  const input = {
    categoryId: 1,
    offerModel: "ecommerce" as const,
    featured: true as const,
    controlled: [
      { attributeId: 4, optionIds: [10] },
      { attributeId: 5, optionIds: [20, 21] }
    ],
    numbers: [{ attributeId: 1, min: 10, max: 20 }],
    years: [{ attributeId: 2, min: 2020, max: 2024 }],
    booleans: [{ attributeId: 3, value: false }],
    sort: "default" as const
  };
  const dataTypes = new Map([
    [1, "number"], [2, "year"], [3, "boolean"], [4, "enum"], [5, "multi_enum"]
  ]);
  const predicates = buildFilterPredicates(dbMock, input, [1, 2], dataTypes);
  
  const sqlStrings = predicates.map(p => dialect.sqlToQuery(p.getSQL()).sql);
  
  assert.ok(sqlStrings.some(s => s.includes('"is_active" = $')), "isActive=true");
  assert.ok(sqlStrings.some(s => s.includes('"publication_status" = $')), "publicationStatus=published");
  assert.ok(sqlStrings.some(s => s.includes('"category_id" in ($')), "category IN descendants scope");
  assert.ok(sqlStrings.some(s => s.includes('"offer_model" = $')), "offerModel");
  assert.ok(sqlStrings.some(s => s.includes('"is_featured" = $')), "featured");
  
  const existsQueries = sqlStrings.filter(s => s.includes('exists ('));
  assert.equal(existsQueries.length, 5, "osobne EXISTS dla różnych atrybutów jako AND");
  
  assert.ok(existsQueries.some(s => s.includes('"attribute_id" = $') && s.includes('"option_id" in ($')), "enum option IN");
  assert.ok(existsQueries.some(s => s.includes('"attribute_id" = $') && s.includes('"option_id" in ($') && s.includes('offer_attribute_option_values')), "multi_enum option IN jako OR");
  assert.ok(existsQueries.some(s => s.includes('"attribute_id" = $') && s.includes('"value_number" >= ') && s.includes('"value_number" <= ')), "number range");
  assert.ok(existsQueries.some(s => s.includes('"attribute_id" = $') && s.includes('"value_year" >= ') && s.includes('"value_year" <= ')), "year min/max");
  assert.ok(existsQueries.some(s => s.includes('"attribute_id" = $') && s.includes('"value_boolean" = $')), "boolean false");

  console.log("LM72_CATALOG_FILTER_TEST=PASS");
}

try {
  runTests();
} catch (error) {
  console.error(error);
  process.exit(1);
}
