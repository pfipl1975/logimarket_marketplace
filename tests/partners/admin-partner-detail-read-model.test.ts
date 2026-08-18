import test from "node:test";
import assert from "node:assert/strict";
import { getAdminPartnerDetailReadModel } from "../../src/lib/admin/partner-detail-read-model-core";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

// Simplified mock DB
const createMockDb = (mockData: Record<string, unknown> = {}) => {
  const chain: unknown = {
    select: () => chain,
    from: (table: unknown) => {
      (chain as Record<string, unknown>)._currentTable = table;
      return chain;
    },
    where: () => chain,
    limit: () => chain,
    orderBy: () => chain,
    then: (resolve: (value: unknown) => void) => {
      // Return appropriate mock data based on current table
      let result: unknown[] = [];
      const chainObj = chain as Record<string, unknown>;
      
      if (chainObj._queryIndex === undefined) chainObj._queryIndex = 0;
      const index = (chainObj._queryIndex as number)++;
      
      if (index === 0) result = (mockData.partners as unknown[]) || [];
      else if (index === 1) result = (mockData.legalIdentities as unknown[]) || [];
      else if (index === 2) result = (mockData.taxIdentifiers as unknown[]) || [];
      else if (index === 3) result = (mockData.registryIdentifiers as unknown[]) || [];
      else if (index === 4) result = (mockData.eligibility as unknown[]) || [];
      
      resolve(result);
    }
  };
  return chain as unknown as NodePgDatabase<Record<string, never>>;
};

