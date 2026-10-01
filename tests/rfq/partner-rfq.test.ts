import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PgDialect } from "drizzle-orm/pg-core";
import { PARTNER_RFQ_STATUSES, parsePartnerRfqId, parsePartnerRfqQuery, partnerRfqUrl } from "../../src/lib/partner-rfq/query";
import { partnerRfqPage, projectPartnerRfqCounts, projectPartnerRfqListItem } from "../../src/lib/partner-rfq/read-model-core";
import { mutatePartnerRfqStatusCore, PartnerRfqMutationSchema } from "../../src/lib/partner-rfq/mutation-core";
import { isRfqStatusTransitionAllowed, getAllowedRfqStatusTransitions } from "../../src/lib/rfq/workflow";
import { requirePartnerMembershipForIdentityCore, resolvePartnerMembership } from "../../src/lib/auth/partner-membership";
import { ForbiddenError, UnauthorizedError, AuthInfrastructureError } from "../../src/lib/auth/authorization-errors";
import type { RfqMutationTransaction } from "../../src/lib/rfq/admin-core";

test("Partner RFQ query: default, all filters, invalid input, bounded pagination and URLs", () => {
  for (const status of [...PARTNER_RFQ_STATUSES, "all"]) assert.equal(parsePartnerRfqQuery({ status }).status, status);
  for (const status of [undefined, "accepted", [], null]) assert.deepEqual(parsePartnerRfqQuery({ status }), { status: "new", page: 1 });
  assert.deepEqual(parsePartnerRfqQuery({ status: "closed", page: "3", q: "secret@email.invalid" }), { status: "closed", page: 3 });
  for (const page of ["0", "01", "1e3", "-1", "9007199254740992", []]) assert.equal(parsePartnerRfqQuery({ page }).page, 1);
  assert.equal(partnerRfqUrl("/partner/1/zapytania", "responded", 2), "/partner/1/zapytania?status=responded&page=2");
  assert.deepEqual(partnerRfqPage({ page: 99, status: "all" }, 26), { currentPage: 2, pageCount: 2, offset: 25 });
  assert.deepEqual(partnerRfqPage({ page: 99, status: "all" }, 0), { currentPage: 1, pageCount: 1, offset: 0 });
});

for (const status of PARTNER_RFQ_STATUSES) test(`Partner RFQ ${status} counts only itself and all`, () => {
  const counts = projectPartnerRfqCounts([{ status, count: 1 }]);
  assert.equal(counts[status], 1);
  assert.equal(counts.all, 1);
  for (const other of PARTNER_RFQ_STATUSES.filter(value => value !== status)) assert.equal(counts[other], 0);
});

test("Partner RFQ count invariant and fail-closed unknown/duplicate/malformed statuses", () => {
  const counts = projectPartnerRfqCounts(PARTNER_RFQ_STATUSES.map(status => ({ status, count: 1 })));
  assert.equal(counts.all, 4);
  assert.equal(PARTNER_RFQ_STATUSES.reduce((sum, status) => sum + counts[status], 0), counts.all);
  for (const rows of [[{ status: "corrupt", count: 1 }], [{ status: "new", count: -1 }],
    [{ status: "new", count: 1 }, { status: "new", count: 1 }]]) assert.throws(() => projectPartnerRfqCounts(rows), /INVALID_RFQ_STATE/);
});

test("Partner RFQ list projection excludes contact and preserves nullable data", () => {
  const row = { id: 1, status: "new", createdAt: null, companyName: null, offerTitle: null,
    email: "private@example.invalid", contactName: "Private", phone: "123", message: "private" };
  assert.deepEqual(projectPartnerRfqListItem(row), { id: 1, status: "new", createdAt: null, companyName: null, offerTitle: null });
  assert.throws(() => projectPartnerRfqListItem({ ...row, status: "broken" }), /INVALID_RFQ_STATE/);
});

test("Partner RFQ detail ID parser is canonical and safe", () => {
  assert.equal(parsePartnerRfqId("12"), 12);
  for (const raw of [0, null, undefined, "01", "-1", "1e2", "9007199254740992", " 1 "]) assert.equal(parsePartnerRfqId(raw), null);
});

