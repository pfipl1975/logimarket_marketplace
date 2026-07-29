import assert from "node:assert/strict";
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

async function runTests() {
  console.log("Running LM72 Parser tests...");
  let parsed = parseFilterQueryInput(null);
  assert.equal(parsed.ok, false);
  assert.ok((parsed as any).errors.includes("INVALID_INPUT"));

  parsed = parseFilterQueryInput({ categoryId: "abc" });
  assert.equal(parsed.ok, false);
  assert.ok((parsed as any).errors.includes("INVALID_IDENTIFIER"));

  parsed = parseFilterQueryInput({ categoryId: 10, page: "abc" });
  assert.equal(parsed.ok, false);
  assert.ok((parsed as any).errors.includes("INVALID_PAGINATION"));

  parsed = parseFilterQueryInput({ categoryId: 10, sort: "invalid" });
  assert.equal(parsed.ok, false);
  assert.ok((parsed as any).errors.includes("INVALID_SORT"));

  parsed = parseFilterQueryInput({ categoryId: 10, controlled: [{ attributeId: 1, optionIds: [100] }] });
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.deepEqual(parsed.value.controlled, [{ attributeId: 1, optionIds: [100] }]);

  parsed = parseFilterQueryInput({ categoryId: 10, numbers: [{ attributeId: 2, min: 10, max: 20 }] });
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.deepEqual(parsed.value.numbers, [{ attributeId: 2, min: 10, max: 20 }]);

  parsed = parseFilterQueryInput({ categoryId: 10, years: [{ attributeId: 3, min: 2020, max: 2024 }] });
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.deepEqual(parsed.value.years, [{ attributeId: 3, min: 2020, max: 2024 }]);

  parsed = parseFilterQueryInput({ categoryId: 10, booleans: [{ attributeId: 4, value: true }, { attributeId: 5, value: false }] });
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.deepEqual(parsed.value.booleans, [{ attributeId: 4, value: true }, { attributeId: 5, value: false }]);

  console.log("Running LM72 Normalization tests...");
  let norm = normalizeFilterQuery({ categoryId: 10, sort: "default", controlled: [{ attributeId: 1, optionIds: [100] }, { attributeId: 1, optionIds: [101] }], numbers: [], years: [], booleans: [] });
  assert.equal(norm.ok, false);
  assert.deepEqual((norm as any).errors, [{ code: "DUPLICATE_ATTRIBUTE_FILTER", attributeId: 1 }]);

  norm = normalizeFilterQuery({ categoryId: 10, sort: "default", numbers: [{ attributeId: 1, min: 10 }, { attributeId: 1, max: 20 }], controlled: [], years: [], booleans: [] });
  assert.equal(norm.ok, false);
  assert.deepEqual((norm as any).errors, [{ code: "DUPLICATE_ATTRIBUTE_FILTER", attributeId: 1 }]);

  norm = normalizeFilterQuery({ categoryId: 10, sort: "default", controlled: [{ attributeId: 1, optionIds: [] }], numbers: [], years: [], booleans: [] });
  assert.equal(norm.ok, false);
  assert.deepEqual((norm as any).errors, [{ code: "EMPTY_OPTION_ARRAY", attributeId: 1 }]);

  norm = normalizeFilterQuery({ categoryId: 10, sort: "default", numbers: [{ attributeId: 1, min: 20, max: 10 }], controlled: [], years: [], booleans: [] });
  assert.equal(norm.ok, false);
  assert.deepEqual((norm as any).errors, [{ code: "INVALID_NUMERIC_BOUNDS", attributeId: 1 }]);

  norm = normalizeFilterQuery({ categoryId: 10, sort: "default", numbers: [{ attributeId: 1, min: Infinity }], controlled: [], years: [], booleans: [] });
  assert.equal(norm.ok, false);
  assert.deepEqual((norm as any).errors, [{ code: "NON_FINITE_NUMBER", attributeId: 1 }]);

  norm = normalizeFilterQuery({ categoryId: 10, sort: "default", years: [{ attributeId: 1, min: 2020.5 }], controlled: [], numbers: [], booleans: [] });
  assert.equal(norm.ok, false);
  assert.deepEqual((norm as any).errors, [{ code: "INVALID_YEAR_BOUNDS", attributeId: 1 }]);

  norm = normalizeFilterQuery({ categoryId: 10, sort: "default", years: [{ attributeId: 1, min: 2024, max: 2020 }], controlled: [], numbers: [], booleans: [] });
  assert.equal(norm.ok, false);
  assert.deepEqual((norm as any).errors, [{ code: "INVALID_YEAR_BOUNDS", attributeId: 1 }]);

  norm = normalizeFilterQuery({ categoryId: 10, sort: "default", booleans: [{ attributeId: 1, value: false }], controlled: [], numbers: [], years: [] });
  assert.equal(norm.ok, true);
  if (norm.ok) assert.deepEqual(norm.value.booleans, [{ attributeId: 1, value: false }]);

  norm = normalizeFilterQuery({ categoryId: 10, sort: "default", controlled: [{ attributeId: 1, optionIds: [102, 101, 101] }], numbers: [], years: [], booleans: [] });
  assert.equal(norm.ok, true);
  if (norm.ok) assert.deepEqual(norm.value.controlled, [{ attributeId: 1, optionIds: [101, 102] }]);

  console.log("Running LM72 URL and pagination tests...");
  let href = buildCategoryPaginationHref("/kat", { view: "grid", sort: "default", filters: {} }, 1);
  assert.equal(href, "/kat");

  href = buildCategoryPaginationHref("/kat", { view: "list", sort: "price-asc", filters: { model: "rfq", featured: true, attributeParams: { af_men: ["b", "a"] } } }, 2);
  assert.equal(href, "/kat?view=list&sort=price-asc&model=rfq&featured=1&af_men=a&af_men=b&page=2");

  href = buildCategoryOfferQueryHref("/kat", { view: "list", sort: "newest", filters: { model: "rfq" } }, {});
  assert.equal(href, "/kat?view=list&sort=newest&model=rfq");

  href = buildCategoryOfferQueryHref("/kat", { view: "grid", sort: "default", filters: {} }, {});
  assert.equal(href, "/kat");

  console.log("Running LM72 SQL Compilation tests...");
  const dialect = new PgDialect();
  const dummyClient = new pg.Client({ connectionString: "postgresql://dummy" });
  const db = drizzle(dummyClient, { schema });

  function getSql(predicates: any[]) {
    if (predicates.length === 0) return { sql: "", params: [] };
    const query = sql.join(predicates, sql` and `);
    return dialect.sqlToQuery(query);
  }

  const baseInput = { categoryId: 10, sort: "default" as const, numbers: [], years: [], booleans: [], controlled: [] };

  // Number min only
  let res = getSql(buildFilterPredicates(db, { ...baseInput, numbers: [{ attributeId: 1, min: 10 }] }, [10], new Map([[1, "number"]])));
  assert.ok(res.sql.includes(">= $"));
  assert.ok(res.params.includes(10));

  // Number max only
  res = getSql(buildFilterPredicates(db, { ...baseInput, numbers: [{ attributeId: 1, max: 20 }] }, [10], new Map([[1, "number"]])));
  assert.ok(res.sql.includes("<= $"));
  assert.ok(res.params.includes(20));

  // Number range
  res = getSql(buildFilterPredicates(db, { ...baseInput, numbers: [{ attributeId: 1, min: 10, max: 20 }] }, [10], new Map([[1, "number"]])));
  assert.ok(res.sql.includes(">= $"));
  assert.ok(res.sql.includes("<= $"));
  assert.ok(res.params.includes(10) && res.params.includes(20));

  // Year min only
  res = getSql(buildFilterPredicates(db, { ...baseInput, years: [{ attributeId: 1, min: 2020 }] }, [10], new Map([[1, "year"]])));
  assert.ok(res.sql.includes(">= $"));
  assert.ok(res.params.includes(2020));

  // Year max only
  res = getSql(buildFilterPredicates(db, { ...baseInput, years: [{ attributeId: 1, max: 2024 }] }, [10], new Map([[1, "year"]])));
  assert.ok(res.sql.includes("<= $"));
  assert.ok(res.params.includes(2024));

  // Year range
  res = getSql(buildFilterPredicates(db, { ...baseInput, years: [{ attributeId: 1, min: 2020, max: 2024 }] }, [10], new Map([[1, "year"]])));
  assert.ok(res.sql.includes(">= $"));
  assert.ok(res.sql.includes("<= $"));
  assert.ok(res.params.includes(2020) && res.params.includes(2024));

  // Boolean true
  res = getSql(buildFilterPredicates(db, { ...baseInput, booleans: [{ attributeId: 1, value: true }] }, [10], new Map([[1, "boolean"]])));
  assert.ok(res.params.includes(true));

  // Boolean false
  res = getSql(buildFilterPredicates(db, { ...baseInput, booleans: [{ attributeId: 1, value: false }] }, [10], new Map([[1, "boolean"]])));
  assert.ok(res.params.includes(false));

  // Enum table offer_attribute_values
  res = getSql(buildFilterPredicates(db, { ...baseInput, controlled: [{ attributeId: 1, optionIds: [100] }] }, [10], new Map([[1, "enum"]])));
  assert.ok(res.sql.includes("offer_attribute_values"));
  assert.ok(!res.sql.includes("offer_attribute_option_values"));

  // Multi_enum table offer_attribute_option_values
  res = getSql(buildFilterPredicates(db, { ...baseInput, controlled: [{ attributeId: 1, optionIds: [100, 101] }] }, [10], new Map([[1, "multi_enum"]])));
  assert.ok(res.sql.includes("offer_attribute_option_values"));
  assert.ok(!res.sql.includes("offer_attribute_values"));

  // multi_enum ma jedno IN z wieloma optionIds
  assert.ok(res.sql.includes("in ("));
  assert.ok(res.params.includes(100) && res.params.includes(101));

  // osobne EXISTS dla różnych atrybutów
  res = getSql(buildFilterPredicates(db, { ...baseInput, numbers: [{ attributeId: 1, min: 10 }], years: [{ attributeId: 2, min: 2020 }] }, [10], new Map([[1, "number"], [2, "year"]])));
  assert.equal(res.sql.split("exists").length - 1, 2); // 2 EXISTS clauses

  // połączenie predicates przez AND
  assert.ok(res.sql.includes(" and "));

  // isActive=true, publicationStatus=published, categoryIds
  assert.ok(res.params.includes(true));
  assert.ok(res.params.includes("published"));
  assert.ok(res.params.includes(10));

  // offerModel i featured tylko wtedy, gdy znajdują się w input
  res = getSql(buildFilterPredicates(db, baseInput, [10], new Map()));
  assert.ok(!res.params.includes("rfq"));
  
  res = getSql(buildFilterPredicates(db, { ...baseInput, offerModel: "rfq", featured: true }, [10], new Map()));
  assert.ok(res.params.includes("rfq"));
}

try {
  runTests();
} catch (error) {
  console.error(error);
  process.exit(1);
}
