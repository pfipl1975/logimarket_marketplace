import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  deriveEffectiveStatus,
  canDisclosePartnerBuyerDetails,
  projectPartnerBuyerInvoiceSnapshot,
  formatPartnerInvoiceStreetLine,
  type PartnerAcceptanceEvidence,
} from "../../src/lib/partner-orders/read-model-core";

const invoiceSnapshot = {
  legalName: "Buyer Snapshot Sp. z o.o.",
  taxIdentifierType: "tax_id",
  taxIdentifierValue: "0000000069",
  street: "Testowa",
  buildingNumber: "12",
  unitNumber: "3",
  postalCode: "00-001",
  city: "Warszawa",
  countryCode: "PL",
} as const;

function canonicalAcceptance(status = "seller_accepted"): PartnerAcceptanceEvidence {
  return {
    status,
    decisionStatus: "seller_accepted",
    acceptedAt: new Date("2026-09-15T12:00:00Z"),
    resolvedAt: new Date("2026-09-15T12:00:00Z"),
    decidedByAuthUserId: "11111111-1111-1111-1111-111111111111",
    decisionSource: "partner_portal",
  };
}

for (const status of ["seller_accepted", "fulfillment_in_progress", "fulfilled"]) {
  test(`${status}: complete E7 discloses the immutable invoice snapshot`, () => {
    const evidence = canonicalAcceptance(status);
    assert.equal(canDisclosePartnerBuyerDetails(evidence), true);
    assert.deepEqual(projectPartnerBuyerInvoiceSnapshot(evidence, [invoiceSnapshot]), invoiceSnapshot);
  });
}

for (const [status, decisionStatus] of [
  ["submitted", "pending_seller_review"],
  ["seller_rejected", "seller_rejected"],
  ["expired", "expired"],
  ["cancelled", "seller_accepted"],
  ["invalid_order_state", "seller_accepted"],
] as const) {
  test(`${status}: invoice is never disclosed`, () => {
    const evidence = { ...canonicalAcceptance(status), decisionStatus };
    assert.equal(canDisclosePartnerBuyerDetails(evidence), false);
    assert.equal(projectPartnerBuyerInvoiceSnapshot(evidence, [invoiceSnapshot]), null);
  });
}

for (const field of ["decisionStatus", "acceptedAt", "resolvedAt", "decidedByAuthUserId", "decisionSource"] as const) {
  test(`accepted status without ${field} cannot disclose invoice data`, () => {
    const evidence = { ...canonicalAcceptance(), [field]: null };
    assert.equal(canDisclosePartnerBuyerDetails(evidence), false);
    assert.equal(projectPartnerBuyerInvoiceSnapshot(evidence, [invoiceSnapshot]), null);
  });
}

test("acceptance from a source other than Partner portal cannot disclose invoice data", () => {
  const evidence = { ...canonicalAcceptance(), decisionSource: "admin" };
  assert.equal(projectPartnerBuyerInvoiceSnapshot(evidence, [invoiceSnapshot]), null);
});

test("historical canonical acceptance without a snapshot remains safely unavailable", () => {
  assert.equal(canDisclosePartnerBuyerDetails(canonicalAcceptance()), true);
  assert.equal(projectPartnerBuyerInvoiceSnapshot(canonicalAcceptance(), []), null);
});

test("nullable invoice unit is valid and the address has no dangling slash", () => {
  const invoice = projectPartnerBuyerInvoiceSnapshot(canonicalAcceptance(), [{ ...invoiceSnapshot, unitNumber: null }]);
  assert.ok(invoice);
  assert.equal(invoice.unitNumber, null);
  assert.equal(formatPartnerInvoiceStreetLine(invoice), "Testowa 12");
  const withUnit = projectPartnerBuyerInvoiceSnapshot(canonicalAcceptance(), [invoiceSnapshot]);
  assert.ok(withUnit);
  assert.equal(formatPartnerInvoiceStreetLine(withUnit), "Testowa 12/3");
});

