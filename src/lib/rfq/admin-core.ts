import { eq, sql } from "drizzle-orm";
import { rfqLeads } from "@/lib/schema";
import type { AdminRfqStatusMutation } from "./schema";
import { isRfqStatusTransitionAllowed } from "./workflow";

// Abstract transaction interface to allow easy testing without full DB
export interface RfqMutationTransaction {
  execute<T = any>(query: ReturnType<typeof sql>): Promise<any>;
  update(table: any): any;
}

export type AdminRfqMutationResult =
  | { ok: true; code: "UPDATED" | "UNCHANGED" }
  | { ok: false; code: "NOT_FOUND" | "CONFLICT" | "TRANSITION_NOT_ALLOWED" | "VALIDATION_ERROR" | "SYSTEM_ERROR" };

export async function mutateRfqStatusCore(
  tx: RfqMutationTransaction,
  data: AdminRfqStatusMutation
): Promise<AdminRfqMutationResult> {
  const lockedRows = await tx.execute<{ id: string | number; status: string }>(
    sql`
      SELECT id, status
      FROM ${rfqLeads}
      WHERE id = ${data.rfqId}
      FOR UPDATE
    `
  );

  if (lockedRows.rows.length === 0) {
    return { ok: false as const, code: "NOT_FOUND" as const };
  }

  const currentStatus = lockedRows.rows[0].status as import("@/lib/schema").RfqStatus;

  if (currentStatus === data.targetStatus) {
    return { ok: true as const, code: "UNCHANGED" as const };
  }

  if (currentStatus !== data.expectedStatus) {
    return { ok: false as const, code: "CONFLICT" as const };
  }

  if (!isRfqStatusTransitionAllowed(currentStatus, data.targetStatus)) {
    return { ok: false as const, code: "TRANSITION_NOT_ALLOWED" as const };
  }

  await tx
    .update(rfqLeads)
    .set({ status: data.targetStatus })
    .where(eq(rfqLeads.id, data.rfqId));

  return { ok: true as const, code: "UPDATED" as const };
}
