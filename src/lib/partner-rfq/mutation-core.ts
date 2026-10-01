import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { rfqLeads } from "@/lib/schema";
import { AdminRfqStatusMutationSchema } from "@/lib/rfq/schema";
import type { RfqMutationTransaction } from "@/lib/rfq/admin-core";
import { isRfqStatusTransitionAllowed } from "@/lib/rfq/workflow";
import { isRfqStatus } from "./query";

export const PartnerRfqMutationSchema = AdminRfqStatusMutationSchema.extend({ partnerId: z.number().int().positive().safe() });
export type PartnerRfqMutation = z.infer<typeof PartnerRfqMutationSchema>;
export type PartnerRfqMutationResult =
  | { ok: true; code: "UPDATED" | "UNCHANGED" }
  | { ok: false; code: "NOT_FOUND" | "CONFLICT" | "TRANSITION_NOT_ALLOWED" | "FORBIDDEN" | "VALIDATION_ERROR" | "SYSTEM_ERROR" };

export async function mutatePartnerRfqStatusCore(
  tx: RfqMutationTransaction,
  data: PartnerRfqMutation,
  authorize: (partnerId: number) => Promise<unknown>,
): Promise<PartnerRfqMutationResult> {
  // Membership is checked and locked on the same tx before any lead lookup.
  await authorize(data.partnerId);
  const rows = await tx.execute(sql`
    SELECT id, status FROM ${rfqLeads}
    WHERE id = ${data.rfqId} AND partner_id = ${data.partnerId}
    FOR UPDATE
  `);
  if (rows.rows.length === 0) return { ok: false, code: "NOT_FOUND" };
  if (rows.rows.length !== 1 || !isRfqStatus(rows.rows[0].status)) return { ok: false, code: "SYSTEM_ERROR" };
  const current = rows.rows[0].status;
  if (current === data.targetStatus) return { ok: true, code: "UNCHANGED" };
  if (current !== data.expectedStatus) return { ok: false, code: "CONFLICT" };
  if (!isRfqStatusTransitionAllowed(current, data.targetStatus)) return { ok: false, code: "TRANSITION_NOT_ALLOWED" };
  await tx.update(rfqLeads).set({ status: data.targetStatus })
    .where(and(eq(rfqLeads.id, data.rfqId), eq(rfqLeads.partnerId, data.partnerId)));
  return { ok: true, code: "UPDATED" };
}