test("Admin Partner Detail Read Model", async (t) => {
  await t.test("canonical positive partner ID accepted and mapped correctly", async () => {
    const db = createMockDb({
      partners: [{ id: 123, companyName: "Test", contactEmail: "test@test.com", websiteUrl: null, logoUrl: null, createdAt: new Date("2023-01-01") }],
      legalIdentities: [{ legalName: "Test Legal", jurisdictionCountry: "PL", verificationStatus: "verified", verifiedAt: new Date("2023-01-02"), verificationSource: null, verificationReference: null }],
      taxIdentifiers: [{ identifierType: "VAT", identifierValue: "12345", countryCode: "PL", verificationStatus: "verified", verifiedAt: new Date("2023-01-02"), verificationSource: null, verificationReference: null }],
      registryIdentifiers: [{ registryType: "KRS", registryValue: "000000", jurisdictionCountry: "PL" }],
      eligibility: [{ eligibilityStatus: "eligible", reason: null, updatedAt: new Date("2023-01-03"), createdAt: new Date("2023-01-01") }]
    });

    const result = await getAdminPartnerDetailReadModel(db, "123");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.data.partner.id, 123);
      assert.equal(result.data.partner.companyName, "Test");
      assert.equal(result.data.legalIdentity?.legalName, "Test Legal");
      assert.equal(result.data.taxIdentifiers.length, 1);
      assert.equal(result.data.registryIdentifiers.length, 1);
      assert.equal(result.data.eligibility?.eligibilityStatus, "eligible");
    }
  });

  await t.test("0 rejected", async () => {
    const db = createMockDb();
    const result = await getAdminPartnerDetailReadModel(db, "0");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "INVALID_ID");
  });

  await t.test("negative rejected", async () => {
    const db = createMockDb();
    const result = await getAdminPartnerDetailReadModel(db, "-5");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "INVALID_ID");
  });

  await t.test("float rejected", async () => {
    const db = createMockDb();
    const result = await getAdminPartnerDetailReadModel(db, "12.5");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "INVALID_ID");
  });

  await t.test("NaN/non-numeric rejected", async () => {
    const db = createMockDb();
    const result = await getAdminPartnerDetailReadModel(db, "abc");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "INVALID_ID");
  });

  await t.test("non-canonical integer representation rejected", async () => {
    const db = createMockDb();
    const result = await getAdminPartnerDetailReadModel(db, "0123");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "INVALID_ID");
  });

  await t.test("legalIdentity null when not found", async () => {
    const db = createMockDb({
      partners: [{ id: 123, companyName: "Test", contactEmail: "test@test.com", websiteUrl: null, logoUrl: null, createdAt: new Date("2023-01-01") }],
      legalIdentities: [],
      taxIdentifiers: [],
      registryIdentifiers: [],
      eligibility: []
    });

    const result = await getAdminPartnerDetailReadModel(db, "123");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.data.legalIdentity, null);
    }
  });

  await t.test("taxIdentifiers [] when not found", async () => {
    const db = createMockDb({
      partners: [{ id: 123, companyName: "Test", contactEmail: "test@test.com", websiteUrl: null, logoUrl: null, createdAt: new Date("2023-01-01") }],
    });

    const result = await getAdminPartnerDetailReadModel(db, "123");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.data.taxIdentifiers, []);
    }
  });

  await t.test("multiple taxIdentifiers mapped", async () => {
    const db = createMockDb({
      partners: [{ id: 123, companyName: "Test", contactEmail: "test@test.com", websiteUrl: null, logoUrl: null, createdAt: new Date("2023-01-01") }],
      taxIdentifiers: [
        { identifierType: "VAT", identifierValue: "1", countryCode: "PL", verificationStatus: "verified", verifiedAt: new Date("2023-01-02"), verificationSource: null, verificationReference: null },
        { identifierType: "VAT", identifierValue: "2", countryCode: "DE", verificationStatus: "verified", verifiedAt: new Date("2023-01-02"), verificationSource: null, verificationReference: null }
      ]
    });

    const result = await getAdminPartnerDetailReadModel(db, "123");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.data.taxIdentifiers.length, 2);
    }
  });

  await t.test("registryIdentifiers [] when not found", async () => {
    const db = createMockDb({
      partners: [{ id: 123, companyName: "Test", contactEmail: "test@test.com", websiteUrl: null, logoUrl: null, createdAt: new Date("2023-01-01") }],
    });

    const result = await getAdminPartnerDetailReadModel(db, "123");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.data.registryIdentifiers, []);
    }
  });

  await t.test("multiple registryIdentifiers mapped", async () => {
    const db = createMockDb({
      partners: [{ id: 123, companyName: "Test", contactEmail: "test@test.com", websiteUrl: null, logoUrl: null, createdAt: new Date("2023-01-01") }],
      registryIdentifiers: [
        { registryType: "KRS", registryValue: "1", jurisdictionCountry: "PL" },
        { registryType: "REGON", registryValue: "2", jurisdictionCountry: "PL" }
      ]
    });

    const result = await getAdminPartnerDetailReadModel(db, "123");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.data.registryIdentifiers.length, 2);
    }
  });

  await t.test("eligibility null when not found", async () => {
    const db = createMockDb({
      partners: [{ id: 123, companyName: "Test", contactEmail: "test@test.com", websiteUrl: null, logoUrl: null, createdAt: new Date("2023-01-01") }],
      eligibility: []
    });

    const result = await getAdminPartnerDetailReadModel(db, "123");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.data.eligibility, null);
    }
  });

  await t.test("eligibility canonical statuses remain: pending, eligible, ineligible, suspended", async () => {
    const statuses = ["pending", "eligible", "ineligible", "suspended"];
    for (const status of statuses) {
      const db = createMockDb({
        partners: [{ id: 123, companyName: "Test", contactEmail: "test@test.com", websiteUrl: null, logoUrl: null, createdAt: new Date("2023-01-01") }],
        eligibility: [{ eligibilityStatus: status, reason: null, updatedAt: new Date("2023-01-03"), createdAt: new Date("2023-01-01") }]
      });

      const result = await getAdminPartnerDetailReadModel(db, "123");
      assert.equal(result.ok, true);
      if (result.ok) {
        assert.equal(result.data.eligibility?.eligibilityStatus, status);
      }
    }
  });
});
