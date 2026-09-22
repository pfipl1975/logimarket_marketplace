import { and, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { isValidPlNip, normalizePlNip } from "../buyer/buyer-identity-core";
import { db as defaultDb } from "../db";
import * as schema from "../schema";
import {
  buyerOrganizationMemberships,
  buyerOrganizations,
  buyerOrganizationVerificationEvents,
  buyerRegistryIdentifiers,
  buyerTaxIdentifiers,
  type BuyerOrganizationVerificationActorType,
  type BuyerOrganizationVerificationEventType,
  type BuyerOrganizationVerificationSourceType,
  type BuyerOrganizationVerificationStatus,
} from "../schema";
import {
  evaluateBuyerOrganizationMembership,
  evaluateBuyerTrustTransition,
  evaluateTrustedBuyerIdentity,
  parseSafePositiveId,
  validateBuyerTrustEventAuthority,
  type BuyerTrustFailureCode,
  type BuyerTrustResult,
  type TrustedBuyerIdentity,
} from "./core";

export type BuyerTrustDb = NodePgDatabase<typeof schema>;

export type BuyerTrustTransitionInput = {
  buyerOrganizationId: number;
  expectedStatus: BuyerOrganizationVerificationStatus;
  eventType: BuyerOrganizationVerificationEventType;
  actorType: BuyerOrganizationVerificationActorType;
  actorUserId: string | null;
  sourceType: BuyerOrganizationVerificationSourceType;
  sourceName: string | null;
  sourceReference: string | null;
  verificationMethod: string;
  reasonCode: string | null;
  taxIdentifierId: number | null;
  registryIdentifierId: number | null;
};

export type BuyerTrustTransitionSuccess = {
  buyerOrganizationId: number;
  eventId: number;
  status: BuyerOrganizationVerificationStatus;
};

function meaningful(value: string | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function validateTransitionInput(input: BuyerTrustTransitionInput): BuyerTrustFailureCode | null {
  if (
    parseSafePositiveId(input.buyerOrganizationId) === null ||
    (input.taxIdentifierId !== null && parseSafePositiveId(input.taxIdentifierId) === null) ||
    (input.registryIdentifierId !== null && parseSafePositiveId(input.registryIdentifierId) === null) ||
    !validateBuyerTrustEventAuthority(input) ||
    !meaningful(input.verificationMethod) ||
    ((input.eventType === "verified" || input.eventType === "rejected") && input.taxIdentifierId === null && input.registryIdentifierId === null)
  ) {
    return "BUYER_TRUST_INPUT_INVALID";
  }

  if (input.eventType === "verified") {
    if (input.actorType !== "admin" || input.sourceType !== "admin_manual") {
      return "BUYER_TRUST_INPUT_INVALID";
    }
    if (!meaningful(input.sourceName) || !meaningful(input.sourceReference) || input.taxIdentifierId === null) {
      return "BUYER_TRUST_INPUT_INVALID";
    }
  } else if (!meaningful(input.reasonCode)) {
    return "BUYER_TRUST_INPUT_INVALID";
  }

  return null;
}

export async function resolveActiveBuyerOrganizationMembership(
  database: BuyerTrustDb,
  authenticatedUserId: string,
  selectedBuyerOrganizationId: number,
): Promise<BuyerTrustResult<{ buyerOrganizationId: number; membershipRole: "organization_admin" | "authorized_buyer" }>> {
  if (!authenticatedUserId.trim()) return { ok: false, code: "BUYER_AUTH_REQUIRED" };
  if (parseSafePositiveId(selectedBuyerOrganizationId) === null) {
    return { ok: false, code: "BUYER_TRUST_INPUT_INVALID" };
  }

  try {
    const membership = await database
      .select({
        buyerOrganizationId: buyerOrganizationMemberships.buyerOrganizationId,
        membershipRole: buyerOrganizationMemberships.membershipRole,
        membershipStatus: buyerOrganizationMemberships.membershipStatus,
        endedAt: buyerOrganizationMemberships.endedAt,
      })
      .from(buyerOrganizationMemberships)
      .where(
        and(
          eq(buyerOrganizationMemberships.authUserId, authenticatedUserId),
          eq(buyerOrganizationMemberships.buyerOrganizationId, selectedBuyerOrganizationId),
          eq(buyerOrganizationMemberships.membershipStatus, "active"),
          isNull(buyerOrganizationMemberships.endedAt),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]);

    return evaluateBuyerOrganizationMembership(membership, selectedBuyerOrganizationId);
  } catch {
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}

export async function loadTrustedBuyerIdentity(
  database: BuyerTrustDb,
  authenticatedUserId: string,
  selectedBuyerOrganizationId: number,
): Promise<BuyerTrustResult<TrustedBuyerIdentity>> {
  const authority = await resolveActiveBuyerOrganizationMembership(
    database,
    authenticatedUserId,
    selectedBuyerOrganizationId,
  );
  if (!authority.ok) return authority;

  try {
    const organization = await database
      .select({
        id: buyerOrganizations.id,
        legalName: buyerOrganizations.legalName,
        jurisdictionCountry: buyerOrganizations.jurisdictionCountry,
        verificationStatus: buyerOrganizations.verificationStatus,
        currentVerificationEventId: buyerOrganizations.currentVerificationEventId,
        verifiedAt: buyerOrganizations.verifiedAt,
      })
      .from(buyerOrganizations)
      .where(eq(buyerOrganizations.id, authority.value.buyerOrganizationId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!organization) return { ok: false, code: "BUYER_ORGANIZATION_NOT_FOUND" };

    const currentEvent = organization.currentVerificationEventId === null
      ? undefined
      : await database
          .select({
            id: buyerOrganizationVerificationEvents.id,
            buyerOrganizationId: buyerOrganizationVerificationEvents.buyerOrganizationId,
            eventType: buyerOrganizationVerificationEvents.eventType,
            outcomeStatus: buyerOrganizationVerificationEvents.outcomeStatus,
            verificationMethod: buyerOrganizationVerificationEvents.verificationMethod,
            sourceType: buyerOrganizationVerificationEvents.sourceType,
            sourceName: buyerOrganizationVerificationEvents.sourceName,
            occurredAt: buyerOrganizationVerificationEvents.occurredAt,
            legalNameSnapshot: buyerOrganizationVerificationEvents.legalNameSnapshot,
            jurisdictionCountrySnapshot: buyerOrganizationVerificationEvents.jurisdictionCountrySnapshot,
            taxIdentifierId: buyerOrganizationVerificationEvents.taxIdentifierId,
            taxIdentifierTypeSnapshot: buyerOrganizationVerificationEvents.taxIdentifierTypeSnapshot,
            taxIdentifierValueSnapshot: buyerOrganizationVerificationEvents.taxIdentifierValueSnapshot,
            taxCountryCodeSnapshot: buyerOrganizationVerificationEvents.taxCountryCodeSnapshot,
            registryIdentifierId: buyerOrganizationVerificationEvents.registryIdentifierId,
            registryTypeSnapshot: buyerOrganizationVerificationEvents.registryTypeSnapshot,
            registryValueSnapshot: buyerOrganizationVerificationEvents.registryValueSnapshot,
            registryCountryCodeSnapshot: buyerOrganizationVerificationEvents.registryCountryCodeSnapshot,
          })
          .from(buyerOrganizationVerificationEvents)
          .where(
            and(
              eq(buyerOrganizationVerificationEvents.id, organization.currentVerificationEventId),
              eq(buyerOrganizationVerificationEvents.buyerOrganizationId, organization.id),
            ),
          )
          .limit(1)
          .then((rows) => rows[0]);

    const [taxIdentifiers, registryIdentifiers] = await Promise.all([
      database
        .select({
          id: buyerTaxIdentifiers.id,
          buyerOrganizationId: buyerTaxIdentifiers.buyerOrganizationId,
          identifierType: buyerTaxIdentifiers.identifierType,
          identifierValue: buyerTaxIdentifiers.identifierValue,
          countryCode: buyerTaxIdentifiers.countryCode,
          canonicalIdentityClass: buyerTaxIdentifiers.canonicalIdentityClass,
          canonicalIdentifierValue: buyerTaxIdentifiers.canonicalIdentifierValue,
          trustedByVerificationEventId: buyerTaxIdentifiers.trustedByVerificationEventId,
          retiredAt: buyerTaxIdentifiers.retiredAt,
        })
        .from(buyerTaxIdentifiers)
        .where(eq(buyerTaxIdentifiers.buyerOrganizationId, organization.id)),
      database
        .select({
          id: buyerRegistryIdentifiers.id,
          buyerOrganizationId: buyerRegistryIdentifiers.buyerOrganizationId,
          registryType: buyerRegistryIdentifiers.registryType,
          registryValue: buyerRegistryIdentifiers.registryValue,
          jurisdictionCountry: buyerRegistryIdentifiers.jurisdictionCountry,
          trustedByVerificationEventId: buyerRegistryIdentifiers.trustedByVerificationEventId,
          retiredAt: buyerRegistryIdentifiers.retiredAt,
        })
        .from(buyerRegistryIdentifiers)
        .where(eq(buyerRegistryIdentifiers.buyerOrganizationId, organization.id)),
    ]);

    return evaluateTrustedBuyerIdentity({ organization, currentEvent, taxIdentifiers, registryIdentifiers });
  } catch {
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}

export async function executeBuyerTrustTransition(
  database: BuyerTrustDb,
  input: BuyerTrustTransitionInput,
): Promise<BuyerTrustResult<BuyerTrustTransitionSuccess>> {
  const invalid = validateTransitionInput(input);
  if (invalid) return { ok: false, code: invalid };

  try {
    return await database.transaction(async (tx): Promise<BuyerTrustResult<BuyerTrustTransitionSuccess>> => {
      const organization = await tx
        .select({
          id: buyerOrganizations.id,
          legalName: buyerOrganizations.legalName,
          jurisdictionCountry: buyerOrganizations.jurisdictionCountry,
          verificationStatus: buyerOrganizations.verificationStatus,
        })
        .from(buyerOrganizations)
        .where(eq(buyerOrganizations.id, input.buyerOrganizationId))
        .for("update")
        .limit(1)
        .then((rows) => rows[0]);

      if (!organization) return { ok: false, code: "BUYER_ORGANIZATION_NOT_FOUND" };

      const transition = evaluateBuyerTrustTransition(
        organization.verificationStatus,
        input.expectedStatus,
        input.eventType,
      );
      if (!transition.ok) return transition;

      const currentTrustedTax = await tx
        .select({ id: buyerTaxIdentifiers.id })
        .from(buyerTaxIdentifiers)
        .where(
          and(
            eq(buyerTaxIdentifiers.buyerOrganizationId, organization.id),
            isNull(buyerTaxIdentifiers.retiredAt),
            isNotNull(buyerTaxIdentifiers.trustedByVerificationEventId),
          ),
        )
        .for("update");
      const currentTrustedRegistry = await tx
        .select({ id: buyerRegistryIdentifiers.id })
        .from(buyerRegistryIdentifiers)
        .where(
          and(
            eq(buyerRegistryIdentifiers.buyerOrganizationId, organization.id),
            isNull(buyerRegistryIdentifiers.retiredAt),
            isNotNull(buyerRegistryIdentifiers.trustedByVerificationEventId),
          ),
        )
        .for("update");

      const selectedTaxId = input.eventType === "verified" || input.eventType === "rejected"
        ? input.taxIdentifierId
        : currentTrustedTax[0]?.id ?? input.taxIdentifierId;
      const selectedRegistryId = input.eventType === "verified" || input.eventType === "rejected"
        ? input.registryIdentifierId
        : currentTrustedRegistry[0]?.id ?? input.registryIdentifierId;

      if (
        (input.eventType === "revoked" || input.eventType === "invalidated") &&
        (currentTrustedTax.length !== 1 || currentTrustedRegistry.length > 1)
      ) {
        return { ok: false, code: "BUYER_TRUST_STATE_INCONSISTENT" };
      }

      const tax = selectedTaxId === null
        ? undefined
        : await tx
            .select()
            .from(buyerTaxIdentifiers)
            .where(
              and(
                eq(buyerTaxIdentifiers.id, selectedTaxId),
                eq(buyerTaxIdentifiers.buyerOrganizationId, organization.id),
                isNull(buyerTaxIdentifiers.retiredAt),
              ),
            )
            .for("update")
            .limit(1)
            .then((rows) => rows[0]);
      const registry = selectedRegistryId === null
        ? undefined
        : await tx
            .select()
            .from(buyerRegistryIdentifiers)
            .where(
              and(
                eq(buyerRegistryIdentifiers.id, selectedRegistryId),
                eq(buyerRegistryIdentifiers.buyerOrganizationId, organization.id),
                isNull(buyerRegistryIdentifiers.retiredAt),
              ),
            )
            .for("update")
            .limit(1)
            .then((rows) => rows[0]);

      if ((selectedTaxId !== null && !tax) || (selectedRegistryId !== null && !registry) || (!tax && !registry)) {
        return { ok: false, code: "BUYER_TRUST_INPUT_INVALID" };
      }

      if (input.eventType === "verified") {
        if (
          !tax ||
          organization.jurisdictionCountry !== "PL" ||
          tax.countryCode !== "PL" ||
          tax.identifierType !== "tax_id" ||
          tax.canonicalIdentityClass !== "PL:NIP" ||
          normalizePlNip(tax.identifierValue) !== tax.canonicalIdentifierValue ||
          !isValidPlNip(tax.canonicalIdentifierValue)
        ) {
          return { ok: false, code: "BUYER_TRUST_INPUT_INVALID" };
        }

        const canonicalLockKey = `${tax.canonicalIdentityClass}:${tax.canonicalIdentifierValue}`;
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtext('buyer_tax_identity'), hashtext(${canonicalLockKey}))`,
        );

        const conflict = await tx
          .select({ id: buyerTaxIdentifiers.id })
          .from(buyerTaxIdentifiers)
          .where(
            and(
              eq(buyerTaxIdentifiers.canonicalIdentityClass, tax.canonicalIdentityClass),
              eq(buyerTaxIdentifiers.canonicalIdentifierValue, tax.canonicalIdentifierValue),
              ne(buyerTaxIdentifiers.buyerOrganizationId, organization.id),
              isNull(buyerTaxIdentifiers.retiredAt),
              isNotNull(buyerTaxIdentifiers.trustedByVerificationEventId),
            ),
          )
          .limit(1);
        if (conflict.length > 0) {
          return { ok: false, code: "BUYER_CANONICAL_IDENTITY_CONFLICT" };
        }
      }

      const event = await tx
        .insert(buyerOrganizationVerificationEvents)
        .values({
          buyerOrganizationId: organization.id,
          eventType: input.eventType,
          outcomeStatus: transition.value.outcomeStatus,
          actorType: input.actorType,
          actorUserId: input.actorUserId,
          sourceType: input.sourceType,
          sourceName: input.sourceName,
          sourceReference: input.sourceReference,
          verificationMethod: input.verificationMethod,
          reasonCode: input.reasonCode,
          previousVerificationStatus: organization.verificationStatus,
          legalNameSnapshot: organization.legalName,
          jurisdictionCountrySnapshot: organization.jurisdictionCountry,
          taxIdentifierId: tax?.id ?? null,
          taxIdentifierTypeSnapshot: tax?.identifierType ?? null,
          taxIdentifierValueSnapshot: tax?.identifierValue ?? null,
          taxCountryCodeSnapshot: tax?.countryCode ?? null,
          registryIdentifierId: registry?.id ?? null,
          registryTypeSnapshot: registry?.registryType ?? null,
          registryValueSnapshot: registry?.registryValue ?? null,
          registryCountryCodeSnapshot: registry?.jurisdictionCountry ?? null,
        })
        .returning({ id: buyerOrganizationVerificationEvents.id, occurredAt: buyerOrganizationVerificationEvents.occurredAt })
        .then((rows) => rows[0]);

      if (!event) return { ok: false, code: "SYSTEM_ERROR" };

      await tx
        .update(buyerTaxIdentifiers)
        .set({ trustedByVerificationEventId: null })
        .where(eq(buyerTaxIdentifiers.buyerOrganizationId, organization.id));
      await tx
        .update(buyerRegistryIdentifiers)
        .set({ trustedByVerificationEventId: null })
        .where(eq(buyerRegistryIdentifiers.buyerOrganizationId, organization.id));

      if (input.eventType === "verified") {
        if (!tax) return { ok: false, code: "SYSTEM_ERROR" };
        await tx
          .update(buyerTaxIdentifiers)
          .set({ trustedByVerificationEventId: event.id })
          .where(eq(buyerTaxIdentifiers.id, tax.id));
        if (registry) {
          await tx
            .update(buyerRegistryIdentifiers)
            .set({ trustedByVerificationEventId: event.id })
            .where(eq(buyerRegistryIdentifiers.id, registry.id));
        }
      }

      await tx
        .update(buyerOrganizations)
        .set({
          verificationStatus: transition.value.outcomeStatus,
          currentVerificationEventId: event.id,
          verifiedAt: transition.value.outcomeStatus === "verified" ? event.occurredAt : null,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(buyerOrganizations.id, organization.id));

      return {
        ok: true,
        value: {
          buyerOrganizationId: organization.id,
          eventId: event.id,
          status: transition.value.outcomeStatus,
        },
      };
    });
  } catch {
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}

export async function loadTrustedBuyerIdentityForUser(
  authenticatedUserId: string,
  selectedBuyerOrganizationId: number,
): Promise<BuyerTrustResult<TrustedBuyerIdentity>> {
  return loadTrustedBuyerIdentity(defaultDb, authenticatedUserId, selectedBuyerOrganizationId);
}
