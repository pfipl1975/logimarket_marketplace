import { z } from "zod";
import { eq, and } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import { partners, sellerLegalIdentities, sellerTaxIdentifiers,
  sellerVerificationEvents, sellerRegistryIdentifiers } from "@/lib/schema";

// ----------------------------------------------------------------------
// 1. Seller Legal Data Save
// ----------------------------------------------------------------------

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

export async function executeAdminSellerLegalDataSave(
  db: NodePgDatabase<typeof schema>,
  input: AdminSellerLegalDataSaveInput
): Promise<AdminSellerLegalDataSaveResult> {
  try {
    const result = await db.transaction(async (tx) => {
      const partnerRows = await tx
        .select({ id: partners.id })
        .from(partners)
        .where(eq(partners.id, input.partnerId))
        .limit(1);

      if (partnerRows.length === 0) {
        return { ok: false as const, code: "PARTNER_NOT_FOUND" as const };
      }

      await tx
        .update(partners)
        .set({ contactEmail: input.businessEmail })
        .where(eq(partners.id, input.partnerId));

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
        })
        .from(sellerLegalIdentities)
        .where(eq(sellerLegalIdentities.partnerId, input.partnerId))
        .limit(1);

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
              updatedAt: new Date(),
            })
            .where(eq(sellerLegalIdentities.partnerId, input.partnerId));
        } else {
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
              updatedAt: new Date(),
            })
            .where(eq(sellerLegalIdentities.partnerId, input.partnerId));
        }
      }

      return { ok: true as const, code: "SAVED" as const };
    });
    return result;
  } catch {
      console.error("[ADMIN_DB] executeAdminSellerLegalDataSave system error");
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
    const deleted = await db
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
  } catch (error: any) {
    if (error && error.code === '23503') { // foreign_key_violation
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
    const deleted = await db
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
  } catch (error: any) {
    if (error && error.code === '23503') { // foreign_key_violation
      return { ok: false as const, code: "VERIFICATION_HISTORY_EXISTS" };
    }
    console.error("[ADMIN_DB] executeAdminSellerRegistryIdentifierDelete system error");
    return { ok: false as const, code: "SYSTEM_ERROR" };
  }
}
