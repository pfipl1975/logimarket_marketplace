import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Pool, type PoolClient } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { readMigrationFiles } from "drizzle-orm/migrator";
import * as schema from "@/lib/schema";
import { getPublicLegalCenter } from "@/lib/legal/public-legal-center";
import { runMigrations } from "../../scripts/database/run-runtime-migrations";
import { RUNTIME_MIGRATIONS_FOLDER } from "../../scripts/database/runtime-migration-contract";
import {
  CORE_LEGAL_PACK_V1_DOCUMENTS,
  CORE_LEGAL_PACK_V1_EFFECTIVE_FROM,
  CORE_LEGAL_PACK_V1_MANIFEST,
  CORE_LEGAL_PACK_V1_REGISTRY_CODE,
  CORE_LEGAL_PACK_V1_ROOT_SHA256,
} from "../../scripts/database/core-legal-pack-v1-data";
import {
  LEGAL_PUBLICATION_AUTHORIZATION,
  publishCoreLegalPackV1,
  validateCanonicalDiskJournal,
  verifyCoreLegalPackPublicationTarget,
} from "../../scripts/database/publish-core-legal-pack-v1";
import { resetDisposableTestDatabase, validateDestructiveTestEnvironment } from "./helpers/destructive-db-safety";

// Independent Owner-reviewed fixture: deliberately not imported from the publisher's data module.
const EXPECTED = {
  packCode: "CORE_PARTNER_LEGAL_PACK",
  externalPackId: "LM-PARTNER-LEGAL-PACK",
  root: "32a1df03f55ed0e2d9c4b189f6ec231b6adb524ef1b92e6f3d4a75924195c77c",
  effectiveInstant: "2026-09-30T22:00:00.000Z",
  documents: [
    ["PARTNER_AGREEMENT", "partner-agreement", "partner_legal_pack", "2b62965fec9d171564dd9e7a72eb426246ff513447b23161202f9dff6be3bd65", 126990, 1, true, "https://drive.google.com/file/d/130j1gVzNixEOML-TqGwq91OaIVqy5UPi/view?usp=drivesdk"],
    ["MARKETPLACE_TERMS", "marketplace-terms", "public_legal", "a5b9cde94becc8e647fc06c598d7e9e3303657e2df7ec11e20d2e08628e776b1", 127639, 2, true, "https://drive.google.com/file/d/1y7e-h3REZzFnAbMhx1CuuYGBE9-PAtfs/view?usp=drivesdk"],
    ["COMMISSION_RULES", "commission-rules", "public_legal", "80f9cdf68a9d75f71efb5716f78c8ed12da6519571e68c0551065cae5cf3ce04", 110232, 3, true, "https://drive.google.com/file/d/1hGAdmkb-1FepCS2GzKGyEyOcPgGwjFgb/view?usp=drivesdk"],
    ["RETURNS_COMPLAINTS", "returns-complaints", "public_legal", "70e13c872fac3823bed6d9c2089c2c9dbc6ebe33bd4cff591579e291701976d5", 90363, 4, true, "https://drive.google.com/file/d/1F0dB11W0Hx7GPOURzFdueXAlDcsGx0Vy/view?usp=drivesdk"],
    ["CONTENT_MODERATION", "content-moderation", "public_legal", "bd5b2d6e0ce29e2b8bcc89f36c958eafc15f3f9e20713df13bc7a83fbfbc10e1", 82685, 5, true, "https://drive.google.com/file/d/1SdLSC210v3bx6MvfdtJ3N-hb5xvtNMNg/view?usp=drivesdk"],
    ["RESTRICTED_PRODUCTS", "restricted-products", "public_legal", "a3b66d7ab8146bb4815deef3e127c3c706dc056e0d1e9747c1dcb37b70122c9b", 97303, 6, true, "https://drive.google.com/file/d/1pQgJuy52orQpsjAkmnHujep35J_5a0Yn/view?usp=drivesdk"],
    ["PRIVACY_POLICY", "privacy-policy", "public_legal", "2da0265e8f928ea05dd83b95fa615a0315b2f2b609a46e1455638e345feb86d5", 102414, 7, false, "https://drive.google.com/file/d/1pnSlhTHYTLmzhdYHahtAhTwP_v7fDnb8/view?usp=drivesdk"],
    ["COOKIE_NOTICE", "cookie-notice", "public_legal", "9f3f4f2b8772ebc2dbafd6598b8a42c8ede96de7120aa304085f91ef9d5987fd", 72206, 8, false, "https://drive.google.com/file/d/1itIwfDwGHh75k2o3IzeBR1T-nh1qyV-X/view?usp=drivesdk"],
  ],
  titles: [
    "Umowa o świadczenie usług i pośrednictwa agencyjnego",
    "Regulamin LogiMarket.eu Marketplace",
    "Cennik i Zasady Prowizji LogiMarket.eu Marketplace",
    "Zasady Reklamacji i Zwrotów LogiMarket.eu Marketplace",
    "Zasady Moderacji Treści LogiMarket.eu Marketplace",
    "Polityka Produktów Zakazanych i Ograniczonych LogiMarket.eu Marketplace",
    "Polityka Prywatności LogiMarket.eu Marketplace",
    "Informacja o Cookies LogiMarket.eu Marketplace",
  ],
  fileNames: [
    "LogiMarket.eu_Marketplace_Umowa_o_Swiadczenie_Uslug_i_Posrednictwa_Agencyjnego_v1_0.pdf",
    "LogiMarket.eu_Marketplace_Regulamin_v1_0.pdf",
    "LogiMarket.eu_Marketplace_Cennik_i_Zasady_Prowizji_v1_0.pdf",
    "LogiMarket.eu_Marketplace_Zasady_Reklamacji_i_Zwrotow_v1_0.pdf",
    "LogiMarket.eu_Marketplace_Zasady_Moderacji_Tresci_v1_0.pdf",
    "LogiMarket.eu_Marketplace_Polityka_Produktow_Zakazanych_i_Ograniczonych_v1_0.pdf",
    "LogiMarket.eu_Marketplace_Polityka_Prywatnosci_v1_0.pdf",
    "LogiMarket.eu_Marketplace_Informacja_o_Cookies_v1_0.pdf",
  ],
} as const;

