import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  grantPartnerAccessSchema, revokePartnerAccessSchema, matchesConfirmedAuthAccount,
} from "../../src/lib/admin/partner-access-core";

const authUserId = "22222222-2222-4222-8222-222222222222";
const valid = { partnerId: 25, authUserId, email: "partner@example.test", expectedStatus: "none" as const, authorityConfirmed: true as const };

test("ADMIN membership grant is strict, normalized and requires explicit intended state", () => {
  const result = grantPartnerAccessSchema.safeParse({ ...valid, email: "  PARTNER@EXAMPLE.TEST " });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.email, valid.email);
  assert.equal(grantPartnerAccessSchema.safeParse({ ...valid, expectedStatus: "revoked" }).success, true);
  for (const patch of [
    { partnerId: 0 }, { partnerId: -1 }, { partnerId: 1.5 },
    { authUserId: "wrong" }, { email: "broken" }, { expectedStatus: "active" },
    { canAcceptOrders: true }, { membershipStatus: "active" }, { actorId: authUserId },
    { partnerId: "25" }, { email: "test@example.test", app_metadata: { role: "admin" } },
  ]) {
    assert.equal(grantPartnerAccessSchema.safeParse({ ...valid, ...patch }).success, false, JSON.stringify(patch));
  }
});

test("revocation has independent strict expected-active contract", () => {
  const validRevoke = { partnerId: 25, authUserId, expectedStatus: "active" };
  assert.equal(revokePartnerAccessSchema.safeParse(validRevoke).success, true);
  for (const patch of [
    { expectedStatus: "revoked" }, { expectedStatus: "none" },
    { partnerId: 0 }, { authUserId: "wrong" }, { canAcceptOrders: true },
  ]) {
    assert.equal(revokePartnerAccessSchema.safeParse({ ...validRevoke, ...patch }).success, false, JSON.stringify(patch));
  }
});

test("verified identity requires matching Supabase UUID, exact normalized email and confirmed timestamp", () => {
  const account = {
    id: authUserId, email: "Partner@Example.Test",
    email_confirmed_at: "2026-01-01T00:00:00.000Z",
  };
  assert.equal(matchesConfirmedAuthAccount(account, valid), true);
  for (const candidate of [
    null,
    { ...account, id: "33333333-3333-4333-8333-333333333333" },
    { ...account, email: "other@example.test" },
    { ...account, email: null },
    { ...account, email_confirmed_at: null },
    { ...account, email_confirmed_at: "" },
  ]) {
    assert.equal(matchesConfirmedAuthAccount(candidate, valid), false);
  }
});

test("all seven locales expose complete and nonempty Partner access labels", () => {
  const locales = ["pl", "en", "de", "fr", "uk", "es", "zh"];
  const lists = locales.map(locale => JSON.parse(readFileSync(`src/messages/${locale}.json`, "utf8")).partnerAccess);
  const keys = Object.keys(lists[0]).sort();
  assert.equal(keys.length, 24);
  for (const translations of lists) {
    assert.deepEqual(Object.keys(translations).sort(), keys);
    assert.ok(Object.values(translations).every(x => typeof x === "string" && x.length > 0));
  }
  assert.equal(new Set(lists.map(t => t.grant)).size, 7);
});

test("mutations remain ADMIN gated and grants cannot confer order acceptance", () => {
  const actions = readFileSync("src/app/actions.ts", "utf8");
  const core = readFileSync("src/lib/admin/partner-access-core.ts", "utf8");
  const service = readFileSync("src/lib/admin/partner-access-service.ts", "utf8");
  for (const name of ["grantAdminPartnerAccess", "revokeAdminPartnerAccess", "getAdminPartnerAccess"]) {
    assert.match(actions, new RegExp(`export async function ${name}\\([^]*?await requireAdmin\\(\\)`, "m"));
  }
  assert.match(core, /membershipStatus: "active",\s*canAcceptOrders: false/);
  assert.match(core, /membershipStatus: "revoked",\s*canAcceptOrders: false/);
  assert.match(service, /auth\.admin\.getUserById/);
  assert.match(service, /matchesConfirmedAuthAccount\(data\.user, parsed\.data\)/);
});
