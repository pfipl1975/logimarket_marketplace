import { describe, test } from "node:test";
import assert from "node:assert";
import {
  AdminSellerLegalDataSaveInputSchema,
  AdminSellerTaxIdentifierAddInputSchema,
  AdminSellerTaxIdentifierDeleteInputSchema,
  AdminSellerRegistryIdentifierAddInputSchema,

  executeAdminSellerLegalDataSave,
  executeAdminSellerTaxIdentifierAdd,
  executeAdminSellerTaxIdentifierDelete,


  type AdminSellerLegalDataSaveInput,
  type AdminSellerTaxIdentifierAddInput,
  type AdminSellerTaxIdentifierDeleteInput,


} from "../../src/lib/admin/partner-edit-core";
import { buildSellerDisclosure } from "../../src/lib/legal/seller-disclosure";
import { resolveCanonicalTaxIdentity } from "../../src/lib/admin/seller-identifier-contract";
import { executeAdminSellerRegistryIdentifierAdd, executeAdminSellerRegistryIdentifierDelete, AdminSellerRegistryIdentifierAddInput, AdminSellerRegistryIdentifierDeleteInput } from "../../src/lib/admin/partner-edit-core";

describe("Admin Seller Legal Data Save Input Validation", () => {
  test("businessEmail > 100 chars -> rejected", () => {
    const input = { adminUserId: "admin", partnerId: 1, businessEmail: "a".repeat(101) + "@ex.com", legalName: "Company", jurisdictionCountry: "PL", registeredAddressLine1: "", registeredAddressLine2: "", registeredPostalCode: "", registeredCity: "", registeredRegion: "", registeredCountryCode: "" } satisfies AdminSellerLegalDataSaveInput;
    assert.strictEqual(AdminSellerLegalDataSaveInputSchema.safeParse(input).success, false);
  });

  test("legalName > 255 chars -> rejected", () => {
    const input = { adminUserId: "admin", partnerId: 1, businessEmail: "test@ex.com", legalName: "a".repeat(256), jurisdictionCountry: "PL", registeredAddressLine1: "", registeredAddressLine2: "", registeredPostalCode: "", registeredCity: "", registeredRegion: "", registeredCountryCode: "" } satisfies AdminSellerLegalDataSaveInput;
    assert.strictEqual(AdminSellerLegalDataSaveInputSchema.safeParse(input).success, false);
  });

  test("legalName required + trim", () => {
    const input = { adminUserId: "admin", partnerId: 1, businessEmail: "test@ex.com", legalName: "   ", jurisdictionCountry: "PL", registeredAddressLine1: "", registeredAddressLine2: "", registeredPostalCode: "", registeredCity: "", registeredRegion: "", registeredCountryCode: "" } satisfies AdminSellerLegalDataSaveInput;
    assert.strictEqual(AdminSellerLegalDataSaveInputSchema.safeParse(input).success, false);
  });

  test("invalid email -> rejected", () => {
    const input = { adminUserId: "admin", partnerId: 1, businessEmail: "not-an-email", legalName: "Company", jurisdictionCountry: "PL", registeredAddressLine1: "", registeredAddressLine2: "", registeredPostalCode: "", registeredCity: "", registeredRegion: "", registeredCountryCode: "" } satisfies AdminSellerLegalDataSaveInput;
    assert.strictEqual(AdminSellerLegalDataSaveInputSchema.safeParse(input).success, false);
  });

  test("invalid partnerId -> rejected", () => {
    const input = { adminUserId: "admin", partnerId: -1, businessEmail: "test@ex.com", legalName: "Company", jurisdictionCountry: "PL", registeredAddressLine1: "", registeredAddressLine2: "", registeredPostalCode: "", registeredCity: "", registeredRegion: "", registeredCountryCode: "" } satisfies AdminSellerLegalDataSaveInput;
    assert.strictEqual(AdminSellerLegalDataSaveInputSchema.safeParse(input).success, false);
  });

  test("invalid jurisdiction length -> rejected", () => {
    const input = { adminUserId: "admin", partnerId: 1, businessEmail: "test@ex.com", legalName: "Company", jurisdictionCountry: "POL", registeredAddressLine1: "", registeredAddressLine2: "", registeredPostalCode: "", registeredCity: "", registeredRegion: "", registeredCountryCode: "" } satisfies AdminSellerLegalDataSaveInput;
    assert.strictEqual(AdminSellerLegalDataSaveInputSchema.safeParse(input).success, false);
  });

  test("jurisdiction normalization (lowercase to uppercase) accepted", () => {
    const input = { adminUserId: "admin", partnerId: 1, businessEmail: "test@ex.com", legalName: "Company", jurisdictionCountry: "pl", registeredAddressLine1: "", registeredAddressLine2: "", registeredPostalCode: "", registeredCity: "", registeredRegion: "", registeredCountryCode: "" } satisfies AdminSellerLegalDataSaveInput;
    const res = AdminSellerLegalDataSaveInputSchema.safeParse(input);
    assert.strictEqual(res.success, true);
    if (res.success) {
      assert.strictEqual(res.data.jurisdictionCountry, "PL");
    }
  });

  test("blank optional address -> null", () => {
    const input = { adminUserId: "admin", partnerId: 1, businessEmail: "test@ex.com", legalName: "Company", jurisdictionCountry: "PL", registeredAddressLine1: "   ", registeredAddressLine2: "", registeredPostalCode: "", registeredCity: "", registeredRegion: "", registeredCountryCode: "" } satisfies AdminSellerLegalDataSaveInput;
    const res = AdminSellerLegalDataSaveInputSchema.safeParse(input);
    assert.strictEqual(res.success, true);
    if (res.success) {
      assert.strictEqual(res.data.registeredAddressLine1, null);
    }
  });

  test("address max length -> rejected", () => {
    const input = { adminUserId: "admin", partnerId: 1, businessEmail: "test@ex.com", legalName: "Company", jurisdictionCountry: "PL", registeredAddressLine1: "a".repeat(256), registeredAddressLine2: "", registeredPostalCode: "", registeredCity: "", registeredRegion: "", registeredCountryCode: "" } satisfies AdminSellerLegalDataSaveInput;
    assert.strictEqual(AdminSellerLegalDataSaveInputSchema.safeParse(input).success, false);
  });
});

