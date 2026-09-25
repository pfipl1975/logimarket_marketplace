import { test } from "node:test";
import assert from "node:assert";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { runMigrations } from "../../scripts/database/run-runtime-migrations";
import {
  validateDestructiveTestEnvironment,
  resetDisposableTestDatabase,
} from "./helpers/destructive-db-safety";
import { createAgreementVersionCore, activateAgreementVersionCore } from "@/lib/admin/agreement-version-core";
import { registerPartnerAgreementExecutionEvidence, invalidatePartnerAgreementExecutionEvidence } from "@/lib/legal/partner-agreement-core";
import { executeOfferPublicationStateChange } from "@/lib/admin/offer-publication-core";
import { querySellerReadiness } from "@/lib/admin/seller-readiness-query";
import * as schema from "@/lib/schema";
import { eq } from "drizzle-orm";

test("AGREEMENT_SELLER_READINESS_FLOW", async (t) => {
  const guard = validateDestructiveTestEnvironment(process.env);
  if (guard.type === "SKIP") {
    t.skip(guard.reason);
    return;
  }
  if (guard.type === "FAIL") {
    throw new Error(`Destructive DB guard failed: ${guard.reason}`);
  }

  const testDatabaseUrl = guard.url;
  const originalDbUrl = process.env.DATABASE_URL;

  const safetyEnv = {
    ...process.env,
    TEST_DATABASE_URL: testDatabaseUrl,
    DATABASE_URL: originalDbUrl,
  };

  process.env.DATABASE_URL = testDatabaseUrl;

  const pool = new Pool({ connectionString: testDatabaseUrl });
  const db = drizzle(pool, { schema });

  t.after(async () => {
    if (originalDbUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDbUrl;
    }
    await pool.end();
  });

  await resetDisposableTestDatabase(pool, safetyEnv);
  await runMigrations(process.env);

  // 1. Setup Test synthetic partner
  const [cat] = await db.insert(schema.categories).values({
    name: "Test Category",
    slug: "test-category",
  }).returning({ id: schema.categories.id });

  const [partner] = await db.insert(schema.partners).values({
    companyName: "PFConsulting - Partner testowy",
    contactEmail: "test-only@example.com",
  }).returning({ id: schema.partners.id });
  const partnerId = partner.id;

  await db.insert(schema.sellerLegalIdentities).values({
    partnerId,
    legalName: "PFConsulting - Partner testowy",
    jurisdictionCountry: "PL",
    verificationStatus: "verified",
    registeredAddressLine1: "Testowa 1",
    registeredPostalCode: "00-000",
    registeredCity: "Test City",
    registeredCountryCode: "PL",
  });

  await db.insert(schema.sellerTaxIdentifiers).values({
    partnerId,
    identifierType: "tax_id",
    identifierValue: "0000000000",
    countryCode: "PL",
    canonicalIdentityClass: "PL:NIP",
    canonicalIdentifierValue: "0000000000",
    verificationStatus: "verified",
  });

  await db.insert(schema.sellerRegistryIdentifiers).values({
    partnerId,
    registryType: "krs",
    registryValue: "0000000000",
    jurisdictionCountry: "PL",
    verificationStatus: "verified",
  });

  await db.insert(schema.sellerEligibility).values({
    partnerId,
    eligibilityStatus: "eligible",
  });

  const [offerA] = await db.insert(schema.offers).values({
    partnerId,
    categoryId: cat.id,
    title: "Test Offer A",
    offerModel: "marketplace",
    conversionType: "inbound",
    priceBrutto: "100.00",
    priceOnRequest: false,
    isActive: true,
    publicationStatus: "draft",
  }).returning({ id: schema.offers.id });

  const [offerB] = await db.insert(schema.offers).values({
    partnerId,
    categoryId: cat.id,
    title: "Test Offer B",
    offerModel: "marketplace",
    conversionType: "inbound",
    priceBrutto: "150.00",
    priceOnRequest: false,
    isActive: true,
    publicationStatus: "draft",
  }).returning({ id: schema.offers.id });

  const adminUserId = "admin-test-123";

  // PHASE A: no agreement version
  const readinessA = await querySellerReadiness(db, partnerId);
  assert.strictEqual(readinessA.status, "not_ready");
  assert.ok(readinessA.blockers.includes("active_agreement_missing"));

  const pubA = await executeOfferPublicationStateChange(
    db,
    { offerId: offerA.id, expectedStatus: "draft", targetStatus: "published" },
    { querySellerReadiness }
  );
  assert.strictEqual(pubA.ok, false);
  if (!pubA.ok) {
    assert.strictEqual(pubA.code, "OFFER_PUBLISH_NOT_ELIGIBLE");
    assert.strictEqual(pubA.reason, "SELLER_NOT_READY");
  }

  const finalOfferAA = await db.select().from(schema.offers).where(eq(schema.offers.id, offerA.id));
  assert.strictEqual(finalOfferAA[0].publicationStatus, "draft");

  // PHASE B: active agreement, no evidence
  const createdRes = await createAgreementVersionCore(db, {
    version: "v1.0",
    canonicalTemplateHashSha256: "0".repeat(64),
  });
  assert.strictEqual(createdRes.type, "AGREEMENT_VERSION_CREATED");
  if (createdRes.type !== "AGREEMENT_VERSION_CREATED") {
    assert.fail(`Unexpected create result: ${createdRes.type}`);
  }
  const versionId = createdRes.versionId;

  const activatedRes = await activateAgreementVersionCore(db, { agreementVersionId: versionId });
  assert.strictEqual(activatedRes.type, "AGREEMENT_VERSION_ACTIVATED");

  const readinessB = await querySellerReadiness(db, partnerId);
  assert.strictEqual(readinessB.status, "not_ready");
  assert.ok(!readinessB.blockers.includes("active_agreement_missing"));
  assert.ok(readinessB.blockers.includes("agreement_execution_missing"));

  const pubB = await executeOfferPublicationStateChange(
    db,
    { offerId: offerA.id, expectedStatus: "draft", targetStatus: "published" },
    { querySellerReadiness }
  );
  assert.strictEqual(pubB.ok, false);
  if (!pubB.ok) {
    assert.strictEqual(pubB.code, "OFFER_PUBLISH_NOT_ELIGIBLE");
    assert.strictEqual(pubB.reason, "SELLER_NOT_READY");
  }

  const finalOfferAB = await db.select().from(schema.offers).where(eq(schema.offers.id, offerA.id));
  assert.strictEqual(finalOfferAB[0].publicationStatus, "draft");

  // PHASE C & D: Evidence registered -> ready -> publish offer
  const activeVersionRow = await db.select().from(schema.agreementVersions).where(eq(schema.agreementVersions.id, versionId));
  const publishedAt = activeVersionRow[0].publishedAt;
  const effectiveFrom = activeVersionRow[0].effectiveFrom;
  assert.notStrictEqual(publishedAt, null);
  assert.notStrictEqual(effectiveFrom, null);

  const safeTimeMs = Math.max(publishedAt!.getTime(), effectiveFrom!.getTime()) + 1000;
  const signedAt = new Date(safeTimeMs).toISOString();

  const evRes = await registerPartnerAgreementExecutionEvidence(db, {
    partnerId,
    agreementVersionId: versionId,
    executionMethod: "platform_documentary_electronic",
    signatoryName: "Test Signatory",
    signatoryRole: "Owner",
    signatoryEmail: "test-only@example.com",
    externalPlatform: "LM_E2E_TEST",
    externalTransactionId: "txn-12345",
    signedPdfSha256: "1".repeat(64),
    signedAt,
  }, adminUserId);
  assert.ok(evRes.ok);
  const evidenceId = evRes.ok ? evRes.data.evidenceId : 0;

  const readinessC = await querySellerReadiness(db, partnerId);
  assert.strictEqual(readinessC.status, "ready");
  assert.strictEqual(readinessC.blockers.length, 0);

  const pubC = await executeOfferPublicationStateChange(
    db,
    { offerId: offerA.id, expectedStatus: "draft", targetStatus: "published" },
    { querySellerReadiness }
  );
  assert.strictEqual(pubC.ok, true);
  if (pubC.ok) {
    assert.strictEqual(pubC.code, "OFFER_PUBLISHED");
    assert.strictEqual(pubC.changed, true);
  }

  const finalOfferA = await db.select().from(schema.offers).where(eq(schema.offers.id, offerA.id));
  assert.strictEqual(finalOfferA[0].publicationStatus, "published");
  assert.notStrictEqual(finalOfferA[0].publishedAt, null);

  // PHASE E: Invalidate evidence -> not ready -> offer 2 fails
  const invRes = await invalidatePartnerAgreementExecutionEvidence(db, {
    executionEvidenceId: evidenceId,
    reason: "LM-AGREEMENT-FLOW-TEST-01 test invalidation",
  }, adminUserId);
  assert.ok(invRes.ok);

  const readinessD = await querySellerReadiness(db, partnerId);
  assert.strictEqual(readinessD.status, "not_ready");
  assert.ok(readinessD.blockers.includes("agreement_execution_invalidated"));

  const finalOfferAAfterInv = await db.select().from(schema.offers).where(eq(schema.offers.id, offerA.id));
  assert.strictEqual(finalOfferAAfterInv[0].publicationStatus, "published");

  // PHASE F: second offer fails
  const pubF = await executeOfferPublicationStateChange(
    db,
    { offerId: offerB.id, expectedStatus: "draft", targetStatus: "published" },
    { querySellerReadiness }
  );
  assert.strictEqual(pubF.ok, false);
  if (!pubF.ok) {
    assert.strictEqual(pubF.code, "OFFER_PUBLISH_NOT_ELIGIBLE");
    assert.strictEqual(pubF.reason, "SELLER_NOT_READY");
  }

  const finalOfferB = await db.select().from(schema.offers).where(eq(schema.offers.id, offerB.id));
  assert.strictEqual(finalOfferB[0].publicationStatus, "draft");
});
