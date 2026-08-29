import test from "node:test";
import assert from "node:assert";
import {
  LegalIdentitySnapshotSchema,
  TaxIdentifierSnapshotSchema,
  RegistryIdentifierSnapshotSchema,
} from "@/lib/verification/events-core";

test("LegalIdentitySnapshotSchema strict validation", () => {
  const valid = {
    legalName: "Test",
    jurisdictionCountry: "PL",
    registeredAddressLine1: "Line 1",
    registeredAddressLine2: null,
    registeredPostalCode: "00-000",
    registeredCity: "Warsaw",
    registeredRegion: null,
    registeredCountryCode: "PL",
  };
  
  const res = LegalIdentitySnapshotSchema.safeParse(valid);
  assert.ok(res.success);

  const invalid = { ...valid, extraField: "should fail" };
  assert.ok(!LegalIdentitySnapshotSchema.safeParse(invalid).success);
});

test("TaxIdentifierSnapshotSchema strict validation", () => {
  const valid = {
    identifierType: "VAT",
    countryCode: "PL",
    identifierValue: "1234567890",
  };
  
  const res = TaxIdentifierSnapshotSchema.safeParse(valid);
  assert.ok(res.success);

  const invalid = { ...valid, extraField: "should fail" };
  assert.ok(!TaxIdentifierSnapshotSchema.safeParse(invalid).success);
});

test("RegistryIdentifierSnapshotSchema strict validation", () => {
  const valid = {
    registryType: "KRS",
    jurisdictionCountry: "PL",
    registryValue: "0000000000",
  };
  
  const res = RegistryIdentifierSnapshotSchema.safeParse(valid);
  assert.ok(res.success);

  const invalid = { ...valid, extraField: "should fail" };
  assert.ok(!RegistryIdentifierSnapshotSchema.safeParse(invalid).success);
});
