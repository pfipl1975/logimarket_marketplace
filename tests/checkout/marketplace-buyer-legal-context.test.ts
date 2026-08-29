import test from "node:test";
import assert from "node:assert";
import {
  validateBuyerLegalContext,
  evaluateBuyerCheckoutReadiness,
  type BuyerLegalContextInput,
} from "@/lib/marketplace/buyer-legal-context";

test("BUYER_01_COMPLETE_TAX_PAIR_VALID", () => {
  const input: BuyerLegalContextInput = {
    businessName: "Test Co",
    countryCode: "PL",
    taxIdentifierType: "VAT",
    taxIdentifierValue: "123",
    registryIdentifierType: null,
    registryIdentifierValue: null,
    businessVerificationStatus: "verified",
    businessVerificationMethod: "API",
    businessVerificationSource: "VIES",
    businessVerifiedAt: new Date(),
    professionalPurposeEvidence: null,
    categoryBStatus: "not_applicable",
    legalContextReviewState: "no_review_needed",
  };
  const res = validateBuyerLegalContext(input);
  assert.strictEqual(res.ok, true);
});

test("BUYER_02_REGISTRY_ONLY_VALID", () => {
  const input: BuyerLegalContextInput = {
    businessName: "Test Co",
    countryCode: "DE",
    taxIdentifierType: null,
    taxIdentifierValue: null,
    registryIdentifierType: "KRS",
    registryIdentifierValue: "456",
    businessVerificationStatus: "verified",
    businessVerificationMethod: "API",
    businessVerificationSource: "REGISTRY",
    businessVerifiedAt: new Date(),
    professionalPurposeEvidence: null,
    categoryBStatus: "not_applicable",
    legalContextReviewState: "no_review_needed",
  };
  const res = validateBuyerLegalContext(input);
  assert.strictEqual(res.ok, true);
});

test("BUYER_03_NO_IDENTIFIER_INVALID", () => {
  const input: BuyerLegalContextInput = {
    businessName: "Test Co",
    countryCode: "DE",
    taxIdentifierType: null,
    taxIdentifierValue: null,
    registryIdentifierType: null,
    registryIdentifierValue: null,
    businessVerificationStatus: "unknown",
    businessVerificationMethod: null,
    businessVerificationSource: null,
    businessVerifiedAt: null,
    professionalPurposeEvidence: null,
    categoryBStatus: "unknown",
    legalContextReviewState: "unknown" as "no_review_needed",
  };
  const res = validateBuyerLegalContext(input);
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "AT_LEAST_ONE_IDENTIFIER_PAIR_REQUIRED");
});

test("BUYER_04_PARTIAL_TAX_INVALID", () => {
  const input: BuyerLegalContextInput = {
    businessName: "Test Co",
    countryCode: "DE",
    taxIdentifierType: "VAT",
    taxIdentifierValue: null,
    registryIdentifierType: "KRS",
    registryIdentifierValue: "123",
    businessVerificationStatus: "unknown",
    businessVerificationMethod: null,
    businessVerificationSource: null,
    businessVerifiedAt: null,
    professionalPurposeEvidence: null,
    categoryBStatus: "not_applicable",
    legalContextReviewState: "no_review_needed",
  };
  const res = validateBuyerLegalContext(input);
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "TAX_IDENTIFIER_MUST_BE_COMPLETE");
});

test("BUYER_05_PARTIAL_REGISTRY_INVALID", () => {
  const input: BuyerLegalContextInput = {
    businessName: "Test Co",
    countryCode: "DE",
    taxIdentifierType: "VAT",
    taxIdentifierValue: "123",
    registryIdentifierType: "KRS",
    registryIdentifierValue: null,
    businessVerificationStatus: "unknown",
    businessVerificationMethod: null,
    businessVerificationSource: null,
    businessVerifiedAt: null,
    professionalPurposeEvidence: null,
    categoryBStatus: "not_applicable",
    legalContextReviewState: "no_review_needed",
  };
  const res = validateBuyerLegalContext(input);
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "REGISTRY_IDENTIFIER_MUST_BE_COMPLETE");
});