describe("Admin Seller Tax Identifier Add Input Validation", () => {
  test("invalid input rejected", () => {
    const input = { adminUserId: "admin", partnerId: 1, identifierType: "vat_id", identifierValue: "PL1234567890", countryCode: "POL" } satisfies AdminSellerTaxIdentifierAddInput;
    const result = AdminSellerTaxIdentifierAddInputSchema.safeParse(input);
    assert.strictEqual(result.success, false);
    if (!result.success) {
      assert.deepStrictEqual(result.error.issues[0]?.path, ["countryCode"]);
    }
  });
});

describe("Admin Seller Tax Identifier Delete Input Validation", () => {
  test("delete predicate contains BOTH taxIdentifierId and partnerId", () => {
    const input = { adminUserId: "admin", partnerId: 1, taxIdentifierId: 2 } satisfies AdminSellerTaxIdentifierDeleteInput;
    assert.strictEqual(AdminSellerTaxIdentifierDeleteInputSchema.safeParse(input).success, true);
    // Invalid input (missing partnerId)
    assert.strictEqual(AdminSellerTaxIdentifierDeleteInputSchema.safeParse({ taxIdentifierId: 2 }).success, false);
  });
});

type FakeDbConfig = {
  partnerExists?: boolean;
  identityExists?: boolean;
  deleteReturnsRow?: boolean;
  insertThrowsDuplicate?: boolean;
  insertThrowsUnrelatedDuplicate?: boolean;
  taxIdentifierConflictExists?: boolean;
  crossPartnerConflictExists?: boolean;
};

class FakeDb {
  public updates: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  public inserts: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  public deletes: Array<{ table: unknown; condition: unknown }> = [];
  public transactionExecuted = false;

  private selectCallIndex = 0;

  constructor(private config: FakeDbConfig) {}

  async transaction(cb: (tx: FakeDb) => Promise<unknown>) {
    this.transactionExecuted = true;
    return await cb(this);
  }

