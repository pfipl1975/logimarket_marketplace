import test from "node:test";
import assert from "node:assert";
import {
  validateBuyerLegalContext,
  evaluateBuyerCheckoutReadiness,
  evaluateCategoryBPolicy,
  type BuyerLegalContextInput,
  type CategoryBStatus,
  type LegalContextReviewState,
} from "@/lib/marketplace/buyer-legal-context";

// ─── Fixtures ───────────────────────────────────────────────────────────────

function basePL(overrides?: Partial<BuyerLegalContextInput>): BuyerLegalContextInput {
  return {
    businessName: "Test Co",
    countryCode: "PL",
    taxIdentifierType: "VAT",
    taxIdentifierValue: "PL1234567890",
    registryIdentifierType: null,
    registryIdentifierValue: null,
    businessVerificationStatus: "verified",
    businessVerificationMethod: "API",
    businessVerificationSource: "VIES",
    businessVerifiedAt: new Date("2024-01-01"),
    professionalPurposeEvidence: null,
    categoryBStatus: "not_applicable",
    legalContextReviewState: "no_review_needed",
    ...overrides,
  };
}

// ─── BUYER_01–12 ─────────────────────────────────────────────────────────────

test("BUYER_01_COMPLETE_TAX_PAIR_VALID", () => {
  assert.strictEqual(validateBuyerLegalContext(basePL()).ok, true);
});

test("BUYER_02_REGISTRY_ONLY_VALID", () => {
  const input = basePL({
    taxIdentifierType: null,
    taxIdentifierValue: null,
    registryIdentifierType: "KRS",
    registryIdentifierValue: "0000123456",
    countryCode: "DE",
    businessVerificationStatus: "unverified",
    businessVerificationMethod: null,
    businessVerificationSource: null,
    businessVerifiedAt: null,
  });
  assert.strictEqual(validateBuyerLegalContext(input).ok, true);
});

test("BUYER_03_NO_IDENTIFIER_INVALID", () => {
  const input = basePL({
    taxIdentifierType: null,
    taxIdentifierValue: null,
    registryIdentifierType: null,
    registryIdentifierValue: null,
  });
  const res = validateBuyerLegalContext(input);
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "AT_LEAST_ONE_IDENTIFIER_PAIR_REQUIRED");
});

test("BUYER_04_PARTIAL_TAX_INVALID", () => {
  const input = basePL({
    taxIdentifierType: "VAT",
    taxIdentifierValue: null,
    registryIdentifierType: null,
    registryIdentifierValue: null,
  });
  const res = validateBuyerLegalContext(input);
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "TAX_IDENTIFIER_MUST_BE_COMPLETE");
});

test("BUYER_05_PARTIAL_REGISTRY_INVALID", () => {
  const input = basePL({
    registryIdentifierType: "KRS",
    registryIdentifierValue: null,
  });
  const res = validateBuyerLegalContext(input);
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "REGISTRY_IDENTIFIER_MUST_BE_COMPLETE");
});

test("BUYER_06_VERIFIED_WITHOUT_METHOD_INVALID", () => {
  const input = basePL({ businessVerificationMethod: null });
  const res = validateBuyerLegalContext(input);
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "VERIFICATION_METHOD_REQUIRED");
});

test("BUYER_07_VERIFIED_WITHOUT_SOURCE_INVALID", () => {
  const input = basePL({ businessVerificationSource: null });
  const res = validateBuyerLegalContext(input);
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "VERIFICATION_SOURCE_REQUIRED");
});

test("BUYER_08_VERIFIED_WITHOUT_VERIFIED_AT_INVALID", () => {
  const input = basePL({ businessVerifiedAt: null });
  const res = validateBuyerLegalContext(input);
  assert.strictEqual(res.ok, false);
  if (!res.ok) assert.strictEqual(res.reason, "VERIFICATION_DATE_REQUIRED");
});

test("BUYER_09_PROFESSIONAL_PURPOSE_NULL_VALID", () => {
  // professionalPurposeEvidence null must NOT block validation.
  assert.strictEqual(validateBuyerLegalContext(basePL({ professionalPurposeEvidence: null })).ok, true);
});

test("BUYER_10_PL_UNVERIFIED_NOT_CHECKOUT_READY", () => {
  const input = basePL({
    businessVerificationStatus: "unverified",
    businessVerificationMethod: null,
    businessVerificationSource: null,
    businessVerifiedAt: null,
  });
  assert.strictEqual(evaluateBuyerCheckoutReadiness(input), "NOT_VERIFIED");
});

test("BUYER_11_PL_FAILED_NOT_CHECKOUT_READY", () => {
  const input = basePL({
    businessVerificationStatus: "failed",
    businessVerificationMethod: null,
    businessVerificationSource: null,
    businessVerifiedAt: null,
  });
  assert.strictEqual(evaluateBuyerCheckoutReadiness(input), "NOT_VERIFIED");
});

test("BUYER_12_PL_VERIFIED_READY_IF_OTHER_POLICIES_ALLOW", () => {
  assert.strictEqual(evaluateBuyerCheckoutReadiness(basePL()), "VALID_CONTEXT");
});

// ─── Empty identifier rejection ──────────────────────────────────────────────