test("invoice projection copies only public invoice fields and preserves historical values", () => {
  const snapshot = { ...invoiceSnapshot, id: 123, marketplaceOrderId: 456 };
  const invoice = projectPartnerBuyerInvoiceSnapshot(canonicalAcceptance(), [snapshot]);
  assert.deepEqual(invoice, invoiceSnapshot);
  assert.notEqual(invoice, snapshot);
  assert.equal(snapshot.id, 123);
});

test("duplicate or structurally malformed snapshots fail closed", () => {
  const malformedRows: unknown[][] = [
    [invoiceSnapshot, invoiceSnapshot], [null], [{}],
    [{ ...invoiceSnapshot, taxIdentifierType: "vat_id" }],
    [{ ...invoiceSnapshot, countryCode: "DE" }],
    [{ ...invoiceSnapshot, taxIdentifierValue: "not-a-nip" }],
    [{ ...invoiceSnapshot, postalCode: "invalid" }],
    [{ ...invoiceSnapshot, unitNumber: "" }],
    [{ ...invoiceSnapshot, unitNumber: undefined }],
    ...["legalName", "taxIdentifierValue", "street", "buildingNumber", "postalCode", "city"]
      .flatMap(field => [[{ ...invoiceSnapshot, [field]: " " }], [{ ...invoiceSnapshot, [field]: null }]]),
  ];
  for (const rows of malformedRows) {
    assert.throws(() => projectPartnerBuyerInvoiceSnapshot(canonicalAcceptance(), rows), /snapshot is inconsistent/);
  }
});

test("invoice UI and all seven dictionaries preserve bounded disclosure and semantic fields", () => {
  const source = readFileSync(new URL("../../src/app/(pl)/partner/[partnerId]/zamowienia/[sellerOrderId]/page.tsx", import.meta.url), "utf8");
  const invoiceSection = source.slice(source.indexOf("{order.buyerDetailsDisclosed &&"));
  assert.match(invoiceSection, /aria-labelledby="buyer-invoice-title"/);
  assert.match(invoiceSection, /<h2 id="buyer-invoice-title"/);
  assert.match(invoiceSection, /order\.invoiceDataAvailable && order\.buyerInvoice/);
  assert.match(invoiceSection, /dict\.invoiceUnavailable/);
  assert.match(invoiceSection, /<dl/);
  assert.match(invoiceSection, /break-words/);
  assert.doesNotMatch(invoiceSection, /buyerBusinessName|buyerEmail|buyerContactName|taxIdentifierType|snapshotId/);
  for (const locale of ["pl", "en", "de", "fr", "uk", "es", "zh"]) {
    const dict = JSON.parse(readFileSync(new URL(`../../src/messages/${locale}.json`, import.meta.url), "utf8"));
    for (const key of ["invoiceDataTitle", "invoiceLegalName", "invoiceTaxId", "invoiceAddress", "invoiceUnavailable", "invoiceSnapshotNotice"]) {
      assert.ok(typeof dict.PartnerWorkspace[key] === "string" && dict.PartnerWorkspace[key].trim(), `${locale}.${key}`);
    }
  }
});

