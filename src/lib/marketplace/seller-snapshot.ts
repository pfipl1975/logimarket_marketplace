export interface SellerSourceInput {
  partnerId: number;
  legalName: string | null;
  jurisdictionCountry: string | null;
  eligibilityStatus: string | null;
  firmContactEmail: string | null;
  
  registeredAddressLine1: string | null;
  
  taxIdentifierType: string | null;
  taxIdentifierValue: string | null;

  registryIdentifierType: string | null;
  registryIdentifierValue: string | null;

  contractModel: string | null;
  sellerOfRecord: string | null;
  goodsInvoiceResponsibility: string | null;
  
  deliveryResponsibility: string | null;
  complaintResponsibility: string | null;
  returnResponsibility: string | null;
  refundFinancialLiability: string | null;
}

export type SellerSnapshotValidationResult = 
  | { ok: true; data: SellerSourceInput }
  | { ok: false; reason: string };

export function validateSellerSourceForSnapshot(input: SellerSourceInput): SellerSnapshotValidationResult {
  if (!Number.isSafeInteger(input.partnerId) || input.partnerId <= 0) {
    return { ok: false, reason: "INVALID_PARTNER_IDENTIFIER" };
  }

  if (!input.legalName || input.legalName.trim() === "") {
    return { ok: false, reason: "MISSING_LEGAL_NAME" };
  }

  if (!input.jurisdictionCountry || input.jurisdictionCountry.trim() === "") {
    return { ok: false, reason: "MISSING_JURISDICTION_COUNTRY" };
  }

  if (!input.firmContactEmail || input.firmContactEmail.trim() === "") {
    return { ok: false, reason: "MISSING_FIRM_EMAIL" };
  }

  if (!input.registeredAddressLine1 || input.registeredAddressLine1.trim() === "") {
    return { ok: false, reason: "INCOMPLETE_REGISTERED_ADDRESS" };
  }

  if (input.eligibilityStatus !== "eligible") {
    return { ok: false, reason: "SELLER_NOT_ELIGIBLE" };
  }

  const hasTax = input.taxIdentifierType !== null || input.taxIdentifierValue !== null;
  if (hasTax && (input.taxIdentifierType === null || input.taxIdentifierValue === null)) {
    return { ok: false, reason: "PARTIAL_TAX_PAIR" };
  }

  const hasRegistry = input.registryIdentifierType !== null || input.registryIdentifierValue !== null;
  if (hasRegistry && (input.registryIdentifierType === null || input.registryIdentifierValue === null)) {
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

  if (
    !input.deliveryResponsibility || 
    !input.complaintResponsibility || 
    !input.returnResponsibility || 
    !input.refundFinancialLiability
  ) {
    return { ok: false, reason: "MISSING_REQUIRED_POLICY_INPUT" };
  }

  return { ok: true, data: input };
}
