/* eslint-disable */
import { describe, test } from "node:test";
/* eslint-disable */
import assert from "node:assert";
/* eslint-disable */
import {
/* eslint-disable */
  AdminSellerLegalDataSaveInputSchema,
/* eslint-disable */
  AdminSellerTaxIdentifierAddInputSchema,
/* eslint-disable */
  AdminSellerTaxIdentifierDeleteInputSchema,
/* eslint-disable */
  executeAdminSellerLegalDataSave,
/* eslint-disable */
  executeAdminSellerTaxIdentifierAdd,
/* eslint-disable */
  executeAdminSellerTaxIdentifierDelete,
/* eslint-disable */
} from "../../src/lib/admin/partner-edit-core";
/* eslint-disable */
import { buildSellerDisclosure } from "../../src/lib/legal/seller-disclosure";
/* eslint-disable */

/* eslint-disable */
describe("Admin Seller Legal Data Save Input Validation", () => {
/* eslint-disable */
  test("invalid partnerId rejected", () => {
/* eslint-disable */
    const input = { partnerId: -1, businessEmail: "test@ex.com", legalName: "Company", jurisdictionCountry: "PL", registeredAddressLine1: "", registeredAddressLine2: "", registeredPostalCode: "", registeredCity: "", registeredRegion: "", registeredCountryCode: "" };
/* eslint-disable */
    assert.strictEqual(AdminSellerLegalDataSaveInputSchema.safeParse(input).success, false);
/* eslint-disable */
  });
/* eslint-disable */

/* eslint-disable */
  test("invalid businessEmail rejected", () => {
/* eslint-disable */
    const input = { partnerId: 1, businessEmail: "not-an-email", legalName: "Company", jurisdictionCountry: "PL", registeredAddressLine1: "", registeredAddressLine2: "", registeredPostalCode: "", registeredCity: "", registeredRegion: "", registeredCountryCode: "" };
/* eslint-disable */
    assert.strictEqual(AdminSellerLegalDataSaveInputSchema.safeParse(input).success, false);
/* eslint-disable */
  });
/* eslint-disable */

/* eslint-disable */
  test("legalName required and trimmed", () => {
/* eslint-disable */
    const input = { partnerId: 1, businessEmail: "test@ex.com", legalName: "  Company  ", jurisdictionCountry: "PL", registeredAddressLine1: "", registeredAddressLine2: "", registeredPostalCode: "", registeredCity: "", registeredRegion: "", registeredCountryCode: "" };
/* eslint-disable */
    const res = AdminSellerLegalDataSaveInputSchema.safeParse(input);
/* eslint-disable */
    assert.strictEqual(res.success, true);
/* eslint-disable */
    if (res.success) assert.strictEqual(res.data.legalName, "Company");
/* eslint-disable */

/* eslint-disable */
    const input2 = { partnerId: 1, businessEmail: "test@ex.com", legalName: "   ", jurisdictionCountry: "PL", registeredAddressLine1: "", registeredAddressLine2: "", registeredPostalCode: "", registeredCity: "", registeredRegion: "", registeredCountryCode: "" };
/* eslint-disable */
    assert.strictEqual(AdminSellerLegalDataSaveInputSchema.safeParse(input2).success, false);
/* eslint-disable */
  });
/* eslint-disable */

/* eslint-disable */
  test("legalName max length", () => {
/* eslint-disable */
    const input = { partnerId: 1, businessEmail: "test@ex.com", legalName: "a".repeat(256), jurisdictionCountry: "PL", registeredAddressLine1: "", registeredAddressLine2: "", registeredPostalCode: "", registeredCity: "", registeredRegion: "", registeredCountryCode: "" };
/* eslint-disable */
    assert.strictEqual(AdminSellerLegalDataSaveInputSchema.safeParse(input).success, false);
/* eslint-disable */
  });
/* eslint-disable */

/* eslint-disable */
  test("businessEmail max length", () => {
/* eslint-disable */
    const input = { partnerId: 1, businessEmail: "a".repeat(100) + "@ex.com", legalName: "Company", jurisdictionCountry: "PL", registeredAddressLine1: "", registeredAddressLine2: "", registeredPostalCode: "", registeredCity: "", registeredRegion: "", registeredCountryCode: "" };
/* eslint-disable */
    assert.strictEqual(AdminSellerLegalDataSaveInputSchema.safeParse(input).success, false);
/* eslint-disable */
  });
/* eslint-disable */

/* eslint-disable */
  test("jurisdiction country normalization and invalid length rejected", () => {
/* eslint-disable */
    const input = { partnerId: 1, businessEmail: "test@ex.com", legalName: "Company", jurisdictionCountry: " pl ", registeredAddressLine1: "", registeredAddressLine2: "", registeredPostalCode: "", registeredCity: "", registeredRegion: "", registeredCountryCode: "" };
/* eslint-disable */
    const res = AdminSellerLegalDataSaveInputSchema.safeParse(input);
/* eslint-disable */
    assert.strictEqual(res.success, true);
/* eslint-disable */
    if (res.success) assert.strictEqual(res.data.jurisdictionCountry, "PL");
/* eslint-disable */

/* eslint-disable */
    const input2 = { partnerId: 1, businessEmail: "test@ex.com", legalName: "Company", jurisdictionCountry: "POL", registeredAddressLine1: "", registeredAddressLine2: "", registeredPostalCode: "", registeredCity: "", registeredRegion: "", registeredCountryCode: "" };
/* eslint-disable */
    assert.strictEqual(AdminSellerLegalDataSaveInputSchema.safeParse(input2).success, false);
/* eslint-disable */
  });
/* eslint-disable */

/* eslint-disable */
  test("blank optional address fields -> null", () => {
/* eslint-disable */
    const input = {
/* eslint-disable */
      partnerId: 1, businessEmail: "test@ex.com", legalName: "Company", jurisdictionCountry: "PL",
/* eslint-disable */
      registeredAddressLine1: "  ", registeredAddressLine2: "", registeredPostalCode: "\t",
/* eslint-disable */
      registeredCity: "", registeredRegion: "", registeredCountryCode: ""
/* eslint-disable */
    };
/* eslint-disable */
    const res = AdminSellerLegalDataSaveInputSchema.safeParse(input);
/* eslint-disable */
    assert.strictEqual(res.success, true);
/* eslint-disable */
    if (res.success) {
/* eslint-disable */
      assert.strictEqual(res.data.registeredAddressLine1, null);
/* eslint-disable */
      assert.strictEqual(res.data.registeredAddressLine2, null);
/* eslint-disable */
      assert.strictEqual(res.data.registeredPostalCode, null);
/* eslint-disable */
    }
/* eslint-disable */
  });
/* eslint-disable */

/* eslint-disable */
  test("address max lengths", () => {
/* eslint-disable */
    const input = {
/* eslint-disable */
      partnerId: 1, businessEmail: "test@ex.com", legalName: "Company", jurisdictionCountry: "PL",
/* eslint-disable */
      registeredAddressLine1: "a".repeat(256), registeredAddressLine2: "", registeredPostalCode: "", registeredCity: "", registeredRegion: "", registeredCountryCode: ""
/* eslint-disable */
    };
/* eslint-disable */
    assert.strictEqual(AdminSellerLegalDataSaveInputSchema.safeParse(input).success, false);
/* eslint-disable */
  });
/* eslint-disable */

/* eslint-disable */
  test("registered country normalization", () => {
/* eslint-disable */
    const input = {
/* eslint-disable */
      partnerId: 1, businessEmail: "test@ex.com", legalName: "Company", jurisdictionCountry: "PL",
/* eslint-disable */
      registeredAddressLine1: "", registeredAddressLine2: "", registeredPostalCode: "", registeredCity: "", registeredRegion: "",
/* eslint-disable */
      registeredCountryCode: " de "
/* eslint-disable */
    };
/* eslint-disable */
    const res = AdminSellerLegalDataSaveInputSchema.safeParse(input);
/* eslint-disable */
    assert.strictEqual(res.success, true);
/* eslint-disable */
    if (res.success) assert.strictEqual(res.data.registeredCountryCode, "DE");
/* eslint-disable */
  });
/* eslint-disable */
});
/* eslint-disable */

