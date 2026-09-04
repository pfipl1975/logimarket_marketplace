import { z } from "zod";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import {
  canonicalRegistryIdentifierWriteSchema,
  canonicalTaxIdentifierWriteSchema,
} from "@/lib/admin/seller-identifier-contract";

const optionalTrimmedString = (max: number) =>
  z.string().trim().max(max).optional().nullable().transform((value) => (!value ? null : value));

export const adminPartnerCreateSchema = z
  .object({
    companyName: z.string().trim().min(1, "MISSING_COMPANY_NAME").max(255, "COMPANY_NAME_TOO_LONG"),
    contactEmail: z.string().trim().min(1, "MISSING_EMAIL").max(100, "EMAIL_TOO_LONG").email("INVALID_EMAIL"),
    websiteUrl: z
      .string()
      .trim()
      .optional()
      .transform((value) => (!value ? null : value))
      .refine((value) => {
        if (value === null) return true;
        try {
          const url = new URL(value);
          return url.protocol === "http:" || url.protocol === "https:";
        } catch {
          return false;
        }
      }, "INVALID_WEBSITE"),
    legalName: z.string().trim().min(1, "MISSING_LEGAL_NAME").max(255, "LEGAL_NAME_TOO_LONG"),
    jurisdictionCountry: z.string().trim().toUpperCase().length(2, "INVALID_JURISDICTION_COUNTRY").regex(/^[A-Z]{2}$/, "INVALID_JURISDICTION_COUNTRY"),
    registeredAddressLine1: z.string().trim().min(1, "MISSING_REGISTERED_ADDRESS").max(255, "REGISTERED_ADDRESS_TOO_LONG"),
    registeredAddressLine2: optionalTrimmedString(255),
    registeredPostalCode: z.string().trim().min(1, "MISSING_REGISTERED_POSTAL_CODE").max(32, "REGISTERED_POSTAL_CODE_TOO_LONG"),
    registeredCity: z.string().trim().min(1, "MISSING_REGISTERED_CITY").max(120, "REGISTERED_CITY_TOO_LONG"),
    registeredRegion: optionalTrimmedString(120),
    registeredCountryCode: z.string().trim().toUpperCase().length(2, "INVALID_REGISTERED_COUNTRY").regex(/^[A-Z]{2}$/, "INVALID_REGISTERED_COUNTRY"),
    taxIdentifiers: z.array(canonicalTaxIdentifierWriteSchema).max(2),
    registryIdentifiers: z.array(canonicalRegistryIdentifierWriteSchema).max(2),
  })
  .superRefine((input, ctx) => {
    const taxTypes = new Set<string>();
    for (const [index, identifier] of input.taxIdentifiers.entries()) {
      if (taxTypes.has(identifier.identifierType)) {
        ctx.addIssue({ code: "custom", path: ["taxIdentifiers", index, "identifierType"], message: "DUPLICATE_IDENTIFIER_TYPE" });
      }
      taxTypes.add(identifier.identifierType);
      if (identifier.countryCode !== input.jurisdictionCountry) {
        ctx.addIssue({ code: "custom", path: ["taxIdentifiers", index, "countryCode"], message: "IDENTIFIER_COUNTRY_MISMATCH" });
      }
    }

    const registryTypes = new Set<string>();
    for (const [index, identifier] of input.registryIdentifiers.entries()) {
      if (registryTypes.has(identifier.registryType)) {
        ctx.addIssue({ code: "custom", path: ["registryIdentifiers", index, "registryType"], message: "DUPLICATE_IDENTIFIER_TYPE" });
      }
      registryTypes.add(identifier.registryType);
      if (identifier.jurisdictionCountry !== input.jurisdictionCountry) {
        ctx.addIssue({ code: "custom", path: ["registryIdentifiers", index, "jurisdictionCountry"], message: "IDENTIFIER_COUNTRY_MISMATCH" });
      }
    }

    if (input.jurisdictionCountry === "PL" && !input.taxIdentifiers.some((identifier) => identifier.identifierType === "tax_id")) {
      ctx.addIssue({ code: "custom", path: ["taxIdentifiers"], message: "MISSING_PL_TAX_ID" });
    }
  });

export type AdminPartnerCreateInput = z.infer<typeof adminPartnerCreateSchema>;

export type AdminPartnerCreateValidationCode =
  | "INVALID_INPUT" | "MISSING_COMPANY_NAME" | "COMPANY_NAME_TOO_LONG"
  | "MISSING_EMAIL" | "EMAIL_TOO_LONG" | "INVALID_EMAIL" | "INVALID_WEBSITE"
  | "MISSING_LEGAL_NAME" | "LEGAL_NAME_TOO_LONG" | "INVALID_JURISDICTION_COUNTRY"
  | "MISSING_REGISTERED_ADDRESS" | "REGISTERED_ADDRESS_TOO_LONG"
  | "MISSING_REGISTERED_POSTAL_CODE" | "REGISTERED_POSTAL_CODE_TOO_LONG"
  | "MISSING_REGISTERED_CITY" | "REGISTERED_CITY_TOO_LONG" | "INVALID_REGISTERED_COUNTRY"
  | "UNKNOWN_IDENTIFIER_TYPE" | "MISSING_IDENTIFIER_VALUE" | "IDENTIFIER_VALUE_TOO_LONG"
  | "INVALID_IDENTIFIER_VALUE" | "INVALID_COUNTRY_CODE" | "INVALID_PL_TAX_ID"
  | "INVALID_PL_VAT_ID" | "INVALID_PL_COMMERCIAL_REGISTER" | "INVALID_PL_STATISTICAL_ID"
  | "DUPLICATE_IDENTIFIER_TYPE" | "IDENTIFIER_COUNTRY_MISMATCH" | "MISSING_PL_TAX_ID";

