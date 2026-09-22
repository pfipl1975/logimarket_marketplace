import assert from "node:assert/strict";
import { resolveCategoryOfferSort, buildCategoryOfferQueryHref, hasActiveCategoryOfferFilters, buildClearAllCategoryFiltersHref } from "../src/lib/catalog/query";
import { catalogOfferOrder } from "../src/lib/catalog/catalog-offer-order";
import { parseFilterQueryInput } from "../src/lib/filters/parser";
import { buildCategoryPaginationHref } from "../src/lib/catalog/pagination";
import { PgDialect } from "drizzle-orm/pg-core";
import { normalizeFilterQuery } from "../src/lib/filters/validation-core";

function runTests() {
  console.log("Running LM-CATALOG-SORT-71 PURE tests...");

  // 1. Resolver undefined -> default, isCanonical: true
  const res1 = resolveCategoryOfferSort(undefined);
  assert.equal(res1.sort, "default");
  assert.equal(res1.isCanonical, true);

  // 2. Resolver explicit default -> default, isCanonical: false
  const res2 = resolveCategoryOfferSort("default");
  assert.equal(res2.sort, "default");
  assert.equal(res2.isCanonical, false);

  // 3. Resolver price-asc -> isCanonical: true
  const res3 = resolveCategoryOfferSort("price-asc");
  assert.equal(res3.sort, "price-asc");
  assert.equal(res3.isCanonical, true);

  const res3b = resolveCategoryOfferSort("price-desc");
  assert.equal(res3b.sort, "price-desc");
  assert.equal(res3b.isCanonical, true);

  const res3c = resolveCategoryOfferSort("newest");
  assert.equal(res3c.sort, "newest");
  assert.equal(res3c.isCanonical, true);

  // 4. Resolver unknown -> fallback default, isCanonical: false
  const res4 = resolveCategoryOfferSort("unknown-sort");
  assert.equal(res4.sort, "default");
  assert.equal(res4.isCanonical, false);

  // 5. Array value -> fallback default, isCanonical: false
  const res5 = resolveCategoryOfferSort(["newest", "price-asc"]);
  assert.equal(res5.sort, "default");
  assert.equal(res5.isCanonical, false);

  // 6. URL builder omits default
  const url1 = buildCategoryOfferQueryHref("/katalog/c-test", { view: "grid", sort: "default", filters: {} }, {});
  assert.equal(url1.includes("sort="), false);

  // 7. URL builder preserves sort
  const url2 = buildCategoryOfferQueryHref("/katalog/c-test", { view: "grid", sort: "price-asc", filters: {} }, {});
  assert.equal(url2.includes("sort=price-asc"), true);

  // 7b. URL builder preserves sort when changing view
  const url3 = buildCategoryOfferQueryHref("/katalog/c-test", { view: "grid", sort: "newest", filters: {} }, { view: "list" });
  assert.equal(url3.includes("sort=newest"), true);

  // 7c. URL builder preserves sort when setting model
  const url4 = buildCategoryOfferQueryHref("/katalog/c-test", { view: "grid", sort: "price-desc", filters: {} }, { model: "rfq" });
  assert.equal(url4.includes("sort=price-desc"), true);

  // 8. Parser supports sort
  const parsed1 = parseFilterQueryInput({ categoryId: 1, sort: "newest" });
  assert.equal(parsed1.ok, true);
  if (parsed1.ok) assert.equal(parsed1.value.sort, "newest");

  const parsed2 = parseFilterQueryInput({ categoryId: 1, sort: "invalid" });
  assert.equal(parsed2.ok, false);
  if (!parsed2.ok) assert.deepEqual(parsed2.errors, ["INVALID_SORT"]);

  const parsed3 = parseFilterQueryInput({ categoryId: 1, sort: ["newest"] });
  assert.equal(parsed3.ok, false);
  if (!parsed3.ok) assert.deepEqual(parsed3.errors, ["INVALID_SORT"]);

  const parsed4 = parseFilterQueryInput({ categoryId: 1, sort: 123 });
  assert.equal(parsed4.ok, false);
  if (!parsed4.ok) assert.deepEqual(parsed4.errors, ["INVALID_SORT"]);

  const parsed5 = parseFilterQueryInput({ categoryId: 1, sort: { a: 1 } });
  assert.equal(parsed5.ok, false);
  if (!parsed5.ok) assert.deepEqual(parsed5.errors, ["INVALID_SORT"]);

  const parsed6 = parseFilterQueryInput({ categoryId: 1, sort: null });
  assert.equal(parsed6.ok, false);
  if (!parsed6.ok) assert.deepEqual(parsed6.errors, ["INVALID_SORT"]);

  // 8b. normalizeFilterQuery tests
  const norm1 = normalizeFilterQuery({ categoryId: 1 });
  assert.equal(norm1.ok, true);
  if (norm1.ok) assert.equal(norm1.value.sort, "default");

  const norm2 = normalizeFilterQuery({ categoryId: 1, sort: "price-desc" });
  assert.equal(norm2.ok, true);
  if (norm2.ok) assert.equal(norm2.value.sort, "price-desc");

  // Attribute sorting in buildCategoryOfferQueryHref
  const urlAttr = buildCategoryOfferQueryHref("/katalog", { view: "grid", sort: "newest", filters: {} }, { clearAttributeFilters: false, view: "grid" });
  assert.equal(urlAttr.includes("sort=newest"), true);

  // Deterministic attribute ordering & repeated values
  const urlDet = buildCategoryOfferQueryHref("/katalog", {
    view: "grid", sort: "default", filters: {
      attributeParams: {
        af_z: ["b", "a", "c", "c"],
        af_a: ["x"]
      }
    }
  }, {});
  // sort expected: af_a=x, then af_z=a, af_z=b, af_z=c, af_z=c
  assert.equal(urlDet.includes("af_a=x&af_z=a&af_z=b&af_z=c&af_z=c"), true);

  // Clear filters preserves sort
  const urlClear = buildClearAllCategoryFiltersHref("/katalog", { view: "grid", sort: "price-asc", filters: { featured: true } });
  assert.equal(urlClear.includes("sort=price-asc"), true);

  // Pagination preserves sort
  const urlPag = buildCategoryPaginationHref("/katalog", { view: "grid", sort: "price-desc", filters: {} }, 2);
  assert.equal(urlPag.includes("sort=price-desc"), true);

  // hasFacetedState helper takes sort into account
  assert.equal(hasActiveCategoryOfferFilters({ model: "rfq" }), true);
  assert.equal(hasActiveCategoryOfferFilters({}), false);

  // SQL Compilation
  const dialect = new PgDialect();

  const compile = (sortParam: import("../src/lib/filters/types").CatalogOfferSort) => {
    const order = catalogOfferOrder(sortParam);
    return order.map(c => dialect.sqlToQuery(c as any).sql).join(" | ").replace(/\s+/g, " ").trim();
  };

  const sqlDefault = compile("default");
  assert.equal(sqlDefault.includes(`"offers"."is_featured" desc`), true);
  assert.equal(sqlDefault.includes(`"offers"."created_at" desc`), true);
  assert.equal(sqlDefault.includes(`"offers"."id" desc`), true);

  const sqlNewest = compile("newest");
  assert.equal(sqlNewest.includes(`"offers"."created_at" desc`), true);
  assert.equal(sqlNewest.includes(`"offers"."id" desc`), true);

  const priceTieBreakersAndCase = `CASE WHEN "offers"."price_on_request" = false AND "offers"."price_brutto" IS NOT NULL THEN 0 ELSE 1 END ASC`;

  const sqlPriceAsc = compile("price-asc");
  assert.equal(sqlPriceAsc.includes(priceTieBreakersAndCase), true);
  assert.equal(sqlPriceAsc.includes(`"offers"."price_brutto" asc`), true);
  assert.equal(sqlPriceAsc.includes(`"offers"."created_at" desc`), true);
  assert.equal(sqlPriceAsc.includes(`"offers"."id" desc`), true);

  const sqlPriceDesc = compile("price-desc");
  assert.equal(sqlPriceDesc.includes(priceTieBreakersAndCase), true);
  assert.equal(sqlPriceDesc.includes(`"offers"."price_brutto" desc`), true);
  assert.equal(sqlPriceDesc.includes(`"offers"."created_at" desc`), true);
  assert.equal(sqlPriceDesc.includes(`"offers"."id" desc`), true);

  console.log("SQL_COMPILATION_TESTS=PASS");
  console.log("PRICE_CASE_ASSERTED=YES");
  console.log("PRICE_TIE_BREAKERS_ASSERTED=YES");
  console.log("All tests passed.");
}

try {
  runTests();
} catch (error) {
  console.error(error);
  process.exit(1);
}