  select() {
    const createChain = (terminalFunc: Record<string, unknown>) => {
      const chain: Record<string, unknown> = new Proxy({}, {
        get: (target, prop) => {
          if (prop === "limit") return () => terminalFunc();
          if (prop === "for") return () => chain;
          if (prop === "from") return () => chain;
          if (prop === "where") return () => chain;
          return undefined;
        }
      });
      return chain;
    };

    return createChain(() => {
      this.selectCallIndex++;
      let res: Record<string, unknown> = [];
      if (this.selectCallIndex === 1) {
        res = this.config.partnerExists !== false ? [{ id: 1, contactEmail: "test@example.com", verificationStatus: "unverified", currentVerificationEventId: null, retiredAt: null }] : [];
      } else if (this.selectCallIndex === 2) {
        res = this.config.identityExists !== false ? [{ currentVerificationEventId: null, retiredAt: null, 
            partnerId: 1,
            legalName: "New Company",
            jurisdictionCountry: "PL",
            registeredAddressLine1: "Line 1",
            registeredAddressLine2: null,
            registeredPostalCode: null,
            registeredCity: null,
            registeredRegion: null,
            registeredCountryCode: null,
            verificationStatus: "unverified"
          }] : [];
      } else if (this.selectCallIndex === 3) {
        if (this.config.crossPartnerConflictExists) {
          res = [{ partnerId: 999 }]; // different partner — cross-partner conflict
        } else {
          res = this.config.taxIdentifierConflictExists ? [{ partnerId: 1 }] : [];
        }
      }
      res.for = () => res;
      return res;
    });
  }

  update(table: unknown) {
    return {
      set: (values: Record<string, unknown>) => {
        this.updates.push({ table, values });
        return {
          where: () => ({})
        };
      }
    };
  }

  insert(table: unknown) {
    return {
      values: (values: Record<string, unknown>) => {
        if (this.config.insertThrowsDuplicate) {
          throw { code: "23505", constraint: "uq_seller_tax_canonical_active" };
        }
        if (this.config.insertThrowsUnrelatedDuplicate) {
          throw { code: "23505", constraint: "some_other_unique_constraint" };
        }
        this.inserts.push({ table, values });
        const chain: Record<string, unknown> = {
          onConflictDoUpdate: () => chain,
          returning: () => [{ id: 999 }]
        };
        return chain;
      }
    };
  }

  delete(table: unknown) {
    return {
      where: (condition: unknown) => {
        this.deletes.push({ table, condition });
        return {
          returning: () => this.config.deleteReturnsRow !== false ? [{ id: 1 }] : []
        };
      }
    };
  }
}

describe("Execute Admin Seller Legal Data Save", () => {
  test("Partner missing -> PARTNER_NOT_FOUND", async () => {
    const db = new FakeDb({ partnerExists: false });
    const input = {
      adminUserId: "admin", partnerId: 1, businessEmail: "new@ex.com", legalName: "New Company", jurisdictionCountry: "PL",
      registeredAddressLine1: "Line 1", registeredAddressLine2: null, registeredPostalCode: null,
      registeredCity: null, registeredRegion: null, registeredCountryCode: null
    } satisfies AdminSellerLegalDataSaveInput;
    const res = await executeAdminSellerLegalDataSave(db as never, input, { actorUserId: "admin" });
    assert.strictEqual(res.ok, false);
    if (!res.ok) assert.strictEqual(res.code, "PARTNER_NOT_FOUND");
  });

  test("legal identity save -> UPDATE path and same transaction used for partner email + identity", async () => {
    const db = new FakeDb({ identityExists: true });
    const input = {
      adminUserId: "admin", partnerId: 1, businessEmail: "new@ex.com", legalName: "Updated Company", jurisdictionCountry: "PL",
      registeredAddressLine1: "Line 1", registeredAddressLine2: null, registeredPostalCode: null,
      registeredCity: null, registeredRegion: null, registeredCountryCode: null
    } satisfies AdminSellerLegalDataSaveInput;
    const res = await executeAdminSellerLegalDataSave(db as never, input, { actorUserId: "admin" });

    assert.strictEqual(res.ok, true);
    assert.strictEqual(db.transactionExecuted, true);
    assert.strictEqual(db.updates.length, 2); // 1 for partner email, 1 for identity

    // Assert update payload DOES reset verification fields
    const updatePayload = db.updates[1].values;
    assert.strictEqual(updatePayload.verificationStatus, "unverified");
    assert.strictEqual("currentVerificationEventId" in updatePayload, true);
  });

  test("legal identity save -> INSERT path", async () => {
    const db = new FakeDb({ identityExists: false });
    const input = {
      adminUserId: "admin", partnerId: 1, businessEmail: "new@ex.com", legalName: "New Company", jurisdictionCountry: "PL",
      registeredAddressLine1: "Line 1", registeredAddressLine2: null, registeredPostalCode: null,
      registeredCity: null, registeredRegion: null, registeredCountryCode: null
    } satisfies AdminSellerLegalDataSaveInput;
    const res = await executeAdminSellerLegalDataSave(db as never, input, { actorUserId: "admin" });

    assert.strictEqual(res.ok, true);
    assert.strictEqual(db.transactionExecuted, true);
    assert.strictEqual(db.inserts.length, 1);

    // Assert insertion defaults are correct
    const insertPayload = db.inserts[0].values;
    assert.strictEqual(insertPayload.verificationStatus, "unverified");
    assert.strictEqual("verifiedAt" in insertPayload, false);
    assert.strictEqual("verificationSource" in insertPayload, false);
    assert.strictEqual("verificationReference" in insertPayload, false);
  });
});

