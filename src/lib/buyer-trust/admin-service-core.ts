import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db as defaultDb } from "../db";
import {
  buyerOrganizations,
  buyerOrganizationAddresses,
  buyerOrganizationMemberships,
  buyerOrganizationVerificationEvents,
  buyerRegistryIdentifiers,
  buyerTaxIdentifiers,
  buyerUserProfiles,
  type BuyerOrganizationMembershipRole,
  type BuyerOrganizationMembershipStatus,
  type BuyerOrganizationVerificationStatus,
} from "../schema";
import type { BuyerTrustDb } from "./service-core";

export type AdminBuyerOrganizationListItem = {
  id: number;
  legalName: string;
  countryCode: string;
  verificationStatus: BuyerOrganizationVerificationStatus;
  createdAt: Date | string;
  taxIdentifier: string | null;
  city: string | null;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
};

export type AdminBuyerMembership = {
  id: number;
  buyerOrganizationId: number;
  role: BuyerOrganizationMembershipRole;
  status: BuyerOrganizationMembershipStatus;
  createdAt: Date | string;
  firstName: string | null;
  lastName: string | null;
  contactEmail: string | null;
  phone: string | null;
};

export function selectPrimaryBuyerContact(memberships: AdminBuyerMembership[]) {
  const selected = memberships
    .filter((member) => member.status === "active")
    .sort((a, b) =>
      Number(b.role === "organization_admin") - Number(a.role === "organization_admin") ||
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
      a.id - b.id
    )[0];
  return {
    name: selected?.firstName && selected?.lastName ? `${selected.firstName} ${selected.lastName}` : null,
    email: selected?.contactEmail ?? null,
  };
}

export async function listAdminBuyerOrganizations(
  database: BuyerTrustDb = defaultDb,
): Promise<AdminBuyerOrganizationListItem[]> {
  try {
    const orgs = await database
      .select({
        id: buyerOrganizations.id,
        legalName: buyerOrganizations.legalName,
        countryCode: buyerOrganizations.jurisdictionCountry,
        verificationStatus: buyerOrganizations.verificationStatus,
        createdAt: buyerOrganizations.createdAt,
      })
      .from(buyerOrganizations)
      .orderBy(desc(buyerOrganizations.createdAt));
    if (orgs.length === 0) return [];

    const [taxRows, addressRows, membershipRows] = await Promise.all([
      database.select({
        organizationId: buyerTaxIdentifiers.buyerOrganizationId,
        value: buyerTaxIdentifiers.identifierValue,
        canonicalClass: buyerTaxIdentifiers.canonicalIdentityClass,
      }).from(buyerTaxIdentifiers).where(isNull(buyerTaxIdentifiers.retiredAt))
        .orderBy(asc(buyerTaxIdentifiers.createdAt), asc(buyerTaxIdentifiers.id)),
      database.select({
        organizationId: buyerOrganizationAddresses.buyerOrganizationId,
        city: buyerOrganizationAddresses.city,
      }).from(buyerOrganizationAddresses).where(and(
        eq(buyerOrganizationAddresses.addressType, "registered"),
        isNull(buyerOrganizationAddresses.retiredAt),
      )),
      database.select({
        id: buyerOrganizationMemberships.id,
        buyerOrganizationId: buyerOrganizationMemberships.buyerOrganizationId,
        role: buyerOrganizationMemberships.membershipRole,
        status: buyerOrganizationMemberships.membershipStatus,
        createdAt: buyerOrganizationMemberships.createdAt,
        firstName: buyerUserProfiles.firstName,
        lastName: buyerUserProfiles.lastName,
        contactEmail: buyerUserProfiles.contactEmail,
        phone: buyerUserProfiles.phone,
      }).from(buyerOrganizationMemberships)
        .leftJoin(buyerUserProfiles, eq(buyerOrganizationMemberships.authUserId, buyerUserProfiles.authUserId))
        .where(eq(buyerOrganizationMemberships.membershipStatus, "active")),
    ]);

    const taxes = new Map<number, { value: string; canonicalClass: string }>();
    for (const row of taxRows) {
      const orgId = Number(row.organizationId);
      const existing = taxes.get(orgId);
      if (!existing || (existing.canonicalClass !== "PL:NIP" && row.canonicalClass === "PL:NIP")) {
        taxes.set(orgId, { value: row.value, canonicalClass: row.canonicalClass });
      }
    }
    const cities = new Map(addressRows.map((row) => [Number(row.organizationId), row.city]));
    const memberships = new Map<number, AdminBuyerMembership[]>();
    for (const row of membershipRows) {
      const orgId = Number(row.buyerOrganizationId);
      const group = memberships.get(orgId) ?? [];
      group.push({ ...row, id: Number(row.id), buyerOrganizationId: orgId });
      memberships.set(orgId, group);
    }

    return orgs.map((org) => {
      const id = Number(org.id);
      const contact = selectPrimaryBuyerContact(memberships.get(id) ?? []);
      return {
        id,
        legalName: org.legalName,
        countryCode: org.countryCode,
        verificationStatus: org.verificationStatus,
        createdAt: org.createdAt,
        taxIdentifier: taxes.get(id)?.value ?? null,
        city: cities.get(id) ?? null,
        primaryContactName: contact.name,
        primaryContactEmail: contact.email,
      };
    });
  } catch (error) {
    console.error("Failed to list admin buyer orgs", error);
    return [];
  }
}

