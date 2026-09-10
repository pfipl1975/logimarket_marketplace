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

// ---------------------------------------------------------------------------
// §10 L, M + §11: createPartnerCore canonical uniqueness and atomicity
// Unit-level (fake DB) proof — real DB atomicity is proven by PATH H in ci-integration.test.ts
// ---------------------------------------------------------------------------

import { describe } from "node:test";
import { createPartnerCore } from "@/lib/admin/partners-create";

/** Minimal fake DB for createPartnerCore. Supports:
 * - conflictPartnerId: partner whose canonical identity conflicts (different partner)
 * - insertThrowsCanonical23505: simulate race in tax identifier INSERT
 * - insertThrowsUnrelated23505: simulate unrelated 23505 in some other INSERT
 */
function makeFakeCreateDb(opts: {
  conflictPartnerId?: number;
  insertThrowsCanonical23505?: boolean;
  insertThrowsUnrelated23505?: boolean;
} = {}) {
  let selectCount = 0;
  let partnerInserted = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: Record<string, any> = {
    transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb(db),
    select: () => {
      const self = {
        from: () => self,
        where: () => self,
        limit: () => {
          selectCount++;
          // First select is the canonical conflict check
          if (selectCount === 1 && opts.conflictPartnerId !== undefined) {
            return [{ partnerId: opts.conflictPartnerId }];
          }
          return [];
        },
      };
      return self;
    },
    insert: () => ({
      values: () => {
        if (!partnerInserted) {
          partnerInserted = true;
          // partners insert — succeeds, returns id
          return {
            returning: () => [{ id: 42 }],
          };
        }
        // legal identities insert — succeeds
        if (!opts.insertThrowsCanonical23505 && !opts.insertThrowsUnrelated23505) {
          return { returning: () => [] };
        }
        // tax identifier insert — throws
        if (opts.insertThrowsCanonical23505) {
          throw { code: "23505", constraint: "uq_seller_tax_canonical_active" };
        }
        if (opts.insertThrowsUnrelated23505) {
          throw { code: "23505", constraint: "some_other_constraint" };
        }
        return { returning: () => [] };
      },
    }),
  };
  return db;
}

const validParsedInput = () => {
  const parsed = adminPartnerCreateSchema.safeParse(validPlInput());
  if (!parsed.success) throw new Error("fixture parse failed");
  return parsed.data;
};

describe("createPartnerCore — canonical uniqueness and 23505 domain mapping", () => {

  // §10 L: Different NIP → allowed (no pre-existing conflict)
  test("L: no pre-existing conflict → createPartnerCore succeeds", async () => {
    const db = makeFakeCreateDb();
    const res = await createPartnerCore(db as never, validParsedInput());
    assert.equal(res.ok, true);
  });

  // §11 / §10 J equivalent for create: cross-partner canonical conflict → SELLER_TAX_IDENTITY_ALREADY_ASSIGNED, partner NOT persisted
  test("§11: createPartnerCore with cross-partner canonical conflict → SELLER_TAX_IDENTITY_ALREADY_ASSIGNED", async () => {
    // The preflight SELECT finds a conflict on a different partner (id=999)
    const db = makeFakeCreateDb({ conflictPartnerId: 999 });
    const res = await createPartnerCore(db as never, validParsedInput());
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.equal((res as { reason: string }).reason, "SELLER_TAX_IDENTITY_ALREADY_ASSIGNED");
      assert.equal((res as { existingPartnerId?: number }).existingPartnerId, 999);
    }
  });

  // §10 N for create: 23505 on canonical index during race → SELLER_TAX_IDENTITY_ALREADY_ASSIGNED
  test("N: createPartnerCore race 23505 on uq_seller_tax_canonical_active → SELLER_TAX_IDENTITY_ALREADY_ASSIGNED", async () => {
    const db = makeFakeCreateDb({ insertThrowsCanonical23505: true });
    const res = await createPartnerCore(db as never, validParsedInput());
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.equal((res as { reason: string }).reason, "SELLER_TAX_IDENTITY_ALREADY_ASSIGNED");
      assert.equal((res as { existingPartnerId?: number }).existingPartnerId, undefined);
    }
  });

  // §10 O for create: unrelated 23505 → PARTNER_CREATE_FAILED, NOT tax conflict
  test("O: createPartnerCore race 23505 on unrelated constraint → PARTNER_CREATE_FAILED", async () => {
    const db = makeFakeCreateDb({ insertThrowsUnrelated23505: true });
    const res = await createPartnerCore(db as never, validParsedInput());
    assert.equal(res.ok, false);
    if (!res.ok) assert.equal((res as { reason: string }).reason, "PARTNER_CREATE_FAILED");
  });
});
