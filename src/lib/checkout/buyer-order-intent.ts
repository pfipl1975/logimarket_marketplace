import { isValidPlNip, normalizePlNip } from "@/lib/buyer/buyer-identity-core";
import { validateBuyerLegalContext, type BuyerLegalContextInput } from "@/lib/marketplace/buyer-legal-context";

export type BuyerInvoiceSnapshotInput = {
  legalName: string;
  taxIdentifierType: "tax_id";
  taxIdentifierValue: string;
  street: string;
  buildingNumber: string;
  unitNumber: string | null;
  postalCode: string;
  city: string;
  countryCode: "PL";
};

export type BuyerOrderIntentContext = {
  authUserId: string;
  buyerOrganizationId: number;
  organizationStatus: "pending" | "verified";
  legal: BuyerLegalContextInput;
  contact: { contactName: string; email: string; phone: string; message?: string | null };
  invoice: BuyerInvoiceSnapshotInput;
};

export type BuyerOrderIntentFailure =
  | "BUYER_PROFILE_REQUIRED"
  | "ORGANIZATION_SELECTION_REQUIRED"
  | "BUYER_NOT_READY"
  | "BUYER_ACCOUNT_UNAVAILABLE";

export function selectSingleBuyerOrganization<T>(organizations: readonly T[]): T | BuyerOrderIntentFailure {
  if (organizations.length === 0) return "BUYER_PROFILE_REQUIRED";
  if (organizations.length !== 1) return "ORGANIZATION_SELECTION_REQUIRED";
  return organizations[0];
}

const meaningful = (value: string | null | undefined): value is string =>
  typeof value === "string" && value.trim().length > 0;

/** E2 is a Buyer offer. A declared identity is allowed without claiming registry verification. */
export function evaluateBuyerOrderIntentReadiness(context: BuyerOrderIntentContext): boolean {
  const { legal, invoice, contact } = context;
  if (!meaningful(context.authUserId) || !Number.isSafeInteger(context.buyerOrganizationId) || context.buyerOrganizationId <= 0) return false;
  if (context.organizationStatus !== "pending" && context.organizationStatus !== "verified") return false;
  if (!validateBuyerLegalContext(legal).ok || legal.countryCode !== "PL") return false;
  if (legal.taxIdentifierType !== "tax_id" || !meaningful(legal.taxIdentifierValue) ||
      normalizePlNip(legal.taxIdentifierValue) !== legal.taxIdentifierValue ||
      !isValidPlNip(legal.taxIdentifierValue)) return false;
  if (context.organizationStatus === "pending" &&
      (legal.businessVerificationStatus !== "unverified" || legal.businessVerificationMethod !== null ||
       legal.businessVerificationSource !== null || legal.businessVerifiedAt !== null)) return false;
  if (context.organizationStatus === "verified" && legal.businessVerificationStatus !== "verified") return false;
  if (invoice.legalName !== legal.businessName || invoice.taxIdentifierType !== "tax_id" ||
      invoice.taxIdentifierValue !== legal.taxIdentifierValue || invoice.countryCode !== "PL") return false;
  if (![invoice.street, invoice.buildingNumber, invoice.postalCode, invoice.city, contact.contactName, contact.email, contact.phone].every(meaningful)) return false;
  if (!/^\d{2}-\d{3}$/.test(invoice.postalCode)) return false;
  // Category B and professional-purpose evidence are captured as-is; neither blocks MVP E2.
  return true;
}
