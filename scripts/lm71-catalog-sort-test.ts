import { resolveCategoryOfferSort, buildCategoryOfferQueryHref } from "../src/lib/catalog/query";
import { catalogOfferOrder } from "../src/lib/catalog/catalog-offer-order";
import { parseFilterQueryInput } from "../src/lib/filters/parser";

async function runTests() {
  console.log("Running LM-CATALOG-SORT-71 PURE tests...");

  // 1. Resolver undefined -> default, isCanonical: true
  const res1 = resolveCategoryOfferSort(undefined);
  if (res1.sort !== "default" || !res1.isCanonical) throw new Error("Test 1 failed");

  // 2. Resolver explicit default -> default, isCanonical: false
  const res2 = resolveCategoryOfferSort("default");
  if (res2.sort !== "default" || res2.isCanonical) throw new Error("Test 2 failed");

  // 3. Resolver price-asc -> isCanonical: true
  const res3 = resolveCategoryOfferSort("price-asc");
  if (res3.sort !== "price-asc" || !res3.isCanonical) throw new Error("Test 3 failed");

  // 4. Resolver unknown -> fallback default, isCanonical: false
  const res4 = resolveCategoryOfferSort("unknown-sort");
  if (res4.sort !== "default" || res4.isCanonical) throw new Error("Test 4 failed");

  // 5. Array value -> fallback default, isCanonical: false
  const res5 = resolveCategoryOfferSort(["newest", "price-asc"]);
  if (res5.sort !== "default" || res5.isCanonical) throw new Error("Test 5 failed");

  // 6. URL builder omits default
  const url1 = buildCategoryOfferQueryHref("/katalog/c-test", { view: "grid", sort: "default", filters: {} }, {});
  if (url1.includes("sort=")) throw new Error(`Test 6 failed: URL includes sort=default, got: ${url1}`);

  // 7. URL builder preserves sort
  const url2 = buildCategoryOfferQueryHref("/katalog/c-test", { view: "grid", sort: "price-asc", filters: {} }, {});
  if (!url2.includes("sort=price-asc")) throw new Error("Test 7 failed: URL missing sort=price-asc");

  // 8. Parser supports sort
  const parsed1 = parseFilterQueryInput({ categoryId: 1, sort: "newest" });
  if (!parsed1.ok || (parsed1 as any).value.sort !== "newest") throw new Error("Test 8 failed");

  const parsed2 = parseFilterQueryInput({ categoryId: 1, sort: "invalid" });
  if (parsed2.ok || !(parsed2 as any).errors.includes("INVALID_SORT")) throw new Error("Test 9 failed");

  // 9. Drizzle clauses generated
  const orderDefault = catalogOfferOrder("default");
  if (orderDefault.length !== 3) throw new Error("Test 10 failed");
  const orderNewest = catalogOfferOrder("newest");
  if (orderNewest.length !== 2) throw new Error("Test 11 failed");

  const orderPriceAsc = catalogOfferOrder("price-asc");
  if (orderPriceAsc.length !== 4) throw new Error("Test 12 failed");

  console.log("All tests passed.");
}

runTests().catch(console.error);
