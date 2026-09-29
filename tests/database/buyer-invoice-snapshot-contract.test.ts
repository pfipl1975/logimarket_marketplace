import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  FINAL_POST_0020_PRODUCTION_FINGERPRINT,
  FINAL_POST_0021_PRODUCTION_FINGERPRINT,
  POST_0018_SECURITY_CONTRACT,
} from "../../scripts/database/runtime-migration-contract";
import { classifyRuntimeTarget, type TableFingerprintSide } from "../../scripts/database/verify-runtime-schema-fingerprint";

const migration = fs.readFileSync("drizzle-runtime/0021_buyer_invoice_snapshot.sql", "utf8");
const checkout = fs.readFileSync("src/lib/checkout/marketplace-checkout-core.ts", "utf8");
const partner = fs.readFileSync("src/lib/partner-orders/read-model.ts", "utf8");
const buyer = fs.readFileSync("src/lib/buyer-orders/invoice-read-model.ts", "utf8");

test("POST_0020 remains migratable and exact POST_0021 rejects partial invoice schema", () => {
  for (const [fingerprint, expected] of [
    [FINAL_POST_0020_PRODUCTION_FINGERPRINT, "EXACT_EXISTING_POST_0020"],
    [FINAL_POST_0021_PRODUCTION_FINGERPRINT, "EXACT_EXISTING_POST_0021"],
  ] as const) {
    const actual = structuredClone(fingerprint) as Record<string, TableFingerprintSide>;
    assert.equal(classifyRuntimeTarget(actual, Object.keys(actual), POST_0018_SECURITY_CONTRACT).state, expected);
  }
  const drifted = structuredClone(FINAL_POST_0021_PRODUCTION_FINGERPRINT) as Record<string, TableFingerprintSide>;
  drifted.marketplace_order_buyer_invoice_snapshots.columns.pop();
  assert.equal(classifyRuntimeTarget(drifted, Object.keys(drifted), POST_0018_SECURITY_CONTRACT).state, "PARTIAL_OR_DRIFTED");
});

test("invoice migration is one-to-one, address-complete, private and does not backfill historical orders", () => {
  for (const column of ["legal_name", "tax_identifier_type", "tax_identifier_value", "street", "building_number", "unit_number", "postal_code", "city", "country_code", "created_at"]) {
    assert.match(migration, new RegExp(`"${column}"`));
  }
  assert.match(migration, /UNIQUE \("marketplace_order_id"\)/);
  assert.match(migration, /ON DELETE restrict/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.doesNotMatch(migration, /\bUPDATE\s+public\.marketplace_orders\b|\bINSERT\s+INTO\s+public\.marketplace_order_buyer_invoice_snapshots\b/i);
  const journal = JSON.parse(fs.readFileSync("drizzle-runtime/meta/_journal.json", "utf8"));
  assert.equal(journal.entries.length, 22);
  assert.equal(journal.entries[21].tag, "0021_buyer_invoice_snapshot");
});

test("canonical checkout writes exactly one invoice snapshot in its existing transaction", () => {
  assert.match(checkout, /db\.transaction\(async \(tx\)/);
  assert.equal((checkout.match(/tx\.insert\(marketplaceOrderBuyerInvoiceSnapshots\)/g) ?? []).length, 1);
  assert.match(checkout, /tx\.insert\(marketplaceOrderBuyerInvoiceSnapshots\)[\s\S]*tx\.insert\(marketplaceOrderBuyerContactSnapshots\)/);
  assert.doesNotMatch(fs.readFileSync("src/app/actions.ts", "utf8").slice(0, 25000), /executeMarketplaceCheckout\(/);
});

test("partner invoice projection remains tenant scoped and accepted-only; Buyer projection remains owner scoped", () => {
  assert.match(partner, /if \(isCanonicalAccepted\) \{[\s\S]*marketplaceOrderBuyerInvoiceSnapshots/);
  assert.match(partner, /eq\(sellerOrders\.partnerId, partnerId\)/);
  assert.match(partner, /invoiceDataAvailable: buyerInvoice !== null/);
  assert.match(buyer, /eq\(marketplaceOrders\.buyerAuthUserId, auth\.user\.id\)/);
});
