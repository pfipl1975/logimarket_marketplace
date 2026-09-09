import test from "node:test";
import assert from "node:assert/strict";
import { getAdminPartnerDetailReadModel } from "../../src/lib/admin/partner-detail-read-model-core";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import {
  partners,
  sellerLegalIdentities,
  sellerTaxIdentifiers,
  sellerRegistryIdentifiers,
  sellerEligibility,
  agreementVersions,
  partnerAgreementExecutionEvidence, partnerAgreementEvidenceInvalidations,
} from "../../src/lib/schema";

// Simplified mock DB
const createMockDb = (mockData: Record<string, unknown> = {}) => {
  const chain: Record<string, unknown> = {
    select: () => chain,
    from: (table: unknown) => {
      chain._currentTable = table;
      return chain;
    },
    innerJoin: () => chain,
    leftJoin: () => chain,
    where: () => chain,
    limit: () => chain,
    orderBy: () => chain,
    then: (resolve: (value: unknown) => void) => {
      let result: unknown[] = [];
      const table = chain._currentTable;
      if (table === partners) result = (mockData.partners as unknown[]) || []; else if (table === sellerLegalIdentities) result = (mockData.legalIdentities as unknown[]) || []; else if (table === sellerTaxIdentifiers) result = (mockData.taxIdentifiers as unknown[]) || []; else if (table === sellerRegistryIdentifiers) result = (mockData.registryIdentifiers as unknown[]) || []; else if (table === sellerEligibility) result = (mockData.eligibility as unknown[]) || []; else if (table === agreementVersions) result = (mockData.agreementVersions as unknown[]) || []; else if (table === partnerAgreementExecutionEvidence) result = (mockData.agreementEvidence as unknown[]) || [];
      else if (table === partnerAgreementEvidenceInvalidations) result = (mockData.agreementInvalidations as unknown[]) || []; else result = [];

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

  await t.test("eligibility updatedAt null remains null", async () => {
    const db = createMockDb({
      partners: [{ id: 123, companyName: "Test", contactEmail: "test@test.com", websiteUrl: null, logoUrl: null, createdAt: new Date("2023-01-01") }],
      eligibility: [{ eligibilityStatus: "pending", reason: null, updatedAt: null, createdAt: new Date("2023-01-01") }]
    });

    const result = await getAdminPartnerDetailReadModel(db, "123");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.data.eligibility?.updatedAt, null);
    }
  });
  await t.test("readiness derived state is exposed and mapped properly", async () => {
    const db = createMockDb({
      partners: [{ id: 123, companyName: "Readiness Test", contactEmail: "rt@test.com", websiteUrl: null, logoUrl: null, createdAt: new Date("2023-01-01") }],
      legalIdentities: [{ partnerId: 123, legalName: "Ready LLC", registeredCountryCode: "PL", businessEmail: "rt@test.com", registeredAddressLine1: "L1", registeredPostalCode: "00", registeredCity: "C", verificationStatus: "verified" }],
      taxIdentifiers: [{ partnerId: 123, verificationStatus: "verified", type: "NIP", value: "123", countryCode: "PL" }],
      registryIdentifiers: [],
      eligibility: [{ partnerId: 123, eligibilityStatus: "eligible" }],
      agreementVersions: [{ id: 1, agreementType: "partner_agreement_b2b", status: "active", versionString: "1.0.0" }],
      agreementEvidence: [{ id: 99, partnerId: 123, agreementVersionId: 1, version: "1.0.0", agreementType: "partner_agreement_b2b", status: "active", executionMethod: "system", signedAt: new Date("2023-01-01"), signatoryName: "Test", signatoryRole: "CEO", signatoryEmail: "test@test.com", externalPlatform: null, externalTransactionId: null, signedPdfSha256: null, recordedAt: new Date("2023-01-01"), recordedByAdminUserId: null, invalidationId: null, invalidationReason: null, invalidatedAt: null, invalidatedByAdminUserId: null, invalidated: null }],
    });
    const result = await getAdminPartnerDetailReadModel(db, "123");
    if (!result.ok) throw new Error("result is not ok");
    assert.equal(result.data.readiness.status, "ready");
    assert.deepEqual(result.data.readiness.blockers, []);
  });

  await t.test("T1. Legal Identity complete, Tax empty -> missing_tax_identity only", async () => {
    const db = createMockDb({
      partners: [{ id: 1, contactEmail: "test@test.com", createdAt: new Date("2023-01-01") }],
      legalIdentities: [{
        legalName: "Test",
        registeredAddressLine1: "Line 1",
        registeredAddressLine2: null,
        registeredPostalCode: "00-000",
        registeredCity: "City",
        registeredRegion: null,
        registeredCountryCode: "PL",
        verificationStatus: "verified" }],
      taxIdentifiers: [],
      registryIdentifiers: [],
      eligibility: [{ partnerId: 1, eligibilityStatus: "eligible" }],
      agreementVersions: [{ id: 1, agreementType: "partner_agreement_b2b", status: "active", versionString: "1.0.0" }],
      agreementEvidence: [{ id: 99, partnerId: 1, agreementVersionId: 1, version: "1.0.0", agreementType: "partner_agreement_b2b", status: "active", executionMethod: "system", signedAt: new Date(), signatoryName: "Test", signatoryRole: "CEO", signatoryEmail: "test@test.com", externalPlatform: null, externalTransactionId: null, signedPdfSha256: null, recordedAt: new Date(), recordedByAdminUserId: null, invalidationId: null, invalidationReason: null, invalidatedAt: null, invalidatedByAdminUserId: null, invalidated: null }],
    });
    const result = await getAdminPartnerDetailReadModel(db, "1");
    if (!result.ok) throw new Error("result not ok");
    assert.equal(result.data.readiness.status, "not_ready");
    assert.ok(result.data.readiness.blockers.includes("missing_tax_identity"));
    assert.ok(!result.data.readiness.blockers.includes("incomplete_legal_identity"));
  });

  await t.test("T2. Legal Identity incomplete, Tax valid -> incomplete_legal_identity only", async () => {
    const db = createMockDb({
      partners: [{ id: 1, contactEmail: "test@test.com", createdAt: new Date("2023-01-01") }],
      legalIdentities: [{
        legalName: "Test",
        registeredAddressLine1: "Line 1",
        registeredAddressLine2: null,
        registeredPostalCode: "00-000",
        registeredCity: null, // MISSING CITY
        registeredRegion: null,
        registeredCountryCode: "PL",
        verificationStatus: "verified" }],
      taxIdentifiers: [{ identifierType: "NIP", identifierValue: "123", countryCode: "PL", verificationStatus: "verified" }],
      registryIdentifiers: [],
      eligibility: [{ partnerId: 1, eligibilityStatus: "eligible" }],
      agreementVersions: [{ id: 1, agreementType: "partner_agreement_b2b", status: "active", versionString: "1.0.0" }],
      agreementEvidence: [{ id: 99, partnerId: 1, agreementVersionId: 1, version: "1.0.0", agreementType: "partner_agreement_b2b", status: "active", executionMethod: "system", signedAt: new Date(), signatoryName: "Test", signatoryRole: "CEO", signatoryEmail: "test@test.com", externalPlatform: null, externalTransactionId: null, signedPdfSha256: null, recordedAt: new Date(), recordedByAdminUserId: null, invalidationId: null, invalidationReason: null, invalidatedAt: null, invalidatedByAdminUserId: null, invalidated: null }],
    });
    const result = await getAdminPartnerDetailReadModel(db, "1");
    if (!result.ok) throw new Error("result not ok");
    assert.ok(result.data.readiness.blockers.includes("incomplete_legal_identity"));
    assert.ok(!result.data.readiness.blockers.includes("missing_tax_identity"));
  });

  await t.test("T3. Legal Identity complete, Tax valid -> neither blocker", async () => {
    const db = createMockDb({
      partners: [{ id: 1, contactEmail: "test@test.com", createdAt: new Date("2023-01-01") }],
      legalIdentities: [{
        legalName: "Test",
        registeredAddressLine1: "Line 1",
        registeredAddressLine2: null,
        registeredPostalCode: "00-000",
        registeredCity: "City",
        registeredRegion: null,
        registeredCountryCode: "PL",
        verificationStatus: "verified" }],
      taxIdentifiers: [{ identifierType: "NIP", identifierValue: "123", countryCode: "PL", verificationStatus: "verified" }],
      registryIdentifiers: [],
      eligibility: [{ partnerId: 1, eligibilityStatus: "eligible" }],
      agreementVersions: [{ id: 1, agreementType: "partner_agreement_b2b", status: "active", versionString: "1.0.0" }],
      agreementEvidence: [{ id: 99, partnerId: 1, agreementVersionId: 1, version: "1.0.0", agreementType: "partner_agreement_b2b", status: "active", executionMethod: "system", signedAt: new Date(), signatoryName: "Test", signatoryRole: "CEO", signatoryEmail: "test@test.com", externalPlatform: null, externalTransactionId: null, signedPdfSha256: null, recordedAt: new Date(), recordedByAdminUserId: null, invalidationId: null, invalidationReason: null, invalidatedAt: null, invalidatedByAdminUserId: null, invalidated: null }],
    });
    const result = await getAdminPartnerDetailReadModel(db, "1");
    if (!result.ok) throw new Error("result not ok");
    assert.ok(!result.data.readiness.blockers.includes("incomplete_legal_identity"));
    assert.ok(!result.data.readiness.blockers.includes("missing_tax_identity"));
  });

});