test("BUYER_EMPTY_TAX_TYPE_NOT_ACCEPTED", () => {
  const input = basePL({ taxIdentifierType: "   ", taxIdentifierValue: null });
  const res = validateBuyerLegalContext(input);
  assert.strictEqual(res.ok, false);
});

test("BUYER_EMPTY_TAX_VALUE_NOT_ACCEPTED", () => {
  const input = basePL({ taxIdentifierType: "VAT", taxIdentifierValue: "" });
  const res = validateBuyerLegalContext(input);
  assert.strictEqual(res.ok, false);
});

// ─── CATEGORY B ─────────────────────────────────────────────────────────────

test("CATEGORY_B_01_ALLOWED_STATES_PRESERVED", () => {
  const states: CategoryBStatus[] = ["unknown", "not_applicable", "applicable", "under_review"];
  for (const s of states) {
    const input = basePL({
      categoryBStatus: s,
      businessVerificationStatus: "unverified",
      businessVerificationMethod: null,
      businessVerificationSource: null,
      businessVerifiedAt: null,
    });
    // All are valid input values — validation must not reject them.
    assert.strictEqual(validateBuyerLegalContext(input).ok, true, `State '${s}' must be valid input`);
  }
});

test("CATEGORY_B_02_REVIEW_STATES_PRESERVED", () => {
  const states: LegalContextReviewState[] = [
    "no_review_needed",
    "pending_review",
    "approved_by_review",
    "rejected_by_review",
  ];
  for (const s of states) {
    const input = basePL({
      legalContextReviewState: s,
      businessVerificationStatus: "unverified",
      businessVerificationMethod: null,
      businessVerificationSource: null,
      businessVerifiedAt: null,
    });
    assert.strictEqual(validateBuyerLegalContext(input).ok, true, `Review state '${s}' must be valid input`);
  }
});

test("CATEGORY_B_03_NO_AUTOMATIC_TRANSITION", () => {
  // Evaluator never changes the input object.
  const input = basePL({ categoryBStatus: "applicable", legalContextReviewState: "pending_review" });
  const before = input.categoryBStatus;
  evaluateBuyerCheckoutReadiness(input);
  assert.strictEqual(input.categoryBStatus, before);
});

test("CATEGORY_B_04_UNRESOLVED_COMBINATION_POLICY_REQUIRED", () => {
  // unknown is always POLICY_DECISION_REQUIRED regardless of review state.
  assert.strictEqual(evaluateBuyerCheckoutReadiness(basePL({ categoryBStatus: "unknown" })), "POLICY_DECISION_REQUIRED");
});

// ─── Category B policy boundary — pure evaluateCategoryBPolicy ───────────────

test("CATB_not_applicable_no_review_needed__NO_BLOCKER", () => {
  assert.strictEqual(evaluateCategoryBPolicy("not_applicable", "no_review_needed"), "NO_BLOCKER");
});

test("CATB_unknown__POLICY_DECISION_REQUIRED", () => {
  const states: LegalContextReviewState[] = [
    "no_review_needed", "pending_review", "approved_by_review", "rejected_by_review",
  ];
  for (const s of states) {
    assert.strictEqual(evaluateCategoryBPolicy("unknown", s), "POLICY_DECISION_REQUIRED", `unknown+${s}`);
  }
});

test("CATB_under_review__POLICY_DECISION_REQUIRED", () => {
  const states: LegalContextReviewState[] = [
    "no_review_needed", "pending_review", "approved_by_review", "rejected_by_review",
  ];
  for (const s of states) {
    assert.strictEqual(evaluateCategoryBPolicy("under_review", s), "POLICY_DECISION_REQUIRED", `under_review+${s}`);
  }
});

test("CATB_applicable_no_review_needed__POLICY_DECISION_REQUIRED", () => {
  assert.strictEqual(evaluateCategoryBPolicy("applicable", "no_review_needed"), "POLICY_DECISION_REQUIRED");
});

test("CATB_applicable_pending_review__POLICY_DECISION_REQUIRED", () => {
  assert.strictEqual(evaluateCategoryBPolicy("applicable", "pending_review"), "POLICY_DECISION_REQUIRED");
});

test("CATB_applicable_approved_by_review__POLICY_DECISION_REQUIRED", () => {
  assert.strictEqual(evaluateCategoryBPolicy("applicable", "approved_by_review"), "POLICY_DECISION_REQUIRED");
});

test("CATB_applicable_rejected_by_review__POLICY_DECISION_REQUIRED", () => {
  assert.strictEqual(evaluateCategoryBPolicy("applicable", "rejected_by_review"), "POLICY_DECISION_REQUIRED");
});

test("CATB_not_applicable_pending_review__POLICY_DECISION_REQUIRED", () => {
  assert.strictEqual(evaluateCategoryBPolicy("not_applicable", "pending_review"), "POLICY_DECISION_REQUIRED");
});

test("CATB_not_applicable_approved_by_review__POLICY_DECISION_REQUIRED", () => {
  assert.strictEqual(evaluateCategoryBPolicy("not_applicable", "approved_by_review"), "POLICY_DECISION_REQUIRED");
});

test("CATB_not_applicable_rejected_by_review__POLICY_DECISION_REQUIRED", () => {
  assert.strictEqual(evaluateCategoryBPolicy("not_applicable", "rejected_by_review"), "POLICY_DECISION_REQUIRED");
});
