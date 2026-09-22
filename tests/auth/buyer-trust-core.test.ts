import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateBuyerOrganizationMembership,
  evaluateBuyerTrustTransition,
  evaluateTrustedBuyerIdentity,
  parseSafePositiveId,
  validateBuyerTrustEventAuthority,
  type TrustedBuyerOrganizationRow,
  type TrustedBuyerTaxIdentifierRow,
  type TrustedBuyerVerificationEventRow,
} from "../../src/lib/buyer-trust/core";

const occurredAt = new Date("2026-09-19T10:00:00.000Z");

const organization: TrustedBuyerOrganizationRow = {
  id: 7,
  legalName: "QA Buyer sp. z o.o.",
  jurisdictionCountry: "PL",
  verificationStatus: "verified",
  currentVerificationEventId: 31,
  verifiedAt: occurredAt,
};

const currentEvent: TrustedBuyerVerificationEventRow = {
  id: 31,
  buyerOrganizationId: 7,
  eventType: "verified",
  outcomeStatus: "verified",
  verificationMethod: "internal_admin_review",
  sourceType: "admin_manual",
  sourceName: "LogiMarket Admin",
  occurredAt,
  legalNameSnapshot: organization.legalName,
  jurisdictionCountrySnapshot: "PL",
  taxIdentifierId: 17,
  taxIdentifierTypeSnapshot: "tax_id",
  taxIdentifierValueSnapshot: "5260250995",
  taxCountryCodeSnapshot: "PL",
  registryIdentifierId: null,
  registryTypeSnapshot: null,
  registryValueSnapshot: null,
  registryCountryCodeSnapshot: null,
};

const taxIdentifier: TrustedBuyerTaxIdentifierRow = {
  id: 17,
  buyerOrganizationId: 7,
  identifierType: "tax_id",
  identifierValue: "5260250995",
  countryCode: "PL",
  canonicalIdentityClass: "PL:NIP",
  canonicalIdentifierValue: "5260250995",
  trustedByVerificationEventId: 31,
  retiredAt: null,
};

test("safe-positive ids reject unsafe browser selectors", () => {
  assert.equal(parseSafePositiveId(1), 1);
  assert.equal(parseSafePositiveId(0), null);
  assert.equal(parseSafePositiveId(-1), null);
  assert.equal(parseSafePositiveId(1.5), null);
  assert.equal(parseSafePositiveId("1"), null);
  assert.equal(parseSafePositiveId(Number.MAX_SAFE_INTEGER + 1), null);
});

test("membership authority requires the exact active organization and permitted role", () => {
  const membership = {
    buyerOrganizationId: 7,
    membershipRole: "authorized_buyer" as const,
    membershipStatus: "active" as const,
    endedAt: null,
  };

  assert.deepEqual(evaluateBuyerOrganizationMembership(membership, 7), {
    ok: true,
    value: { buyerOrganizationId: 7, membershipRole: "authorized_buyer" },
  });
  assert.deepEqual(evaluateBuyerOrganizationMembership(membership, 8), {
    ok: false,
    code: "BUYER_ORGANIZATION_MEMBERSHIP_REQUIRED",
  });
  assert.equal(
    evaluateBuyerOrganizationMembership({ ...membership, membershipStatus: "inactive", endedAt: occurredAt }, 7).ok,
    false,
  );
  assert.equal(
    evaluateBuyerOrganizationMembership({ ...membership, membershipStatus: "revoked", endedAt: occurredAt }, 7).ok,
    false,
  );
});