export type AdminPartnerCreateResult =
  | { ok: true; partnerId: number }
  | { ok: false; reason: "PARTNER_INVALID_INPUT"; code: AdminPartnerCreateValidationCode; field: string | null }
  | { ok: false; reason: "PARTNER_CREATE_FAILED" };

const validationCodes = new Set<AdminPartnerCreateValidationCode>([
  "MISSING_COMPANY_NAME", "COMPANY_NAME_TOO_LONG", "MISSING_EMAIL", "EMAIL_TOO_LONG", "INVALID_EMAIL",
  "INVALID_WEBSITE", "MISSING_LEGAL_NAME", "LEGAL_NAME_TOO_LONG", "INVALID_JURISDICTION_COUNTRY",
  "MISSING_REGISTERED_ADDRESS", "REGISTERED_ADDRESS_TOO_LONG", "MISSING_REGISTERED_POSTAL_CODE",
  "REGISTERED_POSTAL_CODE_TOO_LONG", "MISSING_REGISTERED_CITY", "REGISTERED_CITY_TOO_LONG",
  "INVALID_REGISTERED_COUNTRY", "UNKNOWN_IDENTIFIER_TYPE", "MISSING_IDENTIFIER_VALUE",
  "IDENTIFIER_VALUE_TOO_LONG", "INVALID_IDENTIFIER_VALUE", "INVALID_COUNTRY_CODE", "INVALID_PL_TAX_ID",
  "INVALID_PL_VAT_ID", "INVALID_PL_COMMERCIAL_REGISTER", "INVALID_PL_STATISTICAL_ID",
  "DUPLICATE_IDENTIFIER_TYPE", "IDENTIFIER_COUNTRY_MISMATCH", "MISSING_PL_TAX_ID",
]);

export function parseAdminPartnerCreateInput(rawInput: unknown):
  | { ok: true; data: AdminPartnerCreateInput }
  | { ok: false; code: AdminPartnerCreateValidationCode; field: string | null } {
  if (rawInput === null || typeof rawInput !== "object") {
    return { ok: false, code: "INVALID_INPUT", field: null };
  }

  const parsed = adminPartnerCreateSchema.safeParse(rawInput);
  if (parsed.success) return { ok: true, data: parsed.data };

  const issue = parsed.error.issues[0];
  const code = validationCodes.has(issue?.message as AdminPartnerCreateValidationCode)
    ? (issue.message as AdminPartnerCreateValidationCode)
    : "INVALID_INPUT";
  return { ok: false, code, field: issue?.path.length ? issue.path.join(".") : null };
}

export async function createPartnerCore(
  db: NodePgDatabase<typeof schema>,
  rawInput: unknown,
): Promise<AdminPartnerCreateResult> {
  const parsed = parseAdminPartnerCreateInput(rawInput);
  if (!parsed.ok) {
    return { ok: false, reason: "PARTNER_INVALID_INPUT", code: parsed.code, field: parsed.field };
  }

  const input = parsed.data;
  try {
    return await db.transaction(async (tx) => {
      const [partner] = await tx.insert(schema.partners).values({
        companyName: input.companyName,
        contactEmail: input.contactEmail,
        websiteUrl: input.websiteUrl,
      }).returning({ id: schema.partners.id });

      if (!partner) throw new Error("PARTNER_INSERT_RETURNED_NO_ROW");

      await tx.insert(schema.sellerLegalIdentities).values({
        partnerId: partner.id,
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
        currentVerificationEventId: null,
      });

      if (input.taxIdentifiers.length > 0) {
        await tx.insert(schema.sellerTaxIdentifiers).values(input.taxIdentifiers.map((identifier) => ({
          partnerId: partner.id,
          ...identifier,
          verificationStatus: "unverified",
          verifiedAt: null,
          verificationSource: null,
          verificationReference: null,
          currentVerificationEventId: null,
          retiredAt: null,
        })));
      }

      if (input.registryIdentifiers.length > 0) {
        await tx.insert(schema.sellerRegistryIdentifiers).values(input.registryIdentifiers.map((identifier) => ({
          partnerId: partner.id,
          ...identifier,
          verificationStatus: "unverified",
          verifiedAt: null,
          verificationSource: null,
          verificationReference: null,
          currentVerificationEventId: null,
          retiredAt: null,
        })));
      }

      return { ok: true as const, partnerId: Number(partner.id) };
    });
  } catch (error) {
    console.error(`[partner-create] stage=transaction errorName=${error instanceof Error ? error.name : "Unknown"}`);
    return { ok: false, reason: "PARTNER_CREATE_FAILED" };
  }
}
