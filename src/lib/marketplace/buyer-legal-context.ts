export type BusinessVerificationStatus = "unknown" | "unverified" | "verified" | "failed";
export type CategoryBStatus = "unknown" | "not_applicable" | "applicable" | "under_review";
export type LegalContextReviewState =
  | "no_review_needed"
  | "pending_review"
  | "approved_by_review"
  | "rejected_by_review";

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

  /**
   * Optional professional purpose evidence.
   * Absence MUST NOT independently block checkout readiness.
   */
  professionalPurposeEvidence: string | null;

  categoryBStatus: CategoryBStatus;
  legalContextReviewState: LegalContextReviewState;
}

export type BuyerValidationResult =
  | { ok: true; data: BuyerLegalContextInput }
  | { ok: false; reason: string };

/** Returns true only when value is a non-null, non-empty, non-whitespace string. */
function isMeaningfulString(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateBuyerLegalContext(input: BuyerLegalContextInput): BuyerValidationResult {
  if (!isMeaningfulString(input.businessName)) {
    return { ok: false, reason: "BUSINESS_NAME_REQUIRED" };
  }
  if (!isMeaningfulString(input.countryCode)) {
    return { ok: false, reason: "COUNTRY_CODE_REQUIRED" };
  }

  // An identifier is "present" only when its value is a meaningful non-empty string.
  const hasTaxType = isMeaningfulString(input.taxIdentifierType);
  const hasTaxValue = isMeaningfulString(input.taxIdentifierValue);
  const hasRegistryType = isMeaningfulString(input.registryIdentifierType);
  const hasRegistryValue = isMeaningfulString(input.registryIdentifierValue);

  const hasTaxPair = hasTaxType || hasTaxValue;
  const hasRegistryPair = hasRegistryType || hasRegistryValue;

  if (!hasTaxPair && !hasRegistryPair) {
    return { ok: false, reason: "AT_LEAST_ONE_IDENTIFIER_PAIR_REQUIRED" };
  }

  if (hasTaxPair && !(hasTaxType && hasTaxValue)) {
    return { ok: false, reason: "TAX_IDENTIFIER_MUST_BE_COMPLETE" };
  }

  if (hasRegistryPair && !(hasRegistryType && hasRegistryValue)) {
    return { ok: false, reason: "REGISTRY_IDENTIFIER_MUST_BE_COMPLETE" };
  }

  if (input.businessVerificationStatus === "verified") {
    if (!isMeaningfulString(input.businessVerificationMethod)) {
      return { ok: false, reason: "VERIFICATION_METHOD_REQUIRED" };
    }
    if (!isMeaningfulString(input.businessVerificationSource)) {
      return { ok: false, reason: "VERIFICATION_SOURCE_REQUIRED" };
    }
    if (!input.businessVerifiedAt) {
      return { ok: false, reason: "VERIFICATION_DATE_REQUIRED" };
    }
  }

  return { ok: true, data: input };
}

/**
 * Evaluates pure Category B policy boundary.
 *
 * Authorized non-blocking combination (returns null = no blocker):
 *   categoryBStatus="not_applicable" AND legalContextReviewState="no_review_needed"
 *
 * All other combinations are POLICY_DECISION_REQUIRED until Owner/legal
 * explicitly authorizes additional gating rules.
 *
 * No automatic state transitions are performed.
 */
export function evaluateCategoryBPolicy(
  categoryBStatus: CategoryBStatus,
  legalContextReviewState: LegalContextReviewState,
): "NO_BLOCKER" | "POLICY_DECISION_REQUIRED" {
  if (categoryBStatus === "not_applicable" && legalContextReviewState === "no_review_needed") {
    return "NO_BLOCKER";
  }
  return "POLICY_DECISION_REQUIRED";
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

  // Category B policy boundary — fail closed unless explicitly non-blocking.
  const catB = evaluateCategoryBPolicy(input.categoryBStatus, input.legalContextReviewState);
  if (catB === "POLICY_DECISION_REQUIRED") {
    return "POLICY_DECISION_REQUIRED";
  }

  // PL marketplace requires verified business identity.
  if (input.countryCode?.toUpperCase() === "PL") {
    if (input.businessVerificationStatus !== "verified") {
      return "NOT_VERIFIED";
    }
    return "VALID_CONTEXT";
  }

  // No other country policy has been authorized yet.
  return "POLICY_DECISION_REQUIRED";
}
