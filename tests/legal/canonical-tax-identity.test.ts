import { test, describe } from "node:test";
import assert from "node:assert";
import {
  resolveCanonicalTaxIdentity,
  canonicalTaxIdentifierWriteSchema,
} from "../../src/lib/admin/seller-identifier-contract";

// ---------------------------------------------------------------------------
// §10 A-C: PL tax_id format variants
// ---------------------------------------------------------------------------

describe("Canonical Tax Identity — PL NIP resolver", () => {

  // A. PL tax_id plain
  test("A: PL tax_id plain 10 digits -> PL:NIP/1234567890", () => {
    const r = resolveCanonicalTaxIdentity({ identifierType: "tax_id", countryCode: "PL", identifierValue: "1234567890" });
    assert.strictEqual(r.canonicalIdentityClass, "PL:NIP");
    assert.strictEqual(r.canonicalIdentifierValue, "1234567890");
  });

  // B. PL tax_id hyphenated
  test("B: PL tax_id hyphenated 123-456-78-90 -> PL:NIP/1234567890", () => {
    const r = resolveCanonicalTaxIdentity({ identifierType: "tax_id", countryCode: "PL", identifierValue: "123-456-78-90" });
    assert.strictEqual(r.canonicalIdentityClass, "PL:NIP");
    assert.strictEqual(r.canonicalIdentifierValue, "1234567890");
  });

  // C. PL tax_id spaced
  test("C: PL tax_id spaced '123 456 78 90' -> PL:NIP/1234567890", () => {
    const r = resolveCanonicalTaxIdentity({ identifierType: "tax_id", countryCode: "PL", identifierValue: "123 456 78 90" });
    assert.strictEqual(r.canonicalIdentityClass, "PL:NIP");
    assert.strictEqual(r.canonicalIdentifierValue, "1234567890");
  });

  // D. PL vat_id uppercase PL prefix
  test("D: PL vat_id PL1234567890 -> PL:NIP/1234567890", () => {
    const r = resolveCanonicalTaxIdentity({ identifierType: "vat_id", countryCode: "PL", identifierValue: "PL1234567890" });
    assert.strictEqual(r.canonicalIdentityClass, "PL:NIP");
    assert.strictEqual(r.canonicalIdentifierValue, "1234567890");
  });

  // E. PL vat_id lowercase pl prefix
  test("E: PL vat_id pl1234567890 lowercase prefix -> PL:NIP/1234567890", () => {
    const r = resolveCanonicalTaxIdentity({ identifierType: "vat_id", countryCode: "PL", identifierValue: "pl1234567890" });
    assert.strictEqual(r.canonicalIdentityClass, "PL:NIP");
    assert.strictEqual(r.canonicalIdentifierValue, "1234567890");
  });

  // PL vat_id with prefix and hyphens
  test("PL vat_id PL 123-456-78-90 -> PL:NIP/1234567890", () => {
    const r = resolveCanonicalTaxIdentity({ identifierType: "vat_id", countryCode: "PL", identifierValue: "PL 123-456-78-90" });
    assert.strictEqual(r.canonicalIdentityClass, "PL:NIP");
    assert.strictEqual(r.canonicalIdentifierValue, "1234567890");
  });

  // PL tax_id and vat_id for same NIP produce IDENTICAL canonical result
  test("PL tax_id and vat_id with same NIP produce identical canonical identity (cross-type collapse)", () => {
    const fromTaxId = resolveCanonicalTaxIdentity({ identifierType: "tax_id", countryCode: "PL", identifierValue: "9876543210" });
    const fromVatId = resolveCanonicalTaxIdentity({ identifierType: "vat_id", countryCode: "PL", identifierValue: "PL9876543210" });
    assert.strictEqual(fromTaxId.canonicalIdentityClass, fromVatId.canonicalIdentityClass);
    assert.strictEqual(fromTaxId.canonicalIdentifierValue, fromVatId.canonicalIdentifierValue);
  });
});

// ---------------------------------------------------------------------------
// §10 F-G: Malformed PL input rejected by schema
// ---------------------------------------------------------------------------

