import assert from "node:assert/strict";
import { resolveAttributeFilterUrlState } from "../src/lib/catalog/attribute-filter-url";
import type { CategoryAttributeConfiguration } from "../src/lib/catalog/category-attribute-read-model-core";
import { parseFilterQueryInput } from "../src/lib/filters/parser";
import { normalizeFilterQuery } from "../src/lib/filters/validation-core";
import { buildCategoryPaginationHref } from "../src/lib/catalog/pagination";
import { buildCategoryOfferQueryHref } from "../src/lib/catalog/query";
import { buildFilterPredicates } from "../src/lib/catalog/filter-query-core";
import { PgDialect } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../src/lib/schema";

// ─── Fixture helpers ────────────────────────────────────────────────────────

function makeAttr(
  id: number,
  stableKey: string,
  dataType: string,
  options: { optionId: number; stableKey: string }[] = [],
): CategoryAttributeConfiguration {
  return {
    assignmentId: id * 100,
    attributeId: id,
    stableKey,
    dataType,
    name: stableKey,
    shortLabel: null,
    description: null,
    unitCode: null,
    sortOrder: id,
    isFilterable: true,
    isComparable: false,
    isRequired: false,
    isVisible: true,
    options: options.map((o) => ({ ...o, label: o.stableKey, description: null })),
  };
}

const DEF_NUM = makeAttr(1, "num", "number");
const DEF_YEAR = makeAttr(2, "year_attr", "year");
const DEF_BOOL = makeAttr(3, "bool_attr", "boolean");
const DEF_ENUM = makeAttr(4, "en_attr", "enum", [
  { optionId: 401, stableKey: "opt_a" },
  { optionId: 402, stableKey: "opt_b" },
]);
const DEF_MULTI = makeAttr(5, "men_attr", "multi_enum", [
  { optionId: 501, stableKey: "alpha" },
  { optionId: 502, stableKey: "beta" },
  { optionId: 503, stableKey: "gamma" },
]);

const ALL_DEFS = [DEF_NUM, DEF_YEAR, DEF_BOOL, DEF_ENUM, DEF_MULTI];

// ─── Section 1: resolveAttributeFilterUrlState ───────────────────────────────

