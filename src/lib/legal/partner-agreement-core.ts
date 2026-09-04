import { z } from "zod";
import { eq, and, sql, desc } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@/lib/schema";
import {
  partners,
  agreementVersions,
  partnerAgreementExecutionEvidence,
  partnerAgreementEvidenceInvalidations,
} from "@/lib/schema";

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

export const SHA256_HEX_REGEX = /^[0-9a-f]{64}$/;

export const RegisterPartnerAgreementEvidenceSchema = z.object({
  partnerId: z.number().int().positive("Partner ID must be a positive integer"),
  agreementVersionId: z.number().int().positive("Agreement version ID must be a positive integer"),
  executionMethod: z.enum([
    "platform_documentary_electronic",
    "qualified_electronic_signature",
    "advanced_electronic_signature",
  ]).default("platform_documentary_electronic"),
  signedAt: z.string().datetime({ message: "signedAt must be a valid ISO 8601 datetime string" }),
  signatoryName: z.string().trim().min(1, "Signatory name is required").max(255),
  signatoryRole: z.string().trim().min(1, "Signatory role is required").max(255),
  signatoryEmail: z.string().trim().email("Invalid signatory email").max(255),
  externalPlatform: z.string().trim().min(1, "External platform is required").max(100),
  externalTransactionId: z.string().trim().min(1, "External transaction ID is required").max(255),
  signedPdfSha256: z.string().trim().regex(SHA256_HEX_REGEX, "Must be a 64-character lowercase hexadecimal SHA-256"),
}).strict();

export type RegisterPartnerAgreementEvidenceInput = z.infer<typeof RegisterPartnerAgreementEvidenceSchema>;

export const InvalidatePartnerAgreementEvidenceSchema = z.object({
  executionEvidenceId: z.number().int().positive("Execution evidence ID must be a positive integer"),
  reason: z.string().trim().min(3, "Reason must be at least 3 characters").max(1000),
}).strict();

export type InvalidatePartnerAgreementEvidenceInput = z.infer<typeof InvalidatePartnerAgreementEvidenceSchema>;

// -----------------------------------------------------------------------------
// Return Types
// -----------------------------------------------------------------------------

export type RegisterEvidenceResult =
  | { ok: true; data: { evidenceId: number; recordedAt: string } }
  | {
      ok: false;
      code:
        | "UNAUTHORIZED_ADMIN"
        | "VALIDATION_ERROR"
        | "INVALID_SIGNED_AT_FUTURE"
        | "PARTNER_NOT_FOUND"
        | "AGREEMENT_VERSION_NOT_FOUND"
        | "AGREEMENT_VERSION_NOT_ACTIVE"
        | "INVALID_AGREEMENT_TYPE"
        | "DUPLICATE_EXTERNAL_TRANSACTION"
        | "SYSTEM_ERROR";
      message?: string;
    };

export type InvalidateEvidenceResult =
  | {
      ok: true;
      data: {
        invalidationId: number;
        evidenceId: number;
        invalidatedAt: string;
        invalidatedByAdminUserId: string;
        reason: string;
      };
    }
  | {
      ok: false;
      code:
        | "UNAUTHORIZED_ADMIN"
        | "VALIDATION_ERROR"
        | "EVIDENCE_NOT_FOUND"
        | "ALREADY_INVALIDATED"
        | "SYSTEM_ERROR";
      message?: string;
    };

export interface RecordedEvidenceDto {
  id: number;
  partnerId: number;
  agreementVersionId: number;
  version: string;
  agreementType: string;
  status: string;
  executionMethod: string;
  signedAt: string;
  signatoryName: string;
  signatoryRole: string;
  signatoryEmail: string;
  externalPlatform: string;
  externalTransactionId: string;
  signedPdfSha256: string;
  recordedAt: string;
  recordedByAdminUserId: string;
  isInvalidated: boolean;
  invalidation: {
    reason: string;
    invalidatedAt: string;
    invalidatedByAdminUserId: string;
  } | null;
}

// -----------------------------------------------------------------------------
// Domain Operations
// -----------------------------------------------------------------------------

/**
 * Server-authoritative registration of Partner Agreement execution evidence.
 *
 * Requirements:
 * - Admin authorization context is mandatory and authoritative.
 * - Partner must exist.
 * - Agreement version must exist, be of type PARTNER_AGREEMENT_B2B, and be active.
 * - External transaction must not be claimed by an active (non-invalidated) evidence item.
 * - Evidence row is strictly append-only.
 * - Does NOT mutate seller eligibility, verification, or seller readiness.
 */
