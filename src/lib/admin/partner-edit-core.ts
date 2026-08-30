import { z } from "zod";
import { buildLegalIdentitySnapshot, validateEventOwnership } from "../verification/events-core";
import { eq, and } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import { partners, sellerLegalIdentities, sellerTaxIdentifiers,
  sellerVerificationEvents, sellerRegistryIdentifiers } from "@/lib/schema";

// ----------------------------------------------------------------------
// 1. Seller Legal Data Save
// ----------------------------------------------------------------------

async function assertEventOwnershipSafe(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  subjectType: "legal_identity" | "tax_identifier" | "registry_identifier",
  targetId: number,
  eventId: number | null
): Promise<boolean> {
  if (eventId === null) return true;
  const evt = await tx
    .select({
      subjectType: sellerVerificationEvents.subjectType,
      legalIdentityPartnerId: sellerVerificationEvents.legalIdentityPartnerId,
      taxIdentifierId: sellerVerificationEvents.taxIdentifierId,
      registryIdentifierId: sellerVerificationEvents.registryIdentifierId,
    })
    .from(sellerVerificationEvents)
    .where(eq(sellerVerificationEvents.id, eventId))
    .limit(1);
  if (evt.length === 0) return false;
  return validateEventOwnership(subjectType, targetId, evt[0]);
}

export const AdminSellerLegalDataSaveInputSchema = z.object({
  partnerId: z.number().int().positive(),
    businessEmail: z.string().trim().email().max(100),
  legalName: z.string().trim().min(1).max(255),
  jurisdictionCountry: z.string().trim().toUpperCase().length(2).regex(/^[A-Z]{2}$/, "Must be exactly 2 ASCII letters"),
  registeredAddressLine1: z
    .string()
    .trim()
    .max(255)
    .transform((val) => (val === "" ? null : val))
    .nullable(),
  registeredAddressLine2: z
    .string()
    .trim()
    .max(255)
    .transform((val) => (val === "" ? null : val))
    .nullable(),
  registeredPostalCode: z
    .string()
    .trim()
    .max(32)
    .transform((val) => (val === "" ? null : val))
    .nullable(),
  registeredCity: z
    .string()
    .trim()
    .max(120)
    .transform((val) => (val === "" ? null : val))
    .nullable(),
  registeredRegion: z
    .string()
    .trim()
    .max(120)
    .transform((val) => (val === "" ? null : val))
    .nullable(),
  registeredCountryCode: z
    .string()
    .trim()
    .toUpperCase()
    .transform((val) => (val === "" ? null : val))
    .nullable()
    .refine((val) => val === null || /^[A-Z]{2}$/.test(val), {
      message: "Must be exactly 2 ASCII letters if present",
    }),
});

export type AdminSellerLegalDataSaveInput = z.infer<typeof AdminSellerLegalDataSaveInputSchema>;

export type AdminSellerLegalDataSaveResult =
  | { ok: true; code: "SAVED" }
  | { ok: false; code: "PARTNER_NOT_FOUND" }
  | { ok: false; code: "SYSTEM_ERROR" };

export type AdminSellerLegalDataSaveContext = {
  actorUserId: string;
};

