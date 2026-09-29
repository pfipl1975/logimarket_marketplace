import "server-only";

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  buyerOrganizationAddresses,
  buyerOrganizationMemberships,
  buyerOrganizations,
  buyerTaxIdentifiers,
  buyerUserProfiles,
} from "@/lib/schema";
import type { BuyerTrustDb } from "@/lib/buyer-trust/service-core";
import { deriveBuyerProfileReadiness, isCanonicalNipUniqueViolation, type BuyerOnboardingInput, type BuyerProfileField } from "./core";

export type BuyerAccountOrganization = {
  id: number;
  legalName: string;
  jurisdictionCountry: string;
  nip: string | null;
  registeredAddress: {
    street: string; buildingNumber: string; unitNumber: string | null; postalCode: string; city: string; countryCode: string;
  } | null;
  contactProfile: { firstName: string; lastName: string; contactEmail: string; phone: string } | null;
  profileComplete: boolean;
  missingFields: BuyerProfileField[];
  membershipRole: "organization_admin" | "authorized_buyer";
  verificationStatus: "pending" | "verified" | "rejected" | "revoked";
};

export async function loadBuyerAccountOrganizations(
  authUserId: string,
  database: BuyerTrustDb = db,
): Promise<BuyerAccountOrganization[]> {
  const rows = await database.select({
    id: buyerOrganizations.id,
    legalName: buyerOrganizations.legalName,
    jurisdictionCountry: buyerOrganizations.jurisdictionCountry,
    nip: buyerTaxIdentifiers.canonicalIdentifierValue,
    street: buyerOrganizationAddresses.street,
    buildingNumber: buyerOrganizationAddresses.buildingNumber,
    unitNumber: buyerOrganizationAddresses.unitNumber,
    postalCode: buyerOrganizationAddresses.postalCode,
    city: buyerOrganizationAddresses.city,
    addressCountryCode: buyerOrganizationAddresses.countryCode,
    firstName: buyerUserProfiles.firstName,
    lastName: buyerUserProfiles.lastName,
    contactEmail: buyerUserProfiles.contactEmail,
    phone: buyerUserProfiles.phone,
    membershipRole: buyerOrganizationMemberships.membershipRole,
    verificationStatus: buyerOrganizations.verificationStatus,
  }).from(buyerOrganizationMemberships)
    .innerJoin(buyerOrganizations, eq(buyerOrganizations.id, buyerOrganizationMemberships.buyerOrganizationId))
    .leftJoin(buyerTaxIdentifiers, and(
      eq(buyerTaxIdentifiers.buyerOrganizationId, buyerOrganizations.id),
      eq(buyerTaxIdentifiers.identifierType, "tax_id"),
      eq(buyerTaxIdentifiers.countryCode, "PL"),
      eq(buyerTaxIdentifiers.canonicalIdentityClass, "PL:NIP"),
      isNull(buyerTaxIdentifiers.retiredAt),
    ))
    .leftJoin(buyerOrganizationAddresses, and(
      eq(buyerOrganizationAddresses.buyerOrganizationId, buyerOrganizations.id),
      eq(buyerOrganizationAddresses.addressType, "registered"),
      isNull(buyerOrganizationAddresses.retiredAt),
    ))
    .leftJoin(buyerUserProfiles, eq(buyerUserProfiles.authUserId, authUserId))
    .where(and(
      eq(buyerOrganizationMemberships.authUserId, authUserId),
      eq(buyerOrganizationMemberships.membershipStatus, "active"),
      isNull(buyerOrganizationMemberships.endedAt),
    ))
    .orderBy(asc(buyerOrganizations.id));

  const organizations = new Map<number, BuyerAccountOrganization>();
  for (const row of rows) {
    const existing = organizations.get(row.id);
    if (existing) {
      if (!existing.nip && row.nip) existing.nip = row.nip;
      continue;
    }
    const registeredAddress = row.street && row.buildingNumber && row.postalCode && row.city && row.addressCountryCode
      ? { street: row.street, buildingNumber: row.buildingNumber, unitNumber: row.unitNumber, postalCode: row.postalCode, city: row.city, countryCode: row.addressCountryCode }
      : null;
    const contactProfile = row.firstName && row.lastName && row.contactEmail && row.phone
      ? { firstName: row.firstName, lastName: row.lastName, contactEmail: row.contactEmail, phone: row.phone }
      : null;
    const readiness = deriveBuyerProfileReadiness({
      legalName: row.legalName, nip: row.nip, jurisdictionCountry: row.jurisdictionCountry,
      address: registeredAddress, contact: contactProfile,
    });
    organizations.set(row.id, {
      id: row.id, legalName: row.legalName, jurisdictionCountry: row.jurisdictionCountry,
      nip: row.nip, registeredAddress, contactProfile,
      membershipRole: row.membershipRole, verificationStatus: row.verificationStatus,
      ...readiness,
    });
  }
  return [...organizations.values()];
}