export async function registerPartnerAgreementExecutionEvidence<TSchema extends Record<string, unknown>>(
  db: NodePgDatabase<TSchema>,
  rawInput: unknown,
  recordedByAdminUserId: string
): Promise<RegisterEvidenceResult> {
  if (!recordedByAdminUserId || typeof recordedByAdminUserId !== "string" || recordedByAdminUserId.trim().length === 0) {
    return { ok: false, code: "UNAUTHORIZED_ADMIN", message: "Admin actor identifier is required" };
  }

  const parseRes = RegisterPartnerAgreementEvidenceSchema.safeParse(rawInput);
  if (!parseRes.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parseRes.error.issues.map((i) => i.message).join(", "),
    };
  }

  const input = parseRes.data;

  // Validate signedAt not in future (5 min tolerance)
  const signedAtDate = new Date(input.signedAt);
  if (signedAtDate.getTime() > Date.now() + 5 * 60 * 1000) {
    return { ok: false, code: "INVALID_SIGNED_AT_FUTURE", message: "signedAt timestamp cannot be in the future" };
  }

  // Check Partner exists
  const partnerRows = await db
    .select({ id: partners.id })
    .from(partners)
    .where(eq(partners.id, input.partnerId))
    .limit(1);

  if (partnerRows.length === 0) {
    return { ok: false, code: "PARTNER_NOT_FOUND", message: "Partner does not exist" };
  }

  // Check Agreement Version exists and is active
  const versionRows = await db
    .select({
      id: agreementVersions.id,
      agreementType: agreementVersions.agreementType,
      status: agreementVersions.status,
    })
    .from(agreementVersions)
    .where(eq(agreementVersions.id, input.agreementVersionId))
    .limit(1);

  if (versionRows.length === 0) {
    return { ok: false, code: "AGREEMENT_VERSION_NOT_FOUND", message: "Agreement version does not exist" };
  }

  const version = versionRows[0];
  const normalizedType = version.agreementType.toLowerCase();
  if (normalizedType !== "partner_agreement_b2b") {
    return { ok: false, code: "INVALID_AGREEMENT_TYPE", message: "Agreement version is not PARTNER_AGREEMENT_B2B" };
  }

  if (version.status !== "active") {
    return {
      ok: false,
      code: "AGREEMENT_VERSION_NOT_ACTIVE",
      message: `Agreement version status is '${version.status}', must be 'active' to record execution evidence`,
    };
  }

  // Application check for duplicate active external transaction
  const existingActiveTx = await db
    .select({ id: partnerAgreementExecutionEvidence.id })
    .from(partnerAgreementExecutionEvidence)
    .leftJoin(
      partnerAgreementEvidenceInvalidations,
      eq(partnerAgreementEvidenceInvalidations.executionEvidenceId, partnerAgreementExecutionEvidence.id)
    )
    .where(
      and(
        eq(partnerAgreementExecutionEvidence.externalPlatform, input.externalPlatform),
        eq(partnerAgreementExecutionEvidence.externalTransactionId, input.externalTransactionId),
        sql`${partnerAgreementEvidenceInvalidations.id} IS NULL`
      )
    )
    .limit(1);

  if (existingActiveTx.length > 0) {
    return {
      ok: false,
      code: "DUPLICATE_EXTERNAL_TRANSACTION",
      message: "An active evidence registration already exists for this external signing transaction",
    };
  }

  try {
    const insertRes = await db
      .insert(partnerAgreementExecutionEvidence)
      .values({
        partnerId: input.partnerId,
        agreementVersionId: input.agreementVersionId,
        status: "ACCEPTED",
        executionMethod: input.executionMethod,
        signedAt: signedAtDate,
        signatoryName: input.signatoryName,
        signatoryRole: input.signatoryRole,
        signatoryEmail: input.signatoryEmail,
        externalPlatform: input.externalPlatform,
        externalTransactionId: input.externalTransactionId,
        signedPdfSha256: input.signedPdfSha256.toLowerCase(),
        recordedByAdminUserId: recordedByAdminUserId.trim(),
      })
      .returning({
        id: partnerAgreementExecutionEvidence.id,
        recordedAt: partnerAgreementExecutionEvidence.recordedAt,
      });

    return {
      ok: true,
      data: {
        evidenceId: insertRes[0].id,
        recordedAt: insertRes[0].recordedAt.toISOString(),
      },
    };
  } catch (err: unknown) {
    const pgErr = err as { code?: string; message?: string };
    if (pgErr.code === "23505") {
      return {
        ok: false,
        code: "DUPLICATE_EXTERNAL_TRANSACTION",
        message: "An active evidence registration already exists for this external signing transaction",
      };
    }
    if (pgErr.code === "23503") {
      return {
        ok: false,
        code: "PARTNER_NOT_FOUND",
        message: "Referenced partner or agreement version does not exist",
      };
    }
    console.error("registerPartnerAgreementExecutionEvidence error:", err);
    return { ok: false, code: "SYSTEM_ERROR", message: "Failed to register execution evidence" };
  }
}

