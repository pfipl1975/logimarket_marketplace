export type SellerEligibilityStatus = "pending" | "eligible" | "ineligible" | "suspended";

/**
 * Authoritative seller source data loaded server-side from:
 *   partners, seller_legal_identities, seller_tax_identifiers,
 *   seller_registry_identifiers, seller_eligibility.
 *
 * Never accept any of these fields from client-controlled input.
 */
export interface SellerSourceInput {
  /** Authoritative partner identifier. Must be a positive safe integer. */
  partnerId: number;

  /**
   * Partner display / company name (from partners.company_name).
   * Required for snapshot display and disclosure.
   */
  sellerDisplayName: string | null;

  /** Firm contact email (from partners.contact_email or seller_legal_identities). */
  firmContactEmail: string | null;

  // --- Legal identity (from seller_legal_identities) ---
  legalName: string | null;
  jurisdictionCountry: string | null;

  // --- Registered address (from seller_legal_identities) ---
  registeredAddressLine1: string | null;
  registeredAddressLine2: string | null;   // optional
  registeredPostalCode: string | null;
  registeredCity: string | null;
  registeredRegion: string | null;         // optional
  registeredCountryCode: string | null;

  // --- Marketplace eligibility (from seller_eligibility) ---
  eligibilityStatus: SellerEligibilityStatus | null;

  // --- Tax identifier pair (from seller_tax_identifiers) ---
  taxIdentifierType: string | null;
  taxIdentifierValue: string | null;

  // --- Registry identifier pair (from seller_registry_identifiers) ---
  registryIdentifierType: string | null;
  registryIdentifierValue: string | null;

  // --- Approved contract / responsibility fields ---
  /** Must be "partner_marketplace" for B2B marketplace orders. */
  contractModel: string | null;
  /** Must be "PARTNER". */
  sellerOfRecord: string | null;
  /** Must be "PARTNER". */
  goodsInvoiceResponsibility: string | null;

  /**
   * Policy inputs — values not yet canonically defined by Owner/legal.
   * Must NOT be null/absent for snapshot readiness; future policy will
   * supply approved values.
   */
  deliveryResponsibility: string | null;
  complaintResponsibility: string | null;
  returnResponsibility: string | null;
  refundFinancialLiability: string | null;
}

export type SellerSnapshotValidationResult =
  | { ok: true; data: SellerSourceInput }
  | { ok: false; reason: string };

/** Returns true only for a non-null, non-empty, non-whitespace string. */
function isMeaningful(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateSellerSourceForSnapshot(input: SellerSourceInput): SellerSnapshotValidationResult {
  if (!Number.isSafeInteger(input.partnerId) || input.partnerId <= 0) {
    return { ok: false, reason: "INVALID_PARTNER_IDENTIFIER" };
  }

  if (!isMeaningful(input.sellerDisplayName)) {
    return { ok: false, reason: "MISSING_SELLER_DISPLAY_NAME" };
  }

  if (!isMeaningful(input.legalName)) {
    return { ok: false, reason: "MISSING_LEGAL_NAME" };
  }

  if (!isMeaningful(input.jurisdictionCountry)) {
    return { ok: false, reason: "MISSING_JURISDICTION_COUNTRY" };
  }

  if (!isMeaningful(input.firmContactEmail)) {
    return { ok: false, reason: "MISSING_FIRM_EMAIL" };
  }

  // Registered address snapshot readiness: require at minimum Line1, postal code, city, country.
  if (!isMeaningful(input.registeredAddressLine1)) {
    return { ok: false, reason: "MISSING_REGISTERED_ADDRESS_LINE1" };
  }
  if (!isMeaningful(input.registeredPostalCode)) {
    return { ok: false, reason: "MISSING_REGISTERED_POSTAL_CODE" };
  }
  if (!isMeaningful(input.registeredCity)) {
    return { ok: false, reason: "MISSING_REGISTERED_CITY" };
  }
  if (!isMeaningful(input.registeredCountryCode)) {
    return { ok: false, reason: "MISSING_REGISTERED_COUNTRY_CODE" };
  }

  if (input.eligibilityStatus !== "eligible") {
    return { ok: false, reason: "SELLER_NOT_ELIGIBLE" };
  }

  // Tax pair must be both-present or both-absent (meaningful strings).
  const hasTaxType = isMeaningful(input.taxIdentifierType);
  const hasTaxValue = isMeaningful(input.taxIdentifierValue);
  if (hasTaxType !== hasTaxValue) {
    return { ok: false, reason: "PARTIAL_TAX_PAIR" };
  }

  // Registry pair must be both-present or both-absent (meaningful strings).
  const hasRegistryType = isMeaningful(input.registryIdentifierType);
  const hasRegistryValue = isMeaningful(input.registryIdentifierValue);
  if (hasRegistryType !== hasRegistryValue) {
    return { ok: false, reason: "PARTIAL_REGISTRY_PAIR" };
  }

  if (input.contractModel !== "partner_marketplace") {
    return { ok: false, reason: "INVALID_CONTRACT_MODEL" };
  }

  if (input.sellerOfRecord !== "PARTNER") {
    return { ok: false, reason: "INVALID_SELLER_OF_RECORD" };
  }

  if (input.goodsInvoiceResponsibility !== "PARTNER") {
    return { ok: false, reason: "INVALID_GOODS_INVOICE_RESPONSIBILITY" };
  }

  // Unresolved policy inputs — fail closed when absent.
  // SELLER_RESPONSIBILITY_POLICY_GAP:
  //   DELIVERY_COMPLAINT_RETURN_REFUND_AND_DISCLOSURE_ROLE_POLICY_REQUIRED
  if (
    !isMeaningful(input.deliveryResponsibility) ||
    !isMeaningful(input.complaintResponsibility) ||
    !isMeaningful(input.returnResponsibility) ||
    !isMeaningful(input.refundFinancialLiability)
  ) {
    return { ok: false, reason: "MISSING_REQUIRED_POLICY_INPUT" };
  }

  return { ok: true, data: input };
}
