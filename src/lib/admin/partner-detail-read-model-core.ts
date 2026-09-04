import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@/lib/schema";
import {
  partners,
  sellerLegalIdentities,
  sellerTaxIdentifiers,
  sellerRegistryIdentifiers,
  sellerEligibility,
} from "@/lib/schema";
import { isCanonicalPositiveInteger } from "./partners-query";
import { buildSellerDisclosure, type SellerDisclosureMissingField } from "@/lib/legal/seller-disclosure";
import {
  getActivePartnerAgreementVersion,
  getPartnerAgreementExecutionEvidence,
  hasRecordedPartnerAgreementExecutionEvidence,
  type RecordedEvidenceDto,
} from "@/lib/legal/partner-agreement-core";

export interface AdminPartnerDetailDto {
  partner: {
    id: number;
    companyName: string;
    contactEmail: string;
    websiteUrl: string | null;
    logoUrl: string | null;
    createdAt: string;
  };
  legalIdentity: {
    legalName: string;
    jurisdictionCountry: string;
    registeredAddressLine1: string | null;
    registeredAddressLine2: string | null;
    registeredPostalCode: string | null;
    registeredCity: string | null;
    registeredRegion: string | null;
    registeredCountryCode: string | null;
    verificationStatus: string;
    verifiedAt: string | null;
    verificationSource: string | null;
    verificationReference: string | null;
  } | null;
  taxIdentifiers: Array<{
    id: number;
    identifierType: string;
    identifierValue: string;
    countryCode: string;
    verificationStatus: string;
    verifiedAt: string | null;
    verificationSource: string | null;
    verificationReference: string | null;
  }>;
  registryIdentifiers: Array<{
    id: number;
    registryType: string;
    registryValue: string;
    jurisdictionCountry: string;
  }>;
  eligibility: {
    eligibilityStatus: string;
    reason: string | null;
    updatedAt: string | null;
  } | null;
  sellerDisclosureCompleteness: {
    complete: boolean;
    missing: SellerDisclosureMissingField[];
  };
  agreementEvidence: {
    hasActiveVersion: boolean;
    activeVersion: {
      id: number;
      version: string;
      agreementType: string;
      canonicalTemplateHashSha256: string;
      effectiveFrom: string | null;
      publishedAt: string | null;
    } | null;
    hasRecordedEvidence: boolean;
    evidence: RecordedEvidenceDto[];
  };
}

export type AdminPartnerDetailResult =
  | { ok: true; data: AdminPartnerDetailDto }
  | { ok: false; code: "INVALID_ID" | "NOT_FOUND" };