const guardedUrl = "postgresql://postgres:dummy@db.tpjsiutclowwaxlopemn.supabase.co:5432/logimarket_test";
const authorizedEnv = {
  DATABASE_URL: guardedUrl,
  LEGAL_PUBLICATION_TARGET: "production",
  LEGAL_PUBLICATION_EXPECTED_PROJECT_REF: "tpjsiutclowwaxlopemn",
  LEGAL_PUBLICATION_FORBIDDEN_PROJECT_REF: "oczllhpiicrngbcbxndu",
  LEGAL_PUBLICATION_WRITE_AUTHORIZATION: LEGAL_PUBLICATION_AUTHORIZATION,
};

const migrationsFolder = path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER);
const diskJournal = JSON.parse(fs.readFileSync(path.join(migrationsFolder, "meta", "_journal.json"), "utf8")) as {
  entries: { idx: number; tag: string; when: number }[];
};
const diskMigrations = readMigrationFiles({ migrationsFolder });

test("Core Pack publisher validates the complete appendable disk chain", () => {
  assert.ok(diskJournal.entries.length > 20);
  assert.doesNotThrow(() => validateCanonicalDiskJournal(diskJournal, diskMigrations));
  const appendedWhen = diskJournal.entries.at(-1)!.when + 1;
  assert.doesNotThrow(() => validateCanonicalDiskJournal(
    { entries: [...diskJournal.entries, { idx: diskJournal.entries.length, tag: "0021_future_append", when: appendedWhen }] },
    [...diskMigrations, { folderMillis: appendedWhen }],
  ));
  assert.throws(
    () => validateCanonicalDiskJournal({ entries: diskJournal.entries.slice(0, -1) }, diskMigrations),
    /BLOCKED_DISK_JOURNAL_LENGTH_INVALID/,
  );
  assert.throws(
    () => validateCanonicalDiskJournal({ entries: diskJournal.entries.slice(0, 19) }, diskMigrations.slice(0, 19)),
    /BLOCKED_DISK_JOURNAL_LENGTH_INVALID/,
  );
  for (const change of [
    { idx: -1 },
    { tag: "0001_wrong_runtime_baseline" },
    { when: diskJournal.entries[0].when + 1 },
  ]) {
    const entries = diskJournal.entries.map((entry) => ({ ...entry }));
    Object.assign(entries[0], change);
    assert.throws(
      () => validateCanonicalDiskJournal({ entries }, diskMigrations),
      /BLOCKED_DISK_JOURNAL_INVALID/,
    );
  }
});