function mutationFixture(status: string, owner = 10) {
  let authorized = false;
  const updates: unknown[] = [];
  const tx: RfqMutationTransaction = {
    execute: async query => {
      assert.equal(authorized, true, "membership must precede lead read");
      const compiled = new PgDialect().sqlToQuery(query);
      assert.match(compiled.sql, /WHERE id = .* AND partner_id = .*FOR UPDATE/s);
      const [id, partner] = compiled.params;
      return { rows: id === 1 && partner === owner ? [{ id: 1, status }] : [] };
    },
    update: () => ({ set: (values: unknown) => ({ where: async (query: Parameters<PgDialect["sqlToQuery"]>[0]) => {
      const compiled = new PgDialect().sqlToQuery(query);
      assert.deepEqual(compiled.params, [1, owner]);
      updates.push(values);
    } }) }),
  };
  return { tx, updates, authorize: async () => { authorized = true; } };
}

for (const current of PARTNER_RFQ_STATUSES) for (const target of PARTNER_RFQ_STATUSES) {
  test(`Partner RFQ mutation ${current} -> ${target} follows canonical workflow`, async () => {
    const fixture = mutationFixture(current);
    const result = await mutatePartnerRfqStatusCore(fixture.tx, { partnerId: 10, rfqId: 1, expectedStatus: current, targetStatus: target }, fixture.authorize);
    const allowed = isRfqStatusTransitionAllowed(current, target);
    assert.equal(result.code, current === target ? "UNCHANGED" : allowed ? "UPDATED" : "TRANSITION_NOT_ALLOWED");
    assert.equal(fixture.updates.length, current !== target && allowed ? 1 : 0);
    if (fixture.updates.length) assert.deepEqual(fixture.updates[0], { status: target });
    assert.deepEqual(getAllowedRfqStatusTransitions(current), PARTNER_RFQ_STATUSES.filter(value => value !== current && isRfqStatusTransitionAllowed(current, value)));
  });
}

test("Partner RFQ stale status cannot overwrite a newer status", async () => {
  const fixture = mutationFixture("responded");
  const result = await mutatePartnerRfqStatusCore(fixture.tx, { partnerId: 10, rfqId: 1, expectedStatus: "new", targetStatus: "in_progress" }, fixture.authorize);
  assert.equal(result.code, "CONFLICT");
  assert.equal(fixture.updates.length, 0);
});

test("Partner RFQ wrong tenant and missing lead are neutral, unknown status fails closed", async () => {
  for (const partnerId of [10, 20]) {
    const fixture = mutationFixture("new");
    const result = await mutatePartnerRfqStatusCore(fixture.tx, { partnerId, rfqId: partnerId === 10 ? 999 : 1, expectedStatus: "new", targetStatus: "closed" }, fixture.authorize);
    assert.equal(result.code, "NOT_FOUND");
    assert.equal(fixture.updates.length, 0);
  }
  const fixture = mutationFixture("corrupt");
  assert.equal((await mutatePartnerRfqStatusCore(fixture.tx, { partnerId: 10, rfqId: 1, expectedStatus: "new", targetStatus: "closed" }, fixture.authorize)).code, "SYSTEM_ERROR");
});

test("Partner RFQ unauthorized membership stops before RFQ lookup", async () => {
  const fixture = mutationFixture("new");
  await assert.rejects(mutatePartnerRfqStatusCore(fixture.tx, { partnerId: 10, rfqId: 1, expectedStatus: "new", targetStatus: "closed" }, async () => { throw new ForbiddenError(); }), ForbiddenError);
  assert.equal(fixture.updates.length, 0);
});

test("Partner membership needs active status, independently of canAcceptOrders", async () => {
  const identity = { id: "11111111-1111-1111-1111-111111111111", email: null };
  assert.strictEqual(await requirePartnerMembershipForIdentityCore(identity, async () => ({ membershipStatus: "active", canAcceptOrders: false }), 10), identity);
  for (const membership of [undefined, { membershipStatus: "revoked", canAcceptOrders: true }] as const)
    await assert.rejects(requirePartnerMembershipForIdentityCore(identity, async () => membership, 10), ForbiddenError);
  await assert.rejects(requirePartnerMembershipForIdentityCore(identity, async () => { throw new Error(); }, 10), AuthInfrastructureError);
});

