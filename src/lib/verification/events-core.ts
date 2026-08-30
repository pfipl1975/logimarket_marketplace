import { z } from "zod";

// Zod schemas for the strictly controlled immutable snapshots

export const LegalIdentitySnapshotSchema = z.object({
  legalName: z.string(),
  jurisdictionCountry: z.string(),
  registeredAddressLine1: z.string().nullable(),
  registeredAddressLine2: z.string().nullable(),
  registeredPostalCode: z.string().nullable(),
  registeredCity: z.string().nullable(),
  registeredRegion: z.string().nullable(),
  registeredCountryCode: z.string().nullable(),
}).strict();

export const TaxIdentifierSnapshotSchema = z.object({
  identifierType: z.string(),
  countryCode: z.string(),
  identifierValue: z.string(),
}).strict();

export const RegistryIdentifierSnapshotSchema = z.object({
  registryType: z.string(),
  jurisdictionCountry: z.string(),
  registryValue: z.string(),
}).strict();

export type LegalIdentitySnapshot = z.infer<typeof LegalIdentitySnapshotSchema>;
export type TaxIdentifierSnapshot = z.infer<typeof TaxIdentifierSnapshotSchema>;
export type RegistryIdentifierSnapshot = z.infer<typeof RegistryIdentifierSnapshotSchema>;

// Snapshot Builders
export function buildLegalIdentitySnapshot(data: Record<string, unknown>): LegalIdentitySnapshot {
  return LegalIdentitySnapshotSchema.parse({
    legalName: data.legalName,
    jurisdictionCountry: data.jurisdictionCountry,
    registeredAddressLine1: data.registeredAddressLine1 ?? null,
    registeredAddressLine2: data.registeredAddressLine2 ?? null,
    registeredPostalCode: data.registeredPostalCode ?? null,
    registeredCity: data.registeredCity ?? null,
    registeredRegion: data.registeredRegion ?? null,
    registeredCountryCode: data.registeredCountryCode ?? null,
  });
}

export function buildTaxIdentifierSnapshot(data: Record<string, unknown>): TaxIdentifierSnapshot {
  return TaxIdentifierSnapshotSchema.parse({
    identifierType: data.identifierType,
    countryCode: data.countryCode,
    identifierValue: data.identifierValue,
  });
}

export function buildRegistryIdentifierSnapshot(data: Record<string, unknown>): RegistryIdentifierSnapshot {
  return RegistryIdentifierSnapshotSchema.parse({
    registryType: data.registryType,
    jurisdictionCountry: data.jurisdictionCountry,
    registryValue: data.registryValue,
  });
}

export function validateEventOwnership(
  subjectType: "legal_identity" | "tax_identifier" | "registry_identifier",
  targetId: number,
  eventObj: Record<string, unknown>
): boolean {
  if (subjectType === "legal_identity") {
    return eventObj.subjectType === "legal_identity" && eventObj.legalIdentityPartnerId === targetId;
  }
  if (subjectType === "tax_identifier") {
    return eventObj.subjectType === "tax_identifier" && eventObj.taxIdentifierId === targetId;
  }
  if (subjectType === "registry_identifier") {
    return eventObj.subjectType === "registry_identifier" && eventObj.registryIdentifierId === targetId;
  }
  return false;
}
