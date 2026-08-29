import test from "node:test";
import assert from "node:assert";
import {
  MarketplaceEvents,
  isSellerAcceptanceEvent,
  canSilenceBeAcceptance,
  isRejectionEvent,
} from "@/lib/marketplace/event-semantics";

test("EVENT_01_E3_NOT_ACCEPTANCE", () => {
  assert.strictEqual(isSellerAcceptanceEvent(MarketplaceEvents.E3_RECEIPT_ACKNOWLEDGED), false);
});

test("EVENT_02_E6_NOT_ACCEPTANCE", () => {
  assert.strictEqual(isSellerAcceptanceEvent(MarketplaceEvents.E6_ROUTED_TO_SELLER), false);
});

test("EVENT_03_SELLER_SILENCE_NOT_ACCEPTANCE", () => {
  assert.strictEqual(canSilenceBeAcceptance(), false);
});

test("EVENT_04_EXPIRED_NOT_REJECTED", () => {
  assert.strictEqual(isRejectionEvent("expired"), false);
});

test("EVENT_05_E7_REQUIRES_EXPLICIT_ACCEPTANCE", () => {
  assert.strictEqual(isSellerAcceptanceEvent(MarketplaceEvents.E7_SELLER_ACCEPTED), true);
});
