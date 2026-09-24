import { test, describe, before, after } from "node:test";
import * as assert from "node:assert";
import { db } from "@/lib/db";
import { 
  partners, 
  sellerLegalIdentities, 
  sellerTaxIdentifiers, 
  sellerRegistryIdentifiers, 
  sellerVerificationEvents 
} from "@/lib/schema";
import { executeAdminSellerVerification } from "@/lib/admin/seller-verification-core";
import { eq } from "drizzle-orm";

describe("Admin Seller Identity Verification", () => {
  let partnerId1: number;
  let partnerId2: number;
  let taxId1: number;
  let registryId1: number;

  before(async () => {
    // Create test partners
    const [p1, p2] = await db.insert(partners).values([
      { companyName: "Test Partner 1", contactEmail: "test1@example.com" },
      { companyName: "Test Partner 2", contactEmail: "test2@example.com" }
    ]).returning({ id: partners.id });
    
    partnerId1 = p1.id;
    partnerId2 = p2.id;

    await db.insert(sellerLegalIdentities).values([
      { partnerId: partnerId1, legalName: "Test Legal 1", jurisdictionCountry: "PL", verificationStatus: "unverified" },
      { partnerId: partnerId2, legalName: "Test Legal 2", jurisdictionCountry: "PL", verificationStatus: "unverified" }
    ]);

    const [t1] = await db.insert(sellerTaxIdentifiers).values([
      { partnerId: partnerId1, identifierType: "tax_id", identifierValue: "1111111111", countryCode: "PL", canonicalIdentityClass: "PL_NIP", canonicalIdentifierValue: "1111111111", verificationStatus: "unverified" }
    ]).returning({ id: sellerTaxIdentifiers.id });
    taxId1 = t1.id;

    const [r1] = await db.insert(sellerRegistryIdentifiers).values([
      { partnerId: partnerId1, registryType: "krs", registryValue: "0000000001", jurisdictionCountry: "PL", verificationStatus: "unverified" }
    ]).returning({ id: sellerRegistryIdentifiers.id });
    registryId1 = r1.id;
  });

  after(async () => {
    await db.delete(sellerVerificationEvents);
    await db.delete(sellerRegistryIdentifiers);
    await db.delete(sellerTaxIdentifiers);
    await db.delete(sellerLegalIdentities);
    await db.delete(partners).where(eq(partners.id, partnerId1));
    await db.delete(partners).where(eq(partners.id, partnerId2));
  });

  test("Legal Identity verify success", async () => {
    const result = await executeAdminSellerVerification(db, {
      partnerId: partnerId1,
      subjectType: "legal_identity",
      decision: "verified",
      expectedStatus: "unverified",
      sourceType: "admin_manual",
      sourceName: "Test Admin",
      sourceReference: "Ref123"
    }, { actorUserId: "admin-1" });

    assert.strictEqual(result.ok, true);

    const [legal] = await db.select().from(sellerLegalIdentities).where(eq(sellerLegalIdentities.partnerId, partnerId1));
    assert.strictEqual(legal.verificationStatus, "verified");
    assert.strictEqual(legal.verificationSource, "admin_manual");
    assert.strictEqual(legal.verificationReference, "Ref123");
    assert.notStrictEqual(legal.currentVerificationEventId, null);

    const [event] = await db.select().from(sellerVerificationEvents).where(eq(sellerVerificationEvents.id, legal.currentVerificationEventId!));
    assert.strictEqual(event.subjectType, "legal_identity");
    assert.strictEqual(event.eventType, "verified");
    assert.strictEqual(event.actorUserId, "admin-1");
  });

  test("Tax Identifier verify success", async () => {
    const result = await executeAdminSellerVerification(db, {
      partnerId: partnerId1,
      subjectType: "tax_identifier",
      subjectId: taxId1,
      decision: "verified",
      expectedStatus: "unverified",
      sourceType: "public_registry_manual",
      sourceName: "VIES",
      sourceReference: "VIES-REF-1"
    }, { actorUserId: "admin-1" });

    assert.strictEqual(result.ok, true);

    const [tax] = await db.select().from(sellerTaxIdentifiers).where(eq(sellerTaxIdentifiers.id, taxId1));
    assert.strictEqual(tax.verificationStatus, "verified");
  });

  test("Registry Identifier verify success", async () => {
    const result = await executeAdminSellerVerification(db, {
      partnerId: partnerId1,
      subjectType: "registry_identifier",
      subjectId: registryId1,
      decision: "verified",
      expectedStatus: "unverified",
      sourceType: "partner_document",
      sourceName: "KRS PDF",
      sourceReference: "hash"
    }, { actorUserId: "admin-1" });

    assert.strictEqual(result.ok, true);

    const [reg] = await db.select().from(sellerRegistryIdentifiers).where(eq(sellerRegistryIdentifiers.id, registryId1));
    assert.strictEqual(reg.verificationStatus, "verified");
  });

  test("Tax Identifier cannot be verified through another Partner", async () => {
    const result = await executeAdminSellerVerification(db, {
      partnerId: partnerId2, // Wrong partner
      subjectType: "tax_identifier",
      subjectId: taxId1,
      decision: "verified",
      expectedStatus: "unverified",
      sourceType: "admin_manual"
    }, { actorUserId: "admin-1" });

    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.code, "OWNERSHIP_MISMATCH");
    }
  });

  test("Stale expected state returns conflict", async () => {
    const result = await executeAdminSellerVerification(db, {
      partnerId: partnerId1,
      subjectType: "legal_identity",
      decision: "verified",
      expectedStatus: "unverified", // Already verified in first test
      sourceType: "admin_manual"
    }, { actorUserId: "admin-1" });

    assert.strictEqual(result.ok, false);
    if (!result.ok) {
      assert.strictEqual(result.code, "VERIFICATION_CONFLICT");
    }
  });
});