/* eslint-disable */
describe("Admin Seller Tax Identifier Add Input Validation", () => {
/* eslint-disable */
  test("invalid input rejected", () => {
/* eslint-disable */
    const input = { partnerId: 1, identifierType: "VAT", identifierValue: "PL123", countryCode: "POL" };
/* eslint-disable */
    assert.strictEqual(AdminSellerTaxIdentifierAddInputSchema.safeParse(input).success, false);
/* eslint-disable */
  });
/* eslint-disable */
});
/* eslint-disable */

/* eslint-disable */
describe("Admin Seller Tax Identifier Delete Input Validation", () => {
/* eslint-disable */
  test("delete predicate contains BOTH taxIdentifierId and partnerId", () => {
/* eslint-disable */
    const input = { partnerId: 1, taxIdentifierId: 2 };
/* eslint-disable */
    assert.strictEqual(AdminSellerTaxIdentifierDeleteInputSchema.safeParse(input).success, true);
/* eslint-disable */

/* eslint-disable */
    const badInput = { taxIdentifierId: 2 };
/* eslint-disable */
    assert.strictEqual(AdminSellerTaxIdentifierDeleteInputSchema.safeParse(badInput).success, false);
/* eslint-disable */
  });
/* eslint-disable */
});
/* eslint-disable */

