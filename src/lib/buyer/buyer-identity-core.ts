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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async verifyByNip(_canonicalNip: string): Promise<BuyerIdentityVerificationResult> {
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
  
  const result = await provider.verifyByNip(normalized);
  
  if (result.status === "verified") {
    // Fail closed if provider returns mismatched NIP
    if (result.canonicalNip !== normalized) {
      return { status: "failed", reason: "BUYER_IDENTITY_VERIFICATION_UNAVAILABLE" };
    }
    
    // Fail closed if business name is missing or whitespace
    if (!result.businessName || result.businessName.trim().length === 0) {
      return { status: "failed", reason: "BUYER_IDENTITY_VERIFICATION_UNAVAILABLE" };
    }
  }
  
  return result;
}
