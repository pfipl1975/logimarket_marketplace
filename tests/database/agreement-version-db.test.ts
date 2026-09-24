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
import { agreementVersions } from "@/lib/schema";
import { eq } from "drizzle-orm";

test("AGREEMENT_VERSION_DB_PROOF", async (t) => {
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

  // We only set it for runMigrations which might require it inside this codebase.
  process.env.DATABASE_URL = testDatabaseUrl;

  const pool = new Pool({ connectionString: testDatabaseUrl });

  t.after(async () => {
    if (originalDbUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDbUrl;
    }
    await pool.end();
  });

  const schema = await import("@/lib/schema");
  const testDb = drizzle(pool, { schema });

  const cleanDB = async () => {
    const safetyEnv = {
      ...process.env,
      TEST_DATABASE_URL: testDatabaseUrl,
      DATABASE_URL: originalDbUrl,
    };
    await resetDisposableTestDatabase(pool, safetyEnv);
    await runMigrations(process.env);
  };

  await t.test("CREATE DRAFT AND HASH NORMALIZATION", async () => {
    await cleanDB();
    const result = await createAgreementVersionCore(testDb, { version: "v1.0", canonicalTemplateHashSha256: "A".repeat(64) });
    assert.strictEqual(result.type, "AGREEMENT_VERSION_CREATED");

    const records = await testDb.select().from(agreementVersions);

    assert.strictEqual(records.length, 1);
    assert.strictEqual(records[0].agreementType, "partner_agreement_b2b");
    assert.strictEqual(records[0].version, "v1.0");
    assert.strictEqual(records[0].canonicalTemplateHashSha256, "a".repeat(64));
    assert.strictEqual(records[0].status, "draft");
    assert.strictEqual(records[0].effectiveFrom, null);
    assert.strictEqual(records[0].effectiveTo, null);
    assert.strictEqual(records[0].publishedAt, null);
  });

  await t.test("FIRST ACTIVATION", async () => {
    await cleanDB();
    const created = await createAgreementVersionCore(testDb, { version: "v1.0", canonicalTemplateHashSha256: "a".repeat(64) });
    assert.strictEqual(created.type, "AGREEMENT_VERSION_CREATED");

    const activated = await activateAgreementVersionCore(testDb, { agreementVersionId: (created as { versionId: number }).versionId });
    assert.strictEqual(activated.type, "AGREEMENT_VERSION_ACTIVATED");

    const records = await testDb.select().from(agreementVersions);

    assert.strictEqual(records.length, 1);
    assert.strictEqual(records[0].status, "active");
    assert.notStrictEqual(records[0].effectiveFrom, null);
    assert.notStrictEqual(records[0].publishedAt, null);
    assert.strictEqual(records[0].effectiveTo, null);

    const activeRecords = await testDb.select().from(agreementVersions).where(eq(agreementVersions.status, "active"));
    assert.strictEqual(activeRecords.length, 1, "Exactly one version should be active in DB");
  });

  await t.test("SECOND ACTIVATION REJECTED", async () => {
    await cleanDB();
    const created1 = await createAgreementVersionCore(testDb, { version: "v1.0", canonicalTemplateHashSha256: "a".repeat(64) });
    await activateAgreementVersionCore(testDb, { agreementVersionId: (created1 as { versionId: number }).versionId });

    const created2 = await createAgreementVersionCore(testDb, { version: "v1.1", canonicalTemplateHashSha256: "b".repeat(64) });

    const activated2 = await activateAgreementVersionCore(testDb, { agreementVersionId: (created2 as { versionId: number }).versionId });
    assert.strictEqual(activated2.type, "ACTIVE_VERSION_ALREADY_EXISTS");

    const records = await testDb.select().from(agreementVersions).orderBy(agreementVersions.id);

    assert.strictEqual(records.length, 2);
    assert.strictEqual(records[0].status, "active");
    assert.strictEqual(records[1].status, "draft");
  });

  await t.test("CONCURRENT ACTIVATION", async () => {
    await cleanDB();
    const created1 = await createAgreementVersionCore(testDb, { version: "v1.0", canonicalTemplateHashSha256: "a".repeat(64) });
    const created2 = await createAgreementVersionCore(testDb, { version: "v1.1", canonicalTemplateHashSha256: "b".repeat(64) });

    const [res1, res2] = await Promise.all([
      activateAgreementVersionCore(testDb, { agreementVersionId: (created1 as { versionId: number }).versionId }),
      activateAgreementVersionCore(testDb, { agreementVersionId: (created2 as { versionId: number }).versionId }),
    ]);

    const successes = [res1.type, res2.type].filter(t => t === "AGREEMENT_VERSION_ACTIVATED");
    const conflicts = [res1.type, res2.type].filter(t => t === "ACTIVE_VERSION_ALREADY_EXISTS");

    assert.strictEqual(successes.length, 1);
    assert.strictEqual(conflicts.length, 1);

    const activeRecords = await testDb.select().from(agreementVersions).where(eq(agreementVersions.status, "active"));
    assert.strictEqual(activeRecords.length, 1, "Exactly one version should be active in DB");

    const draftRecords = await testDb.select().from(agreementVersions).where(eq(agreementVersions.status, "draft"));
    assert.strictEqual(draftRecords.length, 1, "Exactly one version should be draft in DB");

    const allRecords = await testDb.select().from(agreementVersions);
    assert.strictEqual(allRecords.length, 2, "Total two versions should be in DB");
  });

  await t.test("UNIQUE VERSION", async () => {
    await cleanDB();
    const res1 = await createAgreementVersionCore(testDb, { version: "v1.0", canonicalTemplateHashSha256: "a".repeat(64) });
    assert.strictEqual(res1.type, "AGREEMENT_VERSION_CREATED");
    const res2 = await createAgreementVersionCore(testDb, { version: "v1.0", canonicalTemplateHashSha256: "b".repeat(64) });
    assert.strictEqual(res2.type, "VERSION_ALREADY_EXISTS");
  });

  await t.test("UNIQUE HASH", async () => {
    await cleanDB();
    const res1 = await createAgreementVersionCore(testDb, { version: "v1.0", canonicalTemplateHashSha256: "a".repeat(64) });
    assert.strictEqual(res1.type, "AGREEMENT_VERSION_CREATED");
    const res2 = await createAgreementVersionCore(testDb, { version: "v1.1", canonicalTemplateHashSha256: "a".repeat(64) });
    assert.strictEqual(res2.type, "TEMPLATE_HASH_ALREADY_EXISTS");
  });
});
