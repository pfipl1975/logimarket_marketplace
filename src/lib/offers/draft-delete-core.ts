import { and, eq, isNull, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/authorization-errors";

export type DraftDeletionInput = {
  offerId: number;
  partnerId: number | null;
  expectedUpdatedAt: string | null;
};

export type DraftDeletionResult =
  | { ok: true; code: "DRAFT_DELETED" }
  | { ok: false; code: "INVALID_INPUT" | "UNAUTHORIZED" | "OFFER_NOT_FOUND" | "OFFER_NOT_DELETABLE" | "OFFER_CONFLICT" | "SYSTEM_ERROR" };

export type DraftDeletionTx = Parameters<Parameters<NodePgDatabase<typeof schema>["transaction"]>[0]>[0];

function positiveCanonicalId(value: unknown): number | null {
  if (typeof value !== "string" || !/^[1-9][0-9]*$/.test(value)) return null;
  const num = Number(value);
  return Number.isSafeInteger(num) && String(num) === value ? num : null;
}

export function parseDraftDeletionInput(raw: unknown, partnerScoped: boolean): DraftDeletionInput | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;
  const offerId = positiveCanonicalId(input.offerId);
  const partnerId = partnerScoped ? positiveCanonicalId(input.partnerId) : null;
  const expectedUpdatedAt = input.expectedUpdatedAt;
  if (!offerId || (partnerScoped && !partnerId)) return null;
  if (expectedUpdatedAt !== null &&
    (typeof expectedUpdatedAt !== "string" || Number.isNaN(Date.parse(expectedUpdatedAt)) ||
      new Date(expectedUpdatedAt).toISOString() !== expectedUpdatedAt)) return null;
  return { offerId, partnerId, expectedUpdatedAt };
}

export function evaluateDraftDeletion(
  current: { publicationStatus: string; publishedAt: Date | null; deletedAt: Date | null; updatedAt: Date | null },
  expectedUpdatedAt: string | null,
): "READY" | "OFFER_NOT_DELETABLE" | "OFFER_CONFLICT" {
  // A returned-to-draft offer with publication history must NEVER be deleted.
  if (current.publicationStatus !== "draft" || current.publishedAt !== null || current.deletedAt !== null) {
    return "OFFER_NOT_DELETABLE";
  }
  const currentMs = current.updatedAt?.getTime() ?? null;
  const expectedMs = expectedUpdatedAt === null ? null : new Date(expectedUpdatedAt).getTime();
  return currentMs === expectedMs ? "READY" : "OFFER_CONFLICT";
}

/**
 * Only the offer row changes. Its media and relational attribute rows retain valid
 * foreign-key references; object storage deletion and retention are separate work.
 * Authorization for a Partner is rechecked under a membership SHARE lock inside
 * the transaction, before locking the offer row.
 */
export async function executeDraftDeletion(
  database: NodePgDatabase<typeof schema>,
  input: DraftDeletionInput,
  authorizePartnerInTx?: (tx: DraftDeletionTx, partnerId: number) => Promise<unknown>,
): Promise<DraftDeletionResult> {
  if (input.partnerId !== null && !authorizePartnerInTx) return { ok: false, code: "UNAUTHORIZED" };
  try {
    return await database.transaction(async (tx) => {
      if (input.partnerId !== null) {
        await authorizePartnerInTx!(tx, input.partnerId);
      }
      const predicates = [
        eq(schema.offers.id, input.offerId),
        ...(input.partnerId !== null ? [eq(schema.offers.partnerId, input.partnerId)] : []),
      ];
      const [current] = await tx.select({
        id: schema.offers.id,
        publicationStatus: schema.offers.publicationStatus,
        publishedAt: schema.offers.publishedAt,
        deletedAt: schema.offers.deletedAt,
        updatedAt: schema.offers.updatedAt,
      }).from(schema.offers).where(and(...predicates)).for("update").limit(1);
      if (!current) return { ok: false as const, code: "OFFER_NOT_FOUND" as const };

      const decision = evaluateDraftDeletion(current, input.expectedUpdatedAt);
      if (decision !== "READY") return { ok: false as const, code: decision };

      const changed = await tx.update(schema.offers).set({
        publicationStatus: "deleted",
        deletedAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
        isActive: false,
      }).where(and(
        ...predicates,
        eq(schema.offers.publicationStatus, "draft"),
        isNull(schema.offers.publishedAt),
        isNull(schema.offers.deletedAt),
      )).returning({ id: schema.offers.id });
      return changed.length === 1
        ? { ok: true as const, code: "DRAFT_DELETED" as const }
        : { ok: false as const, code: "OFFER_CONFLICT" as const };
    });
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return { ok: false, code: "UNAUTHORIZED" };
    }
    console.error("[draft-delete] transaction failed");
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}
