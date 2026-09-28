import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { Pool, type PoolClient } from "pg";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { normalizeProjectRef, RUNTIME_JOURNAL_SCHEMA, RUNTIME_JOURNAL_TABLE, RUNTIME_MIGRATIONS_FOLDER } from "./runtime-migration-contract";
import { validateAppliedMigrationPrefix } from "./runtime-migration-journal";
import { classifyRuntimeTarget, fetchLiveSchemaMetadata } from "./verify-runtime-schema-fingerprint";
import {
  CORE_LEGAL_PACK_V1_DOCUMENTS,
  CORE_LEGAL_PACK_V1_EFFECTIVE_FROM,
  CORE_LEGAL_PACK_V1_MANIFEST,
  CORE_LEGAL_PACK_V1_REGISTRY_CODE,
  CORE_LEGAL_PACK_V1_ROOT_SHA256,
} from "./core-legal-pack-v1-data";

export const LEGAL_PUBLICATION_PRODUCTION_REF = "tpjsiutclowwaxlopemn";
export const LEGAL_PUBLICATION_FORBIDDEN_REF = "oczllhpiicrngbcbxndu";
export const LEGAL_PUBLICATION_AUTHORIZATION = "AUTHORIZED_PROD_CORE_LEGAL_PACK_V1_PUBLICATION";

type ManifestDocument = (typeof CORE_LEGAL_PACK_V1_MANIFEST.payload.documents)[number];
type RegistryCounts = { documents: number; versions: number; packs: number; memberships: number };
type JournalRow = { hash: string; created_at: string | number };
type DocumentRow = { id: number; code: string; slug: string; titlePl: string; documentType: string };
type VersionRow = {
  id: number; code: string; version: string; language: string; status: string;
  effectiveFrom: Date | null; effectiveUntil: Date | null; fileName: string | null;
  mimeType: string | null; storageReference: string | null; sha256: string | null;
  fileSizeBytes: string | number | null; activatedAt: Date | null;
};
type PackRow = {
  id: number; code: string; version: string; language: string; status: string;
  effectiveFrom: Date | null; effectiveUntil: Date | null; hashAlgorithm: string;
  canonicalizationScheme: string; rootSha256: string | null; manifestJson: unknown;
  activatedAt: Date | null;
};
type MembershipRow = { code: string; ordinal: number; acceptanceRequired: boolean };

export type PublicationResult = "PUBLISHED" | "ALREADY_PUBLISHED";
export type PublicationOptions = {
  // CI only: the CLI never supplies an alternate pool or failure hook.
  poolFactory?: (connectionString: string) => Pool;
  afterMembershipInserted?: (client: PoolClient) => Promise<void>;
};

function blocked(reason: string): never {
  throw new Error(`BLOCKED_${reason}`);
}

export function verifyCoreLegalPackPublicationTarget(env: Record<string, string | undefined>): string {
  const url = env.DATABASE_URL;
  if (!url) blocked("DATABASE_URL_MISSING");
  if (env.LEGAL_PUBLICATION_TARGET !== "production") blocked("TARGET_NOT_PRODUCTION");
  if (env.LEGAL_PUBLICATION_EXPECTED_PROJECT_REF !== LEGAL_PUBLICATION_PRODUCTION_REF) blocked("EXPECTED_REF_INVALID");
  if (env.LEGAL_PUBLICATION_FORBIDDEN_PROJECT_REF !== LEGAL_PUBLICATION_FORBIDDEN_REF) blocked("FORBIDDEN_REF_INVALID");
  const actual = normalizeProjectRef(url);
  if (!actual) blocked("DATABASE_REF_UNPARSEABLE");
  if (actual === LEGAL_PUBLICATION_FORBIDDEN_REF) blocked("FORBIDDEN_DATABASE_TARGET");
  if (actual !== LEGAL_PUBLICATION_PRODUCTION_REF) blocked("DATABASE_REF_MISMATCH");
  if (env.LEGAL_PUBLICATION_WRITE_AUTHORIZATION !== LEGAL_PUBLICATION_AUTHORIZATION) blocked("PUBLICATION_AUTHORIZATION_INVALID");
  return url;
}