export async function getAdminPartnerDetailReadModel<TSchema extends Record<string, unknown>>(
  db: NodePgDatabase<TSchema>,
  rawId: string
): Promise<AdminPartnerDetailResult> {
  if (!isCanonicalPositiveInteger(rawId)) {
    return { ok: false, code: "INVALID_ID" };
  }

  const id = parseInt(rawId, 10);

  const partnerRows = await db
    .select({
      id: partners.id,
      companyName: partners.companyName,
      contactEmail: partners.contactEmail,
      websiteUrl: partners.websiteUrl,
      logoUrl: partners.logoUrl,
      createdAt: partners.createdAt,
    })
    .from(partners)
    .where(eq(partners.id, id))
    .limit(1);

  if (partnerRows.length === 0) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const partnerRow = partnerRows[0];

  const legalIdentityRows = await db
    .select()
    .from(sellerLegalIdentities)
    .where(eq(sellerLegalIdentities.partnerId, id))
    .limit(1);

  const taxIdentifierRows = await db
    .select()
    .from(sellerTaxIdentifiers)
    .where(eq(sellerTaxIdentifiers.partnerId, id));

  const registryIdentifierRows = await db
    .select()
    .from(sellerRegistryIdentifiers)
    .where(eq(sellerRegistryIdentifiers.partnerId, id));

  const eligibilityRows = await db
    .select()
    .from(sellerEligibility)
    .where(eq(sellerEligibility.partnerId, id))
    .limit(1);

  const [activeVersion, evidenceList, hasRecorded] = await Promise.all([
    getActivePartnerAgreementVersion(db),
    getPartnerAgreementExecutionEvidence(db, id),
    hasRecordedPartnerAgreementExecutionEvidence(db, id),
  ]);

  const disclosure = buildSellerDisclosure(
    partnerRow.id,
    legalIdentityRows.length > 0 ? legalIdentityRows[0].legalName : null,
    partnerRow.contactEmail,
    {
      addressLine1: legalIdentityRows.length > 0 ? legalIdentityRows[0].registeredAddressLine1 : null,
      addressLine2: legalIdentityRows.length > 0 ? legalIdentityRows[0].registeredAddressLine2 : null,
      postalCode: legalIdentityRows.length > 0 ? legalIdentityRows[0].registeredPostalCode : null,
      city: legalIdentityRows.length > 0 ? legalIdentityRows[0].registeredCity : null,
      region: legalIdentityRows.length > 0 ? legalIdentityRows[0].registeredRegion : null,
      countryCode: legalIdentityRows.length > 0 ? legalIdentityRows[0].registeredCountryCode : null,
    },
    taxIdentifierRows.map(t => ({
      type: t.identifierType,
      value: t.identifierValue,
      countryCode: t.countryCode
    }))
  );

  return {
    ok: true,
    data: {
      partner: {
        id: partnerRow.id,
        companyName: partnerRow.companyName,
        contactEmail: partnerRow.contactEmail,
        websiteUrl: partnerRow.websiteUrl,
        logoUrl: partnerRow.logoUrl,
        createdAt: partnerRow.createdAt.toISOString(),
      },
      legalIdentity: legalIdentityRows.length > 0 ? {
        legalName: legalIdentityRows[0].legalName,
        jurisdictionCountry: legalIdentityRows[0].jurisdictionCountry,
        registeredAddressLine1: legalIdentityRows[0].registeredAddressLine1,
        registeredAddressLine2: legalIdentityRows[0].registeredAddressLine2,
        registeredPostalCode: legalIdentityRows[0].registeredPostalCode,
        registeredCity: legalIdentityRows[0].registeredCity,
        registeredRegion: legalIdentityRows[0].registeredRegion,
        registeredCountryCode: legalIdentityRows[0].registeredCountryCode,
        verificationStatus: legalIdentityRows[0].verificationStatus,
        verifiedAt: legalIdentityRows[0].verifiedAt?.toISOString() ?? null,
        verificationSource: legalIdentityRows[0].verificationSource,
        verificationReference: legalIdentityRows[0].verificationReference,
      } : null,
      taxIdentifiers: taxIdentifierRows.map(row => ({
        id: row.id,
        identifierType: row.identifierType,
        identifierValue: row.identifierValue,
        countryCode: row.countryCode,
        verificationStatus: row.verificationStatus,
        verifiedAt: row.verifiedAt?.toISOString() ?? null,
        verificationSource: row.verificationSource,
        verificationReference: row.verificationReference,
      })),
      registryIdentifiers: registryIdentifierRows.map(row => ({
        id: row.id,
        registryType: row.registryType,
        registryValue: row.registryValue,
        jurisdictionCountry: row.jurisdictionCountry,
      })),
      eligibility: eligibilityRows.length > 0 ? {
        eligibilityStatus: eligibilityRows[0].eligibilityStatus,
        reason: eligibilityRows[0].reason,
        updatedAt: eligibilityRows[0].updatedAt?.toISOString() ?? null,
      } : null,
      sellerDisclosureCompleteness: disclosure.completeness,
      agreementEvidence: {
        hasActiveVersion: activeVersion !== null,
        activeVersion,
        hasRecordedEvidence: hasRecorded,
        evidence: evidenceList,
      },
    }
  };
}
