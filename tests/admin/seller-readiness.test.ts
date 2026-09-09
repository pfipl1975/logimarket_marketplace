import { describe, test, before, after } from "node:test";
import assert from "node:assert";
import { db } from "../../src/lib/db";
import { sql } from "drizzle-orm";
import {
  partners,
  sellerLegalIdentities,
  sellerTaxIdentifiers,
  sellerRegistryIdentifiers,
  sellerEligibility,
  agreementVersions,
  partnerAgreementExecutionEvidence,
  partnerAgreementEvidenceInvalidations,
} from "../../src/lib/schema";
import { resolveSellerReadiness } from "../../src/lib/admin/seller-readiness-core";

describe("Seller Readiness Resolver Contract", () => {
  before(async () => {
    await db.execute(sql`BEGIN`);
  });

  after(async () => {
    await db.execute(sql`ROLLBACK`);
  });

  async function createTestPartner(overrides: {
    legalIdentityComplete?: boolean;
    legalIdentityVerified?: boolean;
    hasTax?: boolean;
    taxVerified?: boolean;
    hasRegistry?: boolean;
    registryVerified?: boolean;
    eligibility?: "eligible" | "ineligible" | "pending";
    agreementActive?: number;
    agreementExecution?: "none" | "active" | "inactive" | "invalidated";
  }) {
    const id = Math.floor(Math.random() * 1000000) + 100000;
    
    await db.insert(partners).values({
      id,
      companyName: `Test Partner ${id}`,
      contactEmail: overrides.legalIdentityComplete !== false ? "test@example.com" : null,
    });

    if (overrides.legalIdentityComplete !== false) {
      await db.insert(sellerLegalIdentities).values({
        partnerId: id,
        legalName: "Test Company",
        jurisdictionCountry: "PL",
        registeredAddressLine1: "Test St 1",
        registeredPostalCode: "00-000",
        registeredCity: "Test",
        registeredCountryCode: "PL",
        verificationStatus: overrides.legalIdentityVerified === false ? "failed" : "verified",
      });
    } else {
      await db.insert(sellerLegalIdentities).values({
        partnerId: id,
        legalName: "Test Company",
        jurisdictionCountry: "PL",
        registeredAddressLine1: null, // incomplete
        verificationStatus: "verified",
      });
    }

    if (overrides.hasTax !== false) {
      await db.insert(sellerTaxIdentifiers).values({
        partnerId: id,
        identifierType: "tax_id",
        identifierValue: `TAX${id}`,
        countryCode: "PL",
        verificationStatus: overrides.taxVerified === false ? "unverified" : "verified",
      });
    }

    if (overrides.hasRegistry) {
      await db.insert(sellerRegistryIdentifiers).values({
        partnerId: id,
        registryType: "commercial_register",
        registryValue: `REG${id}`,
        jurisdictionCountry: "PL",
        verificationStatus: overrides.registryVerified === false ? "unverified" : "verified",
      });
    }

    if (overrides.eligibility) {
      await db.insert(sellerEligibility).values({
        partnerId: id,
        eligibilityStatus: overrides.eligibility,
        updatedBy: -1,
      });
    }

    // Agreements
    let activeVersionId = -1;
    if (overrides.agreementActive === 1 || overrides.agreementActive === 2) {
      const vId = Math.floor(Math.random() * 1000000) + 1000;
      activeVersionId = vId;
      await db.insert(agreementVersions).values({
        id: vId,
        agreementType: "partner_agreement_b2b",
        versionString: `1.0.${vId}`,
        contentUri: "s3://test",
        status: "active",
      });
      if (overrides.agreementActive === 2) {
        await db.insert(agreementVersions).values({
          id: vId + 1,
          agreementType: "partner_agreement_b2b",
          versionString: `1.1.${vId}`,
          contentUri: "s3://test",
          status: "active",
        });
      }
    }

    if (overrides.agreementExecution !== "none" && activeVersionId !== -1) {
      let execVersionId = activeVersionId;
      if (overrides.agreementExecution === "inactive") {
        execVersionId = activeVersionId + 99; // Not the active one
      }
      
      const evId = Math.floor(Math.random() * 1000000) + 1000;
      await db.insert(partnerAgreementExecutionEvidence).values({
        id: evId,
        partnerId: id,
        agreementVersionId: execVersionId,
        executorIdentitySource: "system",
        executorIdentityReference: "ref",
      });

      if (overrides.agreementExecution === "invalidated") {
        await db.insert(partnerAgreementEvidenceInvalidations).values({
          executionEvidenceId: evId,
          invalidationReason: "error",
        });
      }
    }

    return id;
  }

  test("A. valid evidence matching active version -> READY", async () => {
    const id = await createTestPartner({
      eligibility: "eligible",
      agreementActive: 1,
      agreementExecution: "active"
    });
    const res = await resolveSellerReadiness(db, id);
    assert.strictEqual(res.status, "ready");
  });

  test("B. evidence explicitly invalidated -> NOT READY", async () => {
    const id = await createTestPartner({
      eligibility: "eligible",
      agreementActive: 1,
      agreementExecution: "invalidated"
    });
    const res = await resolveSellerReadiness(db, id);
    assert.strictEqual(res.status, "not_ready");
    assert.ok(res.blockers.includes("agreement_execution_missing"));
  });

  test("C. evidence missing -> NOT READY", async () => {
    const id = await createTestPartner({
      eligibility: "eligible",
      agreementActive: 1,
      agreementExecution: "none"
    });
    const res = await resolveSellerReadiness(db, id);
    assert.strictEqual(res.status, "not_ready");
    assert.ok(res.blockers.includes("agreement_execution_missing"));
  });

  test("D. evidence pointing to inactive agreement version -> NOT READY", async () => {
    const id = await createTestPartner({
      eligibility: "eligible",
      agreementActive: 1,
      agreementExecution: "inactive"
    });
    const res = await resolveSellerReadiness(db, id);
    assert.strictEqual(res.status, "not_ready");
    assert.ok(res.blockers.includes("agreement_execution_missing"));
  });

  test("E. missing legal identity -> NOT READY", async () => {
    const id = Math.floor(Math.random() * 1000000) + 100000;
    await db.insert(partners).values({ id, companyName: "No Legal", contactEmail: "x" });
    const res = await resolveSellerReadiness(db, id);
    assert.strictEqual(res.status, "not_ready");
    assert.ok(res.blockers.includes("missing_legal_identity"));
  });

  test("F. incomplete legal identity -> NOT READY", async () => {
    const id = await createTestPartner({
      legalIdentityComplete: false,
      eligibility: "eligible",
      agreementActive: 1,
      agreementExecution: "active"
    });
    const res = await resolveSellerReadiness(db, id);
    assert.strictEqual(res.status, "not_ready");
    assert.ok(res.blockers.includes("incomplete_legal_identity"));
  });

  test("G. missing tax identifier -> NOT READY", async () => {
    const id = await createTestPartner({
      hasTax: false,
      eligibility: "eligible",
      agreementActive: 1,
      agreementExecution: "active"
    });
    const res = await resolveSellerReadiness(db, id);
    assert.strictEqual(res.status, "not_ready");
    assert.ok(res.blockers.includes("missing_tax_identity"));
  });

  test("H. unverified legal identity -> NOT READY", async () => {
    const id = await createTestPartner({
      legalIdentityVerified: false,
      eligibility: "eligible",
      agreementActive: 1,
      agreementExecution: "active"
    });
    const res = await resolveSellerReadiness(db, id);
    assert.strictEqual(res.status, "not_ready");
    assert.ok(res.blockers.includes("verification_not_valid"));
  });

  test("I. unverified tax identifier -> NOT READY", async () => {
    const id = await createTestPartner({
      taxVerified: false,
      eligibility: "eligible",
      agreementActive: 1,
      agreementExecution: "active"
    });
    const res = await resolveSellerReadiness(db, id);
    assert.strictEqual(res.status, "not_ready");
    assert.ok(res.blockers.includes("verification_not_valid"));
  });

  test("K. unverified registry identifier -> NOT READY", async () => {
    const id = await createTestPartner({
      hasRegistry: true,
      registryVerified: false,
      eligibility: "eligible",
      agreementActive: 1,
      agreementExecution: "active"
    });
    const res = await resolveSellerReadiness(db, id);
    assert.strictEqual(res.status, "not_ready");
    assert.ok(res.blockers.includes("verification_not_valid"));
  });

  test("L. eligibility not eligible -> NOT READY", async () => {
    const id = await createTestPartner({
      eligibility: "pending",
      agreementActive: 1,
      agreementExecution: "active"
    });
    const res = await resolveSellerReadiness(db, id);
    assert.strictEqual(res.status, "not_ready");
    assert.ok(res.blockers.includes("eligibility_not_eligible"));
  });

  test("M. multiple active agreement versions -> NOT READY", async () => {
    const id = await createTestPartner({
      eligibility: "eligible",
      agreementActive: 2,
      agreementExecution: "active"
    });
    const res = await resolveSellerReadiness(db, id);
    assert.strictEqual(res.status, "not_ready");
    assert.ok(res.blockers.includes("active_agreement_ambiguous"));
  });

  test("N. zero active agreement versions -> NOT READY", async () => {
    const id = await createTestPartner({
      eligibility: "eligible",
      agreementActive: 0,
      agreementExecution: "none"
    });
    const res = await resolveSellerReadiness(db, id);
    assert.strictEqual(res.status, "not_ready");
    assert.ok(res.blockers.includes("active_agreement_missing"));
  });
});