test("BUYER_06_VERIFIED_WITHOUT_METHOD_INVALID", () => {
  const input: BuyerLegalContextInput = {
    businessName: "Test", countryCode: "PL",
    taxIdentifierType: "VAT", taxIdentifierValue: "1",
    registryIdentifierType: null, registryIdentifierValue: null,
    businessVerificationStatus: "verified",
    businessVerificationMethod: null,
    businessVerificationSource: "SRC",
    businessVerifiedAt: new Date(),
    professionalPurposeEvidence: null,
    categoryBStatus: "not_applicable", legalContextReviewState: "no_review_needed",
  };
  const res = validateBuyerLegalContext(input);
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "VERIFICATION_METHOD_REQUIRED");
});

test("BUYER_07_VERIFIED_WITHOUT_SOURCE_INVALID", () => {
  const input: BuyerLegalContextInput = {
    businessName: "Test", countryCode: "PL",
    taxIdentifierType: "VAT", taxIdentifierValue: "1",
    registryIdentifierType: null, registryIdentifierValue: null,
    businessVerificationStatus: "verified",
    businessVerificationMethod: "METH",
    businessVerificationSource: null,
    businessVerifiedAt: new Date(),
    professionalPurposeEvidence: null,
    categoryBStatus: "not_applicable", legalContextReviewState: "no_review_needed",
  };
  const res = validateBuyerLegalContext(input);
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "VERIFICATION_SOURCE_REQUIRED");
});

test("BUYER_08_VERIFIED_WITHOUT_VERIFIED_AT_INVALID", () => {
  const input: BuyerLegalContextInput = {
    businessName: "Test", countryCode: "PL",
    taxIdentifierType: "VAT", taxIdentifierValue: "1",
    registryIdentifierType: null, registryIdentifierValue: null,
    businessVerificationStatus: "verified",
    businessVerificationMethod: "METH",
    businessVerificationSource: "SRC",
    businessVerifiedAt: null,
    professionalPurposeEvidence: null,
    categoryBStatus: "not_applicable", legalContextReviewState: "no_review_needed",
  };
  const res = validateBuyerLegalContext(input);
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "VERIFICATION_DATE_REQUIRED");
});

test("BUYER_09_PROFESSIONAL_PURPOSE_NULL_VALID", () => {
  const input: BuyerLegalContextInput = {
    businessName: "Test", countryCode: "PL",
    taxIdentifierType: "VAT", taxIdentifierValue: "1",
    registryIdentifierType: null, registryIdentifierValue: null,
    businessVerificationStatus: "unverified",
    businessVerificationMethod: null, businessVerificationSource: null, businessVerifiedAt: null,
    professionalPurposeEvidence: null, // intentionally null
    categoryBStatus: "not_applicable", legalContextReviewState: "no_review_needed",
  };
  assert.strictEqual(validateBuyerLegalContext(input).ok, true);
});

test("BUYER_10_PL_UNVERIFIED_NOT_CHECKOUT_READY", () => {
  const input: BuyerLegalContextInput = {
    businessName: "Test", countryCode: "PL",
    taxIdentifierType: "VAT", taxIdentifierValue: "1",
    registryIdentifierType: null, registryIdentifierValue: null,
    businessVerificationStatus: "unverified",
    businessVerificationMethod: null, businessVerificationSource: null, businessVerifiedAt: null,
    professionalPurposeEvidence: null,
    categoryBStatus: "not_applicable", legalContextReviewState: "no_review_needed",
  };
  assert.strictEqual(evaluateBuyerCheckoutReadiness(input), "NOT_VERIFIED");
});

test("BUYER_11_PL_FAILED_NOT_CHECKOUT_READY", () => {
  const input: BuyerLegalContextInput = {
    businessName: "Test", countryCode: "PL",
    taxIdentifierType: "VAT", taxIdentifierValue: "1",
    registryIdentifierType: null, registryIdentifierValue: null,
    businessVerificationStatus: "failed",
    businessVerificationMethod: null, businessVerificationSource: null, businessVerifiedAt: null,
    professionalPurposeEvidence: null,
    categoryBStatus: "not_applicable", legalContextReviewState: "no_review_needed",
  };
  assert.strictEqual(evaluateBuyerCheckoutReadiness(input), "NOT_VERIFIED");
});

