export type SellerReadinessBlocker =
  | "missing_partner"
  | "missing_legal_identity"
  | "incomplete_legal_identity"
  | "missing_tax_identity"
  | "verification_not_valid"
  | "eligibility_not_eligible"
  | "active_agreement_missing"
  | "active_agreement_ambiguous"
  | "agreement_execution_missing"
  | "agreement_execution_invalidated";

export interface SellerReadinessResult {
  status: "ready" | "not_ready";
  blockers: SellerReadinessBlocker[];
}

export interface SellerReadinessSnapshot {
  partnerExists: boolean;
  legalIdentity: {
    exists: boolean;
    isComplete: boolean;
    verificationStatus: string | null;
  };
  activeTaxIdentifiers: Array<{
    verificationStatus: string | null;
  }>;
  activeRegistryIdentifiers: Array<{
    verificationStatus: string | null;
  }>;
  eligibility: {
    status: string | null;
  };
  activeAgreementVersions: Array<{
    id: number;
    agreementType: string;
  }>;
  agreementExecutionEvidence: Array<{
    isInvalidated: boolean;
    agreementVersionId: number;
  }>;
}

export function evaluateSellerReadiness(snapshot: SellerReadinessSnapshot): SellerReadinessResult {
  const blockers: SellerReadinessBlocker[] = [];

  if (!snapshot.partnerExists) {
    blockers.push("missing_partner");
  }

  if (!snapshot.legalIdentity.exists) {
    blockers.push("missing_legal_identity");
  } else if (!snapshot.legalIdentity.isComplete) {
    blockers.push("incomplete_legal_identity");
  }

  if (snapshot.activeTaxIdentifiers.length === 0) {
    blockers.push("missing_tax_identity");
  }

  // Verification checks
  let isVerificationValid = true;
  if (snapshot.legalIdentity.exists && snapshot.legalIdentity.verificationStatus !== "verified") {
    isVerificationValid = false;
  }
  for (const tax of snapshot.activeTaxIdentifiers) {
    if (tax.verificationStatus !== "verified") {
      isVerificationValid = false;
      break;
    }
  }
  for (const reg of snapshot.activeRegistryIdentifiers) {
    if (reg.verificationStatus !== "verified") {
      isVerificationValid = false;
      break;
    }
  }

  if (!isVerificationValid && snapshot.legalIdentity.exists) {
    blockers.push("verification_not_valid");
  }

  if (snapshot.eligibility.status !== "eligible") {
    blockers.push("eligibility_not_eligible");
  }

  let activeVersionId: number | null = null;
  const b2bVersions = snapshot.activeAgreementVersions.filter(v => v.agreementType === "partner_agreement_b2b");
  
  if (b2bVersions.length === 0) {
    blockers.push("active_agreement_missing");
  } else if (b2bVersions.length > 1) {
    blockers.push("active_agreement_ambiguous");
  } else {
    activeVersionId = b2bVersions[0].id;
  }

  if (activeVersionId !== null) {
    const evidenceForActive = snapshot.agreementExecutionEvidence.filter(e => e.agreementVersionId === activeVersionId);
    
    if (evidenceForActive.length === 0) {
      blockers.push("agreement_execution_missing");
    } else {
      // Check if ALL evidence is invalidated
      const validEvidence = evidenceForActive.filter(e => !e.isInvalidated);
      if (validEvidence.length === 0) {
        blockers.push("agreement_execution_invalidated");
      }
    }
  }

  // Deduplicate blockers
  const uniqueBlockers = Array.from(new Set(blockers));

  return {
    status: uniqueBlockers.length === 0 ? "ready" : "not_ready",
    blockers: uniqueBlockers,
  };
}
