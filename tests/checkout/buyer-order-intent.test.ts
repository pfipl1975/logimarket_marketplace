import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateBuyerOrderIntentReadiness, selectSingleBuyerOrganization,
  type BuyerOrderIntentContext,
} from "../../src/lib/checkout/buyer-order-intent";

function ready(status: "pending" | "verified" = "pending"): BuyerOrderIntentContext {
  const verified = status === "verified";
  return {
    authUserId: "00000000-0000-0000-0000-000000000001",
    buyerOrganizationId: 1,
    organizationStatus: status,
    legal: {
      businessName: "Buyer sp. z o.o.", countryCode: "PL",
      taxIdentifierType: "tax_id", taxIdentifierValue: "1234563218",
      registryIdentifierType: null, registryIdentifierValue: null,
      businessVerificationStatus: verified ? "verified" : "unverified",
      businessVerificationMethod: verified ? "admin_manual" : null,
      businessVerificationSource: verified ? "LogiMarket" : null,
      businessVerifiedAt: verified ? new Date("2026-01-01T00:00:00Z") : null,
      categoryBStatus: "unknown", legalContextReviewState: "no_review_needed",
      professionalPurposeEvidence: null,
    },
    contact: { contactName: "Anna Kowalska", email: "buyer@example.com", phone: "+48 501 234 567" },
    invoice: {
      legalName: "Buyer sp. z o.o.", taxIdentifierType: "tax_id", taxIdentifierValue: "1234563218",
      street: "Przemysłowa", buildingNumber: "12", unitNumber: null,
      postalCode: "00-001", city: "Warszawa", countryCode: "PL",
    },
  };
}

test("pending declared Buyer with checksum-valid NIP may submit E2 without fabricated verification or Category B evidence", () => {
  assert.equal(evaluateBuyerOrderIntentReadiness(ready()), true);
  assert.equal(evaluateBuyerOrderIntentReadiness(ready("verified")), true);
  assert.equal(evaluateBuyerOrderIntentReadiness({ ...ready(), legal: { ...ready().legal, categoryBStatus: "unknown", professionalPurposeEvidence: null } }), true);
});

test("rejected, revoked, inconsistent verification and invalid NIP fail closed", () => {
  const base = ready();
  assert.equal(evaluateBuyerOrderIntentReadiness({ ...base, organizationStatus: "rejected" as never }), false);
  assert.equal(evaluateBuyerOrderIntentReadiness({ ...base, organizationStatus: "revoked" as never }), false);
  assert.equal(evaluateBuyerOrderIntentReadiness({ ...base, legal: { ...base.legal, taxIdentifierValue: "1234563219" } }), false);
  assert.equal(evaluateBuyerOrderIntentReadiness({ ...base, legal: { ...base.legal, taxIdentifierValue: null } }), false);
  assert.equal(evaluateBuyerOrderIntentReadiness({ ...base, legal: { ...base.legal, businessVerificationStatus: "verified" } }), false);
  assert.equal(evaluateBuyerOrderIntentReadiness({ ...ready("verified"), legal: { ...ready("verified").legal, businessVerificationStatus: "unverified" } }), false);
});

test("invoice and contact profile must be complete and match legal context", () => {
  const base = ready();
  assert.equal(evaluateBuyerOrderIntentReadiness({ ...base, invoice: { ...base.invoice, street: "" } }), false);
  assert.equal(evaluateBuyerOrderIntentReadiness({ ...base, invoice: { ...base.invoice, taxIdentifierValue: "1234563219" } }), false);
  assert.equal(evaluateBuyerOrderIntentReadiness({ ...base, contact: { ...base.contact, email: "" } }), false);
});

test("zero or multiple active organizations never choose an arbitrary company", () => {
  assert.equal(selectSingleBuyerOrganization([]), "BUYER_PROFILE_REQUIRED");
  assert.deepEqual(selectSingleBuyerOrganization([{ id: 1 }]), { id: 1 });
  assert.equal(selectSingleBuyerOrganization([{ id: 1 }, { id: 2 }]), "ORGANIZATION_SELECTION_REQUIRED");
});