test("Core Pack v1 frozen metadata and dedicated target guards", () => {
  assert.equal(CORE_LEGAL_PACK_V1_REGISTRY_CODE, EXPECTED.packCode);
  assert.equal(CORE_LEGAL_PACK_V1_MANIFEST.payload.pack_id, EXPECTED.externalPackId);
  assert.notEqual(EXPECTED.packCode, EXPECTED.externalPackId);
  assert.equal(CORE_LEGAL_PACK_V1_MANIFEST.integrity.root_hash_sha256, EXPECTED.root);
  assert.equal(CORE_LEGAL_PACK_V1_ROOT_SHA256, EXPECTED.root);
  assert.equal(CORE_LEGAL_PACK_V1_EFFECTIVE_FROM, EXPECTED.effectiveInstant);
  assert.equal(CORE_LEGAL_PACK_V1_MANIFEST.payload.documents.length, 8);
  EXPECTED.documents.forEach(([code, slug, type, hash, size, ordinal, acceptance, reference], index) => {
    const document = CORE_LEGAL_PACK_V1_MANIFEST.payload.documents[index];
    const mapping = CORE_LEGAL_PACK_V1_DOCUMENTS[index];
    assert.equal(document.document_code, code);
    assert.equal(document.title, EXPECTED.titles[index]);
    assert.equal(document.file_name, EXPECTED.fileNames[index]);
    assert.equal(document.sha256, hash);
    assert.equal(document.byte_length, size);
    assert.equal(document.ordinal, ordinal);
    assert.equal(document.acceptance_required, acceptance);
    assert.equal(mapping.code, code);
    assert.equal(mapping.slug, slug);
    assert.equal(mapping.documentType, type);
    assert.equal(mapping.storageReference, reference);
  });
  assert.equal(verifyCoreLegalPackPublicationTarget(authorizedEnv), guardedUrl);
  assert.throws(() => verifyCoreLegalPackPublicationTarget({ ...authorizedEnv, DATABASE_URL: undefined }), /BLOCKED_DATABASE_URL_MISSING/);
  assert.throws(() => verifyCoreLegalPackPublicationTarget({ ...authorizedEnv, LEGAL_PUBLICATION_TARGET: "development" }), /BLOCKED_TARGET_NOT_PRODUCTION/);
  assert.throws(() => verifyCoreLegalPackPublicationTarget({ ...authorizedEnv, LEGAL_PUBLICATION_EXPECTED_PROJECT_REF: "wrong" }), /BLOCKED_EXPECTED_REF_INVALID/);
  assert.throws(() => verifyCoreLegalPackPublicationTarget({ ...authorizedEnv, LEGAL_PUBLICATION_FORBIDDEN_PROJECT_REF: "wrong" }), /BLOCKED_FORBIDDEN_REF_INVALID/);
  assert.throws(() => verifyCoreLegalPackPublicationTarget({ ...authorizedEnv, DATABASE_URL: "postgresql://postgres:dummy@db.oczllhpiicrngbcbxndu.supabase.co:5432/logimarket_test" }), /BLOCKED_FORBIDDEN_DATABASE_TARGET/);
  assert.throws(() => verifyCoreLegalPackPublicationTarget({ ...authorizedEnv, DATABASE_URL: "postgresql://postgres:dummy@db.someotherref.supabase.co:5432/logimarket_test" }), /BLOCKED_DATABASE_REF_MISMATCH/);
  assert.throws(() => verifyCoreLegalPackPublicationTarget({ ...authorizedEnv, LEGAL_PUBLICATION_WRITE_AUTHORIZATION: undefined }), /BLOCKED_PUBLICATION_AUTHORIZATION_INVALID/);
  assert.throws(() => verifyCoreLegalPackPublicationTarget({ ...authorizedEnv, LEGAL_PUBLICATION_WRITE_AUTHORIZATION: "AUTHORIZED_PROD_RUNTIME_MIGRATION" }), /BLOCKED_PUBLICATION_AUTHORIZATION_INVALID/);
});