function verifyFrozenSource(): void {
  const manifest = CORE_LEGAL_PACK_V1_MANIFEST;
  if (
    manifest.manifest_format !== "LM_LEGAL_PACK_MANIFEST" ||
    manifest.manifest_format_version !== "1.0" ||
    manifest.payload.pack_id !== "LM-PARTNER-LEGAL-PACK" ||
    CORE_LEGAL_PACK_V1_REGISTRY_CODE !== "CORE_PARTNER_LEGAL_PACK" ||
    manifest.payload.pack_version !== "1.0" ||
    manifest.payload.language !== "pl" ||
    manifest.payload.effective_from !== "2026-10-01" ||
    CORE_LEGAL_PACK_V1_EFFECTIVE_FROM !== "2026-09-30T22:00:00.000Z" ||
    manifest.integrity.hash_algorithm !== "SHA-256" ||
    manifest.integrity.canonicalization !== "RFC8785-JCS" ||
    manifest.integrity.hash_scope !== "UTF8(JCS(payload))" ||
    manifest.integrity.root_hash_sha256 !== CORE_LEGAL_PACK_V1_ROOT_SHA256 ||
    manifest.payload.documents.length !== 8 || CORE_LEGAL_PACK_V1_DOCUMENTS.length !== 8
  ) blocked("FROZEN_SOURCE_MISMATCH");
  const seen = new Set<string>();
  for (let index = 0; index < 8; index++) {
    const document = manifest.payload.documents[index];
    const mapping = CORE_LEGAL_PACK_V1_DOCUMENTS[index];
    if (
      seen.has(document.document_code) || document.ordinal !== index + 1 ||
      document.document_code !== mapping.code || document.version !== "1.0" ||
      document.effective_from !== "2026-10-01" || document.mime_type !== "application/pdf" ||
      !/^[0-9a-f]{64}$/.test(document.sha256) || document.byte_length <= 0 ||
      !/^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]+\/view\?usp=drivesdk$/.test(mapping.storageReference) ||
      (index === 0 ? mapping.documentType !== "partner_legal_pack" : mapping.documentType !== "public_legal") ||
      (index === 0 ? document.layers.includes("PUBLIC_LEGAL") : !document.layers.includes("PUBLIC_LEGAL"))
    ) blocked("FROZEN_SOURCE_MISMATCH");
    seen.add(document.document_code);
  }
}

function readCanonicalJournal() {
  const folder = path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER);
  const journal = JSON.parse(fs.readFileSync(path.join(folder, "meta", "_journal.json"), "utf8")) as {
    entries: { idx: number; tag: string; when: number }[];
  };
  const migrations = readMigrationFiles({ migrationsFolder: folder });
  if (journal.entries.length !== 20 || migrations.length !== 20) blocked("DISK_JOURNAL_NOT_20");
  for (let index = 0; index < 20; index++) {
    if (
      journal.entries[index].idx !== index ||
      !journal.entries[index].tag.startsWith(String(index).padStart(4, "0") + "_") ||
      journal.entries[index].when !== migrations[index].folderMillis
    ) blocked("DISK_JOURNAL_INVALID");
  }
  const getBuffer = (tag: string) => fs.readFileSync(path.join(folder, `${tag}.sql`));
  return { journal, migrations, getBuffer };
}

async function readJournal(client: PoolClient): Promise<JournalRow[]> {
  const result = await client.query<JournalRow>(
    `SELECT hash, created_at FROM ${RUNTIME_JOURNAL_SCHEMA}.${RUNTIME_JOURNAL_TABLE} ORDER BY created_at ASC`,
  );
  return result.rows;
}

async function readCounts(client: PoolClient): Promise<RegistryCounts> {
  const result = await client.query<{ documents: string; versions: string; packs: string; memberships: string }>(
    `SELECT (SELECT count(*) FROM public.legal_documents) AS documents,
            (SELECT count(*) FROM public.legal_document_versions) AS versions,
            (SELECT count(*) FROM public.legal_pack_versions) AS packs,
            (SELECT count(*) FROM public.legal_pack_documents) AS memberships`,
  );
  const row = result.rows[0];
  return { documents: Number(row.documents), versions: Number(row.versions), packs: Number(row.packs), memberships: Number(row.memberships) };
}

function sameInstant(value: Date | null): boolean {
  return value instanceof Date && value.toISOString() === CORE_LEGAL_PACK_V1_EFFECTIVE_FROM;
}