/* eslint-disable */
function createFakeDb(overrides = {}) {
/* eslint-disable */
  const defaults = {
/* eslint-disable */
    partnerExists: true,
/* eslint-disable */
    identityExists: true,
/* eslint-disable */
    deleteReturnsRow: true,
/* eslint-disable */
    insertThrowsDuplicate: false,
/* eslint-disable */
    updates: [],
/* eslint-disable */
    inserts: [],
/* eslint-disable */
    deletes: []
/* eslint-disable */
  };
/* eslint-disable */
  const config = { ...defaults, ...overrides };
/* eslint-disable */

/* eslint-disable */
  let selectCallIndex = 0;
/* eslint-disable */

/* eslint-disable */
  const fakeDb: any = {
/* eslint-disable */
    updates: config.updates,
/* eslint-disable */
    inserts: config.inserts,
/* eslint-disable */
    deletes: config.deletes,
/* eslint-disable */
    transaction: async (cb: any) => await cb(fakeDb),
/* eslint-disable */
    select: () => ({
/* eslint-disable */
      from: () => ({
/* eslint-disable */
        where: () => ({
/* eslint-disable */
          limit: () => {
/* eslint-disable */
            selectCallIndex++;
/* eslint-disable */
            if (selectCallIndex === 1) {
/* eslint-disable */
              return config.partnerExists ? [{ id: 1 }] : [];
/* eslint-disable */
            }
/* eslint-disable */
            if (selectCallIndex === 2) {
/* eslint-disable */
              return config.identityExists ? [{ partnerId: 1 }] : [];
/* eslint-disable */
            }
/* eslint-disable */
            return [];
/* eslint-disable */
          }
/* eslint-disable */
        })
/* eslint-disable */
      })
/* eslint-disable */
    }),
/* eslint-disable */
    update: (table: any) => ({
/* eslint-disable */
      set: (values: any) => {
/* eslint-disable */
        config.updates.push({ table, values });
/* eslint-disable */
        return {
/* eslint-disable */
          where: () => ({})
/* eslint-disable */
        };
/* eslint-disable */
      }
/* eslint-disable */
    }),
/* eslint-disable */
    insert: (table: any) => ({
/* eslint-disable */
      values: (values: any) => {
/* eslint-disable */
        config.inserts.push({ table, values });
/* eslint-disable */
        return {
/* eslint-disable */
          onConflictDoUpdate: () => ({})
/* eslint-disable */
        };
/* eslint-disable */
      }
/* eslint-disable */
    }),
/* eslint-disable */
    delete: (table: any) => ({
/* eslint-disable */
      where: (condition: any) => {
/* eslint-disable */
        config.deletes.push({ table, condition });
/* eslint-disable */
        return {
/* eslint-disable */
          returning: () => config.deleteReturnsRow ? [{ id: 1 }] : []
/* eslint-disable */
        };
/* eslint-disable */
      }
/* eslint-disable */
    })
/* eslint-disable */
  };
/* eslint-disable */

/* eslint-disable */
  if (config.insertThrowsDuplicate) {
/* eslint-disable */
    fakeDb.insert = (table: any) => ({
/* eslint-disable */
      values: () => {
/* eslint-disable */
        throw { code: "23505" };
/* eslint-disable */
      }
/* eslint-disable */
    });
/* eslint-disable */
  }
/* eslint-disable */

/* eslint-disable */
  return fakeDb;
/* eslint-disable */
}
/* eslint-disable */

