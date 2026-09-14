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
  assert.match(
    source,
    /row\.decisionStatus === "seller_accepted" &&\s*row\.acceptedAt !== null &&\s*row\.resolvedAt !== null &&\s*row\.decidedByAuthUserId !== null &&\s*row\.decisionSource === "partner_portal"/
  );
  assert.match(
    source,
    /row\.status === "seller_accepted" \|\| row\.status === "fulfillment_in_progress" \|\| row\.status === "fulfilled"/
  );
  assert.match(source, /if \(isCanonicalAccepted\) \{/);
});