test("verification lifecycle permits only the approved state transitions", () => {
  assert.deepEqual(evaluateBuyerTrustTransition("pending", "pending", "verified"), {
    ok: true,
    value: { eventType: "verified", outcomeStatus: "verified" },
  });
  assert.deepEqual(evaluateBuyerTrustTransition("pending", "pending", "rejected"), {
    ok: true,
    value: { eventType: "rejected", outcomeStatus: "rejected" },
  });
  assert.deepEqual(evaluateBuyerTrustTransition("verified", "verified", "revoked"), {
    ok: true,
    value: { eventType: "revoked", outcomeStatus: "revoked" },
  });
  assert.deepEqual(evaluateBuyerTrustTransition("verified", "verified", "invalidated"), {
    ok: true,
    value: { eventType: "invalidated", outcomeStatus: "pending" },
  });
  assert.equal(evaluateBuyerTrustTransition("verified", "verified", "rejected").ok, false);
  assert.equal(evaluateBuyerTrustTransition("pending", "pending", "revoked").ok, false);
  assert.deepEqual(evaluateBuyerTrustTransition("pending", "verified", "verified"), {
    ok: false,
    code: "BUYER_TRUST_CONCURRENT_CONFLICT",
  });
});

test("verification actor/source provenance cannot be elevated by a spoofed payload", () => {
  assert.equal(
    validateBuyerTrustEventAuthority({ actorType: "admin", actorUserId: "054bd02a-53fd-4406-ad1e-554e5569d1e3", sourceType: "admin_manual" }),
    true,
  );
  assert.equal(
    validateBuyerTrustEventAuthority({ actorType: "admin", actorUserId: null, sourceType: "admin_manual" }),
    false,
  );
  assert.equal(
    validateBuyerTrustEventAuthority({ actorType: "buyer_user", actorUserId: "054bd02a-53fd-4406-ad1e-554e5569d1e3", sourceType: "admin_manual" }),
    false,
  );
  assert.equal(
    validateBuyerTrustEventAuthority({ actorType: "external_adapter", actorUserId: "054bd02a-53fd-4406-ad1e-554e5569d1e3", sourceType: "external_adapter" }),
    false,
  );
});

test("trusted Buyer read model returns only consistent PL identity and no transaction policy", () => {
  const result = evaluateTrustedBuyerIdentity({
    organization,
    currentEvent,
    taxIdentifiers: [taxIdentifier],
    registryIdentifiers: [],
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.businessVerificationStatus, "verified");
  assert.equal(result.value.taxIdentifierValue, "5260250995");
  assert.equal("categoryBStatus" in result.value, false);
  assert.equal("legalContextReviewState" in result.value, false);
});

test("trusted Buyer read model fails closed on unverified, stale, retired, ambiguous, and cross-owner state", () => {
  assert.deepEqual(
    evaluateTrustedBuyerIdentity({
      organization: { ...organization, verificationStatus: "pending", currentVerificationEventId: null, verifiedAt: null },
      currentEvent: undefined,
      taxIdentifiers: [],
      registryIdentifiers: [],
    }),
    { ok: false, code: "BUYER_ORGANIZATION_NOT_VERIFIED" },
  );

  assert.equal(
    evaluateTrustedBuyerIdentity({
      organization,
      currentEvent: { ...currentEvent, legalNameSnapshot: "Stale name" },
      taxIdentifiers: [taxIdentifier],
      registryIdentifiers: [],
    }).ok,
    false,
  );
  assert.deepEqual(
    evaluateTrustedBuyerIdentity({
      organization,
      currentEvent,
      taxIdentifiers: [{ ...taxIdentifier, retiredAt: occurredAt }],
      registryIdentifiers: [],
    }),
    { ok: false, code: "BUYER_IDENTIFIER_NOT_TRUSTED" },
  );
  assert.equal(
    evaluateTrustedBuyerIdentity({
      organization,
      currentEvent,
      taxIdentifiers: [taxIdentifier, { ...taxIdentifier, id: 18 }],
      registryIdentifiers: [],
    }).ok,
    false,
  );
  assert.equal(
    evaluateTrustedBuyerIdentity({
      organization,
      currentEvent,
      taxIdentifiers: [{ ...taxIdentifier, buyerOrganizationId: 8 }],
      registryIdentifiers: [],
    }).ok,
    false,
  );
});