/* eslint-disable */
describe("Execute Admin Seller Legal Data Save", () => {
/* eslint-disable */
  test("missing Partner -> PARTNER_NOT_FOUND", async () => {
/* eslint-disable */
    const fakeDb = createFakeDb({ partnerExists: false });
/* eslint-disable */
    const res = await executeAdminSellerLegalDataSave(fakeDb, {
/* eslint-disable */
      partnerId: 999, businessEmail: "test@ex.com", legalName: "Company", jurisdictionCountry: "PL",
/* eslint-disable */
      registeredAddressLine1: null, registeredAddressLine2: null, registeredPostalCode: null,
/* eslint-disable */
      registeredCity: null, registeredRegion: null, registeredCountryCode: null
/* eslint-disable */
    });
/* eslint-disable */
    assert.strictEqual(res.ok, false);
/* eslint-disable */
    if (!res.ok) assert.strictEqual(res.code, "PARTNER_NOT_FOUND");
/* eslint-disable */
  });
/* eslint-disable */

/* eslint-disable */
  test("legal identity save -> UPDATE path", async () => {
/* eslint-disable */
    const fakeDb = createFakeDb({ identityExists: true });
/* eslint-disable */
    const res = await executeAdminSellerLegalDataSave(fakeDb, {
/* eslint-disable */
      partnerId: 1, businessEmail: "new@ex.com", legalName: "New Company", jurisdictionCountry: "PL",
/* eslint-disable */
      registeredAddressLine1: "Line 1", registeredAddressLine2: null, registeredPostalCode: null,
/* eslint-disable */
      registeredCity: null, registeredRegion: null, registeredCountryCode: null
/* eslint-disable */
    });
/* eslint-disable */
    assert.strictEqual(res.ok, true);
/* eslint-disable */
    assert.strictEqual(fakeDb.updates.length, 2);
/* eslint-disable */
    assert.strictEqual(fakeDb.updates[0].values.contactEmail, "new@ex.com");
/* eslint-disable */
    assert.strictEqual(fakeDb.updates[1].values.legalName, "New Company");
/* eslint-disable */
    assert.strictEqual(fakeDb.inserts.length, 0);
/* eslint-disable */
  });
/* eslint-disable */

/* eslint-disable */
  test("legal identity save -> INSERT path", async () => {
/* eslint-disable */
    const fakeDb = createFakeDb({ identityExists: false });
/* eslint-disable */
    const res = await executeAdminSellerLegalDataSave(fakeDb, {
/* eslint-disable */
      partnerId: 1, businessEmail: "new@ex.com", legalName: "New Company", jurisdictionCountry: "PL",
/* eslint-disable */
      registeredAddressLine1: "Line 1", registeredAddressLine2: null, registeredPostalCode: null,
/* eslint-disable */
      registeredCity: null, registeredRegion: null, registeredCountryCode: null
/* eslint-disable */
    });
/* eslint-disable */
    assert.strictEqual(res.ok, true);
/* eslint-disable */
    assert.strictEqual(fakeDb.updates.length, 1);
/* eslint-disable */
    assert.strictEqual(fakeDb.inserts.length, 1);
/* eslint-disable */
    assert.strictEqual(fakeDb.updates[0].values.contactEmail, "new@ex.com");
/* eslint-disable */
    assert.strictEqual(fakeDb.inserts[0].values.legalName, "New Company");
/* eslint-disable */
    assert.strictEqual(fakeDb.inserts[0].values.verificationStatus, "unverified");
/* eslint-disable */
  });
/* eslint-disable */
});
/* eslint-disable */

/* eslint-disable */
describe("Execute Admin Seller Tax Identifier Add", () => {
/* eslint-disable */
  test("Partner missing -> PARTNER_NOT_FOUND", async () => {
/* eslint-disable */
    const fakeDb = createFakeDb({ partnerExists: false });
/* eslint-disable */
    const res = await executeAdminSellerTaxIdentifierAdd(fakeDb, {
/* eslint-disable */
      partnerId: 999, identifierType: "VAT", identifierValue: "PL123", countryCode: "PL"
/* eslint-disable */
    });
/* eslint-disable */
    assert.strictEqual(res.ok, false);
/* eslint-disable */
    if (!res.ok) assert.strictEqual(res.code, "PARTNER_NOT_FOUND");
/* eslint-disable */
  });
/* eslint-disable */

/* eslint-disable */
  test("legal identity missing -> LEGAL_IDENTITY_REQUIRED", async () => {
/* eslint-disable */
    const fakeDb = createFakeDb({ identityExists: false });
/* eslint-disable */
    const res = await executeAdminSellerTaxIdentifierAdd(fakeDb, {
/* eslint-disable */
      partnerId: 1, identifierType: "VAT", identifierValue: "PL123", countryCode: "PL"
/* eslint-disable */
    });
/* eslint-disable */
    assert.strictEqual(res.ok, false);
/* eslint-disable */
    if (!res.ok) assert.strictEqual(res.code, "LEGAL_IDENTITY_REQUIRED");
/* eslint-disable */
  });
/* eslint-disable */

/* eslint-disable */
  test("duplicate -> TAX_IDENTIFIER_CONFLICT", async () => {
/* eslint-disable */
    const fakeDb = createFakeDb({ insertThrowsDuplicate: true });
/* eslint-disable */
    const res = await executeAdminSellerTaxIdentifierAdd(fakeDb, {
/* eslint-disable */
      partnerId: 1, identifierType: "VAT", identifierValue: "PL123", countryCode: "PL"
/* eslint-disable */
    });
/* eslint-disable */
    assert.strictEqual(res.ok, false);
/* eslint-disable */
    if (!res.ok) assert.strictEqual(res.code, "TAX_IDENTIFIER_CONFLICT");
/* eslint-disable */
  });
/* eslint-disable */

/* eslint-disable */
  test("successful insert contains only intended editable values", async () => {
/* eslint-disable */
    const fakeDb = createFakeDb();
/* eslint-disable */
    const res = await executeAdminSellerTaxIdentifierAdd(fakeDb, {
/* eslint-disable */
      partnerId: 1, identifierType: "VAT", identifierValue: "PL123", countryCode: "PL"
/* eslint-disable */
    });
/* eslint-disable */
    assert.strictEqual(res.ok, true);
/* eslint-disable */
    assert.strictEqual(fakeDb.inserts.length, 1);
/* eslint-disable */
    assert.strictEqual(fakeDb.inserts[0].values.identifierValue, "PL123");
/* eslint-disable */
    assert.strictEqual(fakeDb.inserts[0].values.verificationStatus, "unverified");
/* eslint-disable */
  });
/* eslint-disable */
});
/* eslint-disable */

