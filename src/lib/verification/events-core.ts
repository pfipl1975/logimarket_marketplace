import { z } from "zod";

// Zod schemas for the strictly controlled immutable snapshots

export const LegalIdentitySnapshotSchema = z.object({
  legalName: z.string().nullable(),
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
export function buildLegalIdentitySnapshot(data: unknown): LegalIdentitySnapshot {
  return LegalIdentitySnapshotSchema.parse(data);
}

export function buildTaxIdentifierSnapshot(data: unknown): TaxIdentifierSnapshot {
  return TaxIdentifierSnapshotSchema.parse(data);
}

export function buildRegistryIdentifierSnapshot(data: unknown): RegistryIdentifierSnapshot {
  return RegistryIdentifierSnapshotSchema.parse(data);
}
