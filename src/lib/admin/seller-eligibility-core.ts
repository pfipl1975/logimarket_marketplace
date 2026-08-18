import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import { partners, sellerEligibility } from "@/lib/schema";
import { isCanonicalPositiveInteger } from "./partners-query";

export type CanonicalEligibilityStatus = "pending" | "eligible" | "ineligible" | "suspended";
export type ExpectedEligibilityStatus = "none" | CanonicalEligibilityStatus;

export interface SellerEligibilityInput {
  partnerId: number;
  expectedStatus: ExpectedEligibilityStatus;
  targetStatus: CanonicalEligibilityStatus;
  reason: string | null;
}

export type SellerEligibilityMutationResult =
  | { ok: true; code: "ELIGIBILITY_CREATED"; changed: true }
  | { ok: true; code: "ELIGIBILITY_UPDATED"; changed: true }
  | { ok: true; code: "ELIGIBILITY_UNCHANGED"; changed: false }
  | { ok: false; code: "ELIGIBILITY_INVALID_INPUT" }
  | { ok: false; code: "PARTNER_NOT_FOUND" }
  | { ok: false; code: "ELIGIBILITY_CONFLICT" }
  | { ok: false; code: "ELIGIBILITY_REASON_REQUIRED" }
  | { ok: false; code: "SYSTEM_ERROR" };

export function parseAdminSellerEligibilityInput(rawInput: unknown): { ok: true; data: SellerEligibilityInput } | { ok: false; code: "ELIGIBILITY_INVALID_INPUT" | "ELIGIBILITY_REASON_REQUIRED" } {
  if (!rawInput || typeof rawInput !== "object") {
    return { ok: false, code: "ELIGIBILITY_INVALID_INPUT" };
  }

  const { partnerId, expectedStatus, targetStatus, reason } = rawInput as Record<string, unknown>;

  if (typeof partnerId !== "string" || !isCanonicalPositiveInteger(partnerId)) {
    return { ok: false, code: "ELIGIBILITY_INVALID_INPUT" };
  }

  const parsedPartnerId = parseInt(partnerId, 10);

  if (typeof expectedStatus !== "string" || !["none", "pending", "eligible", "ineligible", "suspended"].includes(expectedStatus)) {
    return { ok: false, code: "ELIGIBILITY_INVALID_INPUT" };
  }

  if (typeof targetStatus !== "string" || !["pending", "eligible", "ineligible", "suspended"].includes(targetStatus)) {
    return { ok: false, code: "ELIGIBILITY_INVALID_INPUT" };
  }

  let normalizedReason: string | null = null;
  
  if (reason !== undefined && reason !== null) {
    if (typeof reason !== "string") {
      return { ok: false, code: "ELIGIBILITY_INVALID_INPUT" };
    }
    normalizedReason = reason.trim();
  }

  if (targetStatus === "suspended") {
    if (!normalizedReason || normalizedReason.length === 0 || normalizedReason.length > 2000) {
      return { ok: false, code: "ELIGIBILITY_REASON_REQUIRED" };
    }
  } else if (targetStatus === "ineligible") {
    if (normalizedReason === "") {
      normalizedReason = null;
    }
    if (normalizedReason && normalizedReason.length > 2000) {
      return { ok: false, code: "ELIGIBILITY_INVALID_INPUT" };
    }
  } else {
    // pending or eligible
    normalizedReason = null;
  }

  return {
    ok: true,
    data: {
      partnerId: parsedPartnerId,
      expectedStatus: expectedStatus as ExpectedEligibilityStatus,
      targetStatus: targetStatus as CanonicalEligibilityStatus,
      reason: normalizedReason,
    }
  };
}

export async function executeSellerEligibilityChange(
  db: NodePgDatabase<typeof schema>,
  input: SellerEligibilityInput
): Promise<SellerEligibilityMutationResult> {
  try {
    return await db.transaction(async (tx) => {
      const partnerRows = await tx
        .select({ id: partners.id })
        .from(partners)
        .where(eq(partners.id, input.partnerId))
        .for("update")
        .limit(1);

      if (partnerRows.length === 0) {
        return { ok: false, code: "PARTNER_NOT_FOUND" };
      }

      const eligibilityRows = await tx
        .select()
        .from(sellerEligibility)
        .where(eq(sellerEligibility.partnerId, input.partnerId))
        .for("update")
        .limit(1);

      const currentStatus = eligibilityRows.length > 0 ? eligibilityRows[0].eligibilityStatus : "none";
      const currentReasonRaw = eligibilityRows.length > 0 ? eligibilityRows[0].reason : null;

      if (currentStatus !== input.expectedStatus) {
        return { ok: false, code: "ELIGIBILITY_CONFLICT" };
      }

      let isUnchanged = false;
      if (currentStatus === input.targetStatus) {
        if (input.targetStatus === "pending" || input.targetStatus === "eligible") {
          if (currentReasonRaw === null) {
            isUnchanged = true;
          }
        } else {
          const normalizedCurrentReason = currentReasonRaw?.trim() || null;
          if (normalizedCurrentReason === input.reason) {
            isUnchanged = true;
          }
        }
      }

      if (isUnchanged) {
        return { ok: true, code: "ELIGIBILITY_UNCHANGED", changed: false };
      }

      if (eligibilityRows.length === 0) {
        await tx.insert(sellerEligibility).values({
          partnerId: input.partnerId,
          eligibilityStatus: input.targetStatus,
          reason: input.reason,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        });
        return { ok: true, code: "ELIGIBILITY_CREATED", changed: true };
      } else {
        await tx
          .update(sellerEligibility)
          .set({
            eligibilityStatus: input.targetStatus,
            reason: input.reason,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(sellerEligibility.partnerId, input.partnerId));
        return { ok: true, code: "ELIGIBILITY_UPDATED", changed: true };
      }
    });
  } catch (err) {
    const errorName = err instanceof Error ? err.name : "UnknownError";
    console.error("executeSellerEligibilityChange system error", { errorName });
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}
