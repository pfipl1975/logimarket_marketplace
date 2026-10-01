import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPartnerOrderDetailProgress, getPartnerOrderDetailStatusLabel } from "../../src/lib/partner-orders/detail-presentation";
import { getPartnerOrderStatusLabel } from "../../src/lib/partner-orders/presentation";
import type { PartnerOrderEffectiveStatus } from "../../src/lib/partner-orders/read-model-core";
import pl from "../../src/messages/pl.json";

const dict = pl.PartnerWorkspace;
const routedAt = new Date("2026-10-01T12:00:00Z");
const resolvedAt = new Date("2026-10-01T13:00:00Z");
const source = readFileSync(new URL("../../src/app/(pl)/partner/[partnerId]/zamowienia/[sellerOrderId]/page.tsx", import.meta.url), "utf8");
const labels: [PartnerOrderEffectiveStatus, string][] = [
  ["pending_decision", dict.statusPending], ["accepted", dict.statusAccepted],
  ["fulfillment_in_progress", dict.statusFulfillmentInProgress], ["fulfilled", dict.statusFulfilled],
  ["rejected", dict.statusRejected], ["expired", dict.statusExpired],
  ["cancelled", dict.statusCancelled], ["invalid_order_state", dict.statusInvalid],
];
for (const [status, label] of labels) {
  test("header badge uses canonical current label: " + status, () => {
    assert.equal(getPartnerOrderDetailStatusLabel(status, dict), label);
  });
}
test("fulfilled label matches list/dashboard and never uses generic completed tab", () => {
  assert.equal(getPartnerOrderDetailStatusLabel("fulfilled", dict), "Zrealizowane");
  assert.equal(getPartnerOrderDetailStatusLabel("fulfilled", dict), getPartnerOrderStatusLabel("fulfilled", dict));
  assert.notEqual(getPartnerOrderDetailStatusLabel("fulfilled", dict), dict.tabCompleted);
  assert.doesNotMatch(source, /tabCompleted|tabInProgress/);
  assert.match(source, /getPartnerOrderDetailStatusLabel\(order\.effectiveStatus, dict\)/);
  const header = source.slice(source.indexOf("<header"), source.indexOf("</header>"));
  assert.match(header, /role="status"/); assert.match(header, /\{statusLabel\}/);
  assert.match(header, /order\.orderTotal\} \{order\.currency/);
});
const successful: [PartnerOrderEffectiveStatus, string[]][] = [
  ["pending_decision", ["routed", "pending"]], ["accepted", ["routed", "accepted"]],
  ["fulfillment_in_progress", ["routed", "accepted", "in_progress"]],
  ["fulfilled", ["routed", "accepted", "in_progress", "fulfilled"]],
];
for (const [status, keys] of successful) {
  test("operational progression: " + status, () => {
    const result = buildPartnerOrderDetailProgress({ effectiveStatus: status, routedAt, resolvedAt });
    assert.deepEqual(result.map(step => step.key), keys);
    assert.equal(result.filter(step => step.current).length, 1);
    assert.equal(result.at(-1)?.current, true);
    assert.equal(result[0].timestamp, routedAt);
    if (status !== "pending_decision") assert.equal(result[1].timestamp, resolvedAt);
    for (const step of result.filter(step => ["pending", "in_progress", "fulfilled"].includes(step.key))) {
      assert.equal(step.timestamp, null);
    }
    if (status === "fulfilled") assert.equal(dict[result.at(-1)!.labelKey], dict.statusFulfilled);
  });
}
for (const status of ["rejected", "expired", "cancelled", "invalid_order_state"] as const) {
  test("terminal state has no successful path: " + status, () => {
    assert.deepEqual(buildPartnerOrderDetailProgress({ effectiveStatus: status, routedAt, resolvedAt }), []);
    assert.equal(getPartnerOrderDetailStatusLabel(status, dict), labels.find(([key]) => key === status)![1]);
  });
}
test("missing timestamps remain absent and no clock/event history is invented", () => {
  const result = buildPartnerOrderDetailProgress({ effectiveStatus: "fulfilled", routedAt: null, resolvedAt: null });
  assert.ok(result.every(step => step.timestamp === null));
  const helper = readFileSync(new URL("../../src/lib/partner-orders/detail-presentation.ts", import.meta.url), "utf8");
  assert.doesNotMatch(helper, /new Date|Date\.now|updatedAt|createdAt/);
});
test("semantic panels, ordered current step and responsive grids stay compact", () => {
  assert.match(source, /<h1/); assert.match(source, /<h2/); assert.match(source, /<h3/);
  assert.match(source, /<ol/); assert.match(source, /aria-current=\{step\.current \? "step" : undefined\}/);
  assert.match(source, /dict\.currentStatus/); assert.match(source, /dict\.progressCompleted/);
  assert.match(source, /grid-cols-1 items-start gap-6 xl:grid-cols-5/);
  assert.match(source, /xl:col-span-3/); assert.match(source, /xl:col-span-2/);
  assert.match(source, /order\.buyerDetailsDisclosed \? "lg:grid-cols-2" : ""/);
  assert.match(source, /focus-visible:ring-2/); assert.match(source, /min-h-11/);
  assert.doesNotMatch(source, /min-h-\[|h-full|style=\{\{|"use client"|dict\.orderStatus/);
});
test("pre/post-E7 disclosure, historical invoice state and contact links retain their gates", () => {
  assert.match(source, /const showContact = order\.buyerContactName \|\| order\.buyerEmail \|\| order\.buyerPhone/);
  assert.match(source, /\{showContact &&/);
  assert.match(source, /!showContact && order\.effectiveStatus === "pending_decision"/);
  const invoice = source.slice(source.indexOf("{order.buyerDetailsDisclosed &&"));
  assert.match(invoice, /order\.invoiceDataAvailable && order\.buyerInvoice/);
  assert.match(invoice, /dict\.invoiceUnavailable/);
  assert.match(invoice, /formatPartnerInvoiceStreetLine\(order\.buyerInvoice\)/);
  assert.doesNotMatch(invoice, /buyerBusinessName|buyerEmail|buyerContactName/);
  assert.match(source, /mailto:\$\{order\.buyerEmail\}/);
  assert.match(source, /tel:\$\{order\.buyerPhone\}/);
});
test("critical actions keep existing authority, decision window and current-state conditions", () => {
  assert.match(source, /await requirePartnerOrderDecisionAuthority\(parsedPartnerId\)/);
  assert.match(source, /order\.effectiveStatus === "pending_decision" && order\.decisionWindowOpen/);
  assert.match(source, /<PartnerOrderDecisionPanel sellerOrderId=\{order\.sellerOrderId\} dict=\{dict\} canMakeDecision=\{canMakeDecision\}/);
  assert.match(source, /order\.effectiveStatus === "accepted" \|\| order\.effectiveStatus === "fulfillment_in_progress"/);
  assert.match(source, /<PartnerOrderFulfillmentPanel/);
  assert.match(source, /formatPartnerOrderRemainingTime\(order\.expiresAt, order\.serverNow, dict\)/);
  assert.match(source, /dict\.decisionExpired/);
});
test("all seven locales reuse their canonical lifecycle labels and translate progression", () => {
  for (const locale of ["pl", "en", "de", "fr", "uk", "es", "zh"]) {
    const { PartnerWorkspace: translated } = JSON.parse(readFileSync(new URL(`../../src/messages/${locale}.json`, import.meta.url), "utf8"));
    for (const key of ["orderProgress", "progressRouted", "progressAccepted", "progressCompleted"]) {
      assert.ok(typeof translated[key] === "string" && translated[key].trim());
    }
    assert.equal(getPartnerOrderDetailStatusLabel("fulfilled", translated), translated.statusFulfilled);
  }
});