export async function executeAdminSellerLegalDataSave(
  db: NodePgDatabase<typeof schema>,
  input: AdminSellerLegalDataSaveInput,
  context: AdminSellerLegalDataSaveContext
): Promise<AdminSellerLegalDataSaveResult> {
  try {
    const result = await db.transaction(async (tx): Promise<AdminSellerLegalDataSaveResult> => {
      const partnerRows = await tx
        .select({ id: partners.id, contactEmail: partners.contactEmail })
        .from(partners)
        .where(eq(partners.id, input.partnerId))
        .limit(1);

      if (partnerRows.length === 0) {
        return { ok: false as const, code: "PARTNER_NOT_FOUND" as const };
      }

      if (partnerRows[0].contactEmail !== input.businessEmail) {
        await tx
          .update(partners)
          .set({ contactEmail: input.businessEmail })
          .where(eq(partners.id, input.partnerId));
      }

      const existingIdentity = await tx
        .select({
          partnerId: sellerLegalIdentities.partnerId,
          legalName: sellerLegalIdentities.legalName,
          jurisdictionCountry: sellerLegalIdentities.jurisdictionCountry,
          registeredAddressLine1: sellerLegalIdentities.registeredAddressLine1,
          registeredAddressLine2: sellerLegalIdentities.registeredAddressLine2,
          registeredPostalCode: sellerLegalIdentities.registeredPostalCode,
          registeredCity: sellerLegalIdentities.registeredCity,
          registeredRegion: sellerLegalIdentities.registeredRegion,
          registeredCountryCode: sellerLegalIdentities.registeredCountryCode,
          verificationStatus: sellerLegalIdentities.verificationStatus,
          verifiedAt: sellerLegalIdentities.verifiedAt,
          verificationSource: sellerLegalIdentities.verificationSource,
          verificationReference: sellerLegalIdentities.verificationReference,
          currentVerificationEventId: sellerLegalIdentities.currentVerificationEventId,
        })
        .from(sellerLegalIdentities)
        .where(eq(sellerLegalIdentities.partnerId, input.partnerId))
        .for("update")
        .limit(1);

      if (existingIdentity.length > 0) {
        const curr = existingIdentity[0];
        const isOwnershipSafe = await assertEventOwnershipSafe(tx, "legal_identity", input.partnerId, curr.currentVerificationEventId);
        if (!isOwnershipSafe) return { ok: false as const, code: "SYSTEM_ERROR" };
      }

      if (existingIdentity.length === 0) {
        await tx.insert(sellerLegalIdentities).values({
          partnerId: input.partnerId,
          legalName: input.legalName,
          jurisdictionCountry: input.jurisdictionCountry,
          registeredAddressLine1: input.registeredAddressLine1,
          registeredAddressLine2: input.registeredAddressLine2,
          registeredPostalCode: input.registeredPostalCode,
          registeredCity: input.registeredCity,
          registeredRegion: input.registeredRegion,
          registeredCountryCode: input.registeredCountryCode,
          verificationStatus: "unverified",
        });
      } else {
        const curr = existingIdentity[0];
        const changed =
          curr.legalName !== input.legalName ||
          curr.jurisdictionCountry !== input.jurisdictionCountry ||
          curr.registeredAddressLine1 !== input.registeredAddressLine1 ||
          curr.registeredAddressLine2 !== input.registeredAddressLine2 ||
          curr.registeredPostalCode !== input.registeredPostalCode ||
          curr.registeredCity !== input.registeredCity ||
          curr.registeredRegion !== input.registeredRegion ||
          curr.registeredCountryCode !== input.registeredCountryCode;

        if (changed) {
          const snapshot = buildLegalIdentitySnapshot({
            legalName: curr.legalName,
            jurisdictionCountry: curr.jurisdictionCountry,
            registeredAddressLine1: curr.registeredAddressLine1,
            registeredAddressLine2: curr.registeredAddressLine2,
            registeredPostalCode: curr.registeredPostalCode,
            registeredCity: curr.registeredCity,
            registeredRegion: curr.registeredRegion,
            registeredCountryCode: curr.registeredCountryCode,
          });

          let currentEventId = curr.currentVerificationEventId;
          const needsInvalidation = curr.verificationStatus !== "unverified" || curr.verifiedAt !== null || curr.verificationSource !== null || curr.verificationReference !== null;
          
          if (needsInvalidation) {
            const eventRes = await tx.insert(sellerVerificationEvents).values({
              subjectType: "legal_identity",
              legalIdentityPartnerId: input.partnerId,
              eventType: "invalidated",
              actorType: "admin",
              actorUserId: context.actorUserId,
              sourceType: "system_rule",
              reasonCode: "legal_identity_changed",
              subjectSnapshot: snapshot,
              previousVerificationStatus: curr.verificationStatus,
              previousVerifiedAt: curr.verifiedAt,
              previousVerificationSource: curr.verificationSource,
              previousVerificationReference: curr.verificationReference,
            }).returning({ id: sellerVerificationEvents.id });
            currentEventId = eventRes[0].id;
          }

          await tx
            .update(sellerLegalIdentities)
            .set({
              legalName: input.legalName,
              jurisdictionCountry: input.jurisdictionCountry,
              registeredAddressLine1: input.registeredAddressLine1,
              registeredAddressLine2: input.registeredAddressLine2,
              registeredPostalCode: input.registeredPostalCode,
              registeredCity: input.registeredCity,
              registeredRegion: input.registeredRegion,
              registeredCountryCode: input.registeredCountryCode,
              verificationStatus: "unverified",
              verifiedAt: null,
              verificationSource: null,
              verificationReference: null,
              currentVerificationEventId: currentEventId,
              updatedAt: new Date(),
            })
            .where(eq(sellerLegalIdentities.partnerId, input.partnerId));
        }
      }

      return { ok: true as const, code: "SAVED" as const };
    });
    return result;
  } catch (error: unknown) {
    console.error("[ADMIN_DB] executeAdminSellerLegalDataSave system error", error);
    return { ok: false as const, code: "SYSTEM_ERROR" };
  }
}