/**
 * Invalidate a previously registered evidence entry due to administrative/evidentiary error.
 *
 * Requirements:
 * - Evidence row itself is NOT updated or deleted (remains immutable).
 * - Exactly one invalidation per evidence row.
 * - Invalidation record itself is append-only.
 * - Admin actor comes from server session.
 */
export async function invalidatePartnerAgreementExecutionEvidence<TSchema extends Record<string, unknown>>(
  db: NodePgDatabase<TSchema>,
  rawInput: unknown,
  invalidatedByAdminUserId: string
): Promise<InvalidateEvidenceResult> {
  if (!invalidatedByAdminUserId || typeof invalidatedByAdminUserId !== "string" || invalidatedByAdminUserId.trim().length === 0) {
    return { ok: false, code: "UNAUTHORIZED_ADMIN", message: "Admin actor identifier is required" };
  }

  const parseRes = InvalidatePartnerAgreementEvidenceSchema.safeParse(rawInput);
  if (!parseRes.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Invalid invalidation payload: " + parseRes.error.issues.map((i) => i.message).join("; "),
    };
  }

  const { executionEvidenceId: evidenceId, reason } = parseRes.data;

  // Verify that the evidence record exists
  const evidenceRows = await db
    .select({
      id: partnerAgreementExecutionEvidence.id,
      partnerId: partnerAgreementExecutionEvidence.partnerId,
      status: partnerAgreementExecutionEvidence.status,
    })
    .from(partnerAgreementExecutionEvidence)
    .where(eq(partnerAgreementExecutionEvidence.id, evidenceId))
    .limit(1);

  if (evidenceRows.length === 0) {
    return {
      ok: false,
      code: "EVIDENCE_NOT_FOUND",
      message: `Partner agreement execution evidence ${evidenceId} not found`,
    };
  }

  // Check if an invalidation already exists (invalidation is append-only, but only 1 invalidation per evidence)
  const existingInvalidations = await db
    .select({ id: partnerAgreementEvidenceInvalidations.id })
    .from(partnerAgreementEvidenceInvalidations)
    .where(eq(partnerAgreementEvidenceInvalidations.executionEvidenceId, evidenceId))
    .limit(1);

  if (existingInvalidations.length > 0) {
    return {
      ok: false,
      code: "ALREADY_INVALIDATED",
      message: `Partner agreement execution evidence ${evidenceId} is already invalidated`,
    };
  }

  // Insert invalidation record (append-only)
  const insertRows = await db
    .insert(partnerAgreementEvidenceInvalidations)
    .values({
      executionEvidenceId: evidenceId,
      reason,
      invalidatedByAdminUserId,
    })
    .returning({
      id: partnerAgreementEvidenceInvalidations.id,
      executionEvidenceId: partnerAgreementEvidenceInvalidations.executionEvidenceId,
      invalidatedAt: partnerAgreementEvidenceInvalidations.invalidatedAt,
    });

  const inserted = insertRows[0];

  return {
    ok: true,
    data: {
      invalidationId: inserted.id,
      evidenceId: inserted.executionEvidenceId,
      invalidatedAt: inserted.invalidatedAt.toISOString(),
      invalidatedByAdminUserId,
      reason,
    },
  };
}

/**
 * Retrieve execution evidence history for a partner.
 * Distinguishes recorded active evidence from invalidated evidence.
 */
