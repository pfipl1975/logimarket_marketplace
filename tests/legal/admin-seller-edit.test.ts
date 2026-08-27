import { describe, test } from "node:test";
import assert from "node:assert";
import {
  AdminSellerLegalDataSaveInputSchema,
  AdminSellerTaxIdentifierAddInputSchema,
  AdminSellerTaxIdentifierDeleteInputSchema,
  executeAdminSellerLegalDataSave,
  executeAdminSellerTaxIdentifierAdd,
  executeAdminSellerTaxIdentifierDelete,
} from "../../src/lib/admin/partner-edit-core";
import { buildSellerDisclosure } from "../../src/lib/legal/seller-disclosure";

describe("Admin Seller Legal Data Save Input Validation", () => {
  test("invalid partnerId rejected", () => {
    const input = { partnerId: -1, businessEmail: "test@ex.com", legalName: "Company", jurisdictionCountry: "PL", registeredAddressLine1: "", registeredAddressLine2: "", registeredPostalCode: "", registeredCity: "", registeredRegion: "", registeredCountryCode: "" };
    assert.strictEqual(AdminSellerLegalDataSaveInputSchema.safeParse(input).success, false);
  });

  test("invalid businessEmail rejected", () => {
    const input = { partnerId: 1, businessEmail: "not-an-email", legalName: "Company", jurisdictionCountry: "PL", registeredAddressLine1: "", registeredAddressLine2: "", registeredPostalCode: "", registeredCity: "", registeredRegion: "", registeredCountryCode: "" };
    assert.strictEqual(AdminSellerLegalDataSaveInputSchema.safeParse(input).success, false);
  });

  test("legalName required and trimmed", () => {
    const input = { partnerId: 1, businessEmail: "test@ex.com", legalName: "  Company  ", jurisdictionCountry: "PL", registeredAddressLine1: "", registeredAddressLine2: "", registeredPostalCode: "", registeredCity: "", registeredRegion: "", registeredCountryCode: "" };
    const res = AdminSellerLegalDataSaveInputSchema.safeParse(input);
    assert.strictEqual(res.success, true);
    if (res.success) assert.strictEqual(res.data.legalName, "Company");
  });

  test("jurisdiction country normalization", () => {
    const input = { partnerId: 1, businessEmail: "test@ex.com", legalName: "Company", jurisdictionCountry: " pl ", registeredAddressLine1: "", registeredAddressLine2: "", registeredPostalCode: "", registeredCity: "", registeredRegion: "", registeredCountryCode: "" };
    const res = AdminSellerLegalDataSaveInputSchema.safeParse(input);
    assert.strictEqual(res.success, true);
    if (res.success) assert.strictEqual(res.data.jurisdictionCountry, "PL");
  });

  test("blank optional address fields -> null", () => {
    const input = {
      partnerId: 1, businessEmail: "test@ex.com", legalName: "Company", jurisdictionCountry: "PL",
      registeredAddressLine1: "  ", registeredAddressLine2: "", registeredPostalCode: "\t",
      registeredCity: "", registeredRegion: "", registeredCountryCode: ""
    };
    const res = AdminSellerLegalDataSaveInputSchema.safeParse(input);
    assert.strictEqual(res.success, true);
    if (res.success) {
      assert.strictEqual(res.data.registeredAddressLine1, null);
    }
  });
});

describe("Admin Seller Tax Identifier Add Input Validation", () => {
  test("invalid input rejected", () => {
    const input = { partnerId: 1, identifierType: "VAT", identifierValue: "PL123", countryCode: "POL" };
    assert.strictEqual(AdminSellerTaxIdentifierAddInputSchema.safeParse(input).success, false);
  });
});

describe("Admin Seller Tax Identifier Delete Input Validation", () => {
  test("delete predicate contains BOTH taxIdentifierId and partnerId", () => {
    const input = { partnerId: 1, taxIdentifierId: 2 };
    assert.strictEqual(AdminSellerTaxIdentifierDeleteInputSchema.safeParse(input).success, true);
    const badInput = { taxIdentifierId: 2 };
    assert.strictEqual(AdminSellerTaxIdentifierDeleteInputSchema.safeParse(badInput).success, false);
  });
});

type FakeDbConfig = {
  partnerExists?: boolean;
  identityExists?: boolean;
  deleteReturnsRow?: boolean;
  insertThrowsDuplicate?: boolean;
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
    return {
      from: () => ({
        where: () => ({
          limit: () => {
            this.selectCallIndex++;
            if (this.selectCallIndex === 1) {
              return this.config.partnerExists !== false ? [{ id: 1 }] : [];
            }
            if (this.selectCallIndex === 2) {
              return this.config.identityExists !== false ? [{ partnerId: 1 }] : [];
            }
            return [];
          }
        })
      })
    };
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
          throw { code: "23505" };
        }
        this.inserts.push({ table, values });
        return {
          onConflictDoUpdate: () => ({})
        };
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
  test("legal identity save -> UPDATE path", async () => {
    const db = new FakeDb({ identityExists: true });
    const res = await executeAdminSellerLegalDataSave(db as never, {
      partnerId: 1, businessEmail: "new@ex.com", legalName: "New Company", jurisdictionCountry: "PL",
      registeredAddressLine1: "Line 1", registeredAddressLine2: null, registeredPostalCode: null,
      registeredCity: null, registeredRegion: null, registeredCountryCode: null
    });

    assert.strictEqual(res.ok, true);
    assert.strictEqual(db.transactionExecuted, true);
    assert.strictEqual(db.updates.length, 2);

    // Assert update payload DOES NOT contain verification fields
    const updatePayload = db.updates[1].values;
    assert.strictEqual("verificationStatus" in updatePayload, false);
    assert.strictEqual("verifiedAt" in updatePayload, false);
    assert.strictEqual("verificationSource" in updatePayload, false);
    assert.strictEqual("verificationReference" in updatePayload, false);
  });

  test("legal identity save -> INSERT path", async () => {
    const db = new FakeDb({ identityExists: false });
    const res = await executeAdminSellerLegalDataSave(db as never, {
      partnerId: 1, businessEmail: "new@ex.com", legalName: "New Company", jurisdictionCountry: "PL",
      registeredAddressLine1: "Line 1", registeredAddressLine2: null, registeredPostalCode: null,
      registeredCity: null, registeredRegion: null, registeredCountryCode: null
    });

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
  test("duplicate -> TAX_IDENTIFIER_CONFLICT", async () => {
    const db = new FakeDb({ insertThrowsDuplicate: true });
    const res = await executeAdminSellerTaxIdentifierAdd(db as never, {
      partnerId: 1, identifierType: "VAT", identifierValue: "PL123", countryCode: "PL"
    });
    assert.strictEqual(res.ok, false);
    if (!res.ok) assert.strictEqual(res.code, "TAX_IDENTIFIER_CONFLICT");
  });
});

describe("Execute Admin Seller Tax Identifier Delete", () => {
  test("successful scoped delete -> DELETED and checks BOTH id and partner_id", async () => {
    const db = new FakeDb({ deleteReturnsRow: true });
    const res = await executeAdminSellerTaxIdentifierDelete(db as never, {
      partnerId: 1, taxIdentifierId: 2
    });

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
  test("incomplete data returns expected stable missing-field ids", () => {
    const disclosure = buildSellerDisclosure(1, "Company", null, {}, []);
    assert.strictEqual(disclosure.completeness.complete, false);
    assert.strictEqual(disclosure.completeness.missing.includes("business_email"), true);
  });
});
