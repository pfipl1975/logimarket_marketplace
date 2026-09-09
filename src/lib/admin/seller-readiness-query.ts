import { eq, isNull, and } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  partners,
  sellerLegalIdentities,
  sellerTaxIdentifiers,
  sellerRegistryIdentifiers,
  sellerEligibility,
  agreementVersions,
  partnerAgreementExecutionEvidence,
  partnerAgreementEvidenceInvalidations,
} from "@/lib/schema";
import { type SellerReadinessResult, evaluateSellerReadiness, type SellerReadinessSnapshot } from "../partners/seller-readiness-core";
import { buildSellerDisclosure } from "@/lib/legal/seller-disclosure";

export async function querySellerReadiness(db: NodePgDatabase<any>, partnerId: number): Promise<SellerReadinessResult> {
  // Partner exists
  const partnerRows = await db.select({ id: partners.id }).from(partners).where(eq(partners.id, partnerId)).limit(1);
  const partnerExists = partnerRows.length > 0;

  // Legal Identity
  const legalRows = await db.select().from(sellerLegalIdentities).where(eq(sellerLegalIdentities.partnerId, partnerId)).limit(1);
  const legalIdentity = legalRows[0] || null;
  
  // Tax identifiers
  const taxRows = await db.select({ verificationStatus: sellerTaxIdentifiers.verificationStatus, type: sellerTaxIdentifiers.identifierType, value: sellerTaxIdentifiers.identifierValue, countryCode: sellerTaxIdentifiers.countryCode })
    .from(sellerTaxIdentifiers)
    .where(and(eq(sellerTaxIdentifiers.partnerId, partnerId), isNull(sellerTaxIdentifiers.retiredAt)));

  let isComplete = false;
  let liVerificationStatus: string | null = null;
  if (legalIdentity) {
    const pRows = await db.select({ contactEmail: partners.contactEmail }).from(partners).where(eq(partners.id, partnerId));
    const p = pRows[0];
    const disclosure = buildSellerDisclosure(
      partnerId,
      legalIdentity.legalName || "",
      p?.contactEmail || "",
      {
        addressLine1: legalIdentity.registeredAddressLine1,
        addressLine2: legalIdentity.registeredAddressLine2,
        postalCode: legalIdentity.registeredPostalCode,
        city: legalIdentity.registeredCity,
        region: legalIdentity.registeredRegion,
        countryCode: legalIdentity.registeredCountryCode,
      },
      taxRows.map(t => ({ type: t.type, value: t.value, countryCode: t.countryCode }))
    );
    isComplete = disclosure.completeness.complete;
    liVerificationStatus = legalIdentity.verificationStatus;
  }

    
  // Registry identifiers
  const regRows = await db.select({ verificationStatus: sellerRegistryIdentifiers.verificationStatus })
    .from(sellerRegistryIdentifiers)
    .where(and(eq(sellerRegistryIdentifiers.partnerId, partnerId), isNull(sellerRegistryIdentifiers.retiredAt)));

  // Eligibility
  const eligRows = await db.select({ eligibilityStatus: sellerEligibility.eligibilityStatus })
    .from(sellerEligibility)
    .where(eq(sellerEligibility.partnerId, partnerId))
    .limit(1);

  // Active agreement versions
  const b2bVersions = await db.select({ id: agreementVersions.id, agreementType: agreementVersions.agreementType })
    .from(agreementVersions)
    .where(and(eq(agreementVersions.status, "active"), eq(agreementVersions.agreementType, "partner_agreement_b2b")));

  // Evidence
  const evidenceRows = await db
    .select({
      id: partnerAgreementExecutionEvidence.id,
      agreementVersionId: partnerAgreementExecutionEvidence.agreementVersionId,
      invalidated: partnerAgreementEvidenceInvalidations.executionEvidenceId
    })
    .from(partnerAgreementExecutionEvidence)
    .leftJoin(
      partnerAgreementEvidenceInvalidations,
      eq(partnerAgreementExecutionEvidence.id, partnerAgreementEvidenceInvalidations.executionEvidenceId)
    )
    .where(eq(partnerAgreementExecutionEvidence.partnerId, partnerId));

  const snapshot: SellerReadinessSnapshot = {
    partnerExists,
    legalIdentity: {
      exists: !!legalIdentity,
      isComplete,
      verificationStatus: liVerificationStatus,
    },
    activeTaxIdentifiers: taxRows,
    activeRegistryIdentifiers: regRows,
    eligibility: {
      status: eligRows.length > 0 ? eligRows[0].eligibilityStatus : null,
    },
    activeAgreementVersions: b2bVersions,
    agreementExecutionEvidence: evidenceRows.map(e => ({
      agreementVersionId: e.agreementVersionId,
      isInvalidated: e.invalidated !== null
    }))
  };

  return evaluateSellerReadiness(snapshot);
}