describe("Execute Admin Seller Tax Identifier Add", () => {
  test("Partner missing -> PARTNER_NOT_FOUND", async () => {
    const db = new FakeDb({ partnerExists: false });
    const input = AdminSellerTaxIdentifierAddInputSchema.parse({
      partnerId: 1, identifierType: "vat_id", identifierValue: "PL1234567890", countryCode: "PL"
    });
    const res = await executeAdminSellerTaxIdentifierAdd(db as never, input);
    assert.strictEqual(res.ok, false);
    if (!res.ok) assert.strictEqual(res.code, "PARTNER_NOT_FOUND");
  });

  test("legal identity missing -> LEGAL_IDENTITY_REQUIRED", async () => {
    const db = new FakeDb({ identityExists: false });
    const input = AdminSellerTaxIdentifierAddInputSchema.parse({
      partnerId: 1, identifierType: "vat_id", identifierValue: "PL1234567890", countryCode: "PL"
    });
    const res = await executeAdminSellerTaxIdentifierAdd(db as never, input);
    assert.strictEqual(res.ok, false);
    if (!res.ok) assert.strictEqual(res.code, "LEGAL_IDENTITY_REQUIRED");
  });

  // §10 I: same partner, same canonical identity → TAX_IDENTIFIER_CONFLICT
  test("I: pre-existing exact duplicate SELECT same partner -> TAX_IDENTIFIER_CONFLICT and NO INSERT", async () => {
    const db = new FakeDb({ taxIdentifierConflictExists: true });
    const input = {
      partnerId: 1, identifierType: "vat_id", identifierValue: "PL1234567890", countryCode: "PL"
    } satisfies AdminSellerTaxIdentifierAddInput;
    const res = await executeAdminSellerTaxIdentifierAdd(db as never, input);
    assert.strictEqual(res.ok, false);
    if (!res.ok) assert.strictEqual(res.code, "TAX_IDENTIFIER_CONFLICT");
    assert.strictEqual(db.inserts.length, 0); // duplicate precheck performs NO INSERT
  });

  // §10 J: same canonical identity, different partner → SELLER_TAX_IDENTITY_ALREADY_ASSIGNED
  test("J: cross-partner SELECT conflict -> SELLER_TAX_IDENTITY_ALREADY_ASSIGNED with existingPartnerId", async () => {
    const db = new FakeDb({ crossPartnerConflictExists: true });
    const input = {
      partnerId: 1, identifierType: "vat_id", identifierValue: "PL1234567890", countryCode: "PL"
    } satisfies AdminSellerTaxIdentifierAddInput;
    const res = await executeAdminSellerTaxIdentifierAdd(db as never, input);
    assert.strictEqual(res.ok, false);
    if (!res.ok) {
      assert.strictEqual(res.code, "SELLER_TAX_IDENTITY_ALREADY_ASSIGNED");
      assert.strictEqual((res as { existingPartnerId?: number }).existingPartnerId, 999);
    }
    assert.strictEqual(db.inserts.length, 0);
  });

  // §10 K: tax_id vs vat_id same PL NIP across partners → resolveCanonicalTaxIdentity produces same class/value
  test("K: tax_id and vat_id with same PL NIP are equivalent canonical class for cross-partner detection", () => {
    const fromTaxId = resolveCanonicalTaxIdentity({ identifierType: "tax_id", countryCode: "PL", identifierValue: "1234567890" });
    const fromVatId = resolveCanonicalTaxIdentity({ identifierType: "vat_id", countryCode: "PL", identifierValue: "PL1234567890" });
    assert.strictEqual(fromTaxId.canonicalIdentityClass, fromVatId.canonicalIdentityClass);
    assert.strictEqual(fromTaxId.canonicalIdentifierValue, fromVatId.canonicalIdentifierValue);
  });

  // §10 N: canonical DB uniqueness 23505 with constraint name → SELLER_TAX_IDENTITY_ALREADY_ASSIGNED
  test("N: INSERT throws 23505 on uq_seller_tax_canonical_active (race) -> SELLER_TAX_IDENTITY_ALREADY_ASSIGNED", async () => {
    const db = new FakeDb({ insertThrowsDuplicate: true });
    const input = {
      partnerId: 1, identifierType: "vat_id", identifierValue: "PL1234567890", countryCode: "PL"
    } satisfies AdminSellerTaxIdentifierAddInput;
    const res = await executeAdminSellerTaxIdentifierAdd(db as never, input);
    assert.strictEqual(res.ok, false);
    if (!res.ok) assert.strictEqual(res.code, "SELLER_TAX_IDENTITY_ALREADY_ASSIGNED");
  });

  // §10 O: unrelated 23505 (different constraint) → SYSTEM_ERROR, NOT falsely classified as tax duplicate
  test("O: INSERT throws 23505 on unrelated constraint -> SYSTEM_ERROR, not SELLER_TAX_IDENTITY_ALREADY_ASSIGNED", async () => {
    const db = new FakeDb({ insertThrowsUnrelatedDuplicate: true });
    const input = {
      partnerId: 1, identifierType: "vat_id", identifierValue: "PL1234567890", countryCode: "PL"
    } satisfies AdminSellerTaxIdentifierAddInput;
    const res = await executeAdminSellerTaxIdentifierAdd(db as never, input);
    assert.strictEqual(res.ok, false);
    if (!res.ok) assert.strictEqual(res.code, "SYSTEM_ERROR");
  });

  test("successful insert uses expected fields and verificationStatus='unverified'", async () => {
    const db = new FakeDb({});
    const input = AdminSellerTaxIdentifierAddInputSchema.parse({
      partnerId: 1, identifierType: "vat_id", identifierValue: "PL1234567890", countryCode: "PL"
    });
    const res = await executeAdminSellerTaxIdentifierAdd(db as never, input);
    assert.strictEqual(res.ok, true);

    assert.strictEqual(db.inserts.length, 1);
    const insertPayload = db.inserts[0].values;
    assert.strictEqual(insertPayload.identifierType, "vat_id");
    assert.strictEqual(insertPayload.identifierValue, "1234567890");
    assert.strictEqual(insertPayload.countryCode, "PL");
    assert.strictEqual(insertPayload.verificationStatus, "unverified");
  });
});