async function assertExactPublishedRegistry(client: PoolClient): Promise<void> {
  const counts = await readCounts(client);
  if (!isDeepStrictEqual(counts, { documents: 8, versions: 8, packs: 1, memberships: 8 })) blocked("EXISTING_LEGAL_REGISTRY_STATE");
  const documents = (await client.query<DocumentRow>(
    `SELECT id, code, slug, title_pl AS "titlePl", document_type AS "documentType" FROM public.legal_documents ORDER BY code`,
  )).rows;
  const versions = (await client.query<VersionRow>(
    `SELECT v.id, d.code, v.version, v.language, v.status, v.effective_from AS "effectiveFrom",
            v.effective_until AS "effectiveUntil", v.file_name AS "fileName", v.mime_type AS "mimeType",
            v.storage_reference AS "storageReference", v.sha256, v.file_size_bytes AS "fileSizeBytes",
            v.activated_at AS "activatedAt"
       FROM public.legal_document_versions v JOIN public.legal_documents d ON d.id = v.legal_document_id ORDER BY d.code`,
  )).rows;
  const packs = (await client.query<PackRow>(
    `SELECT id, code, version, language, status, effective_from AS "effectiveFrom",
            effective_until AS "effectiveUntil", hash_algorithm AS "hashAlgorithm",
            canonicalization_scheme AS "canonicalizationScheme", root_sha256 AS "rootSha256",
            manifest_json AS "manifestJson", activated_at AS "activatedAt"
       FROM public.legal_pack_versions`,
  )).rows;
  const memberships = (await client.query<MembershipRow>(
    `SELECT d.code, m.ordinal, m.acceptance_required AS "acceptanceRequired"
       FROM public.legal_pack_documents m
       JOIN public.legal_pack_versions p ON p.id = m.legal_pack_version_id
       JOIN public.legal_document_versions v ON v.id = m.legal_document_version_id
       JOIN public.legal_documents d ON d.id = v.legal_document_id
      WHERE p.code = $1 ORDER BY m.ordinal`,
    [CORE_LEGAL_PACK_V1_REGISTRY_CODE],
  )).rows;

  for (let index = 0; index < 8; index++) {
    const source = CORE_LEGAL_PACK_V1_MANIFEST.payload.documents[index];
    const mapping = CORE_LEGAL_PACK_V1_DOCUMENTS[index];
    const document = documents.find((row) => row.code === source.document_code);
    const version = versions.find((row) => row.code === source.document_code);
    const membership = memberships[index];
    if (
      !document || document.slug !== mapping.slug || document.titlePl !== source.title ||
      document.documentType !== mapping.documentType ||
      !version || version.version !== source.version || version.language !== "pl" ||
      version.status !== "active" || !sameInstant(version.effectiveFrom) ||
      version.effectiveUntil !== null || version.fileName !== source.file_name ||
      version.mimeType !== source.mime_type || version.storageReference !== mapping.storageReference ||
      version.sha256 !== source.sha256 || Number(version.fileSizeBytes) !== source.byte_length ||
      !(version.activatedAt instanceof Date) ||
      !membership || membership.code !== source.document_code ||
      membership.ordinal !== source.ordinal || membership.acceptanceRequired !== source.acceptance_required
    ) blocked("EXISTING_LEGAL_REGISTRY_STATE");
  }
  const pack = packs[0];
  if (
    pack.code !== CORE_LEGAL_PACK_V1_REGISTRY_CODE || pack.version !== "1.0" ||
    pack.language !== "pl" || pack.status !== "active" || !sameInstant(pack.effectiveFrom) ||
    pack.effectiveUntil !== null || pack.rootSha256 !== CORE_LEGAL_PACK_V1_ROOT_SHA256 ||
    pack.hashAlgorithm !== "sha256" || pack.canonicalizationScheme !== "RFC8785-JCS" ||
    !(pack.activatedAt instanceof Date) || !isDeepStrictEqual(pack.manifestJson, CORE_LEGAL_PACK_V1_MANIFEST)
  ) blocked("EXISTING_LEGAL_REGISTRY_STATE");
}

