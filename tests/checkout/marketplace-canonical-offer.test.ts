import test from "node:test";
import assert from "node:assert";
import { resolveCanonicalOfferModel } from "@/lib/offers/model";

test("MODEL_01_MARKETPLACE_INBOUND_ALLOWED", () => {
  const model = resolveCanonicalOfferModel("marketplace", "inbound");
  assert.strictEqual(model, "ecommerce");
});

test("MODEL_02_RFQ_INBOUND_NOT_ECOMMERCE", () => {
  const model = resolveCanonicalOfferModel("rfq", "inbound");
  assert.strictEqual(model, "rfq");
});

test("MODEL_03_OUTBOUND_NOT_ECOMMERCE", () => {
  const model = resolveCanonicalOfferModel("marketplace", "outbound");
  assert.strictEqual(model, "outbound");
});

test("MODEL_04_INCONSISTENT_NOT_ECOMMERCE", () => {
  const model = resolveCanonicalOfferModel("unknown", "inbound");
  assert.strictEqual(model, "unknown");
});