function runResolverTests() {
  console.log("--- RESOLVER TESTS ---");

  // Empty input
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, undefined);
    assert.equal(r.isCanonical, true, "empty: isCanonical=true");
    assert.deepEqual(r.input.numbers, [], "empty: numbers=[]");
    assert.deepEqual(r.input.years, [], "empty: years=[]");
    assert.deepEqual(r.input.booleans, [], "empty: booleans=[]");
    assert.deepEqual(r.input.controlled, [], "empty: controlled=[]");
    assert.deepEqual(r.params, {}, "empty: params={}");
  }

  // Number - min only
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_num_min: ["10"] });
    assert.equal(r.isCanonical, true, "num min: canonical");
    assert.deepEqual(r.input.numbers, [{ attributeId: 1, min: 10 }]);
    assert.deepEqual(r.params, { af_num_min: ["10"] });
  }

  // Number - max only
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_num_max: ["20"] });
    assert.equal(r.isCanonical, true, "num max: canonical");
    assert.deepEqual(r.input.numbers, [{ attributeId: 1, max: 20 }]);
  }

  // Number - range (canonical: af_num_max comes before af_num_min alphabetically)
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_num_max: ["15"], af_num_min: ["5"] });
    assert.equal(r.isCanonical, true, "num range: canonical (max key first)");
    assert.deepEqual(r.input.numbers, [{ attributeId: 1, min: 5, max: 15 }]);
  }

  // Number - range reversed (min key first) → not canonical
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_num_min: ["5"], af_num_max: ["15"] });
    assert.equal(r.isCanonical, false, "num range reversed keys: not canonical");
    // filter still built correctly
    assert.deepEqual(r.input.numbers, [{ attributeId: 1, min: 5, max: 15 }]);
  }

  // Number - invalid value (non-numeric)
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_num_min: ["abc"] });
    assert.equal(r.isCanonical, false, "num invalid: not canonical");
    assert.deepEqual(r.input.numbers, [], "num invalid: no filter");
  }

  // Number - Infinity → rejected
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_num_min: ["Infinity"] });
    assert.equal(r.isCanonical, false, "num Infinity: not canonical");
    assert.deepEqual(r.input.numbers, []);
  }

  // Number - multiple bounds (duplicate key) → not canonical, no filter
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_num_min: ["1", "2"] });
    assert.equal(r.isCanonical, false, "num duplicate bound: not canonical");
    assert.deepEqual(r.input.numbers, []);
  }

  // Number - min > max → not canonical, no filter
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_num_min: ["20"], af_num_max: ["10"] });
    assert.equal(r.isCanonical, false, "num min>max: not canonical");
    assert.deepEqual(r.input.numbers, []);
  }

  // Number - canonical normalization: 001.0 → 1
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_num_min: ["001.0"] });
    assert.equal(r.isCanonical, false, "num 001.0: not canonical (raw differs from normalized)");
    assert.deepEqual(r.input.numbers, [{ attributeId: 1, min: 1 }], "num 001.0: parsed as 1");
    assert.deepEqual(r.params, { af_num_min: ["1"] }, "num 001.0: canonical param is 1");
  }

  // Number - value above MAX_ABSOLUTE_NUMBER → rejected
  {
    // MAX_ABSOLUTE_NUMBER = 1_000_000_000, so 1_000_000_001 should fail for number
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_num_min: ["1000000001"] });
    assert.equal(r.isCanonical, false, "num above max: not canonical");
    assert.deepEqual(r.input.numbers, [], "num above max: no filter");
  }

  // Year - integer
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_year_attr_min: ["2020"] });
    assert.equal(r.isCanonical, true, "year int: canonical");
    assert.deepEqual(r.input.years, [{ attributeId: 2, min: 2020 }]);
  }

  // Year - range (canonical: af_year_attr_max < af_year_attr_min alphabetically)
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_year_attr_max: ["2024"], af_year_attr_min: ["2020"] });
    assert.equal(r.isCanonical, true, "year range: canonical (max key first)");
    assert.deepEqual(r.input.years, [{ attributeId: 2, min: 2020, max: 2024 }]);
  }

  // Year - fractional → rejected
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_year_attr_min: ["2020.5"] });
    assert.equal(r.isCanonical, false, "year fractional: not canonical");
    assert.deepEqual(r.input.years, [], "year fractional: no filter");
  }

  // Year - duplicate bound → not canonical
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_year_attr_min: ["2020", "2021"] });
    assert.equal(r.isCanonical, false, "year duplicate bound: not canonical");
    assert.deepEqual(r.input.years, []);
  }

  // Year - min > max → rejected
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_year_attr_min: ["2024"], af_year_attr_max: ["2020"] });
    assert.equal(r.isCanonical, false, "year min>max: not canonical");
    assert.deepEqual(r.input.years, []);
  }

  // Year - large safe integer 1_000_000_001 → ACCEPTED (no max bound for year unlike number)
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_year_attr_min: ["1000000001"] });
    assert.equal(r.isCanonical, true, "year safe big int: canonical");
    assert.deepEqual(r.input.years, [{ attributeId: 2, min: 1000000001 }]);
  }

  // Year - canonical string representation preserved (no normalization of "2020" → stays "2020")
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_year_attr_min: ["2020"] });
    assert.deepEqual(r.params, { af_year_attr_min: ["2020"] }, "year: param repr preserved");
  }

  // Boolean - true
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_bool_attr: ["true"] });
    assert.equal(r.isCanonical, true, "bool true: canonical");
    assert.deepEqual(r.input.booleans, [{ attributeId: 3, value: true }]);
  }

  // Boolean - false (still an active filter)
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_bool_attr: ["false"] });
    assert.equal(r.isCanonical, true, "bool false: canonical");
    assert.deepEqual(r.input.booleans, [{ attributeId: 3, value: false }], "bool false: active filter");
    assert.deepEqual(r.params, { af_bool_attr: ["false"] });
  }

  // Boolean - invalid literal
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_bool_attr: ["maybe"] });
    assert.equal(r.isCanonical, false, "bool invalid: not canonical");
    assert.deepEqual(r.input.booleans, []);
  }

  // Boolean - repeated value (array len > 1) → not canonical
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_bool_attr: ["true", "false"] });
    assert.equal(r.isCanonical, false, "bool repeated: not canonical");
    assert.deepEqual(r.input.booleans, []);
  }

  // Enum - one valid value
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_en_attr: ["opt_a"] });
    assert.equal(r.isCanonical, true, "enum valid: canonical");
    assert.deepEqual(r.input.controlled, [{ attributeId: 4, optionIds: [401] }]);
    assert.deepEqual(r.params, { af_en_attr: ["opt_a"] });
  }

  // Enum - unknown option → not canonical, no filter
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_en_attr: ["unknown_option"] });
    assert.equal(r.isCanonical, false, "enum unknown: not canonical");
    assert.deepEqual(r.input.controlled, []);
  }

  // Enum - empty value → not canonical, no filter
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_en_attr: [""] });
    assert.equal(r.isCanonical, false, "enum empty: not canonical");
    assert.deepEqual(r.input.controlled, []);
  }

  // Enum - multiple values (array len > 1) → rejected
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_en_attr: ["opt_a", "opt_b"] });
    assert.equal(r.isCanonical, false, "enum multi values: not canonical");
    assert.deepEqual(r.input.controlled, []);
  }

  // Multi-enum - multiple different values accepted
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_men_attr: ["alpha", "beta"] });
    assert.equal(r.isCanonical, true, "multi_enum multi: canonical (sorted)");
    assert.deepEqual(r.input.controlled, [{ attributeId: 5, optionIds: [501, 502] }]);
    assert.deepEqual(r.params, { af_men_attr: ["alpha", "beta"] });
  }

  // Multi-enum - both options preserved semantically
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_men_attr: ["alpha", "gamma"] });
    assert.equal(r.isCanonical, true, "multi_enum both: canonical");
    assert.deepEqual(r.input.controlled, [{ attributeId: 5, optionIds: [501, 503] }]);
  }

  // Multi-enum - values in canonical order → isCanonical=true
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_men_attr: ["alpha", "beta", "gamma"] });
    assert.equal(r.isCanonical, true, "multi_enum sorted: canonical=true");
  }

  // Multi-enum - values in reverse order → isCanonical=false
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_men_attr: ["gamma", "beta", "alpha"] });
    assert.equal(r.isCanonical, false, "multi_enum reverse: canonical=false");
    // But params and filter are still populated with canonical order
    assert.deepEqual(r.params, { af_men_attr: ["alpha", "beta", "gamma"] });
    assert.deepEqual(r.input.controlled, [{ attributeId: 5, optionIds: [501, 502, 503] }]);
  }

  // Multi-enum - duplicate values → isCanonical=false, deduplicated in params
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_men_attr: ["alpha", "alpha", "beta"] });
    assert.equal(r.isCanonical, false, "multi_enum dupes: canonical=false");
    assert.deepEqual(r.params, { af_men_attr: ["alpha", "beta"] });
    assert.deepEqual(r.input.controlled, [{ attributeId: 5, optionIds: [501, 502] }]);
  }

  // Multi-enum - unknown option → isCanonical=false, unknown removed from params
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_men_attr: ["alpha", "unknown_xyz"] });
    assert.equal(r.isCanonical, false, "multi_enum unknown: canonical=false");
    assert.deepEqual(r.params, { af_men_attr: ["alpha"] });
    assert.deepEqual(r.input.controlled, [{ attributeId: 5, optionIds: [501] }]);
  }

  // Multi-enum - empty option
  {
    const r = resolveAttributeFilterUrlState(ALL_DEFS, { af_men_attr: [""] });
    assert.equal(r.isCanonical, false, "multi_enum empty option: canonical=false");
    assert.deepEqual(r.input.controlled, []);
  }

  console.log("RESOLVER_TESTS=PASS");
}