describe("Execute Admin Seller Tax Identifier Delete", () => {
  test('history exists -> blocked', async () => {
    const db = new FakeDb({ deleteReturnsRow: true, identityExists: true });
    const input = { adminUserId: 'admin', partnerId: 1, taxIdentifierId: 2 } satisfies AdminSellerTaxIdentifierDeleteInput;
    const res = await executeAdminSellerTaxIdentifierDelete(db as never, input);
    assert.strictEqual(res.ok, false);
    if (!res.ok) assert.strictEqual(res.code, 'VERIFICATION_HISTORY_EXISTS');
  });

  test('23503 -> VERIFICATION_HISTORY_EXISTS', async () => {
    const db = new FakeDb({ deleteReturnsRow: true, identityExists: false });
    db.delete = () => ({ where: () => { throw { code: '23503' }; } });
    const input = { adminUserId: 'admin', partnerId: 1, taxIdentifierId: 2 } satisfies AdminSellerTaxIdentifierDeleteInput;
    const res = await executeAdminSellerTaxIdentifierDelete(db as never, input);
    assert.strictEqual(res.ok, false);
    if (!res.ok) assert.strictEqual(res.code, 'VERIFICATION_HISTORY_EXISTS');
  });

  test("no matching scoped row -> NOT_FOUND", async () => {
    const db = new FakeDb({ deleteReturnsRow: false, partnerExists: false });
    const input = { adminUserId: "admin", partnerId: 1, taxIdentifierId: 2 } satisfies AdminSellerTaxIdentifierDeleteInput;
    const res = await executeAdminSellerTaxIdentifierDelete(db as never, input);
    assert.strictEqual(res.ok, false);
    if (!res.ok) assert.strictEqual(res.code, "NOT_FOUND");
  });

  test("successful scoped delete -> DELETED and behavioral query proof contains BOTH taxIdentifierId and partnerId", async () => {
    const db = new FakeDb({ deleteReturnsRow: true, identityExists: false });
    const input = { adminUserId: "admin", partnerId: 1, taxIdentifierId: 2 } satisfies AdminSellerTaxIdentifierDeleteInput;
    const res = await executeAdminSellerTaxIdentifierDelete(db as never, input);

    assert.strictEqual(res.ok, true);
    assert.strictEqual(db.deletes.length, 1);

    // Verify Drizzle AST for condition contains both arguments
    let foundPartner = false;
    let foundTaxId = false;
    const walk = (obj: unknown, seen = new WeakSet()) => {
      if (!obj || typeof obj !== "object" || seen.has(obj)) return;
      seen.add(obj);
      if ((obj as Record<string, unknown>).value === 1) foundPartner = true;
      if ((obj as Record<string, unknown>).value === 2) foundTaxId = true;
      for (const val of Object.values(obj)) walk(val, seen);
    };
    walk(db.deletes[0].condition);
    assert.strictEqual(foundPartner, true);
    assert.strictEqual(foundTaxId, true);
  });
});