// ----------------------------------------------------------------------
// 2. Tax Identifier Add
// ----------------------------------------------------------------------

export const AdminSellerTaxIdentifierAddInputSchema = z.object({
  partnerId: z.number().int().positive(),
  identifierType: z.string().trim().min(1).max(50),
  identifierValue: z.string().trim().min(1).max(100),
  countryCode: z.string().trim().toUpperCase().length(2).regex(/^[A-Z]{2}$/, "Must be exactly 2 ASCII letters"),
});

export type AdminSellerTaxIdentifierAddInput = z.infer<typeof AdminSellerTaxIdentifierAddInputSchema>;

export type AdminSellerTaxIdentifierAddResult =
  | { ok: true; code: "ADDED" }
  | { ok: false; code: "PARTNER_NOT_FOUND" }
  | { ok: false; code: "LEGAL_IDENTITY_REQUIRED" }
  | { ok: false; code: "TAX_IDENTIFIER_CONFLICT" }
  | { ok: false; code: "SYSTEM_ERROR" };

export async function executeAdminSellerTaxIdentifierAdd(
  db: NodePgDatabase<typeof schema>,
  input: AdminSellerTaxIdentifierAddInput
): Promise<AdminSellerTaxIdentifierAddResult> {
  try {
    return await db.transaction(async (tx) => {
      const partnerRows = await tx
        .select({ id: partners.id })
        .from(partners)
        .where(eq(partners.id, input.partnerId))
        .limit(1);

      if (partnerRows.length === 0) {
        return { ok: false as const, code: "PARTNER_NOT_FOUND" as const };
      }

      const identityRows = await tx
        .select({ partnerId: sellerLegalIdentities.partnerId })
        .from(sellerLegalIdentities)
        .where(eq(sellerLegalIdentities.partnerId, input.partnerId))
        .limit(1);

      if (identityRows.length === 0) {
        return { ok: false as const, code: "LEGAL_IDENTITY_REQUIRED" as const };
      }

      const conflictRows = await tx
        .select({ id: sellerTaxIdentifiers.id })
        .from(sellerTaxIdentifiers)
        .where(
          and(
            eq(sellerTaxIdentifiers.partnerId, input.partnerId),
            eq(sellerTaxIdentifiers.identifierType, input.identifierType),
            eq(sellerTaxIdentifiers.countryCode, input.countryCode),
            eq(sellerTaxIdentifiers.identifierValue, input.identifierValue)
          )
        )
        .limit(1);

      if (conflictRows.length > 0) {
        return { ok: false as const, code: "TAX_IDENTIFIER_CONFLICT" as const };
      }

      await tx.insert(sellerTaxIdentifiers).values({
        partnerId: input.partnerId,
        identifierType: input.identifierType,
        identifierValue: input.identifierValue,
        countryCode: input.countryCode,
        verificationStatus: "unverified",
      });

      return { ok: true as const, code: "ADDED" as const };
    });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return { ok: false as const, code: "TAX_IDENTIFIER_CONFLICT" };
    }
    console.error("[ADMIN_DB] executeAdminSellerTaxIdentifierAdd system error");
    return { ok: false as const, code: "SYSTEM_ERROR" };
  }
}

// ----------------------------------------------------------------------
// 3. Tax Identifier Delete
// ----------------------------------------------------------------------

export const AdminSellerTaxIdentifierDeleteInputSchema = z.object({
  partnerId: z.number().int().positive(),
  taxIdentifierId: z.number().int().positive(),
});

export type AdminSellerTaxIdentifierDeleteInput = z.infer<typeof AdminSellerTaxIdentifierDeleteInputSchema>;

export type AdminSellerTaxIdentifierDeleteResult =
  | { ok: true; code: "DELETED" }
  | { ok: false; code: "NOT_FOUND" }
  | { ok: false; code: "VERIFICATION_HISTORY_EXISTS" }
  | { ok: false; code: "SYSTEM_ERROR" };

