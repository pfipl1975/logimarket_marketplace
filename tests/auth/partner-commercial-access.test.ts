import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ForbiddenError } from "../../src/lib/auth/authorization-errors";
import { requirePartnerCommercialAccessCore } from "../../src/lib/auth/partner-commercial-access";

test("tenant membership is checked before readiness", async () => {
  const events: string[] = [];
  await requirePartnerCommercialAccessCore(24,
    async id => { events.push(`membership:${id}`); },
    async id => { events.push(`readiness:${id}`); return { status: "ready" }; });
  assert.deepEqual(events, ["membership:24", "readiness:24"]);
});

test("unready membership is denied; revoked membership never reaches readiness read", async () => {
  let reads = 0;
  await assert.rejects(requirePartnerCommercialAccessCore(24,
    async () => undefined,
    async () => { reads++; return { status: "not_ready" }; }), ForbiddenError);
  assert.equal(reads, 1);
  await assert.rejects(requirePartnerCommercialAccessCore(24,
    async () => { throw new ForbiddenError(); },
    async () => { reads++; return { status: "ready" }; }), ForbiddenError);
  assert.equal(reads, 1);
});

test("readiness database failure cannot grant access", async () => {
  await assert.rejects(requirePartnerCommercialAccessCore(24,
    async () => undefined,
    async () => { throw new Error("readiness unavailable"); }), /readiness unavailable/);
});

test("RFQ and orders are commercially gated; draft offers retain membership-only access", () => {
  const rfq = readFileSync("src/lib/partner-rfq/read-model.ts", "utf8");
  const orders = readFileSync("src/lib/partner-orders/read-model.ts", "utf8");
  const actions = readFileSync("src/app/actions.ts", "utf8");
  const drafts = readFileSync("src/lib/partner-offers/read-model.ts", "utf8");
  assert.equal((rfq.match(/await requirePartnerCommercialAccess\(partnerId\)/g) ?? []).length, 2);
  assert.equal((orders.match(/await requirePartnerCommercialAccess\(partnerId\)/g) ?? []).length, 2);
  const mutation = actions.slice(actions.indexOf("export async function mutatePartnerRfqStatus"), actions.indexOf("export async function getCategoryAttributeConfiguration"));
  assert.match(mutation, /await requirePartnerCommercialAccess\(parsed\.data\.partnerId\)/);
  assert.match(mutation, /authorize\(id, tx\)/);
  assert.match(drafts, /authorize: requirePartnerMembership/);
});
