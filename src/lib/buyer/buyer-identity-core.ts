export type BuyerIdentityVerificationFailure =
  | "INVALID_BUYER_IDENTITY"
  | "BUYER_IDENTITY_NOT_FOUND"
  | "BUYER_IDENTITY_VERIFICATION_UNAVAILABLE"
  | "BUYER_IDENTITY_AMBIGUOUS";

export interface BuyerIdentityVerifiedResult {
  status: "verified";
  countryCode: "PL";
  canonicalNip: string;
  businessName: string;
  regon?: string;
  krs?: string;
  registeredAddress?: string;
  businessVerificationMethod: string;
  businessVerificationSource: string;
  businessVerifiedAt: Date;
}

export type BuyerIdentityVerificationResult =
  | BuyerIdentityVerifiedResult
  | { status: "failed"; reason: BuyerIdentityVerificationFailure };

/**
 * Normalizes NIP by removing spaces and hyphens.
 */
export function normalizePlNip(nip: string): string {
  return nip.replace(/[\s-]/g, "");
}

/**
 * Validates PL NIP checksum.
 */
export function isValidPlNip(nip: string): boolean {
  const normalized = normalizePlNip(nip);
  if (!/^\d{10}$/.test(normalized)) {
    return false;
  }
  
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(normalized[i]!, 10) * weights[i]!;
  }
  
  const checksum = sum % 11;
  if (checksum === 10) return false;
  
  return checksum === parseInt(normalized[9]!, 10);
}

export interface BuyerBusinessIdentityProvider {
  verifyByNip(canonicalNip: string): Promise<BuyerIdentityVerificationResult>;
}

export class UnavailableBuyerBusinessIdentityProvider implements BuyerBusinessIdentityProvider {
  async verifyByNip(): Promise<BuyerIdentityVerificationResult> {
    return { status: "failed", reason: "BUYER_IDENTITY_VERIFICATION_UNAVAILABLE" };
  }
}

/**
 * Core domain service to coordinate verification, ensuring NIP validity 
 * and protecting against fake verification evidence.
 */
export async function verifyBuyerIdentity(
  nipInput: string,
  provider: BuyerBusinessIdentityProvider
): Promise<BuyerIdentityVerificationResult> {
  const normalized = normalizePlNip(nipInput);
  
  if (!isValidPlNip(normalized)) {
    return { status: "failed", reason: "INVALID_BUYER_IDENTITY" };
  }
  
  let result: BuyerIdentityVerificationResult;
  try {
    result = await provider.verifyByNip(normalized);
  } catch {
    return { status: "failed", reason: "BUYER_IDENTITY_VERIFICATION_UNAVAILABLE" };
  }
  
  if (result.status === "verified") {
    if (result.countryCode !== "PL") {
      return { status: "failed", reason: "BUYER_IDENTITY_VERIFICATION_UNAVAILABLE" };
    }
    if (result.canonicalNip !== normalized) {
      return { status: "failed", reason: "BUYER_IDENTITY_VERIFICATION_UNAVAILABLE" };
    }
    if (!result.businessName || result.businessName.trim().length === 0) {
      return { status: "failed", reason: "BUYER_IDENTITY_VERIFICATION_UNAVAILABLE" };
    }
    if (!result.businessVerificationMethod || result.businessVerificationMethod.trim().length === 0) {
      return { status: "failed", reason: "BUYER_IDENTITY_VERIFICATION_UNAVAILABLE" };
    }
    if (!result.businessVerificationSource || result.businessVerificationSource.trim().length === 0) {
      return { status: "failed", reason: "BUYER_IDENTITY_VERIFICATION_UNAVAILABLE" };
    }
    if (!(result.businessVerifiedAt instanceof Date) || Number.isNaN(result.businessVerifiedAt.getTime())) {
      return { status: "failed", reason: "BUYER_IDENTITY_VERIFICATION_UNAVAILABLE" };
    }
  }
  
  return result;
}
