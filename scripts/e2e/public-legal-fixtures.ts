import type { PoolClient } from "pg";
import manifest from "../database/core-legal-pack-v1-manifest.json";
import { PUBLIC_LEGAL_DOCUMENTS, PUBLIC_CORE_LEGAL_EFFECTIVE_INSTANT } from "../../src/lib/legal/public-legal-documents";

/** Used only by the disposable PostgreSQL Browser E2E setup. */
export async function insertPublicLegalFixtures(client: PoolClient) {
  const versionIds: number[] = [];

  for (const document of manifest.payload.documents) {
    const publicDelivery = PUBLIC_LEGAL_DOCUMENTS.find((item) => item.code === document.document_code);
    const isPartnerAgreement = document.document_code === "PARTNER_AGREEMENT";
    if (!isPartnerAgreement && !publicDelivery) throw new Error(`Unmapped public legal fixture: ${document.document_code}`);
    const slug = isPartnerAgreement ? "partner-agreement" : publicDelivery!.slug;
    const type = isPartnerAgreement ? "partner_legal_pack" : "public_legal";
    const insertedDocument = await client.query<{ id: number }>(
      `INSERT INTO legal_documents (code, slug, title_pl, document_type)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [document.document_code, slug, document.title, type],
    );
    const insertedVersion = await client.query<{ id: number }>(
      `INSERT INTO legal_document_versions
       (legal_document_id, version, language, status, effective_from, file_name,
        mime_type, storage_reference, sha256, file_size_bytes)
       VALUES ($1, $2, 'pl', 'draft', $3, $4, $5, $6, $7, $8) RETURNING id`,
      [insertedDocument.rows[0].id, document.version, PUBLIC_CORE_LEGAL_EFFECTIVE_INSTANT,
        document.file_name, document.mime_type, `fixture://private/${document.document_code}`,
        document.sha256, document.byte_length],
    );
    versionIds.push(insertedVersion.rows[0].id);
  }

  const pack = await client.query<{ id: number }>(
    `INSERT INTO legal_pack_versions
     (code, version, language, status, effective_from, hash_algorithm,
      canonicalization_scheme, root_sha256, manifest_json)
     VALUES ($1, $2, 'pl', 'draft', $3, 'sha256', 'RFC8785-JCS', $4, $5::jsonb) RETURNING id`,
    ["CORE_PARTNER_LEGAL_PACK", manifest.payload.pack_version, PUBLIC_CORE_LEGAL_EFFECTIVE_INSTANT,
      manifest.integrity.root_hash_sha256, JSON.stringify(manifest)],
  );

  for (const [index, document] of manifest.payload.documents.entries()) {
    await client.query(
      `INSERT INTO legal_pack_documents
       (legal_pack_version_id, legal_document_version_id, ordinal, acceptance_required)
       VALUES ($1, $2, $3, $4)`,
      [pack.rows[0].id, versionIds[index], document.ordinal, document.acceptance_required],
    );
  }

  await client.query(
    `UPDATE legal_document_versions SET status = 'active', activated_at = CURRENT_TIMESTAMP
     WHERE id = ANY($1::integer[])`,
    [versionIds],
  );
  await client.query(
    `UPDATE legal_pack_versions SET status = 'active', activated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [pack.rows[0].id],
  );
}
