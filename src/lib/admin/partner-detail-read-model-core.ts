import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import {
  partners,
  sellerLegalIdentities,
  sellerTaxIdentifiers,
  sellerRegistryIdentifiers,
  sellerEligibility,
} from "@/lib/schema";
import { isCanonicalPositiveInteger } from "./partners-query";

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
    verificationStatus: string;
    verifiedAt: string | null;
    verificationSource: string | null;
    verificationReference: string | null;
  } | null;
  taxIdentifiers: Array<{
    identifierType: string;
    identifierValue: string;
    countryCode: string;
    verificationStatus: string;
    verifiedAt: string | null;
    verificationSource: string | null;
    verificationReference: string | null;
  }>;
  registryIdentifiers: Array<{
    registryType: string;
    registryValue: string;
    jurisdictionCountry: string;
  }>;
  eligibility: {
    eligibilityStatus: string;
    reason: string | null;
    updatedAt: string | null;
  } | null;
}

export type AdminPartnerDetailResult =
  | { ok: true; data: AdminPartnerDetailDto }
  | { ok: false; code: "INVALID_ID" | "NOT_FOUND" };

export async function getAdminPartnerDetailReadModel(
  db: NodePgDatabase<typeof schema>,
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
        verificationStatus: legalIdentityRows[0].verificationStatus,
        verifiedAt: legalIdentityRows[0].verifiedAt?.toISOString() ?? null,
        verificationSource: legalIdentityRows[0].verificationSource,
        verificationReference: legalIdentityRows[0].verificationReference,
      } : null,
      taxIdentifiers: taxIdentifierRows.map(row => ({
        identifierType: row.identifierType,
        identifierValue: row.identifierValue,
        countryCode: row.countryCode,
        verificationStatus: row.verificationStatus,
        verifiedAt: row.verifiedAt?.toISOString() ?? null,
        verificationSource: row.verificationSource,
        verificationReference: row.verificationReference,
      })),
      registryIdentifiers: registryIdentifierRows.map(row => ({
        registryType: row.registryType,
        registryValue: row.registryValue,
        jurisdictionCountry: row.jurisdictionCountry,
      })),
      eligibility: eligibilityRows.length > 0 ? {
        eligibilityStatus: eligibilityRows[0].eligibilityStatus,
        reason: eligibilityRows[0].reason,
        updatedAt: eligibilityRows[0].updatedAt?.toISOString() ?? null,
      } : null,
    }
  };
}