describe("Seller Disclosure Completeness", () => {
  test("incomplete data returns expected stable missing fields", () => {
    const disclosure = buildSellerDisclosure(1, "Company", null, {}, []);
    assert.strictEqual(disclosure.completeness.complete, false);
    assert.strictEqual(disclosure.completeness.missing.includes("business_email"), true);
  });

  test("complete data returns complete=true and missing.length=0", () => {
    const disclosure = buildSellerDisclosure(
      1,
      "Company",
      "valid@ex.com",
      {
        legalName: "Valid Legal Name",
        jurisdictionCountry: "PL",
        addressLine1: "Line 1",
        postalCode: "00-000",
        city: "City",
        countryCode: "PL"
      },
      [{ type: "VAT", value: "PL123", countryCode: "PL" }]
    );

    assert.strictEqual(disclosure.completeness.complete, true);
    assert.strictEqual(disclosure.completeness.missing.length, 0);
  });
});


describe("Admin Seller Registry Identifier Add Input Validation", () => {
  test("invalid partnerId -> rejected", () => {
    const input = { adminUserId: "admin", partnerId: -1, registryType: "commercial_register", registryValue: "0000123456", jurisdictionCountry: "PL" };
    assert.strictEqual(AdminSellerRegistryIdentifierAddInputSchema.safeParse(input).success, false);
  });

  test("empty registryType -> rejected", () => {
    const input = { adminUserId: "admin", partnerId: 1, registryType: "   ", registryValue: "0000123456", jurisdictionCountry: "PL" };
    assert.strictEqual(AdminSellerRegistryIdentifierAddInputSchema.safeParse(input).success, false);
  });

  test("empty registryValue -> rejected", () => {
    const input = { adminUserId: "admin", partnerId: 1, registryType: "commercial_register", registryValue: "   ", jurisdictionCountry: "PL" };
    assert.strictEqual(AdminSellerRegistryIdentifierAddInputSchema.safeParse(input).success, false);
  });

  test("invalid jurisdictionCountry -> rejected", () => {
    const input = { adminUserId: "admin", partnerId: 1, registryType: "commercial_register", registryValue: "0000123456", jurisdictionCountry: "POL" };
    assert.strictEqual(AdminSellerRegistryIdentifierAddInputSchema.safeParse(input).success, false);
  });

  test("lowercase country normalization", () => {
    const input = { adminUserId: "admin", partnerId: 1, registryType: "commercial_register", registryValue: "0000-123-456", jurisdictionCountry: "pl" };
    const parsed = AdminSellerRegistryIdentifierAddInputSchema.safeParse(input);
    assert.strictEqual(parsed.success, true);
    if (parsed.success) {
      assert.strictEqual(parsed.data.jurisdictionCountry, "PL");
    }
  });

  test("oversized registryType -> rejected", () => {
    const input = { adminUserId: "admin", partnerId: 1, registryType: "a".repeat(51), registryValue: "0000123456", jurisdictionCountry: "PL" };
    assert.strictEqual(AdminSellerRegistryIdentifierAddInputSchema.safeParse(input).success, false);
  });

  test("oversized registryValue -> rejected", () => {
    const input = { adminUserId: "admin", partnerId: 1, registryType: "commercial_register", registryValue: "a".repeat(101), jurisdictionCountry: "PL" };
    assert.strictEqual(AdminSellerRegistryIdentifierAddInputSchema.safeParse(input).success, false);
  });
});