describe("Canonical Tax Identity — PL NIP schema validation rejects malformed input", () => {

  // F. Too short (9 digits)
  test("F: PL tax_id 9 digits rejected with INVALID_PL_TAX_ID", () => {
    const r = canonicalTaxIdentifierWriteSchema.safeParse({ identifierType: "tax_id", identifierValue: "123456789", countryCode: "PL" });
    assert.strictEqual(r.success, false);
    if (!r.success) assert.strictEqual(r.error.issues[0]?.message, "INVALID_PL_TAX_ID");
  });

  // F. Too long (11 digits)
  test("F: PL tax_id 11 digits rejected", () => {
    const r = canonicalTaxIdentifierWriteSchema.safeParse({ identifierType: "tax_id", identifierValue: "12345678901", countryCode: "PL" });
    assert.strictEqual(r.success, false);
  });

  // G. Non-digit content rejected
  test("G: PL tax_id non-digit content ABCDEFGHIJ rejected with INVALID_PL_TAX_ID", () => {
    const r = canonicalTaxIdentifierWriteSchema.safeParse({ identifierType: "tax_id", identifierValue: "ABCDEFGHIJ", countryCode: "PL" });
    assert.strictEqual(r.success, false);
    if (!r.success) assert.strictEqual(r.error.issues[0]?.message, "INVALID_PL_TAX_ID");
  });

  // G. PL vat_id with wrong non-PL prefix rejected
  test("G: PL vat_id with DE prefix rejected with INVALID_PL_VAT_ID", () => {
    const r = canonicalTaxIdentifierWriteSchema.safeParse({ identifierType: "vat_id", identifierValue: "DE123456789", countryCode: "PL" });
    assert.strictEqual(r.success, false);
    if (!r.success) assert.strictEqual(r.error.issues[0]?.message, "INVALID_PL_VAT_ID");
  });
});

// ---------------------------------------------------------------------------
// §10 H: Non-PL — deterministic without unsupported cross-type collapse
// ---------------------------------------------------------------------------

describe("Canonical Tax Identity — non-PL deterministic, no unsupported cross-type collapse", () => {

  // H. DE tax_id and DE vat_id are DISTINCT canonical classes
  test("H: DE tax_id vs DE vat_id remain distinct canonical classes (no collapse)", () => {
    const fromTaxId = resolveCanonicalTaxIdentity({ identifierType: "tax_id", countryCode: "DE", identifierValue: "123456789" });
    const fromVatId = resolveCanonicalTaxIdentity({ identifierType: "vat_id", countryCode: "DE", identifierValue: "123456789" });
    assert.strictEqual(fromTaxId.canonicalIdentityClass, "DE:TAX_ID");
    assert.strictEqual(fromVatId.canonicalIdentityClass, "DE:VAT_ID");
    assert.notStrictEqual(fromTaxId.canonicalIdentityClass, fromVatId.canonicalIdentityClass);
  });

  // H. Non-PL value: hyphens and spaces are preserved (not stripped)
  test("H: non-PL identifier value preserves separators — trim+uppercase only, no stripping", () => {
    const r = resolveCanonicalTaxIdentity({ identifierType: "vat_id", countryCode: "DE", identifierValue: "DE 123-456-789" });
    assert.strictEqual(r.canonicalIdentifierValue, "DE 123-456-789".trim().toUpperCase());
    assert.ok(r.canonicalIdentifierValue.includes("-"), "hyphens must be preserved for non-PL");
    assert.ok(r.canonicalIdentifierValue.includes(" "), "internal space must be preserved for non-PL");
  });

  // H. Non-PL canonical class is COUNTRY:IDENTIFIER_TYPE uppercase
  test("H: non-PL canonical class format is COUNTRY:IDENTIFIER_TYPE uppercased", () => {
    const r = resolveCanonicalTaxIdentity({ identifierType: "tax_id", countryCode: "FR", identifierValue: "12345678901" });
    assert.strictEqual(r.canonicalIdentityClass, "FR:TAX_ID");
  });
});