export async function getPartnerAgreementExecutionEvidence<TSchema extends Record<string, unknown>>(
  db: NodePgDatabase<TSchema>,
  partnerId: number
): Promise<RecordedEvidenceDto[]> {
  const rows = await db
    .select({
      id: partnerAgreementExecutionEvidence.id,
      partnerId: partnerAgreementExecutionEvidence.partnerId,
      agreementVersionId: partnerAgreementExecutionEvidence.agreementVersionId,
      version: agreementVersions.version,
      agreementType: agreementVersions.agreementType,
      status: partnerAgreementExecutionEvidence.status,
      executionMethod: partnerAgreementExecutionEvidence.executionMethod,
      signedAt: partnerAgreementExecutionEvidence.signedAt,
      signatoryName: partnerAgreementExecutionEvidence.signatoryName,
      signatoryRole: partnerAgreementExecutionEvidence.signatoryRole,
      signatoryEmail: partnerAgreementExecutionEvidence.signatoryEmail,
      externalPlatform: partnerAgreementExecutionEvidence.externalPlatform,
      externalTransactionId: partnerAgreementExecutionEvidence.externalTransactionId,
      signedPdfSha256: partnerAgreementExecutionEvidence.signedPdfSha256,
      recordedAt: partnerAgreementExecutionEvidence.recordedAt,
      recordedByAdminUserId: partnerAgreementExecutionEvidence.recordedByAdminUserId,
      invalidationId: partnerAgreementEvidenceInvalidations.id,
      invalidationReason: partnerAgreementEvidenceInvalidations.reason,
      invalidatedAt: partnerAgreementEvidenceInvalidations.invalidatedAt,
      invalidatedByAdminUserId: partnerAgreementEvidenceInvalidations.invalidatedByAdminUserId,
    })
    .from(partnerAgreementExecutionEvidence)
    .innerJoin(
      agreementVersions,
      eq(partnerAgreementExecutionEvidence.agreementVersionId, agreementVersions.id)
    )
    .leftJoin(
      partnerAgreementEvidenceInvalidations,
      eq(partnerAgreementEvidenceInvalidations.executionEvidenceId, partnerAgreementExecutionEvidence.id)
    )
    .where(eq(partnerAgreementExecutionEvidence.partnerId, partnerId))
    .orderBy(desc(partnerAgreementExecutionEvidence.recordedAt));

  return rows.map((row) => ({
    id: row.id,
    partnerId: row.partnerId,
    agreementVersionId: row.agreementVersionId,
    version: row.version,
    agreementType: row.agreementType,
    status: row.status,
    executionMethod: row.executionMethod,
    signedAt: row.signedAt.toISOString(),
    signatoryName: row.signatoryName,
    signatoryRole: row.signatoryRole,
    signatoryEmail: row.signatoryEmail,
    externalPlatform: row.externalPlatform,
    externalTransactionId: row.externalTransactionId,
    signedPdfSha256: row.signedPdfSha256,
    recordedAt: row.recordedAt.toISOString(),
    recordedByAdminUserId: row.recordedByAdminUserId,
    isInvalidated: row.invalidationId !== null,
    invalidation:
      row.invalidationId !== null
        ? {
            reason: row.invalidationReason!,
            invalidatedAt: row.invalidatedAt!.toISOString(),
            invalidatedByAdminUserId: row.invalidatedByAdminUserId!,
          }
        : null,
  }));
}

/**
 * Bounded check: returns true if the partner has at least one active (non-invalidated)
 * recorded execution evidence item.
 *
 * Does NOT assert full Seller Readiness.
 */
export async function hasRecordedPartnerAgreementExecutionEvidence<TSchema extends Record<string, unknown>>(
  db: NodePgDatabase<TSchema>,
  partnerId: number
): Promise<boolean> {
  const rows = await db
    .select({ id: partnerAgreementExecutionEvidence.id })
    .from(partnerAgreementExecutionEvidence)
    .leftJoin(
      partnerAgreementEvidenceInvalidations,
      eq(partnerAgreementEvidenceInvalidations.executionEvidenceId, partnerAgreementExecutionEvidence.id)
    )
    .where(
      and(
        eq(partnerAgreementExecutionEvidence.partnerId, partnerId),
        sql`${partnerAgreementEvidenceInvalidations.id} IS NULL`
      )
    )
    .limit(1);

  return rows.length > 0;
}

/**
 * Get active canonical Partner Agreement version if configured.
 */
export async function getActivePartnerAgreementVersion<TSchema extends Record<string, unknown>>(
  db: NodePgDatabase<TSchema>
): Promise<{
  id: number;
  version: string;
  agreementType: string;
  canonicalTemplateHashSha256: string;
  effectiveFrom: string | null;
  publishedAt: string | null;
} | null> {
  const rows = await db
    .select({
      id: agreementVersions.id,
      version: agreementVersions.version,
      agreementType: agreementVersions.agreementType,
      canonicalTemplateHashSha256: agreementVersions.canonicalTemplateHashSha256,
      effectiveFrom: agreementVersions.effectiveFrom,
      publishedAt: agreementVersions.publishedAt,
    })
    .from(agreementVersions)
    .where(
      and(
        eq(agreementVersions.status, "active"),
        sql`(${agreementVersions.agreementType} = 'partner_agreement_b2b' OR ${agreementVersions.agreementType} = 'PARTNER_AGREEMENT_B2B')`
      )
    )
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    version: row.version,
    agreementType: row.agreementType,
    canonicalTemplateHashSha256: row.canonicalTemplateHashSha256,
    effectiveFrom: row.effectiveFrom?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
  };
}
