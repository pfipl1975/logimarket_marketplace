import test from "node:test";
import assert from "node:assert/strict";
import {
  adminPartnerCreateSchema,
  parseAdminPartnerCreateInput,
} from "@/lib/admin/partners-create";
import {
  canonicalRegistryIdentifierWriteSchema,
  canonicalTaxIdentifierWriteSchema,
} from "@/lib/admin/seller-identifier-contract";

const validPlInput = () => ({
  companyName: "  Acme Trade  ",
  contactEmail: "  admin@acme.test ",
  websiteUrl: " https://acme.test ",
  legalName: "  Acme sp. z o.o.  ",
  jurisdictionCountry: "pl",
  registeredAddressLine1: "  Przemysłowa 1  ",
  registeredAddressLine2: " ",
  registeredPostalCode: " 00-001 ",
  registeredCity: " Warszawa ",
  registeredRegion: " Mazowieckie ",
  registeredCountryCode: "pl",
  taxIdentifiers: [
    { identifierType: "tax_id", identifierValue: "123-456-78-90", countryCode: "pl" },
    { identifierType: "vat_id", identifierValue: "PL 1234567890", countryCode: "PL" },
  ],
  registryIdentifiers: [
    { registryType: "commercial_register", registryValue: "0000-123-456", jurisdictionCountry: "pl" },
    { registryType: "statistical_id", registryValue: "123 456 785", jurisdictionCountry: "PL" },
  ],
});

test("complete PL onboarding is normalized without changing identifier semantics", () => {
  const parsed = adminPartnerCreateSchema.safeParse(validPlInput());
  assert.equal(parsed.success, true);
  if (!parsed.success) return;

  assert.equal(parsed.data.companyName, "Acme Trade");
  assert.equal(parsed.data.legalName, "Acme sp. z o.o.");
  assert.equal(parsed.data.contactEmail, "admin@acme.test");
  assert.equal(parsed.data.jurisdictionCountry, "PL");
  assert.equal(parsed.data.registeredAddressLine1, "Przemysłowa 1");
  assert.equal(parsed.data.registeredAddressLine2, null);
  assert.equal(parsed.data.registeredCountryCode, "PL");
  assert.deepEqual(parsed.data.taxIdentifiers.map((item) => item.identifierValue), ["1234567890", "1234567890"]);
  assert.deepEqual(parsed.data.registryIdentifiers.map((item) => item.registryValue), ["0000123456", "123456785"]);
});

test("legal name and registered-office core fields are required", () => {
  for (const field of ["legalName", "registeredAddressLine1", "registeredPostalCode", "registeredCity"] as const) {
    const input = { ...validPlInput(), [field]: "   " };
    assert.equal(adminPartnerCreateSchema.safeParse(input).success, false, field);
  }
});

test("email, website and ISO country validation remain server-authoritative", () => {
  assert.equal(adminPartnerCreateSchema.safeParse({ ...validPlInput(), contactEmail: "bad" }).success, false);
  assert.equal(adminPartnerCreateSchema.safeParse({ ...validPlInput(), websiteUrl: "ftp://acme.test" }).success, false);
  assert.equal(adminPartnerCreateSchema.safeParse({ ...validPlInput(), jurisdictionCountry: "POL" }).success, false);
  assert.equal(adminPartnerCreateSchema.safeParse({ ...validPlInput(), registeredCountryCode: "1P" }).success, false);
});

test("unknown identifier types are rejected on both write contracts", () => {
  const unknownTax = { ...validPlInput(), taxIdentifiers: [{ identifierType: "nip", identifierValue: "1234567890", countryCode: "PL" }] };
  const unknownRegistry = { ...validPlInput(), registryIdentifiers: [{ registryType: "ceidg", registryValue: "1234567890", jurisdictionCountry: "PL" }] };
  assert.equal(parseAdminPartnerCreateInput(unknownTax).ok, false);
  const registryResult = parseAdminPartnerCreateInput(unknownRegistry);
  assert.equal(registryResult.ok, false);
  if (!registryResult.ok) assert.equal(registryResult.code, "UNKNOWN_IDENTIFIER_TYPE");
});

