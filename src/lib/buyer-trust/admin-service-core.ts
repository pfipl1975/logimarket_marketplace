import { and, desc, eq, isNull } from "drizzle-orm";
import { db as defaultDb } from "../db";
import {
  buyerOrganizations,
  buyerOrganizationVerificationEvents,
  buyerRegistryIdentifiers,
  buyerTaxIdentifiers,
  type BuyerOrganizationVerificationStatus,
} from "../schema";
import type { BuyerTrustDb } from "./service-core";

export type AdminBuyerOrganizationListItem = {
  id: number;
  legalName: string;
  countryCode: string;
  verificationStatus: BuyerOrganizationVerificationStatus;
  verifiedAt: Date | string | null;
  taxIdentifier: string | null;
  registryIdentifier: string | null;
  lastEventDate: Date | string | null;
};

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
        verifiedAt: buyerOrganizations.verifiedAt,
        currentVerificationEventId: buyerOrganizations.currentVerificationEventId,
      })
      .from(buyerOrganizations)
      .orderBy(desc(buyerOrganizations.createdAt));

    const result: AdminBuyerOrganizationListItem[] = [];

    for (const org of orgs) {
      const taxRow = await database
        .select({ value: buyerTaxIdentifiers.identifierValue })
        .from(buyerTaxIdentifiers)
        .where(
          and(
            eq(buyerTaxIdentifiers.buyerOrganizationId, org.id),
            isNull(buyerTaxIdentifiers.retiredAt)
          )
        )
        .limit(1)
        .then((r) => r[0]);

      const regRow = await database
        .select({ value: buyerRegistryIdentifiers.registryValue })
        .from(buyerRegistryIdentifiers)
        .where(
          and(
            eq(buyerRegistryIdentifiers.buyerOrganizationId, org.id),
            isNull(buyerRegistryIdentifiers.retiredAt)
          )
        )
        .limit(1)
        .then((r) => r[0]);

      const eventRow = org.currentVerificationEventId ? await database
        .select({ occurredAt: buyerOrganizationVerificationEvents.occurredAt })
        .from(buyerOrganizationVerificationEvents)
        .where(eq(buyerOrganizationVerificationEvents.id, org.currentVerificationEventId))
        .limit(1)
        .then((r) => r[0]) : null;

      result.push({
        id: org.id,
        legalName: org.legalName,
        countryCode: org.countryCode,
        verificationStatus: org.verificationStatus,
        verifiedAt: org.verifiedAt,
        taxIdentifier: taxRow?.value ?? null,
        registryIdentifier: regRow?.value ?? null,
        lastEventDate: eventRow?.occurredAt ?? null,
      });
    }

    return result;
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
  verifiedAt: Date | string | null;
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
        verifiedAt: buyerOrganizations.verifiedAt,
      })
      .from(buyerOrganizations)
      .where(eq(buyerOrganizations.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!org) return null;

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
      id: org.id,
      legalName: org.legalName,
      countryCode: org.countryCode,
      verificationStatus: org.verificationStatus,
      verifiedAt: org.verifiedAt,
      taxIdentifiers: taxes.map((t) => ({
        id: t.id,
        type: t.type,
        value: t.value,
        country: t.country,
        trusted: t.trustedByEvent !== null,
      })),
      registryIdentifiers: registries.map((r) => ({
        id: r.id,
        type: r.type,
        value: r.value,
        country: r.country,
        trusted: r.trustedByEvent !== null,
      })),
      history: events.map((e) => ({
        id: e.id,
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
