export type SellerEligibilityStatus = "pending" | "eligible" | "ineligible" | "suspended";

/**
 * Authoritative seller source data loaded server-side from:
 *   partners, seller_legal_identities, seller_tax_identifiers,
 *   seller_registry_identifiers, seller_eligibility.
 *
 * Never accept any of these fields from client-controlled input.
 *
 * This type must carry enough verified information for a later orchestrator
 * to construct BOTH:
 *   A. marketplace_order_seller_disclosures
 *   B. seller_order_seller_snapshots
 * without accessing client-controlled data or inventing policy values.
 */
export interface SellerSourceInput {
  /** Authoritative partner identifier. Must be a positive safe integer. */
  partnerId: number;

  /**
   * Partner display / company name (from partners.company_name).
   * Required for snapshot display and disclosure.
   */
  sellerDisplayName: string | null;

  /** Firm contact email (from partners.contact_email). */
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

  // --- Approved contract fields (values defined by Owner/legal agreement) ---

  /** Must be "partner_marketplace" for marketplace B2B orders. */
  contractModel: string | null;

  /**
   * Seller-of-record identity. Approved value: "PARTNER".
   * Goods sale is Partner → Buyer; LogiMarket is NOT seller of record.
   */
  sellerOfRecord: string | null;

  /**
   * Party who issues the goods invoice to Buyer. Approved value: "PARTNER".
   * LogiMarket does NOT issue the Buyer goods invoice.
   * Disclosure schema field: marketplace_order_seller_disclosures.goods_invoice_issuer.
   */
  goodsInvoiceIssuer: "PARTNER" | null;

  /**
   * Party responsible for the goods invoice in the seller order context.
   * Approved value: "PARTNER".
   * Snapshot schema field: seller_order_seller_snapshots.goods_invoice_responsibility (NOT NULL).
   * This is a distinct semantic field from goodsInvoiceIssuer and must NOT be derived from it.
   */
  goodsInvoiceResponsibility: "PARTNER" | null;

  // --- Unresolved policy inputs (REQUIRED_POLICY_INPUT) ---
  // Values below are NOT yet canonically defined by Owner/legal.
  // The domain fails closed when any is absent.
  // Future Owner/legal-approved values will be supplied to populate these.
  //
  // SELLER_RESPONSIBILITY_POLICY_GAP:
  //   DELIVERY_COMPLAINT_RETURN_REFUND_SELLER_ROLE_AND_PLATFORM_ROLE_POLICY_REQUIRED

  deliveryResponsibility: string | null;
  complaintResponsibility: string | null;
  returnResponsibility: string | null;
  refundFinancialLiability: string | null;

  /**
   * The legal/commercial role the Seller plays in this order.
   * Required for marketplace_order_seller_disclosures.sellerRole.
   * REQUIRED_POLICY_INPUT — exact canonical value not yet authorized.
   */
  sellerRole: string | null;

  /**
   * The role LogiMarket plays in facilitating this order.
   * Required for marketplace_order_seller_disclosures.logimarketPlatformRole.
   * REQUIRED_POLICY_INPUT — exact canonical value not yet authorized.
   */
  logimarketPlatformRole: string | null;
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

  // Registered address snapshot readiness: require Line1, postal code, city, country.
  // Line2 and region remain optional.
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

  // Goods invoice issuer must be explicitly "PARTNER".
  // LogiMarket does NOT issue goods invoices. No other value is authorized.
  if (input.goodsInvoiceIssuer !== "PARTNER") {
    return { ok: false, reason: "INVALID_GOODS_INVOICE_ISSUER" };
  }

  // Goods invoice responsibility must be explicitly "PARTNER" (separate snapshot field).
  if (input.goodsInvoiceResponsibility !== "PARTNER") {
    return { ok: false, reason: "INVALID_GOODS_INVOICE_RESPONSIBILITY" };
  }

  // Unresolved policy inputs — fail closed when absent.
  // SELLER_RESPONSIBILITY_POLICY_GAP:
  //   DELIVERY_COMPLAINT_RETURN_REFUND_SELLER_ROLE_AND_PLATFORM_ROLE_POLICY_REQUIRED
  if (
    !isMeaningful(input.deliveryResponsibility) ||
    !isMeaningful(input.complaintResponsibility) ||
    !isMeaningful(input.returnResponsibility) ||
    !isMeaningful(input.refundFinancialLiability) ||
    !isMeaningful(input.sellerRole) ||
    !isMeaningful(input.logimarketPlatformRole)
  ) {
    return { ok: false, reason: "MISSING_REQUIRED_POLICY_INPUT" };
  }

  return { ok: true, data: input };
}