test("Core Pack v1 publishes atomically in disposable PostgreSQL only", async (t) => {
  const guard = validateDestructiveTestEnvironment(process.env);
  if (guard.type === "SKIP") return t.skip(guard.reason);
  if (guard.type === "FAIL") throw new Error(`Destructive DB guard failed: ${guard.reason}`);
  const disposableUrl = guard.url;
  const originalUrl = process.env.DATABASE_URL;
  const adminPool = new Pool({ connectionString: disposableUrl });
  const poolFactory = () => new Pool({ connectionString: disposableUrl, max: 1 });
  const run = (afterMembershipInserted?: (client: PoolClient) => Promise<void>) =>
    publishCoreLegalPackV1(authorizedEnv, { poolFactory, afterMembershipInserted });
  const counts = async () => (await adminPool.query<{ documents: string; versions: string; packs: string; memberships: string }>(
    `SELECT (SELECT count(*) FROM public.legal_documents) AS documents,
            (SELECT count(*) FROM public.legal_document_versions) AS versions,
            (SELECT count(*) FROM public.legal_pack_versions) AS packs,
            (SELECT count(*) FROM public.legal_pack_documents) AS memberships`,
  )).rows[0];
  const snapshot = async (table: string) => (await adminPool.query(`SELECT * FROM public.${table} ORDER BY id`)).rows;
  const journal = async () => (await adminPool.query(`SELECT hash, created_at FROM drizzle_runtime.__drizzle_migrations ORDER BY created_at`)).rows;
  t.after(async () => {
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
    await adminPool.end();
  });
  await resetDisposableTestDatabase(adminPool, { ...process.env, DATABASE_URL: originalUrl, TEST_DATABASE_URL: disposableUrl });
  process.env.DATABASE_URL = disposableUrl;
  await runMigrations(process.env);
  const agreementBefore = await snapshot("agreement_versions");
  const evidenceBefore = await snapshot("partner_agreement_execution_evidence");
  const journalBefore = await journal();
  assert.equal(journalBefore.length, diskMigrations.length);
  const lastApplied = journalBefore[journalBefore.length - 1];

  await adminPool.query(`ALTER TABLE public.legal_documents ADD COLUMN publication_test_drift text`);
  await assert.rejects(run(), /BLOCKED_PHYSICAL_STATE_PARTIAL_OR_DRIFTED/);
  await adminPool.query(`ALTER TABLE public.legal_documents DROP COLUMN publication_test_drift`);
  await adminPool.query(`UPDATE drizzle_runtime.__drizzle_migrations SET hash = 'wrong' WHERE created_at = $1`, [lastApplied.created_at]);
  await assert.rejects(run(), /BLOCKED_RUNTIME_JOURNAL_NONCANONICAL/);
  await adminPool.query(`UPDATE drizzle_runtime.__drizzle_migrations SET hash = $1 WHERE created_at = $2`, [lastApplied.hash, lastApplied.created_at]);
  await adminPool.query(`INSERT INTO public.legal_documents (code, slug, title_pl) VALUES ('UNEXPECTED', 'unexpected', 'Unexpected')`);
  await assert.rejects(run(), /BLOCKED_EXISTING_LEGAL_REGISTRY_STATE/);
  await adminPool.query(`DELETE FROM public.legal_documents WHERE code = 'UNEXPECTED'`);

  await assert.rejects(run(async (client) => {
    // The failure hook is reached only after all memberships exist and before activation.
    const drafts = await client.query<{ documentDrafts: string; packDrafts: string; memberships: string }>(
      `SELECT (SELECT count(*) FROM public.legal_document_versions WHERE status = 'draft') AS "documentDrafts",
              (SELECT count(*) FROM public.legal_pack_versions WHERE status = 'draft') AS "packDrafts",
              (SELECT count(*) FROM public.legal_pack_documents) AS memberships`,
    );
    assert.deepEqual(Object.values(drafts.rows[0]).map(Number), [8, 1, 8]);
    throw new Error("INJECTED_BEFORE_ACTIVATION");
  }), /INJECTED_BEFORE_ACTIVATION/);
  assert.deepEqual(Object.values(await counts()).map(Number), [0, 0, 0, 0]);
  assert.deepEqual(await journal(), journalBefore);

  assert.equal(await run(), "PUBLISHED");
  assert.deepEqual(Object.values(await counts()).map(Number), [8, 8, 1, 8]);
  const publishedRows = (await adminPool.query<{
    code: string; slug: string; documentType: string; title: string; version: string;
    language: string; status: string; effectiveFrom: Date; fileName: string;
    mimeType: string; sha256: string; fileSizeBytes: string; storageReference: string;
    ordinal: number; acceptanceRequired: boolean;
  }>(
    `SELECT d.code, d.slug, d.document_type AS "documentType", d.title_pl AS title,
            v.version, v.language, v.status, v.effective_from AS "effectiveFrom",
            v.file_name AS "fileName", v.mime_type AS "mimeType", v.sha256,
            v.file_size_bytes AS "fileSizeBytes", v.storage_reference AS "storageReference",
            m.ordinal, m.acceptance_required AS "acceptanceRequired"
       FROM public.legal_pack_documents m
       JOIN public.legal_document_versions v ON v.id = m.legal_document_version_id
       JOIN public.legal_documents d ON d.id = v.legal_document_id
      ORDER BY m.ordinal`,
  )).rows;
  assert.equal(publishedRows.length, 8);
  publishedRows.forEach((row, index) => {
    const [code, slug, type, hash, size, ordinal, acceptance, reference] = EXPECTED.documents[index];
    assert.deepEqual(
      [row.code, row.slug, row.documentType, row.title, row.version, row.language, row.status,
        row.effectiveFrom.toISOString(), row.fileName, row.mimeType, row.sha256,
        Number(row.fileSizeBytes), row.storageReference, row.ordinal, row.acceptanceRequired],
      [code, slug, type, EXPECTED.titles[index], "1.0", "pl", "active",
        EXPECTED.effectiveInstant, EXPECTED.fileNames[index], "application/pdf", hash,
        size, reference, ordinal, acceptance],
    );
  });
  const db = drizzle(adminPool, { schema });
  const before = await getPublicLegalCenter(db, new Date("2026-09-30T21:59:59.000Z"));
  assert.equal(before.currentDocuments.length, 0);
  assert.equal(before.upcomingDocuments.length, 7);
  assert.equal(before.currentPacks.length, 0);
  assert.equal(before.upcomingPacks.length, 1);
  const at = await getPublicLegalCenter(db, new Date(EXPECTED.effectiveInstant));
  assert.equal(at.currentDocuments.length, 7);
  assert.equal(at.upcomingDocuments.length, 0);
  assert.equal(at.currentPacks.length, 1);
  assert.equal(at.upcomingPacks.length, 0);
  assert.equal(at.currentPacks[0].rootSha256, EXPECTED.root);
  assert.ok(!at.currentDocuments.some((document) => document.title === "Umowa o świadczenie usług i pośrednictwa agencyjnego"));
  const publicJson = JSON.stringify(at);
  assert.ok(!publicJson.includes("drive.google.com"));
  assert.ok(!publicJson.includes("storageReference"));
  assert.ok(!publicJson.includes("manifestJson"));
  assert.ok(!publicJson.includes(EXPECTED.externalPackId));
  assert.ok(!publicJson.includes('"id"'));
  assert.deepEqual(await snapshot("agreement_versions"), agreementBefore);
  assert.deepEqual(await snapshot("partner_agreement_execution_evidence"), evidenceBefore);
  assert.deepEqual(await journal(), journalBefore);
  await assert.rejects(adminPool.query(`UPDATE public.legal_document_versions SET sha256 = $1 WHERE id = (SELECT min(id) FROM public.legal_document_versions)`, ["a".repeat(64)]), /Cannot modify frozen fields/);
  await assert.rejects(adminPool.query(`INSERT INTO public.legal_pack_documents (legal_pack_version_id, legal_document_version_id, ordinal) SELECT p.id, v.id, 9 FROM public.legal_pack_versions p CROSS JOIN public.legal_document_versions v LIMIT 1`), /Cannot insert or move membership into a frozen legal pack/);
  assert.equal(await run(), "ALREADY_PUBLISHED");
  await adminPool.query(`INSERT INTO public.legal_documents (code, slug, title_pl) VALUES ('UNEXPECTED', 'unexpected', 'Unexpected')`);
  await assert.rejects(run(), /BLOCKED_EXISTING_LEGAL_REGISTRY_STATE/);
  assert.deepEqual(await journal(), journalBefore);
});