// ─── Section 2: Key ordering tests ──────────────────────────────────────────

function runKeyOrderTests() {
  console.log("--- KEY ORDER TESTS ---");

  // canonical order: af_bool_attr before af_num_min (alphabetical)
  {
    const rawCanonical = { af_bool_attr: ["true"], af_num_min: ["10"] };
    const r = resolveAttributeFilterUrlState(ALL_DEFS, rawCanonical);
    assert.equal(r.isCanonical, true, "key order canonical: isCanonical=true");
    assert.deepEqual(r.input.booleans, [{ attributeId: 3, value: true }]);
    assert.deepEqual(r.input.numbers, [{ attributeId: 1, min: 10 }]);
  }

  // reverse order → isCanonical=false but filters still populated
  {
    const rawReversed = { af_num_min: ["10"], af_bool_attr: ["true"] };
    const r = resolveAttributeFilterUrlState(ALL_DEFS, rawReversed);
    assert.equal(r.isCanonical, false, "key order reversed: isCanonical=false");
    // params contains both valid filters
    assert.deepEqual(r.params["af_bool_attr"], ["true"], "reversed: bool in params");
    assert.deepEqual(r.params["af_num_min"], ["10"], "reversed: num in params");
    assert.deepEqual(r.input.booleans, [{ attributeId: 3, value: true }]);
    assert.deepEqual(r.input.numbers, [{ attributeId: 1, min: 10 }]);
  }

  // Three different af_* keys - canonical order: af_bool_attr < af_men_attr < af_num_min
  {
    const rawThreeCanonical = {
      af_bool_attr: ["false"],
      af_men_attr: ["alpha"],
      af_num_min: ["5"],
    };
    const r = resolveAttributeFilterUrlState(ALL_DEFS, rawThreeCanonical);
    assert.equal(r.isCanonical, true, "three keys canonical: isCanonical=true");

    // Reversed three keys
    const rawThreeReversed = {
      af_num_min: ["5"],
      af_men_attr: ["alpha"],
      af_bool_attr: ["false"],
    };
    const r2 = resolveAttributeFilterUrlState(ALL_DEFS, rawThreeReversed);
    assert.equal(r2.isCanonical, false, "three keys reversed: isCanonical=false");
    // All filters still present
    assert.deepEqual(r2.input.booleans, [{ attributeId: 3, value: false }]);
    assert.deepEqual(r2.input.controlled, [{ attributeId: 5, optionIds: [501] }]);
    assert.deepEqual(r2.input.numbers, [{ attributeId: 1, min: 5 }]);
  }

  console.log("ATTRIBUTE_KEY_ORDER_TESTS=PASS");
}

