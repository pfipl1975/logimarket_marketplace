import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../../src/lib/partner-orders/read-model.ts", import.meta.url),
  "utf8"
);

test("both Partner read boundaries require server-side membership", () => {
  assert.match(
    source,
    /export async function getPartnerOrdersList[\s\S]*?await requirePartnerMembership\(partnerId\);/
  );
  assert.match(
    source,
    /export async function getPartnerOrderDetail[\s\S]*?await requirePartnerMembership\(partnerId\);/
  );
});

test("list and detail queries remain tenant-scoped", () => {
  assert.match(source, /\.where\(eq\(sellerOrders\.partnerId, partnerId\)\)/);
  assert.match(
    source,
    /\.where\(and\(\s*eq\(sellerOrders\.partnerId, partnerId\),\s*eq\(sellerOrders\.id, sellerOrderId\)\s*\)\)/
  );
});

test("unauthorized and forbidden reads fail closed", () => {
  const unauthorizedMappings = source.match(
    /error\.name === "UnauthorizedError" \|\| error\.name === "ForbiddenError"/g
  );
  assert.equal(unauthorizedMappings?.length, 2);

  const failClosedResults = source.match(
    /return \{ ok: false, code: "UNAUTHORIZED" \};/g
  );
  assert.equal(failClosedResults?.length, 2);
});

test("E7 buyer contact gate remains canonical", () => {
  const core = readFileSync(
    new URL("../../src/lib/partner-orders/read-model-core.ts", import.meta.url), "utf8"
  );
  assert.match(source, /const isCanonicalAccepted = canDisclosePartnerBuyerDetails\(row\);/);
  assert.match(
    core,
    /evidence\.decisionStatus === "seller_accepted" &&\s*evidence\.acceptedAt !== null &&\s*evidence\.resolvedAt !== null &&\s*evidence\.decidedByAuthUserId !== null &&\s*evidence\.decisionSource === "partner_portal"/
  );
  assert.match(
    core,
    /evidence\.status === "seller_accepted" \|\| evidence\.status === "fulfillment_in_progress" \|\| evidence\.status === "fulfilled"/
  );
  assert.match(source, /if \(isCanonicalAccepted\) \{/);
});

test("immutable invoice query proves both Partner ownership and exact row cardinality", () => {
  const invoiceQuery = source.slice(source.indexOf("const invoiceRows"), source.indexOf("return {\n      ok: true", source.indexOf("const invoiceRows")));
  assert.match(invoiceQuery, /from\(marketplaceOrderBuyerInvoiceSnapshots\)/);
  assert.match(invoiceQuery, /eq\(sellerOrders\.id, sellerOrderId\), eq\(sellerOrders\.partnerId, partnerId\)/);
  assert.match(invoiceQuery, /\.limit\(2\)/);
  assert.match(invoiceQuery, /projectPartnerBuyerInvoiceSnapshot\(row, invoiceRows\)/);
  assert.doesNotMatch(invoiceQuery, /buyerOrganizations|buyerUserProfiles|buyerLegalContextSnapshots/);
});