test("Partner membership resolver resolves session before tx and uses the supplied locked tx", async () => {
  let transactionOpen = false;
  let sessionCalls = 0;
  let membershipCalls = 0;
  const resolver = await resolvePartnerMembership(async () => {
    assert.equal(transactionOpen, false);
    sessionCalls++;
    return { status: "authenticated", user: { id: "11111111-1111-1111-1111-111111111111", email: null } };
  });
  const tx = { select: () => {
    assert.equal(transactionOpen, true);
    membershipCalls++;
    return { from: () => ({ where: () => ({ limit: () => ({ for: async (lock: string) => {
      assert.equal(lock, "share"); return [{ membershipStatus: "active", canAcceptOrders: false }];
    } }) }) }) };
  } } as unknown as Parameters<typeof resolver>[1];
  transactionOpen = true;
  await resolver(10, tx);
  assert.equal(sessionCalls, 1);
  assert.equal(membershipCalls, 1);
  await assert.rejects(resolvePartnerMembership(async () => ({ status: "unauthenticated", user: null })), UnauthorizedError);
});

test("Partner RFQ input rejects spoofed/invalid IDs and unknown statuses", () => {
  const valid = { partnerId: 10, rfqId: 1, expectedStatus: "new", targetStatus: "closed" };
  assert.equal(PartnerRfqMutationSchema.safeParse(valid).success, true);
  for (const changed of [{ partnerId: "10" }, { partnerId: -1 }, { rfqId: 0 }, { targetStatus: "accepted" }])
    assert.equal(PartnerRfqMutationSchema.safeParse({ ...valid, ...changed }).success, false);
});

test("Partner RFQ read SQL is scoped, deterministic, minimized; auth precedes parsing", () => {
  const source = fs.readFileSync("src/lib/partner-rfq/read-model-core.ts", "utf8");
  const list = source.slice(source.indexOf("export async function getPartnerRfqListCore"), source.indexOf("export async function getPartnerRfqDetailCore"));
  for (const field of ["email", "phone", "message", "contactName"]) assert.equal(list.includes(`schema.rfqLeads.${field}`), false);
  assert.match(list, /DESC NULLS LAST/);
  assert.match(list, /desc\(schema.rfqLeads.id\)/);
  assert.match(list, /limit\(PARTNER_RFQ_PAGE_SIZE\)/);
  assert.match(source, /and\(eq\(schema.rfqLeads.id, rfqId\), eq\(schema.rfqLeads.partnerId, partnerId\)\)/);
  assert.match(source, /eq\(schema.offers.partnerId, partnerId\)/);
  const wrapper = fs.readFileSync("src/lib/partner-rfq/read-model.ts", "utf8");
  for (const kind of ["List", "Detail"]) {
    const fn = wrapper.slice(wrapper.indexOf(`export async function getPartnerRfq${kind}`));
    assert.ok(fn.indexOf("await requirePartnerMembership") < fn.indexOf(kind === "List" ? "const query" : "const rfqId"));
  }
  const actions = fs.readFileSync("src/app/actions.ts", "utf8");
  const action = actions.slice(actions.indexOf("export async function mutatePartnerRfqStatus"), actions.indexOf("export async function getCategoryAttributeConfiguration"));
  assert.ok(action.indexOf("await resolvePartnerMembership()") < action.indexOf("db.transaction"));
  assert.match(action, /authorize\(id, tx\)/);
  assert.doesNotMatch(action, /requireAdmin|requirePartnerOrderDecisionAuthority/);
});

test("Partner RFQ dictionaries and navigation have seven-locale semantic parity", () => {
  const canonical = JSON.parse(fs.readFileSync("src/messages/pl.json", "utf8")).PartnerRfq;
  for (const locale of ["pl", "en", "de", "fr", "uk", "es", "zh"]) {
    const dictionary = JSON.parse(fs.readFileSync(`src/messages/${locale}.json`, "utf8"));
    assert.deepEqual(Object.keys(dictionary.PartnerRfq).sort(), Object.keys(canonical).sort());
    for (const value of Object.values(dictionary.PartnerRfq)) assert.ok(typeof value === "string" && value.trim());
    assert.ok(dictionary.PartnerWorkspace.rfq);
  }
  const nav = fs.readFileSync("src/app/_shared/partner/PartnerWorkspaceNavigation.tsx", "utf8");
  assert.match(nav, /grid-cols-2/);
  assert.match(nav, /md:grid-cols-4/);
  assert.match(nav, /aria-current=\{isRfqActive \? "page" : undefined\}/);
  assert.match(nav, /pathname.startsWith\(`\$\{normalizedRfqHref\}\//);
  const control = fs.readFileSync("src/components/partner/PartnerRfqStatusControl.tsx", "utf8");
  assert.match(control, /getAllowedRfqStatusTransitions\(status\)/);
  assert.match(control, /role="alert"/);
  assert.match(control, /DialogDescription/);
});
