import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PRODUCT_CONDITIONS, parseProductConditionInput,
} from "../../src/lib/offers/product-condition";
import { parseOfferDraftCreateInput } from "../../src/lib/offers/draft-core";
import { parseAdminOfferEditInput } from "../../src/lib/admin/offer-edit-core";
import {
  parsePartnerOfferEditInput, evaluatePartnerOfferEditCore,
  type CurrentPartnerOfferState,
} from "../../src/lib/partner-offers/edit-core";
import { parseFilterQueryInput } from "../../src/lib/filters/parser";
import { normalizeFilterQuery } from "../../src/lib/filters/validation";
import {
  resolveCategoryOfferFilters, hasActiveCategoryOfferFilters, buildCategoryOfferQueryHref,
} from "../../src/lib/catalog/query";
import { buildCategoryPaginationHref } from "../../src/lib/catalog/pagination";

test("product condition: canonical enum and nullable backward compatibility", () => {
  assert.deepEqual([...PRODUCT_CONDITIONS], ["new", "used", "refurbished"]);
  for (const value of PRODUCT_CONDITIONS) assert.deepEqual(parseProductConditionInput(value), { ok: true, value });
  assert.deepEqual(parseProductConditionInput(""), { ok: true, value: null });
  assert.deepEqual(parseProductConditionInput(null), { ok: true, value: null });
  assert.deepEqual(parseProductConditionInput(undefined), { ok: true, value: undefined });
  for (const invalid of ["unknown", "NEW", 0, false, {}, []]) {
    assert.deepEqual(parseProductConditionInput(invalid), { ok: false });
  }
});

test("draft creation: optional condition, no implicit new default, reject tampered input", () => {
  const base = { partnerId: "1", categoryId: "2", title: "Product", adminOfferType: "marketplace" };
  const legacy = parseOfferDraftCreateInput(base);
  assert.equal(legacy.ok, true);
  if (legacy.ok) assert.equal(legacy.data.productCondition, undefined);
  for (const value of [null, "new", "used", "refurbished"]) {
    const parsed = parseOfferDraftCreateInput({ ...base, productCondition: value });
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.equal(parsed.data.productCondition, value);
  }
  assert.equal(parseOfferDraftCreateInput({ ...base, productCondition: "invalid" }).ok, false);
});

test("Admin editing: optional condition is validated without disturbing pricing/model input", () => {
  const base = { offerId: "1", expectedUpdatedAt: null, title: "Product", priceOnRequest: true,
    adminOfferType: "rfq", isFeatured: false };
  const legacy = parseAdminOfferEditInput(base);
  assert.equal(legacy.ok, true);
  if (legacy.ok) assert.equal(legacy.data.productCondition, undefined);
  const changed = parseAdminOfferEditInput({ ...base, productCondition: "refurbished" });
  assert.equal(changed.ok, true);
  if (changed.ok) assert.equal(changed.data.productCondition, "refurbished");
  assert.equal(parseAdminOfferEditInput({ ...base, productCondition: "outbound" }).ok, false);
});

test("Partner editing: unchanged condition is preserved even when another field changes", () => {
  const base = { partnerId: 1, offerId: 2, expectedUpdatedAt: null, title: "Offer", description: null,
    partnerOfferType: "marketplace", priceBrutto: null, priceOnRequest: false, outboundUrl: null };
  const old = parsePartnerOfferEditInput(base);
  assert.equal(old.ok, true);
  if (old.ok) assert.equal(old.data.productCondition, undefined);
  const parsed = parsePartnerOfferEditInput({ ...base, productCondition: "used" });
  assert.equal(parsed.ok, true);
  if (parsed.ok) assert.equal(parsed.data.productCondition, "used");
  assert.equal(parsePartnerOfferEditInput({ ...base, productCondition: "new-ish" }).ok, false);
  const current: CurrentPartnerOfferState = {
    publicationStatus: "draft", updatedAt: null, offerModel: "marketplace",
    conversionType: "inbound", title: "Old offer", description: null,
    priceBrutto: null, priceOnRequest: false, outboundUrl: null, productCondition: "refurbished",
  };
  if (old.ok) {
    const res = evaluatePartnerOfferEditCore(old.data, current);
    assert.equal(res.ok, true);
    if (res.ok && res.code === "EXECUTE_UPDATE") assert.equal(res.payload.productCondition, undefined);
  }
});

test("condition catalog filters: parse, normalize and preserve across sort, view and page", () => {
  const bad = parseFilterQueryInput({ categoryId: 7, productCondition: "invalid" });
  assert.equal(bad.ok, false);
  const parsed = parseFilterQueryInput({ categoryId: 7, productCondition: "used" });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const norm = normalizeFilterQuery(parsed.value);
  assert.equal(norm.ok, true);
  if (norm.ok) assert.equal(norm.value.productCondition, "used");
  const filters = resolveCategoryOfferFilters({ model: "outbound", featured: "1", condition: "used", af_9: "42" });
  assert.equal(filters.condition, "used");
  assert.equal(hasActiveCategoryOfferFilters(filters), true);
  const state = { view: "list" as const, sort: "newest" as const, filters };
  const href = buildCategoryOfferQueryHref("/katalog/c-test", state, { view: "grid" });
  assert.match(href, /condition=used/);
  assert.match(href, /model=outbound/);
  assert.match(href, /af_9=42/);
  const page = buildCategoryPaginationHref("/katalog/c-test", state, 2);
  assert.match(page, /condition=used/);
  assert.match(page, /page=2/);
  const cleared = buildCategoryOfferQueryHref("/katalog/c-test", state, { condition: null });
  assert.doesNotMatch(cleared, /condition=/);
  assert.equal(resolveCategoryOfferFilters({ condition: "invalid" }).condition, undefined);
});

test("locales: standalone product condition wording exists across all seven languages", () => {
  for (const locale of ["pl", "en", "de", "fr", "uk", "es", "zh"]) {
    const json = JSON.parse(readFileSync(join(process.cwd(), "src", "messages", `${locale}.json`), "utf8"));
    for (const section of ["catalog", "offers", "adminOffers", "adminOfferEdit", "PartnerWorkspace"]) {
      for (const key of ["productConditionLabel", "productConditionUnspecified", "productConditionNew",
        "productConditionUsed", "productConditionRefurbished"]) {
        assert.ok(typeof json[section]?.[key] === "string" && json[section][key].length > 0, `${locale}.${section}.${key}`);
      }
    }
  }
});

test("migration is additive and never rewrites historical product condition", () => {
  const sql = readFileSync(join(process.cwd(), "drizzle-runtime", "0024_product_condition.sql"), "utf8");
  assert.match(sql, /ADD COLUMN product_condition varchar\(20\)/);
  assert.match(sql, /product_condition IS NULL/);
  assert.doesNotMatch(sql, /UPDATE\s+(?:public\.)?offers/i);
  assert.doesNotMatch(sql, /DEFAULT\s+['"]?new/i);
});