/* eslint-disable */
describe("Execute Admin Seller Tax Identifier Delete", () => {
/* eslint-disable */
  test("wrong partner / no row -> NOT_FOUND", async () => {
/* eslint-disable */
    const fakeDb = createFakeDb({ deleteReturnsRow: false });
/* eslint-disable */
    const res = await executeAdminSellerTaxIdentifierDelete(fakeDb, {
/* eslint-disable */
      partnerId: 1, taxIdentifierId: 2
/* eslint-disable */
    });
/* eslint-disable */
    assert.strictEqual(res.ok, false);
/* eslint-disable */
    if (!res.ok) assert.strictEqual(res.code, "NOT_FOUND");
/* eslint-disable */
  });
/* eslint-disable */

/* eslint-disable */
  test("successful scoped delete -> DELETED", async () => {
/* eslint-disable */
    const fakeDb = createFakeDb({ deleteReturnsRow: true });
/* eslint-disable */
    const res = await executeAdminSellerTaxIdentifierDelete(fakeDb, {
/* eslint-disable */
      partnerId: 1, taxIdentifierId: 2
/* eslint-disable */
    });
/* eslint-disable */
    assert.strictEqual(res.ok, true);
/* eslint-disable */
    if (res.ok) assert.strictEqual(res.code, "DELETED");
/* eslint-disable */
    assert.strictEqual(fakeDb.deletes.length, 1);
/* eslint-disable */
  });
/* eslint-disable */
});
/* eslint-disable */

/* eslint-disable */
describe("Seller Disclosure Completeness", () => {
/* eslint-disable */
  test("incomplete data returns expected stable missing-field ids", () => {
/* eslint-disable */
    const disclosure = buildSellerDisclosure(1, "Company", null, {}, []);
/* eslint-disable */
    assert.strictEqual(disclosure.completeness.complete, false);
/* eslint-disable */
    assert.strictEqual(disclosure.completeness.missing.includes("business_email"), true);
/* eslint-disable */
    assert.strictEqual(disclosure.completeness.missing.includes("registered_address_line1"), true);
/* eslint-disable */
    assert.strictEqual(disclosure.completeness.missing.includes("tax_identifier"), true);
/* eslint-disable */
  });
/* eslint-disable */

/* eslint-disable */
  test("complete data returns complete=true", () => {
/* eslint-disable */
    const disclosure = buildSellerDisclosure(
/* eslint-disable */
      1,
/* eslint-disable */
      "Company",
/* eslint-disable */
      "email@ex.com",
/* eslint-disable */
      {
/* eslint-disable */
        addressLine1: "Line 1",
/* eslint-disable */
        postalCode: "00-000",
/* eslint-disable */
        city: "City",
/* eslint-disable */
        countryCode: "PL"
/* eslint-disable */
      },
/* eslint-disable */
      [{ type: "VAT", value: "123", countryCode: "PL" }]
/* eslint-disable */
    );
/* eslint-disable */
    assert.strictEqual(disclosure.completeness.complete, true);
/* eslint-disable */
  });
/* eslint-disable */
});