export type AdminBuyerOrganizationDetail = {
  id: number;
  legalName: string;
  countryCode: string;
  verificationStatus: BuyerOrganizationVerificationStatus;
  createdAt: Date | string;
  verifiedAt: Date | string | null;
  registeredAddress: {
    street: string;
    buildingNumber: string;
    unitNumber: string | null;
    postalCode: string;
    city: string;
    countryCode: string;
  } | null;
  memberships: AdminBuyerMembership[];
  taxIdentifiers: {
    id: number;
    type: string;
    value: string;
    country: string;
    trusted: boolean;
  }[];
  registryIdentifiers: {
    id: number;
    type: string;
    value: string;
    country: string;
    trusted: boolean;
  }[];
  history: {
    id: number;
    eventType: string;
    outcomeStatus: string;
    actorType: string;
    sourceType: string;
    method: string;
    reasonCode: string | null;
    occurredAt: Date | string;
  }[];
};

export async function getAdminBuyerOrganizationDetail(
  database: BuyerTrustDb,
  id: number,
): Promise<AdminBuyerOrganizationDetail | null> {
  try {
    const org = await database
      .select({
        id: buyerOrganizations.id,
        legalName: buyerOrganizations.legalName,
        countryCode: buyerOrganizations.jurisdictionCountry,
        verificationStatus: buyerOrganizations.verificationStatus,
        createdAt: buyerOrganizations.createdAt,
        verifiedAt: buyerOrganizations.verifiedAt,
      })
      .from(buyerOrganizations)
      .where(eq(buyerOrganizations.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!org) return null;

    const address = await database.select({
      street: buyerOrganizationAddresses.street,
      buildingNumber: buyerOrganizationAddresses.buildingNumber,
      unitNumber: buyerOrganizationAddresses.unitNumber,
      postalCode: buyerOrganizationAddresses.postalCode,
      city: buyerOrganizationAddresses.city,
      countryCode: buyerOrganizationAddresses.countryCode,
    }).from(buyerOrganizationAddresses).where(and(
      eq(buyerOrganizationAddresses.buyerOrganizationId, org.id),
      eq(buyerOrganizationAddresses.addressType, "registered"),
      isNull(buyerOrganizationAddresses.retiredAt),
    )).limit(1).then((rows) => rows[0] ?? null);

    const members = await database.select({
      id: buyerOrganizationMemberships.id,
      buyerOrganizationId: buyerOrganizationMemberships.buyerOrganizationId,
      role: buyerOrganizationMemberships.membershipRole,
      status: buyerOrganizationMemberships.membershipStatus,
      createdAt: buyerOrganizationMemberships.createdAt,
      firstName: buyerUserProfiles.firstName,
      lastName: buyerUserProfiles.lastName,
      contactEmail: buyerUserProfiles.contactEmail,
      phone: buyerUserProfiles.phone,
    }).from(buyerOrganizationMemberships)
      .leftJoin(buyerUserProfiles, eq(buyerOrganizationMemberships.authUserId, buyerUserProfiles.authUserId))
      .where(eq(buyerOrganizationMemberships.buyerOrganizationId, org.id))
      .orderBy(asc(buyerOrganizationMemberships.createdAt), asc(buyerOrganizationMemberships.id));

    const taxes = await database
      .select({
        id: buyerTaxIdentifiers.id,
        type: buyerTaxIdentifiers.identifierType,
        value: buyerTaxIdentifiers.identifierValue,
        country: buyerTaxIdentifiers.countryCode,
        trustedByEvent: buyerTaxIdentifiers.trustedByVerificationEventId,
      })
      .from(buyerTaxIdentifiers)
      .where(
        and(
          eq(buyerTaxIdentifiers.buyerOrganizationId, org.id),
          isNull(buyerTaxIdentifiers.retiredAt)
        )
      );

    const registries = await database
      .select({
        id: buyerRegistryIdentifiers.id,
        type: buyerRegistryIdentifiers.registryType,
        value: buyerRegistryIdentifiers.registryValue,
        country: buyerRegistryIdentifiers.jurisdictionCountry,
        trustedByEvent: buyerRegistryIdentifiers.trustedByVerificationEventId,
      })
      .from(buyerRegistryIdentifiers)
      .where(
        and(
          eq(buyerRegistryIdentifiers.buyerOrganizationId, org.id),
          isNull(buyerRegistryIdentifiers.retiredAt)
        )
      );

    const events = await database
      .select({
        id: buyerOrganizationVerificationEvents.id,
        eventType: buyerOrganizationVerificationEvents.eventType,
        outcomeStatus: buyerOrganizationVerificationEvents.outcomeStatus,
        actorType: buyerOrganizationVerificationEvents.actorType,
        sourceType: buyerOrganizationVerificationEvents.sourceType,
        method: buyerOrganizationVerificationEvents.verificationMethod,
        reasonCode: buyerOrganizationVerificationEvents.reasonCode,
        occurredAt: buyerOrganizationVerificationEvents.occurredAt,
      })
      .from(buyerOrganizationVerificationEvents)
      .where(eq(buyerOrganizationVerificationEvents.buyerOrganizationId, org.id))
      .orderBy(desc(buyerOrganizationVerificationEvents.occurredAt));

    return {
      id: Number(org.id),
      legalName: org.legalName,
      countryCode: org.countryCode,
      verificationStatus: org.verificationStatus,
      createdAt: org.createdAt,
      verifiedAt: org.verifiedAt,
      registeredAddress: address,
      memberships: members.map((member) => ({
        ...member,
        id: Number(member.id),
        buyerOrganizationId: Number(member.buyerOrganizationId),
      })),
      taxIdentifiers: taxes.map((t) => ({
        id: Number(t.id),
        type: t.type,
        value: t.value,
        country: t.country,
        trusted: t.trustedByEvent !== null,
      })),
      registryIdentifiers: registries.map((r) => ({
        id: Number(r.id),
        type: r.type,
        value: r.value,
        country: r.country,
        trusted: r.trustedByEvent !== null,
      })),
      history: events.map((e) => ({
        id: Number(e.id),
        eventType: e.eventType,
        outcomeStatus: e.outcomeStatus,
        actorType: e.actorType,
        sourceType: e.sourceType,
        method: e.method,
        reasonCode: e.reasonCode,
        occurredAt: e.occurredAt,
      })),
    };
  } catch (error) {
    console.error("Failed to load admin buyer org details", error);
    return null;
  }
}