// ─── Section 3: Parser and normalization tests ───────────────────────────────

function runParserTests() {
  console.log("--- PARSER TESTS ---");

  // INVALID_INPUT: non-object
  {
    const r = parseFilterQueryInput(null);
    assert.equal(r.ok, false);
    assert.deepEqual((r as any).errors, ["INVALID_INPUT"]);
  }

  // INVALID_INPUT: number instead of object
  {
    const r = parseFilterQueryInput(42);
    assert.equal(r.ok, false);
    assert.deepEqual((r as any).errors, ["INVALID_INPUT"]);
  }

  // INVALID_IDENTIFIER: categoryId string
  {
    const r = parseFilterQueryInput({ categoryId: "abc" });
    assert.equal(r.ok, false);
    assert.deepEqual((r as any).errors, ["INVALID_IDENTIFIER"]);
  }

  // INVALID_IDENTIFIER: categoryId 0
  {
    const r = parseFilterQueryInput({ categoryId: 0 });
    assert.equal(r.ok, false);
    assert.deepEqual((r as any).errors, ["INVALID_IDENTIFIER"]);
  }

  // INVALID_PAGINATION: page without pageSize
  {
    const r = parseFilterQueryInput({ categoryId: 10, page: 2 });
    assert.equal(r.ok, false);
    assert.deepEqual((r as any).errors, ["INVALID_PAGINATION"]);
  }

  // INVALID_PAGINATION: string page
  {
    const r = parseFilterQueryInput({ categoryId: 10, page: "abc", pageSize: 10 });
    assert.equal(r.ok, false);
    assert.deepEqual((r as any).errors, ["INVALID_PAGINATION"]);
  }

  // INVALID_SORT
  {
    const r = parseFilterQueryInput({ categoryId: 10, sort: "invalid" });
    assert.equal(r.ok, false);
    assert.deepEqual((r as any).errors, ["INVALID_SORT"]);
  }

  // Valid: controlled
  {
    const r = parseFilterQueryInput({ categoryId: 10, controlled: [{ attributeId: 1, optionIds: [100] }] });
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.value.controlled, [{ attributeId: 1, optionIds: [100] }]);
  }

  // Valid: numbers
  {
    const r = parseFilterQueryInput({ categoryId: 10, numbers: [{ attributeId: 2, min: 10, max: 20 }] });
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.value.numbers, [{ attributeId: 2, min: 10, max: 20 }]);
  }

  // Valid: years
  {
    const r = parseFilterQueryInput({ categoryId: 10, years: [{ attributeId: 3, min: 2020, max: 2024 }] });
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.value.years, [{ attributeId: 3, min: 2020, max: 2024 }]);
  }

  // Valid: booleans with true and false
  {
    const r = parseFilterQueryInput({ categoryId: 10, booleans: [{ attributeId: 4, value: true }, { attributeId: 5, value: false }] });
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.value.booleans, [{ attributeId: 4, value: true }, { attributeId: 5, value: false }]);
  }

  console.log("PARSER_TESTS=PASS");
}

