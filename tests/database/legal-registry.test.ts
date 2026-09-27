import { test } from "node:test";
import assert from "node:assert";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { validateDestructiveTestEnvironment, resetDisposableTestDatabase } from "./helpers/destructive-db-safety";
import { runMigrations } from "../../scripts/database/run-runtime-migrations";
import * as schema from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getPublicLegalCenter, PUBLIC_CORE_LEGAL_PACK_CODE } from "@/lib/legal/public-legal-center";

async function assertDbError(promise: Promise<unknown>, regex: RegExp) {
  try {
    await promise;
    assert.fail("Expected promise to reject, but it resolved.");
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;
    const message = err.cause?.message || err.message || String(err);
    assert.match(message, regex, `Expected error message to match ${regex}. Actual: ${message}`);
  }
}

test("LEGAL_REGISTRY_IMMUTABILITY_CONTRACT", async (t) => {
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

  try {
    await resetDisposableTestDatabase(pool, safetyEnv);
    await runMigrations(process.env);

    await t.test("1. Can create a legal document and multiple versions", async () => {
      const [doc] = await db.insert(schema.legalDocuments).values({
        code: "TEST_AGREEMENT",
        slug: "test-agreement",
        titlePl: "Testowa Umowa",
        documentType: "partner_legal_pack",
      }).returning();

      assert.ok(doc.id);

      const [v1] = await db.insert(schema.legalDocumentVersions).values({
        legalDocumentId: doc.id,
        version: "v1.0",
        language: "pl",
        status: "draft",
      }).returning();

      const [v2] = await db.insert(schema.legalDocumentVersions).values({
        legalDocumentId: doc.id,
        version: "v2.0",
        language: "pl",
        status: "draft",
      }).returning();

      assert.strictEqual(v1.version, "v1.0");
      assert.strictEqual(v2.version, "v2.0");
    });

    await t.test("2. Active document uniqueness constraint", async () => {
      const [doc] = await db.insert(schema.legalDocuments).values({
        code: "TEST_UNIQUENESS",
        slug: "test-uniqueness",
        titlePl: "Test",
        documentType: "partner_legal_pack",
      }).returning();

      const baseVersion = {
        legalDocumentId: doc.id,
        language: "pl",
        status: "active",
        sha256: "a".repeat(64),
        storageReference: "s3://test/1.pdf",
        fileName: "1.pdf",
        fileSizeBytes: 100,
        effectiveFrom: new Date(),
      };

      await db.insert(schema.legalDocumentVersions).values({ ...baseVersion, version: "v1.0" });

      await assertDbError(
        db.insert(schema.legalDocumentVersions).values({ ...baseVersion, version: "v2.0" }),
        /uq_legal_doc_versions_active/
      );
    });

    await t.test("3. Invalid SHA-256 is rejected", async () => {
      const [doc] = await db.insert(schema.legalDocuments).values({
        code: "TEST_HASH",
        slug: "test-hash",
        titlePl: "Test",
      }).returning();

      await assertDbError(
        db.insert(schema.legalDocumentVersions).values({
          legalDocumentId: doc.id,
          version: "v1.0",
          sha256: "invalid-hash",
        }),
        /chk_legal_doc_versions_hash_format/
      );
    });

    await t.test("4. Active without required integrity fields is rejected", async () => {
      const [doc] = await db.insert(schema.legalDocuments).values({
        code: "TEST_INTEGRITY",
        slug: "test-integrity",
        titlePl: "Test",
      }).returning();

      await assertDbError(
        db.insert(schema.legalDocumentVersions).values({
          legalDocumentId: doc.id,
          version: "v1.0",
          status: "active",
        }),
        /chk_legal_doc_versions_active_integrity/
      );
    });

    await t.test("5. Frozen document version prevents modification of frozen fields", async () => {
      const [doc] = await db.insert(schema.legalDocuments).values({
        code: "TEST_FROZEN",
        slug: "test-frozen",
        titlePl: "Test",
      }).returning();

      const [v] = await db.insert(schema.legalDocumentVersions).values({
        legalDocumentId: doc.id,
        version: "v1.0",
        status: "active",
        sha256: "b".repeat(64),
        storageReference: "s3://test/2.pdf",
        fileName: "2.pdf",
        fileSizeBytes: 200,
        effectiveFrom: new Date(),
      }).returning();

      await assertDbError(
        db.update(schema.legalDocumentVersions).set({ sha256: "c".repeat(64) }).where(eq(schema.legalDocumentVersions.id, v.id)),
        /Cannot modify frozen fields/
      );
      
      // But we can transition to superseded
      await db.update(schema.legalDocumentVersions).set({ status: "superseded" }).where(eq(schema.legalDocumentVersions.id, v.id));
      
      // And we cannot unarchive/unsupersede
      await assertDbError(
        db.update(schema.legalDocumentVersions).set({ status: "active" }).where(eq(schema.legalDocumentVersions.id, v.id)),
        /Superseded legal document version can only become archived/
      );
    });

    await t.test("6. Pack membership and freeze contract", async () => {
      const [doc] = await db.insert(schema.legalDocuments).values({
        code: "TEST_PACK_DOC",
        slug: "test-pack-doc",
        titlePl: "Test",
      }).returning();

      const [docVer] = await db.insert(schema.legalDocumentVersions).values({
        legalDocumentId: doc.id,
        version: "v1.0",
      }).returning();

      const [packVer] = await db.insert(schema.legalPackVersions).values({
        code: "CORE_PARTNER_LEGAL_PACK",
        version: "v1.0",
      }).returning();

      await db.insert(schema.legalPackDocuments).values({
        legalPackVersionId: packVer.id,
        legalDocumentVersionId: docVer.id,
        ordinal: 1,
      });

      // Activate pack
      await db.update(schema.legalPackVersions).set({
        status: "active",
        rootSha256: "32a1df03f55ed0e2d9c4b189f6ec231b6adb524ef1b92e6f3d4a75924195c77c",
      }).where(eq(schema.legalPackVersions.id, packVer.id));

      // Attempt to modify membership
      await assertDbError(
        db.insert(schema.legalPackDocuments).values({
          legalPackVersionId: packVer.id,
          legalDocumentVersionId: docVer.id,
          ordinal: 2,
        }),
        /Cannot insert or move membership into a frozen legal pack/
      );

      await assertDbError(
        db.delete(schema.legalPackDocuments).where(eq(schema.legalPackDocuments.legalPackVersionId, packVer.id)),
        /Cannot modify or delete membership of a frozen legal pack/
      );
    });

    await t.test("7. Public Legal Center read model filters registry rows", async () => {
      const now = new Date("2026-09-27T12:00:00.000Z");
      const past = new Date("2026-09-01T00:00:00.000Z");
      const older = new Date("2026-08-01T00:00:00.000Z");
      const future = new Date("2026-10-01T00:00:00.000Z");
      const sha256 = "d".repeat(64);
      const rootSha256 = "e".repeat(64);

      for (const [code, documentType, status, effectiveFrom, version] of [
        ["CENTER_ACTIVE", "public_legal", "active", past, "center-active"],
        ["CENTER_DRAFT", "public_legal", "draft", past, "center-draft"],
        ["CENTER_FUTURE", "public_legal", "active", future, "center-future"],
        ["CENTER_PRIVATE", "partner_legal_pack", "active", past, "center-private"],
        ["CENTER_SUPERSEDED", "public_legal", "superseded", past, "center-superseded"],
        ["CENTER_ARCHIVED", "public_legal", "archived", older, "center-archived"],
      ] as const) {
        const [document] = await db.insert(schema.legalDocuments).values({
          code,
          slug: code.toLowerCase().replaceAll("_", "-"),
          titlePl: code,
          documentType,
        }).returning({ id: schema.legalDocuments.id });
        await db.insert(schema.legalDocumentVersions).values({
          legalDocumentId: document.id,
          version,
          language: "pl",
          status,
          effectiveFrom,
          sha256,
          fileName: `${code}.pdf`,
          fileSizeBytes: 100,
          storageReference: "s3://private-bucket/internal.pdf",
        });
      }

      await db.insert(schema.legalPackVersions).values([
        { code: PUBLIC_CORE_LEGAL_PACK_CODE, version: "center-current", language: "en", status: "active", effectiveFrom: past, rootSha256, manifestJson: { internal: "secret" } },
        { code: PUBLIC_CORE_LEGAL_PACK_CODE, version: "center-future", language: "de", status: "active", effectiveFrom: future, rootSha256 },
        { code: PUBLIC_CORE_LEGAL_PACK_CODE, version: "center-draft", language: "fr", status: "draft", effectiveFrom: past, rootSha256 },
        { code: "OTHER_PACK", version: "center-other", language: "pl", status: "active", effectiveFrom: past, rootSha256 },
      ]);

      const center = await getPublicLegalCenter(db, now);
      assert.deepStrictEqual(center.currentDocuments.map((row) => row.version), ["center-active"]);
      assert.deepStrictEqual(center.history.map((row) => row.version), ["center-superseded", "center-archived"]);
      assert.strictEqual(center.currentDocuments[0].sha256, sha256);
      assert.deepStrictEqual(center.packs.map((row) => row.version), ["center-current"]);
      assert.strictEqual(center.packs[0].rootSha256, rootSha256);
      assert.ok(!JSON.stringify(center).includes("storageReference"));
      assert.ok(!JSON.stringify(center).includes("manifestJson"));
      assert.ok(!JSON.stringify(center).includes("private-bucket"));
      assert.ok(!JSON.stringify(center).includes("secret"));
    });

  } finally {
    // pool is closed in t.after()
  }
});
