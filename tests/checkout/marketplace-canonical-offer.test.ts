import test from "node:test";
import assert from "node:assert";
import { evaluateMarketplaceLineEligibility } from "@/lib/marketplace/marketplace-line-eligibility";
import type { AuthoritativeMarketplaceLine } from "@/lib/marketplace/order-orchestration-types";

// ─── Fixture ─────────────────────────────────────────────────────────────────

function baseLine(overrides?: Partial<AuthoritativeMarketplaceLine>): AuthoritativeMarketplaceLine {
  return {
    offerId: 1,
    partnerId: 10,
    title: "Widget",
    quantity: 2,
    offerModel: "marketplace",
    conversionType: "inbound",
    publicationStatus: "published",
    isActive: true,
    priceOnRequest: false,
    unitPriceMinor: 10000n,
    contractModel: "partner_marketplace",
    currency: "PLN",   // fixture-only — currency source is Owner-decided, not hardcoded globally
    ...overrides,
  };
}

// ─── MODEL tests — exercise the domain evaluator (which calls resolveCanonicalOfferModel) ──

test("MODEL_01_MARKETPLACE_INBOUND_ALLOWED", () => {
  const res = evaluateMarketplaceLineEligibility(baseLine({ offerModel: "marketplace", conversionType: "inbound" }));
  assert.strictEqual(res.ok, true);
});

test("MODEL_02_RFQ_INBOUND_NOT_ECOMMERCE", () => {
  const res = evaluateMarketplaceLineEligibility(baseLine({ offerModel: "rfq", conversionType: "inbound" }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "OFFER_NOT_ECOMMERCE");
});

test("MODEL_03_OUTBOUND_NOT_ECOMMERCE", () => {
  const res = evaluateMarketplaceLineEligibility(baseLine({ offerModel: "marketplace", conversionType: "outbound" }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "OFFER_NOT_ECOMMERCE");
});

test("MODEL_04_INCONSISTENT_NOT_ECOMMERCE", () => {
  const res = evaluateMarketplaceLineEligibility(baseLine({ offerModel: "unknown_model", conversionType: "inbound" }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "OFFER_NOT_ECOMMERCE");
});

test("MODEL_INACTIVE_OFFER_REJECTED", () => {
  const res = evaluateMarketplaceLineEligibility(baseLine({ isActive: false }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "OFFER_INACTIVE");
});

test("MODEL_UNPUBLISHED_OFFER_REJECTED", () => {
  const res = evaluateMarketplaceLineEligibility(baseLine({ publicationStatus: "draft" }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "OFFER_NOT_CONVERSION_ALLOWED");
});

test("MODEL_PRICE_ON_REQUEST_REJECTED", () => {
  const res = evaluateMarketplaceLineEligibility(baseLine({ priceOnRequest: true }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "PRICE_ON_REQUEST");
});

test("MODEL_INVALID_QUANTITY_REJECTED", () => {
  const res = evaluateMarketplaceLineEligibility(baseLine({ quantity: 0 }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "INVALID_QUANTITY");
});

test("MODEL_INVALID_PARTNER_REJECTED", () => {
  const res = evaluateMarketplaceLineEligibility(baseLine({ partnerId: 0 }));
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "INVALID_PARTNER_ID");
});