test("PL identifier formats follow the Owner contract", () => {
  assert.equal(canonicalTaxIdentifierWriteSchema.safeParse({ identifierType: "tax_id", identifierValue: "123", countryCode: "PL" }).success, false);
  assert.equal(canonicalTaxIdentifierWriteSchema.safeParse({ identifierType: "vat_id", identifierValue: "DE123456789", countryCode: "PL" }).success, false);
  assert.equal(canonicalRegistryIdentifierWriteSchema.safeParse({ registryType: "commercial_register", registryValue: "123", jurisdictionCountry: "PL" }).success, false);
  assert.equal(canonicalRegistryIdentifierWriteSchema.safeParse({ registryType: "statistical_id", registryValue: "1234567890", jurisdictionCountry: "PL" }).success, false);
  assert.equal(canonicalRegistryIdentifierWriteSchema.safeParse({ registryType: "statistical_id", registryValue: "12345678901234", jurisdictionCountry: "PL" }).success, true);
});

test("PL tax_id is required while KRS, REGON and VAT remain optional", () => {
  const input = { ...validPlInput(), taxIdentifiers: [], registryIdentifiers: [] };
  const parsed = parseAdminPartnerCreateInput(input);
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.equal(parsed.code, "MISSING_PL_TAX_ID");

  const valid = { ...input, taxIdentifiers: [{ identifierType: "tax_id", identifierValue: "1234567890", countryCode: "PL" }] };
  assert.equal(adminPartnerCreateSchema.safeParse(valid).success, true);
});

test("non-PL onboarding allows neutral optional identifiers and preserves their value", () => {
  const input = {
    ...validPlInput(),
    jurisdictionCountry: "DE",
    registeredCountryCode: "DE",
    taxIdentifiers: [{ identifierType: "tax_id", identifierValue: "DE-TIN-42", countryCode: "DE" }],
    registryIdentifiers: [],
  };
  const parsed = adminPartnerCreateSchema.safeParse(input);
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.taxIdentifiers[0].identifierValue, "DE-TIN-42");

  assert.equal(adminPartnerCreateSchema.safeParse({ ...input, taxIdentifiers: [] }).success, true);
});

test("duplicate canonical types and country mismatch are rejected", () => {
  const duplicate = {
    ...validPlInput(),
    taxIdentifiers: [
      { identifierType: "tax_id", identifierValue: "1234567890", countryCode: "PL" },
      { identifierType: "tax_id", identifierValue: "0987654321", countryCode: "PL" },
    ],
  };
  const duplicateResult = parseAdminPartnerCreateInput(duplicate);
  assert.equal(duplicateResult.ok, false);
  if (!duplicateResult.ok) assert.equal(duplicateResult.code, "DUPLICATE_IDENTIFIER_TYPE");

  const mismatch = { ...validPlInput(), taxIdentifiers: [{ identifierType: "tax_id", identifierValue: "DE-TIN", countryCode: "DE" }] };
  const mismatchResult = parseAdminPartnerCreateInput(mismatch);
  assert.equal(mismatchResult.ok, false);
  if (!mismatchResult.ok) assert.equal(mismatchResult.code, "IDENTIFIER_COUNTRY_MISMATCH");
});

test("client payload cannot grant compliance state", () => {
  const parsed = adminPartnerCreateSchema.safeParse({
    ...validPlInput(),
    eligibilityStatus: "eligible",
    sellerReady: true,
    verificationStatus: "verified",
    verifiedAt: new Date().toISOString(),
    partnerAgreementStatus: "effective",
    currentVerificationEventId: 1,
  });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  const safe = parsed.data as unknown as Record<string, unknown>;
  for (const key of ["eligibilityStatus", "sellerReady", "verificationStatus", "verifiedAt", "partnerAgreementStatus", "currentVerificationEventId"]) {
    assert.equal(key in safe, false, key);
  }
});
