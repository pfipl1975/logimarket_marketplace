import { z } from "zod";

export const TAX_IDENTIFIER_TYPES = ["tax_id", "vat_id"] as const;
export const REGISTRY_IDENTIFIER_TYPES = [
  "commercial_register",
  "statistical_id",
] as const;

export type TaxIdentifierType = (typeof TAX_IDENTIFIER_TYPES)[number];
export type RegistryIdentifierType = (typeof REGISTRY_IDENTIFIER_TYPES)[number];

export const taxIdentifierTypeSchema = z.enum(TAX_IDENTIFIER_TYPES, {
  error: "UNKNOWN_IDENTIFIER_TYPE",
});

export const registryIdentifierTypeSchema = z.enum(
  REGISTRY_IDENTIFIER_TYPES,
  { error: "UNKNOWN_IDENTIFIER_TYPE" },
);

export const identifierCountryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(2, "INVALID_COUNTRY_CODE")
  .regex(/^[A-Z]{2}$/, "INVALID_COUNTRY_CODE");

const identifierValueSchema = z
  .string()
  .trim()
  .min(1, "MISSING_IDENTIFIER_VALUE")
  .max(100, "IDENTIFIER_VALUE_TOO_LONG")
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), {
    message: "INVALID_IDENTIFIER_VALUE",
  });

function removeSafeSeparators(value: string) {
  return value.replace(/[\s-]/g, "");
}

export const canonicalTaxIdentifierWriteSchema = z
  .object({
    identifierType: taxIdentifierTypeSchema,
    identifierValue: identifierValueSchema,
    countryCode: identifierCountryCodeSchema,
  })
  .transform((input, ctx) => {
    if (input.countryCode !== "PL") {
      return input;
    }

    let identifierValue = removeSafeSeparators(input.identifierValue);
    if (input.identifierType === "vat_id" && /^PL/i.test(identifierValue)) {
      identifierValue = identifierValue.slice(2);
    }

    if (!/^\d{10}$/.test(identifierValue)) {
      ctx.addIssue({
        code: "custom",
        path: ["identifierValue"],
        message:
          input.identifierType === "tax_id"
            ? "INVALID_PL_TAX_ID"
            : "INVALID_PL_VAT_ID",
      });
      return z.NEVER;
    }

    return { ...input, identifierValue };
  });

export const canonicalRegistryIdentifierWriteSchema = z
  .object({
    registryType: registryIdentifierTypeSchema,
    registryValue: identifierValueSchema,
    jurisdictionCountry: identifierCountryCodeSchema,
  })
  .transform((input, ctx) => {
    if (input.jurisdictionCountry !== "PL") {
      return input;
    }

    const registryValue = removeSafeSeparators(input.registryValue);
    const valid =
      input.registryType === "commercial_register"
        ? /^\d{10}$/.test(registryValue)
        : /^(?:\d{9}|\d{14})$/.test(registryValue);

    if (!valid) {
      ctx.addIssue({
        code: "custom",
        path: ["registryValue"],
        message:
          input.registryType === "commercial_register"
            ? "INVALID_PL_COMMERCIAL_REGISTER"
            : "INVALID_PL_STATISTICAL_ID",
      });
      return z.NEVER;
    }

    return { ...input, registryValue };
  });

export function isTaxIdentifierType(value: string): value is TaxIdentifierType {
  return TAX_IDENTIFIER_TYPES.includes(value as TaxIdentifierType);
}

export function isRegistryIdentifierType(
  value: string,
): value is RegistryIdentifierType {
  return REGISTRY_IDENTIFIER_TYPES.includes(value as RegistryIdentifierType);
}