export type CreateBuyerOrganizationResult = "CREATED" | "ALREADY_HAS_ORGANIZATION" | "BUYER_ORGANIZATION_NIP_ALREADY_EXISTS";

/** Serializes first-organization creation by authenticated UUID inside PostgreSQL. */
export async function createFirstBuyerOrganization(
  authUserId: string,
  input: BuyerOnboardingInput,
  database: BuyerTrustDb = db,
): Promise<CreateBuyerOrganizationResult> {
  try {
    return await database.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('buyer_first_organization'), hashtext(${authUserId}))`);
    const existing = await tx.select({ id: buyerOrganizationMemberships.id })
      .from(buyerOrganizationMemberships)
      .where(and(
        eq(buyerOrganizationMemberships.authUserId, authUserId),
        eq(buyerOrganizationMemberships.membershipStatus, "active"),
        isNull(buyerOrganizationMemberships.endedAt),
      )).limit(1);
    if (existing.length > 0) return "ALREADY_HAS_ORGANIZATION";

    const [organization] = await tx.insert(buyerOrganizations).values({
      legalName: input.legalName,
      jurisdictionCountry: "PL",
      verificationStatus: "pending",
      currentVerificationEventId: null,
      verifiedAt: null,
    }).returning({ id: buyerOrganizations.id });
    if (!organization) throw new Error("BUYER_ORGANIZATION_INSERT_FAILED");

    await tx.insert(buyerTaxIdentifiers).values({
      buyerOrganizationId: organization.id,
      identifierType: "tax_id",
      identifierValue: input.nip,
      countryCode: "PL",
      canonicalIdentityClass: "PL:NIP",
      canonicalIdentifierValue: input.nip,
      trustedByVerificationEventId: null,
      retiredAt: null,
    });
    await tx.insert(buyerOrganizationAddresses).values({
      buyerOrganizationId: organization.id,
      addressType: "registered",
      street: input.street,
      buildingNumber: input.buildingNumber,
      unitNumber: input.unitNumber,
      postalCode: input.postalCode,
      city: input.city,
      countryCode: "PL",
      retiredAt: null,
    });
    await tx.insert(buyerOrganizationMemberships).values({
      authUserId,
      buyerOrganizationId: organization.id,
      membershipRole: "organization_admin",
      membershipStatus: "active",
      endedAt: null,
    });
    await tx.insert(buyerUserProfiles).values({
      authUserId,
      firstName: input.firstName,
      lastName: input.lastName,
      contactEmail: input.contactEmail,
      phone: input.phone,
    }).onConflictDoUpdate({
      target: buyerUserProfiles.authUserId,
      set: { firstName: input.firstName, lastName: input.lastName, contactEmail: input.contactEmail, phone: input.phone, updatedAt: new Date() },
    });
    return "CREATED";
    });
  } catch (error) {
    if (isCanonicalNipUniqueViolation(error)) return "BUYER_ORGANIZATION_NIP_ALREADY_EXISTS";
    throw error;
  }
}
