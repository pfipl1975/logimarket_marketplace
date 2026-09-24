import { z } from "zod";
import { agreementVersions } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export const CreateDraftSchema = z.object({
  version: z.string()
    .trim()
    .max(50)
    .regex(/^v\d+\.\d+$/, "Version must be in format vX.Y"),
  canonicalTemplateHashSha256: z.string().trim()
    .regex(/^[a-fA-F0-9]{64}$/, "Must be exactly 64 hex characters")
}).strict();

export const ActivateSchema = z.object({
  agreementVersionId: z.number().int().positive().safe()
}).strict();

export type CreateAgreementVersionResult =
  | { type: 'AGREEMENT_VERSION_CREATED'; versionId: number }
  | { type: 'INVALID_INPUT'; issues: unknown }
  | { type: 'VERSION_ALREADY_EXISTS' }
  | { type: 'TEMPLATE_HASH_ALREADY_EXISTS' }
  | { type: 'SYSTEM_ERROR' };

export type ActivateAgreementVersionResult =
  | { type: 'AGREEMENT_VERSION_ACTIVATED' }
  | { type: 'INVALID_INPUT'; issues: unknown }
  | { type: 'AGREEMENT_VERSION_NOT_FOUND' }
  | { type: 'INVALID_AGREEMENT_TYPE' }
  | { type: 'AGREEMENT_VERSION_NOT_DRAFT' }
  | { type: 'ACTIVE_VERSION_ALREADY_EXISTS' }
  | { type: 'SYSTEM_ERROR' };

// type for generic transaction executors
type TransactionExecutor = Parameters<Parameters<NodePgDatabase<Record<string, unknown>>["transaction"]>[0]>[0];

function getPostgresErrorMetadata(error: unknown): { code?: string; constraint?: string } {
  if (error && typeof error === "object") {
    // direct error
    if ("code" in error) {
      return {
        code: String((error as { code: unknown }).code),
        constraint: "constraint" in error ? String((error as { constraint: unknown }).constraint) : undefined
      };
    }
    // wrapped error via cause
    if ("cause" in error && error.cause && typeof error.cause === "object" && "code" in error.cause) {
      return {
        code: String((error.cause as { code: unknown }).code),
        constraint: "constraint" in error.cause ? String((error.cause as { constraint: unknown }).constraint) : undefined
      };
    }
  }
  return {};
}

export async function createAgreementVersionCore(db: NodePgDatabase<Record<string, unknown>> | TransactionExecutor, input: z.infer<typeof CreateDraftSchema>): Promise<CreateAgreementVersionResult> {
  const parsed = CreateDraftSchema.safeParse(input);
  if (!parsed.success) {
    return { type: 'INVALID_INPUT', issues: parsed.error.format() };
  }

  const { version, canonicalTemplateHashSha256 } = parsed.data;
  const hashLowerCase = canonicalTemplateHashSha256.toLowerCase();

  try {
    const [inserted] = await db.insert(agreementVersions).values({
      agreementType: "partner_agreement_b2b",
      version,
      canonicalTemplateHashSha256: hashLowerCase,
      status: "draft",
      effectiveFrom: null,
      publishedAt: null,
      effectiveTo: null,
    }).returning({ id: agreementVersions.id });

    if (!inserted) {
      return { type: 'SYSTEM_ERROR' };
    }

    return { type: 'AGREEMENT_VERSION_CREATED', versionId: inserted.id };
  } catch (error) {
    const { code, constraint } = getPostgresErrorMetadata(error);
    if (code === "23505") {
      if (constraint === "uq_agreement_versions_type_version") {
        return { type: 'VERSION_ALREADY_EXISTS' };
      }
      if (constraint === "uq_agreement_versions_hash") {
        return { type: 'TEMPLATE_HASH_ALREADY_EXISTS' };
      }
      return { type: 'SYSTEM_ERROR' };
    }
    return { type: 'SYSTEM_ERROR' };
  }
}

export async function activateAgreementVersionCore(db: NodePgDatabase<Record<string, unknown>>, input: z.infer<typeof ActivateSchema>): Promise<ActivateAgreementVersionResult> {
  const parsed = ActivateSchema.safeParse(input);
  if (!parsed.success) {
    return { type: 'INVALID_INPUT', issues: parsed.error.format() };
  }

  const { agreementVersionId } = parsed.data;

  try {
    return await db.transaction(async (tx) => {
      // 1. Transaction-scoped advisory lock for global lifecycle per agreement_type
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('agreement_versions'), hashtext('partner_agreement_b2b'))`);

      // 2. Select target version FOR UPDATE
      const [target] = await tx
        .select()
        .from(agreementVersions)
        .where(eq(agreementVersions.id, agreementVersionId))
        .for("update");

      if (!target) {
        return { type: 'AGREEMENT_VERSION_NOT_FOUND' };
      }

      if (target.agreementType !== "partner_agreement_b2b") {
        return { type: 'INVALID_AGREEMENT_TYPE' };
      }

      if (target.status !== "draft") {
        return { type: 'AGREEMENT_VERSION_NOT_DRAFT' };
      }

      // 3. Re-check for any active versions in this transaction
      const activeVersions = await tx
        .select({ id: agreementVersions.id })
        .from(agreementVersions)
        .where(
          and(
            eq(agreementVersions.agreementType, "partner_agreement_b2b"),
            eq(agreementVersions.status, "active")
          )
        );

      if (activeVersions.length > 0) {
        return { type: 'ACTIVE_VERSION_ALREADY_EXISTS' };
      }

      // 4. Update the target to active
      await tx
        .update(agreementVersions)
        .set({
          status: "active",
          effectiveFrom: sql`CURRENT_TIMESTAMP`,
          publishedAt: sql`CURRENT_TIMESTAMP`,
          effectiveTo: null,
        })
        .where(eq(agreementVersions.id, agreementVersionId));

      return { type: 'AGREEMENT_VERSION_ACTIVATED' };
    });
  } catch (error) {
    const { code, constraint } = getPostgresErrorMetadata(error);
    if (code === "23505") {
      if (constraint === "idx_agreement_versions_single_active") {
        return { type: 'ACTIVE_VERSION_ALREADY_EXISTS' };
      }
      return { type: 'SYSTEM_ERROR' };
    }
    return { type: 'SYSTEM_ERROR' };
  }
}