export async function executeAdminSellerTaxIdentifierDelete(
  db: NodePgDatabase<typeof schema>,
  input: AdminSellerTaxIdentifierDeleteInput
): Promise<AdminSellerTaxIdentifierDeleteResult> {
  try {
    return await db.transaction(async (tx) => {
      const existing = await tx
        .select({ verificationStatus: sellerTaxIdentifiers.verificationStatus, currentVerificationEventId: sellerTaxIdentifiers.currentVerificationEventId, retiredAt: sellerTaxIdentifiers.retiredAt })
        .from(sellerTaxIdentifiers)
        .where(
          and(
            eq(sellerTaxIdentifiers.id, input.taxIdentifierId),
            eq(sellerTaxIdentifiers.partnerId, input.partnerId)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        return { ok: false as const, code: "NOT_FOUND" };
      }

      const isOwnershipSafe = await assertEventOwnershipSafe(tx, "tax_identifier", input.taxIdentifierId, existing[0].currentVerificationEventId);
      if (!isOwnershipSafe) return { ok: false as const, code: "SYSTEM_ERROR" };

      const history = await tx
        .select({ id: sellerVerificationEvents.id })
        .from(sellerVerificationEvents)
        .where(eq(sellerVerificationEvents.taxIdentifierId, input.taxIdentifierId))
        .limit(1);

      if (
        existing[0].verificationStatus !== "unverified" ||
        existing[0].currentVerificationEventId !== null ||
        existing[0].retiredAt !== null ||
        history.length > 0
      ) {
        return { ok: false as const, code: "VERIFICATION_HISTORY_EXISTS" };
      }

      const deleted = await tx
        .delete(sellerTaxIdentifiers)
        .where(
          and(
            eq(sellerTaxIdentifiers.id, input.taxIdentifierId),
            eq(sellerTaxIdentifiers.partnerId, input.partnerId)
          )
        )
        .returning({ id: sellerTaxIdentifiers.id });

      if (deleted.length === 0) {
        return { ok: false as const, code: "NOT_FOUND" };
      }

      return { ok: true as const, code: "DELETED" };
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23503") {
      return { ok: false as const, code: "VERIFICATION_HISTORY_EXISTS" };
    }
    console.error("[ADMIN_DB] executeAdminSellerTaxIdentifierDelete system error");
    return { ok: false as const, code: "SYSTEM_ERROR" };
  }
}
// ----------------------------------------------------------------------
// 4. Registry Identifier Add
// ----------------------------------------------------------------------
export const AdminSellerRegistryIdentifierAddInputSchema = z.object({
  partnerId: z.number().int().positive(),
  registryType: z.string().trim().min(1).max(50),
  registryValue: z.string().trim().min(1).max(100),
  jurisdictionCountry: z.string().trim().toUpperCase().length(2).regex(/^[A-Z]{2}$/, "Must be exactly 2 ASCII letters"),
});

export type AdminSellerRegistryIdentifierAddInput = z.infer<typeof AdminSellerRegistryIdentifierAddInputSchema>;

export type AdminSellerRegistryIdentifierAddResult =
  | { ok: true; code: "ADDED" }
  | { ok: false; code: "PARTNER_NOT_FOUND" }
  | { ok: false; code: "LEGAL_IDENTITY_REQUIRED" }
  | { ok: false; code: "REGISTRY_IDENTIFIER_CONFLICT" }
  | { ok: false; code: "SYSTEM_ERROR" };

export async function executeAdminSellerRegistryIdentifierAdd(
  db: NodePgDatabase<typeof schema>,
  input: AdminSellerRegistryIdentifierAddInput
): Promise<AdminSellerRegistryIdentifierAddResult> {
  try {
    return await db.transaction(async (tx) => {
      const partnerRows = await tx
        .select({ id: partners.id })
        .from(partners)
        .where(eq(partners.id, input.partnerId))
        .limit(1);

      if (partnerRows.length === 0) {
        return { ok: false as const, code: "PARTNER_NOT_FOUND" as const };
      }

      const identityRows = await tx
        .select({ partnerId: sellerLegalIdentities.partnerId })
        .from(sellerLegalIdentities)
        .where(eq(sellerLegalIdentities.partnerId, input.partnerId))
        .limit(1);

      if (identityRows.length === 0) {
        return { ok: false as const, code: "LEGAL_IDENTITY_REQUIRED" as const };
      }

      const conflictRows = await tx
        .select({ id: sellerRegistryIdentifiers.id })
        .from(sellerRegistryIdentifiers)
        .where(
          and(
            eq(sellerRegistryIdentifiers.partnerId, input.partnerId),
            eq(sellerRegistryIdentifiers.registryType, input.registryType),
            eq(sellerRegistryIdentifiers.jurisdictionCountry, input.jurisdictionCountry),
            eq(sellerRegistryIdentifiers.registryValue, input.registryValue)
          )
        )
        .limit(1);

      if (conflictRows.length > 0) {
        return { ok: false as const, code: "REGISTRY_IDENTIFIER_CONFLICT" as const };
      }

      await tx.insert(sellerRegistryIdentifiers).values({
        partnerId: input.partnerId,
        registryType: input.registryType,
        jurisdictionCountry: input.jurisdictionCountry,
        registryValue: input.registryValue,
        verificationStatus: "unverified",
        currentVerificationEventId: null,
        retiredAt: null,
      });

      return { ok: true as const, code: "ADDED" as const };
    });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return { ok: false as const, code: "REGISTRY_IDENTIFIER_CONFLICT" };
    }
    console.error("[ADMIN_DB] executeAdminSellerRegistryIdentifierAdd system error");
    return { ok: false as const, code: "SYSTEM_ERROR" };
  }
}

// ----------------------------------------------------------------------
// 5. Registry Identifier Delete
// ----------------------------------------------------------------------

export const AdminSellerRegistryIdentifierDeleteInputSchema = z.object({
  partnerId: z.number().int().positive(),
  registryIdentifierId: z.number().int().positive(),
});

export type AdminSellerRegistryIdentifierDeleteInput = z.infer<typeof AdminSellerRegistryIdentifierDeleteInputSchema>;

export type AdminSellerRegistryIdentifierDeleteResult =
  | { ok: true; code: "DELETED" }
  | { ok: false; code: "NOT_FOUND" }
  | { ok: false; code: "VERIFICATION_HISTORY_EXISTS" }
  | { ok: false; code: "SYSTEM_ERROR" };

export async function executeAdminSellerRegistryIdentifierDelete(
  db: NodePgDatabase<typeof schema>,
  input: AdminSellerRegistryIdentifierDeleteInput
): Promise<AdminSellerRegistryIdentifierDeleteResult> {
  try {
    return await db.transaction(async (tx) => {
      const existing = await tx
        .select({ verificationStatus: sellerRegistryIdentifiers.verificationStatus, currentVerificationEventId: sellerRegistryIdentifiers.currentVerificationEventId, retiredAt: sellerRegistryIdentifiers.retiredAt })
        .from(sellerRegistryIdentifiers)
        .where(
          and(
            eq(sellerRegistryIdentifiers.id, input.registryIdentifierId),
            eq(sellerRegistryIdentifiers.partnerId, input.partnerId)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        return { ok: false as const, code: "NOT_FOUND" };
      }

      const isOwnershipSafe = await assertEventOwnershipSafe(tx, "registry_identifier", input.registryIdentifierId, existing[0].currentVerificationEventId);
      if (!isOwnershipSafe) return { ok: false as const, code: "SYSTEM_ERROR" };

      const history = await tx
        .select({ id: sellerVerificationEvents.id })
        .from(sellerVerificationEvents)
        .where(eq(sellerVerificationEvents.registryIdentifierId, input.registryIdentifierId))
        .limit(1);

      const status = existing[0].verificationStatus;
      if (
        (status !== null && status !== "unverified") ||
        existing[0].currentVerificationEventId !== null ||
        existing[0].retiredAt !== null ||
        history.length > 0
      ) {
        return { ok: false as const, code: "VERIFICATION_HISTORY_EXISTS" };
      }

      const deleted = await tx
        .delete(sellerRegistryIdentifiers)
        .where(
          and(
            eq(sellerRegistryIdentifiers.id, input.registryIdentifierId),
            eq(sellerRegistryIdentifiers.partnerId, input.partnerId)
          )
        )
        .returning({ id: sellerRegistryIdentifiers.id });

      if (deleted.length === 0) {
        return { ok: false as const, code: "NOT_FOUND" };
      }

      return { ok: true as const, code: "DELETED" };
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23503") {
      return { ok: false as const, code: "VERIFICATION_HISTORY_EXISTS" };
    }
    console.error("[ADMIN_DB] executeAdminSellerRegistryIdentifierDelete system error");
    return { ok: false as const, code: "SYSTEM_ERROR" };
  }
}