describe('Execute Admin Seller Registry Identifier Add', () => {
  test('explicit create defaults', async () => {
    const db = new FakeDb({});
    const input = { adminUserId: 'admin', partnerId: 1, registryType: 'commercial_register', registryValue: '0000123456', jurisdictionCountry: 'PL' } satisfies AdminSellerRegistryIdentifierAddInput;
    const res = await executeAdminSellerRegistryIdentifierAdd(db as never, input);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(db.inserts.length, 1);
    assert.strictEqual(db.inserts[0].values.verificationStatus, 'unverified');
    assert.strictEqual(db.inserts[0].values.currentVerificationEventId, null);
    assert.strictEqual(db.inserts[0].values.retiredAt, null);
  });

  test('legacy labels cannot be used for new writes', () => {
    assert.strictEqual(AdminSellerRegistryIdentifierAddInputSchema.safeParse({ partnerId: 1, registryType: 'VAT', registryValue: '0000123456', jurisdictionCountry: 'PL' }).success, false);
    assert.strictEqual(AdminSellerTaxIdentifierAddInputSchema.safeParse({ partnerId: 1, identifierType: 'NIP', identifierValue: '1234567890', countryCode: 'PL' }).success, false);
  });
});

describe('Execute Admin Seller Registry Identifier Delete', () => {
  test('legacy NULL no history -> deleted', async () => {
    const db = new FakeDb({ deleteReturnsRow: true, identityExists: false });
    const originalSelect = db.select.bind(db);
    db.select = () => {
      const chain = originalSelect();
      const oldFor = chain.for;
      chain.for = () => {
         const res = oldFor();
         if (res.length > 0) Object.defineProperty(res[0], 'verificationStatus', { value: null, writable: true });
         return res;
      };
      return chain;
    };
    const input = { adminUserId: 'admin', partnerId: 1, registryIdentifierId: 2 } satisfies AdminSellerRegistryIdentifierDeleteInput;
    const res = await executeAdminSellerRegistryIdentifierDelete(db as never, input);
    assert.strictEqual(res.ok, true);
  });

  test('history exists -> blocked', async () => {
    const db = new FakeDb({ deleteReturnsRow: true, identityExists: true });
    const input = { adminUserId: 'admin', partnerId: 1, registryIdentifierId: 2 } satisfies AdminSellerRegistryIdentifierDeleteInput;
    const res = await executeAdminSellerRegistryIdentifierDelete(db as never, input);
    assert.strictEqual(res.ok, false);
    if (!res.ok) assert.strictEqual(res.code, 'VERIFICATION_HISTORY_EXISTS');
  });

  test('23503 -> VERIFICATION_HISTORY_EXISTS', async () => {
    const db = new FakeDb({ deleteReturnsRow: true, identityExists: false });
    db.delete = () => ({ where: () => { throw { code: '23503' }; } });
    const input = { adminUserId: 'admin', partnerId: 1, registryIdentifierId: 2 } satisfies AdminSellerRegistryIdentifierDeleteInput;
    const res = await executeAdminSellerRegistryIdentifierDelete(db as never, input);
    assert.strictEqual(res.ok, false);
    if (!res.ok) assert.strictEqual(res.code, 'VERIFICATION_HISTORY_EXISTS');
  });
});