test("BUYER_12_PL_VERIFIED_READY_IF_OTHER_POLICIES_ALLOW", () => {
  const input: BuyerLegalContextInput = {
    businessName: "Test", countryCode: "PL",
    taxIdentifierType: "VAT", taxIdentifierValue: "1",
    registryIdentifierType: null, registryIdentifierValue: null,
    businessVerificationStatus: "verified",
    businessVerificationMethod: "API", businessVerificationSource: "VIES", businessVerifiedAt: new Date(),
    professionalPurposeEvidence: null,
    categoryBStatus: "not_applicable", legalContextReviewState: "no_review_needed",
  };
  assert.strictEqual(evaluateBuyerCheckoutReadiness(input), "VALID_CONTEXT");
});

test("CATEGORY_B_01_ALLOWED_STATES_PRESERVED", () => {
  const validStates = ["unknown", "not_applicable", "applicable", "under_review"];
  for (const s of validStates) {
    const input: BuyerLegalContextInput = {
      businessName: "Test", countryCode: "PL",
      taxIdentifierType: "VAT", taxIdentifierValue: "1",
      registryIdentifierType: null, registryIdentifierValue: null,
      businessVerificationStatus: "unverified",
      businessVerificationMethod: null, businessVerificationSource: null, businessVerifiedAt: null,
      professionalPurposeEvidence: null,
      categoryBStatus: s as "unknown", legalContextReviewState: "no_review_needed",
    };
    assert.strictEqual(validateBuyerLegalContext(input).ok, true);
  }
});

test("CATEGORY_B_02_REVIEW_STATES_PRESERVED", () => {
  const validStates = ["no_review_needed", "pending_review", "approved_by_review", "rejected_by_review"];
  for (const s of validStates) {
    const input: BuyerLegalContextInput = {
      businessName: "Test", countryCode: "PL",
      taxIdentifierType: "VAT", taxIdentifierValue: "1",
      registryIdentifierType: null, registryIdentifierValue: null,
      businessVerificationStatus: "unverified",
      businessVerificationMethod: null, businessVerificationSource: null, businessVerifiedAt: null,
      professionalPurposeEvidence: null,
      categoryBStatus: "not_applicable", legalContextReviewState: s as "no_review_needed",
    };
    assert.strictEqual(validateBuyerLegalContext(input).ok, true);
  }
});

test("CATEGORY_B_03_NO_AUTOMATIC_TRANSITION", () => {
  // Pure evaluator, no transitions, just evaluates readiness
  const input: BuyerLegalContextInput = {
    businessName: "Test", countryCode: "PL",
    taxIdentifierType: "VAT", taxIdentifierValue: "1",
    registryIdentifierType: null, registryIdentifierValue: null,
    businessVerificationStatus: "verified",
    businessVerificationMethod: "API", businessVerificationSource: "VIES", businessVerifiedAt: new Date(),
    professionalPurposeEvidence: null,
    categoryBStatus: "applicable", legalContextReviewState: "pending_review",
  };
  assert.strictEqual(evaluateBuyerCheckoutReadiness(input), "POLICY_DECISION_REQUIRED");
});

test("CATEGORY_B_04_UNRESOLVED_COMBINATION_POLICY_REQUIRED", () => {
  const input: BuyerLegalContextInput = {
    businessName: "Test", countryCode: "PL",
    taxIdentifierType: "VAT", taxIdentifierValue: "1",
    registryIdentifierType: null, registryIdentifierValue: null,
    businessVerificationStatus: "verified",
    businessVerificationMethod: "API", businessVerificationSource: "VIES", businessVerifiedAt: new Date(),
    professionalPurposeEvidence: null,
    categoryBStatus: "unknown", legalContextReviewState: "no_review_needed",
  };
  assert.strictEqual(evaluateBuyerCheckoutReadiness(input), "POLICY_DECISION_REQUIRED");
});