function runNormalizationTests() {
  console.log("--- NORMALIZATION TESTS ---");

  // DUPLICATE_ATTRIBUTE_FILTER: same attributeId in controlled twice
  {
    const r = normalizeFilterQuery({
      categoryId: 10, sort: "default",
      controlled: [{ attributeId: 1, optionIds: [100] }, { attributeId: 1, optionIds: [101] }],
      numbers: [], years: [], booleans: [],
    });
    assert.equal(r.ok, false);
    assert.deepEqual((r as any).errors, [{ code: "DUPLICATE_ATTRIBUTE_FILTER", attributeId: 1 }]);
  }

  // DUPLICATE_ATTRIBUTE_FILTER: number duplicated
  {
    const r = normalizeFilterQuery({
      categoryId: 10, sort: "default",
      numbers: [{ attributeId: 1, min: 10 }, { attributeId: 1, max: 20 }],
      controlled: [], years: [], booleans: [],
    });
    assert.equal(r.ok, false);
    assert.deepEqual((r as any).errors, [{ code: "DUPLICATE_ATTRIBUTE_FILTER", attributeId: 1 }]);
  }

  // DUPLICATE_ATTRIBUTE_FILTER: same attributeId in number AND boolean (cross-collection duplicate)
  {
    const r = normalizeFilterQuery({
      categoryId: 10, sort: "default",
      numbers: [{ attributeId: 7, min: 5 }],
      booleans: [{ attributeId: 7, value: true }],
      controlled: [], years: [],
    });
    assert.equal(r.ok, false);
    assert.deepEqual((r as any).errors, [{ code: "DUPLICATE_ATTRIBUTE_FILTER", attributeId: 7 }]);
  }

  // EMPTY_OPTION_ARRAY
  {
    const r = normalizeFilterQuery({
      categoryId: 10, sort: "default",
      controlled: [{ attributeId: 1, optionIds: [] }],
      numbers: [], years: [], booleans: [],
    });
    assert.equal(r.ok, false);
    assert.deepEqual((r as any).errors, [{ code: "EMPTY_OPTION_ARRAY", attributeId: 1 }]);
  }

  // NON_FINITE_NUMBER: Infinity
  {
    const r = normalizeFilterQuery({
      categoryId: 10, sort: "default",
      numbers: [{ attributeId: 1, min: Infinity }],
      controlled: [], years: [], booleans: [],
    });
    assert.equal(r.ok, false);
    assert.deepEqual((r as any).errors, [{ code: "NON_FINITE_NUMBER", attributeId: 1 }]);
  }

  // INVALID_NUMERIC_BOUNDS: min > max
  {
    const r = normalizeFilterQuery({
      categoryId: 10, sort: "default",
      numbers: [{ attributeId: 1, min: 20, max: 10 }],
      controlled: [], years: [], booleans: [],
    });
    assert.equal(r.ok, false);
    assert.deepEqual((r as any).errors, [{ code: "INVALID_NUMERIC_BOUNDS", attributeId: 1 }]);
  }

  // INVALID_YEAR_BOUNDS: fractional year
  {
    const r = normalizeFilterQuery({
      categoryId: 10, sort: "default",
      years: [{ attributeId: 1, min: 2020.5 }],
      controlled: [], numbers: [], booleans: [],
    });
    assert.equal(r.ok, false);
    assert.deepEqual((r as any).errors, [{ code: "INVALID_YEAR_BOUNDS", attributeId: 1 }]);
  }

  // INVALID_YEAR_BOUNDS: min > max
  {
    const r = normalizeFilterQuery({
      categoryId: 10, sort: "default",
      years: [{ attributeId: 1, min: 2024, max: 2020 }],
      controlled: [], numbers: [], booleans: [],
    });
    assert.equal(r.ok, false);
    assert.deepEqual((r as any).errors, [{ code: "INVALID_YEAR_BOUNDS", attributeId: 1 }]);
  }

  // Boolean false stays as active filter
  {
    const r = normalizeFilterQuery({
      categoryId: 10, sort: "default",
      booleans: [{ attributeId: 1, value: false }],
      controlled: [], numbers: [], years: [],
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.value.booleans, [{ attributeId: 1, value: false }]);
  }

  // optionIds deduplication and sorting
  {
    const r = normalizeFilterQuery({
      categoryId: 10, sort: "default",
      controlled: [{ attributeId: 1, optionIds: [102, 101, 101] }],
      numbers: [], years: [], booleans: [],
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.value.controlled, [{ attributeId: 1, optionIds: [101, 102] }]);
  }

  console.log("NORMALIZATION_TESTS=PASS");
}

// ─── Section 4: URL and pagination tests ─────────────────────────────────────

function runUrlTests() {
  console.log("--- URL TESTS ---");

  // page=1 → no page param (canonical omit)
  {
    const href = buildCategoryPaginationHref("/kat", { view: "grid", sort: "default", filters: {} }, 1);
    assert.equal(href, "/kat", "pagination page=1: omit");
  }

  // page=2 with filters
  {
    const href = buildCategoryPaginationHref("/kat", {
      view: "list", sort: "price-asc",
      filters: { model: "rfq", featured: true, attributeParams: { af_men: ["b", "a"] } },
    }, 2);
    assert.equal(href, "/kat?view=list&sort=price-asc&model=rfq&featured=1&af_men=a&af_men=b&page=2", "pagination full");
  }

  // buildCategoryOfferQueryHref with model
  {
    const href = buildCategoryOfferQueryHref("/kat", { view: "list", sort: "newest", filters: { model: "rfq" } }, {});
    assert.equal(href, "/kat?view=list&sort=newest&model=rfq", "query href model");
  }

  // buildCategoryOfferQueryHref minimal
  {
    const href = buildCategoryOfferQueryHref("/kat", { view: "grid", sort: "default", filters: {} }, {});
    assert.equal(href, "/kat", "query href minimal");
  }

  console.log("URL_TESTS=PASS");
  console.log("PAGINATION_TESTS=PASS");
}

// ─── Section 5: SQL compilation tests ────────────────────────────────────────

function runSqlTests() {
  console.log("--- SQL COMPILATION TESTS ---");

  const dialect = new PgDialect();
  const dummyClient = new pg.Client({ connectionString: "postgresql://dummy:dummy@localhost/dummy" });
  const db = drizzle(dummyClient, { schema });

  function getSql(predicates: ReturnType<typeof buildFilterPredicates>) {
    if (predicates.length === 0) return { sql: "", params: [] as unknown[] };
    const query = sql.join(predicates, sql` and `);
    return dialect.sqlToQuery(query);
  }

  const base = { categoryId: 10, sort: "default" as const, numbers: [], years: [], booleans: [], controlled: [] };

  // Number min only
  {
    const r = getSql(buildFilterPredicates(db, { ...base, numbers: [{ attributeId: 1, min: 10 }] }, [10], new Map([[1, "number"]])));
    assert.ok(r.sql.includes(">= $"), "num min: >= present");
    assert.ok(r.params.includes(10), "num min: param 10");
  }

  // Number max only
  {
    const r = getSql(buildFilterPredicates(db, { ...base, numbers: [{ attributeId: 1, max: 20 }] }, [10], new Map([[1, "number"]])));
    assert.ok(r.sql.includes("<= $"), "num max: <= present");
    assert.ok(r.params.includes(20), "num max: param 20");
  }

  // Number range
  {
    const r = getSql(buildFilterPredicates(db, { ...base, numbers: [{ attributeId: 1, min: 10, max: 20 }] }, [10], new Map([[1, "number"]])));
    assert.ok(r.sql.includes(">= $"), "num range: >=");
    assert.ok(r.sql.includes("<= $"), "num range: <=");
    assert.ok(r.params.includes(10) && r.params.includes(20), "num range: both params");
  }

  // Year min
  {
    const r = getSql(buildFilterPredicates(db, { ...base, years: [{ attributeId: 1, min: 2020 }] }, [10], new Map([[1, "year"]])));
    assert.ok(r.sql.includes(">= $"), "year min: >=");
    assert.ok(r.params.includes(2020), "year min: param 2020");
  }

  // Year max
  {
    const r = getSql(buildFilterPredicates(db, { ...base, years: [{ attributeId: 1, max: 2024 }] }, [10], new Map([[1, "year"]])));
    assert.ok(r.sql.includes("<= $"), "year max: <=");
    assert.ok(r.params.includes(2024), "year max: param 2024");
  }

  // Year range
  {
    const r = getSql(buildFilterPredicates(db, { ...base, years: [{ attributeId: 1, min: 2020, max: 2024 }] }, [10], new Map([[1, "year"]])));
    assert.ok(r.params.includes(2020) && r.params.includes(2024), "year range: both params");
  }

  // Boolean true
  {
    const r = getSql(buildFilterPredicates(db, { ...base, booleans: [{ attributeId: 1, value: true }] }, [10], new Map([[1, "boolean"]])));
    assert.ok(r.params.includes(true), "bool true: param true");
  }

  // Boolean false
  {
    const r = getSql(buildFilterPredicates(db, { ...base, booleans: [{ attributeId: 1, value: false }] }, [10], new Map([[1, "boolean"]])));
    assert.ok(r.params.includes(false), "bool false: param false");
  }

  // Enum → offer_attribute_values, not offer_attribute_option_values
  {
    const r = getSql(buildFilterPredicates(db, { ...base, controlled: [{ attributeId: 1, optionIds: [100] }] }, [10], new Map([[1, "enum"]])));
    assert.ok(r.sql.includes("offer_attribute_values"), "enum: uses offer_attribute_values");
    assert.ok(!r.sql.includes("offer_attribute_option_values"), "enum: not offer_attribute_option_values");
  }

  // Multi-enum → offer_attribute_option_values
  {
    const r = getSql(buildFilterPredicates(db, { ...base, controlled: [{ attributeId: 1, optionIds: [100, 101] }] }, [10], new Map([[1, "multi_enum"]])));
    assert.ok(r.sql.includes("offer_attribute_option_values"), "multi_enum: uses offer_attribute_option_values");
    assert.ok(!r.sql.includes("offer_attribute_values") || r.sql.includes("offer_attribute_option_values"), "multi_enum: correct table");
    assert.ok(r.sql.includes("in ("), "multi_enum: IN clause");
    assert.ok(r.params.includes(100) && r.params.includes(101), "multi_enum: both optionIds in params");
  }

  // Multiple attributes → 2 EXISTS
  {
    const r = getSql(buildFilterPredicates(db, {
      ...base,
      numbers: [{ attributeId: 1, min: 10 }],
      years: [{ attributeId: 2, min: 2020 }],
    }, [10], new Map([[1, "number"], [2, "year"]])));
    assert.equal(r.sql.split("exists").length - 1, 2, "two attrs: 2 EXISTS clauses");
    assert.ok(r.sql.includes(" and "), "two attrs: AND connector");
  }

  // Base predicates: isActive, publicationStatus, categoryId
  {
    const r = getSql(buildFilterPredicates(db, base, [10], new Map()));
    assert.ok(r.params.includes(true), "base: isActive=true");
    assert.ok(r.params.includes("published"), "base: publicationStatus=published");
    assert.ok(r.params.includes(10), "base: categoryId=10");
  }

  // Multiple categoryIds: [10, 11]
  {
    const r = getSql(buildFilterPredicates(db, base, [10, 11], new Map()));
    assert.ok(r.params.includes(10), "multi-cat: param 10");
    assert.ok(r.params.includes(11), "multi-cat: param 11");
  }

  // offerModel and featured only when present
  {
    const r = getSql(buildFilterPredicates(db, base, [10], new Map()));
    assert.ok(!r.params.includes("rfq"), "no offerModel: no rfq param");
    // is_featured col check: with featured
    const withFeatured = getSql(buildFilterPredicates(db, { ...base, featured: true }, [10], new Map()));
    assert.ok(withFeatured.sql.includes("is_featured"), "featured: is_featured column present");
    // without featured: is_featured not present
    assert.ok(!r.sql.includes("is_featured"), "no featured: is_featured absent");
  }

  // offerModel only when active
  {
    const withModel = getSql(buildFilterPredicates(db, { ...base, offerModel: "rfq" }, [10], new Map()));
    assert.ok(withModel.params.includes("rfq"), "offerModel: rfq present");
    const withoutModel = getSql(buildFilterPredicates(db, base, [10], new Map()));
    assert.ok(!withoutModel.params.includes("rfq"), "no offerModel: rfq absent");
  }

  console.log("SQL_COMPILATION_TESTS=PASS");
}

// ─── Main runner ──────────────────────────────────────────────────────────────

function runTests() {
  runResolverTests();
  runKeyOrderTests();
  runParserTests();
  runNormalizationTests();
  runUrlTests();
  runSqlTests();
}

try {
  runTests();
  console.log("LM72_CATALOG_FILTER_TEST=PASS");
} catch (error) {
  console.error(error);
  process.exit(1);
}
