export type BusinessVerificationStatus = "unknown" | "unverified" | "verified" | "failed";
export type CategoryBStatus = "unknown" | "not_applicable" | "applicable" | "under_review";
export type LegalContextReviewState = "no_review_needed" | "pending_review" | "approved_by_review" | "rejected_by_review";

export interface BuyerLegalContextInput {
  businessName: string | null;
  countryCode: string | null;

  taxIdentifierType: string | null;
  taxIdentifierValue: string | null;

  registryIdentifierType: string | null;
  registryIdentifierValue: string | null;

  businessVerificationStatus: BusinessVerificationStatus;
  businessVerificationMethod: string | null;
  businessVerificationSource: string | null;
  businessVerifiedAt: Date | null;

  professionalPurposeEvidence: string | null;

  categoryBStatus: CategoryBStatus;
  legalContextReviewState: LegalContextReviewState;
}

export type BuyerValidationResult =
  | { ok: true; data: BuyerLegalContextInput }
  | { ok: false; reason: string };

export function validateBuyerLegalContext(input: BuyerLegalContextInput): BuyerValidationResult {
  if (!input.businessName || input.businessName.trim() === "") {
    return { ok: false, reason: "BUSINESS_NAME_REQUIRED" };
  }
  if (!input.countryCode || input.countryCode.trim() === "") {
    return { ok: false, reason: "COUNTRY_CODE_REQUIRED" };
  }

  const hasTax = input.taxIdentifierType !== null || input.taxIdentifierValue !== null;
  const hasRegistry = input.registryIdentifierType !== null || input.registryIdentifierValue !== null;

  if (!hasTax && !hasRegistry) {
    return { ok: false, reason: "AT_LEAST_ONE_IDENTIFIER_PAIR_REQUIRED" };
  }

  if (hasTax) {
    if (input.taxIdentifierType === null || input.taxIdentifierValue === null) {
      return { ok: false, reason: "TAX_IDENTIFIER_MUST_BE_COMPLETE" };
    }
  }

  if (hasRegistry) {
    if (input.registryIdentifierType === null || input.registryIdentifierValue === null) {
      return { ok: false, reason: "REGISTRY_IDENTIFIER_MUST_BE_COMPLETE" };
    }
  }

  if (!["unknown", "unverified", "verified", "failed"].includes(input.businessVerificationStatus)) {
    return { ok: false, reason: "INVALID_VERIFICATION_STATUS" };
  }

  if (input.businessVerificationStatus === "verified") {
    if (!input.businessVerificationMethod) return { ok: false, reason: "VERIFICATION_METHOD_REQUIRED" };
    if (!input.businessVerificationSource) return { ok: false, reason: "VERIFICATION_SOURCE_REQUIRED" };
    if (!input.businessVerifiedAt) return { ok: false, reason: "VERIFICATION_DATE_REQUIRED" };
  }

  if (!["unknown", "not_applicable", "applicable", "under_review"].includes(input.categoryBStatus)) {
    return { ok: false, reason: "INVALID_CATEGORY_B_STATUS" };
  }

  if (!["no_review_needed", "pending_review", "approved_by_review", "rejected_by_review"].includes(input.legalContextReviewState)) {
    return { ok: false, reason: "INVALID_LEGAL_REVIEW_STATE" };
  }

  return { ok: true, data: input };
}

export type CheckoutReadinessStatus = 
  | "VALID_CONTEXT"
  | "NOT_VERIFIED"
  | "POLICY_DECISION_REQUIRED"
  | "INVALID_CONTEXT";

export function evaluateBuyerCheckoutReadiness(input: BuyerLegalContextInput): CheckoutReadinessStatus {
  const validation = validateBuyerLegalContext(input);
  if (!validation.ok) {
    return "INVALID_CONTEXT";
  }

  // Category B Policy Boundary
  if (input.categoryBStatus === "applicable") {
    if (input.legalContextReviewState === "pending_review") return "POLICY_DECISION_REQUIRED";
    if (input.legalContextReviewState === "rejected_by_review") return "INVALID_CONTEXT";
    if (input.legalContextReviewState === "no_review_needed") {
      return "POLICY_DECISION_REQUIRED";
    }
  }
  if (input.categoryBStatus === "under_review") {
    return "POLICY_DECISION_REQUIRED";
  }
  if (input.categoryBStatus === "unknown") {
    return "POLICY_DECISION_REQUIRED";
  }

  if (input.countryCode?.toUpperCase() === "PL") {
    if (input.businessVerificationStatus === "failed") {
      return "NOT_VERIFIED";
    }
    if (input.businessVerificationStatus !== "verified") {
      return "NOT_VERIFIED";
    }
    return "VALID_CONTEXT";
  }

  return "POLICY_DECISION_REQUIRED";
}

