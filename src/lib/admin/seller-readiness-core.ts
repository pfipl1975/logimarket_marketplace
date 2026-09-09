import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, and, isNull } from "drizzle-orm";
import {
  partners,
  sellerLegalIdentities,
  sellerTaxIdentifiers,
  sellerRegistryIdentifiers,
  sellerEligibility,
  agreementVersions,
  partnerAgreementExecutionEvidence,
  partnerAgreementEvidenceInvalidations,
} from "../schema";

export type SellerReadinessBlocker =
  | "missing_legal_identity"
  | "incomplete_legal_identity"
  | "missing_tax_identity"
  | "verification_missing"
  | "verification_not_valid"
  | "eligibility_not_eligible"
  | "active_agreement_missing"
  | "active_agreement_ambiguous"
  | "agreement_execution_missing"
  | "agreement_execution_invalidated";

export type SellerReadinessResult = {
  status: "ready" | "not_ready";
  blockers: SellerReadinessBlocker[];
  checks: {
    legalIdentity: boolean;
    taxIdentity: boolean;
    verification: boolean;
    eligibility: boolean;
    activeAgreement: boolean;
    agreementExecution: boolean;
  };
};

export async function resolveSellerReadiness<TSchema extends Record<string, unknown>>(
  db: NodePgDatabase<TSchema>,
  partnerId: number
): Promise<SellerReadinessResult> {
  const blockers: SellerReadinessBlocker[] = [];
  const checks = {
    legalIdentity: false,
    taxIdentity: false,
    verification: false,
    eligibility: false,
    activeAgreement: false,
    agreementExecution: false,
  };

  // 1. Fetch Partner & Legal Identity
  const pRows = await db
    .select({
      contactEmail: partners.contactEmail,
      legalName: sellerLegalIdentities.legalName,
      addressLine1: sellerLegalIdentities.registeredAddressLine1,
      postalCode: sellerLegalIdentities.registeredPostalCode,
      city: sellerLegalIdentities.registeredCity,
      countryCode: sellerLegalIdentities.registeredCountryCode,
      verificationStatus: sellerLegalIdentities.verificationStatus,
    })
    .from(partners)
    .leftJoin(sellerLegalIdentities, eq(sellerLegalIdentities.partnerId, partners.id))
    .where(eq(partners.id, partnerId))
    .limit(1);

  if (pRows.length === 0) {
    return {
      status: "not_ready",
      blockers: ["missing_legal_identity"],
      checks,
    };
  }

  const p = pRows[0];

  let hasUnverifiedOrFailed = false;
  if (!p.legalName) {
    blockers.push("missing_legal_identity");
  } else {
    if (!p.contactEmail || !p.addressLine1 || !p.postalCode || !p.city || !p.countryCode) {
      blockers.push("incomplete_legal_identity");
    } else {
      checks.legalIdentity = true;
    }
    
    if (p.verificationStatus !== "verified") {
      hasUnverifiedOrFailed = true;
    }
  }

  const taxRows = await db
    .select({
      id: sellerTaxIdentifiers.id,
      verificationStatus: sellerTaxIdentifiers.verificationStatus,
    })
    .from(sellerTaxIdentifiers)
    .where(
      and(
        eq(sellerTaxIdentifiers.partnerId, partnerId),
        isNull(sellerTaxIdentifiers.retiredAt)
      )
    );

  if (taxRows.length === 0) {
    blockers.push("missing_tax_identity");
  } else {
    checks.taxIdentity = true;
    for (const tax of taxRows) {
      if (tax.verificationStatus !== "verified") {
        hasUnverifiedOrFailed = true;
      }
    }
  }

  const regRows = await db
    .select({
      id: sellerRegistryIdentifiers.id,
      verificationStatus: sellerRegistryIdentifiers.verificationStatus,
    })
    .from(sellerRegistryIdentifiers)
    .where(
      and(
        eq(sellerRegistryIdentifiers.partnerId, partnerId),
        isNull(sellerRegistryIdentifiers.retiredAt)
      )
    );

  for (const reg of regRows) {
    if (reg.verificationStatus !== "verified") {
      hasUnverifiedOrFailed = true;
    }
  }

  if (checks.legalIdentity && checks.taxIdentity) {
    if (hasUnverifiedOrFailed) {
      blockers.push("verification_not_valid");
    } else {
      checks.verification = true;
    }
  } else {
    blockers.push("verification_missing");
  }

  const eligRows = await db
    .select({
      status: sellerEligibility.eligibilityStatus,
    })
    .from(sellerEligibility)
    .where(eq(sellerEligibility.partnerId, partnerId))
    .limit(1);

  if (eligRows.length === 0 || eligRows[0].status !== "eligible") {
    blockers.push("eligibility_not_eligible");
  } else {
    checks.eligibility = true;
  }

  const activeVersions = await db
    .select({ id: agreementVersions.id })
    .from(agreementVersions)
    .where(eq(agreementVersions.status, "active"));

  if (activeVersions.length === 0) {
    blockers.push("active_agreement_missing");
  } else if (activeVersions.length > 1) {
    blockers.push("active_agreement_ambiguous");
  } else {
    checks.activeAgreement = true;
    const activeVersionId = activeVersions[0].id;

    const evidenceRows = await db
      .select({ id: partnerAgreementExecutionEvidence.id })
      .from(partnerAgreementExecutionEvidence)
      .leftJoin(
        partnerAgreementEvidenceInvalidations,
        eq(partnerAgreementEvidenceInvalidations.executionEvidenceId, partnerAgreementExecutionEvidence.id)
      )
      .where(
        and(
          eq(partnerAgreementExecutionEvidence.partnerId, partnerId),
          eq(partnerAgreementExecutionEvidence.agreementVersionId, activeVersionId),
          isNull(partnerAgreementEvidenceInvalidations.id)
        )
      )
      .limit(1);

    if (evidenceRows.length === 0) {
      blockers.push("agreement_execution_missing");
    } else {
      checks.agreementExecution = true;
    }
  }

  return {
    status: blockers.length === 0 ? "ready" : "not_ready",
    blockers: Array.from(new Set(blockers)).sort(),
    checks,
  };
}