async function insertDocument(client: PoolClient, source: ManifestDocument, mapping: (typeof CORE_LEGAL_PACK_V1_DOCUMENTS)[number]): Promise<number> {
  const document = await client.query<{ id: number }>(
    `INSERT INTO public.legal_documents (code, slug, title_pl, document_type)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [source.document_code, mapping.slug, source.title, mapping.documentType],
  );
  return document.rows[0].id;
}

async function insertVersion(client: PoolClient, documentId: number, source: ManifestDocument, mapping: (typeof CORE_LEGAL_PACK_V1_DOCUMENTS)[number], effectiveFrom: Date): Promise<number> {
  const version = await client.query<{ id: number }>(
    `INSERT INTO public.legal_document_versions
       (legal_document_id, version, language, status, effective_from, file_name, mime_type, storage_reference, sha256, file_size_bytes)
     VALUES ($1, $2, 'pl', 'draft', $3, $4, $5, $6, $7, $8) RETURNING id`,
    [documentId, source.version, effectiveFrom, source.file_name, source.mime_type,
      mapping.storageReference, source.sha256, source.byte_length],
  );
  return version.rows[0].id;
}

export async function publishCoreLegalPackV1(env: Record<string, string | undefined>, options: PublicationOptions = {}): Promise<PublicationResult> {
  const url = verifyCoreLegalPackPublicationTarget(env);
  verifyFrozenSource();
  const { journal, migrations, getBuffer } = readCanonicalJournal();
  const pool = options.poolFactory?.(url) ?? new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 10_000 });
  try {
    const client = await pool.connect();
    let inTransaction = false;
    try {
      await client.query("BEGIN");
      inTransaction = true;
      await client.query("SET LOCAL lock_timeout = '10s'");
      await client.query("SELECT pg_advisory_xact_lock(716987210201::bigint)");

      const before = await fetchLiveSchemaMetadata(client);
      const state = classifyRuntimeTarget(before.fingerprint, before.publicTables, before.security).state;
      if (state !== "EXACT_EXISTING_POST_0019") blocked(`PHYSICAL_STATE_${state}`);
      await client.query("LOCK TABLE public.legal_documents, public.legal_document_versions, public.legal_pack_versions, public.legal_pack_documents IN SHARE ROW EXCLUSIVE MODE");
      const applied = await readJournal(client);
      if (applied.length !== 20) blocked("RUNTIME_JOURNAL_NOT_20");
      try {
        validateAppliedMigrationPrefix("production", state, journal, migrations, applied, getBuffer);
      } catch {
        blocked("RUNTIME_JOURNAL_NONCANONICAL");
      }

      const counts = await readCounts(client);
      if (Object.values(counts).some((count) => count !== 0)) {
        await assertExactPublishedRegistry(client);
        await client.query("ROLLBACK");
        inTransaction = false;
        return "ALREADY_PUBLISHED";
      }

      const effectiveFrom = new Date(CORE_LEGAL_PACK_V1_EFFECTIVE_FROM);
      const documentIds: number[] = [];
      const versionIds: number[] = [];
      for (let index = 0; index < 8; index++) {
        documentIds.push(await insertDocument(client, CORE_LEGAL_PACK_V1_MANIFEST.payload.documents[index], CORE_LEGAL_PACK_V1_DOCUMENTS[index]));
      }
      for (let index = 0; index < 8; index++) {
        versionIds.push(await insertVersion(client, documentIds[index], CORE_LEGAL_PACK_V1_MANIFEST.payload.documents[index], CORE_LEGAL_PACK_V1_DOCUMENTS[index], effectiveFrom));
      }
      const pack = await client.query<{ id: number }>(
        `INSERT INTO public.legal_pack_versions
           (code, version, language, status, effective_from, hash_algorithm, canonicalization_scheme, root_sha256, manifest_json)
         VALUES ($1, '1.0', 'pl', 'draft', $2, 'sha256', 'RFC8785-JCS', $3, $4::jsonb) RETURNING id`,
        [CORE_LEGAL_PACK_V1_REGISTRY_CODE, effectiveFrom, CORE_LEGAL_PACK_V1_ROOT_SHA256, JSON.stringify(CORE_LEGAL_PACK_V1_MANIFEST)],
      );
      const packId = pack.rows[0].id;
      for (let index = 0; index < 8; index++) {
        const source = CORE_LEGAL_PACK_V1_MANIFEST.payload.documents[index];
        await client.query(
          `INSERT INTO public.legal_pack_documents
             (legal_pack_version_id, legal_document_version_id, ordinal, acceptance_required)
           VALUES ($1, $2, $3, $4)`,
          [packId, versionIds[index], source.ordinal, source.acceptance_required],
        );
      }
      await options.afterMembershipInserted?.(client);
      const activated = await client.query(
        `UPDATE public.legal_document_versions SET status = 'active', activated_at = now()
          WHERE id = ANY($1::integer[]) AND status = 'draft'`,
        [versionIds],
      );
      if (activated.rowCount !== 8) blocked("DOCUMENT_ACTIVATION_COUNT");
      const activePack = await client.query(
        `UPDATE public.legal_pack_versions SET status = 'active', activated_at = now()
          WHERE id = $1 AND status = 'draft'`,
        [packId],
      );
      if (activePack.rowCount !== 1) blocked("PACK_ACTIVATION_COUNT");

      await assertExactPublishedRegistry(client);
      const after = await fetchLiveSchemaMetadata(client);
      if (
        classifyRuntimeTarget(after.fingerprint, after.publicTables, after.security).state !== "EXACT_EXISTING_POST_0019" ||
        !isDeepStrictEqual(before, after) || !isDeepStrictEqual(applied, await readJournal(client))
      ) blocked("POSTCONDITION_SCHEMA_OR_JOURNAL_CHANGED");
      await client.query("COMMIT");
      inTransaction = false;
      return "PUBLISHED";
    } catch (error) {
      if (inTransaction) await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  publishCoreLegalPackV1(process.env)
    .then((result) => console.log(`CORE_LEGAL_PACK_V1_PUBLICATION=${result}`))
    .catch((error: unknown) => {
      console.error(error instanceof Error && error.message.startsWith("BLOCKED_") ? error.message : "BLOCKED_PUBLICATION_FAILED");
      process.exitCode = 1;
    });
}