test("deriveEffectiveStatus - SLA Logic", async (t) => {
  const routedAt = new Date("2026-09-14T12:00:00Z");
  const expiresAt = new Date("2026-09-15T12:00:00Z");
  await t.test("canonical pending before deadline", () => {
    const serverNow = new Date("2026-09-15T10:00:00Z");
    const result = deriveEffectiveStatus("submitted", "pending_seller_review", routedAt, expiresAt, serverNow);
    assert.equal(result.effectiveStatus, "pending_decision");
    assert.equal(result.decisionWindowOpen, true);
  });

  await t.test("canonical pending exact deadline", () => {
    const serverNow = new Date("2026-09-15T12:00:00Z");
    const result = deriveEffectiveStatus("submitted", "pending_seller_review", routedAt, expiresAt, serverNow);
    assert.equal(result.effectiveStatus, "expired");
    assert.equal(result.decisionWindowOpen, false);
  });

  await t.test("canonical pending after deadline", () => {
    const serverNow = new Date("2026-09-15T14:00:00Z");
    const result = deriveEffectiveStatus("submitted", "pending_seller_review", routedAt, expiresAt, serverNow);
    assert.equal(result.effectiveStatus, "expired");
    assert.equal(result.decisionWindowOpen, false);
  });

  await t.test("invalid/non-actionable: submitted + missing decision", () => {
    const result = deriveEffectiveStatus("submitted", null, routedAt, expiresAt, new Date());
    assert.equal(result.effectiveStatus, "invalid_order_state");
    assert.equal(result.decisionWindowOpen, false);
  });

  await t.test("invalid/non-actionable: submitted + missing routedAt", () => {
    const result = deriveEffectiveStatus("submitted", "pending_seller_review", null, expiresAt, new Date());
    assert.equal(result.effectiveStatus, "invalid_order_state");
    assert.equal(result.decisionWindowOpen, false);
  });

  await t.test("invalid/non-actionable: submitted + missing expiresAt", () => {
    const result = deriveEffectiveStatus("submitted", "pending_seller_review", routedAt, null, new Date());
    assert.equal(result.effectiveStatus, "invalid_order_state");
    assert.equal(result.decisionWindowOpen, false);
  });

  await t.test("invalid/non-actionable: submitted + accepted decision", () => {
    const result = deriveEffectiveStatus("submitted", "seller_accepted", routedAt, expiresAt, new Date());
    assert.equal(result.effectiveStatus, "invalid_order_state");
    assert.equal(result.decisionWindowOpen, false);
  });

  await t.test("invalid/non-actionable: seller_accepted + pending decision", () => {
    const result = deriveEffectiveStatus("seller_accepted", "pending_seller_review", routedAt, expiresAt, new Date());
    assert.equal(result.effectiveStatus, "invalid_order_state");
    assert.equal(result.decisionWindowOpen, false);
  });

  await t.test("invalid/non-actionable: seller_rejected + accepted decision", () => {
    const result = deriveEffectiveStatus("seller_rejected", "seller_accepted", routedAt, expiresAt, new Date());
    assert.equal(result.effectiveStatus, "invalid_order_state");
    assert.equal(result.decisionWindowOpen, false);
  });
});

test("parseStrictIdOrNotFound preserves strict positive-integer routing", () => {
  const source = readFileSync(
    new URL("../../src/lib/partner-orders/route-params.ts", import.meta.url),
    "utf8"
  );

  assert.match(source, /if \(!idStr\) notFound\(\);/);
  assert.match(source, /if \(!\/\^\[1-9\]\\d\*\$\/\.test\(idStr\)\)/);
  assert.match(source, /parseInt\(idStr, 10\)/);
  assert.doesNotMatch(source, /parseFloat|Number\(idStr\)/);
});

test("Disclosure & Tenancy Requirements", async (t) => {
  const routedAt = new Date("2026-09-14T12:00:00Z");
  await t.test("Pre-E7 Contact Hidden (predicate extraction proof)", () => {
    const status = deriveEffectiveStatus("submitted", "pending_seller_review", routedAt, new Date("2030-01-01"), new Date());
    assert.equal(status.effectiveStatus, "pending_decision");
  });

  await t.test("Post-E7 Contact Bounded (predicate extraction proof)", () => {
    const status = deriveEffectiveStatus("seller_accepted", "seller_accepted", routedAt, new Date("2030-01-01"), new Date());
    assert.equal(status.effectiveStatus, "accepted");
  });

  await t.test("Inconsistent acceptance -> contact not releasable", () => {
    const status = deriveEffectiveStatus("fulfillment_in_progress", "pending_seller_review", routedAt, new Date("2030-01-01"), new Date());
    assert.equal(status.effectiveStatus, "invalid_order_state");
  });
});
