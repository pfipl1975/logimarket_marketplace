import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import * as schema from "@/lib/schema";
import { querySellerReadiness } from "@/lib/admin/seller-readiness-query";
import { routeSellerOrderToPartnerInTransaction, SELLER_ACCEPTANCE_SLA_MS } from "./seller-order-workflow";

type RecoveryOrder = { status: string; e6RoutedToSellerAt: Date | null };
type RecoveryDecision = {
  decisionStatus: string; expiresAt: Date | null; acceptedAt: Date | null;
  resolvedAt: Date | null; decidedByAuthUserId: string | null; decisionSource: string | null;
};
export type RecoveryStatus = "SAFE_TO_ROUTE" | "ALREADY_ROUTED" | "CONFLICTING_STATE" | "NOT_FOUND" | "NOT_ELIGIBLE" | "SYSTEM_ERROR";

export function assessRoutingRecovery(order: RecoveryOrder, decision: RecoveryDecision | undefined): RecoveryStatus {
  if (order.status !== "submitted") return "NOT_ELIGIBLE";
  if (!decision && order.e6RoutedToSellerAt === null) return "SAFE_TO_ROUTE";
  if (decision && order.e6RoutedToSellerAt && decision.expiresAt &&
      decision.decisionStatus === "pending_seller_review" &&
      decision.acceptedAt === null && decision.resolvedAt === null &&
      decision.decidedByAuthUserId === null && decision.decisionSource === null &&
      decision.expiresAt.getTime() - order.e6RoutedToSellerAt.getTime() === SELLER_ACCEPTANCE_SLA_MS) {
    return "ALREADY_ROUTED";
  }
  return "CONFLICTING_STATE";
}

/** Exact-target recovery. Dry-run is read-only; execution repeats all checks under locks. */
export async function recoverSellerOrderRouting(
  database: NodePgDatabase<typeof schema>,
  marketplaceOrderId: number,
  sellerOrderId: number,
  execute = false
): Promise<{ status: RecoveryStatus; changed: boolean; partnerId?: number }> {
  if (![marketplaceOrderId, sellerOrderId].every(id => Number.isSafeInteger(id) && id > 0)) {
    return { status: "CONFLICTING_STATE", changed: false };
  }
  try {
    return await database.transaction(async tx => {
      if (!execute) await tx.execute(sql`SET TRANSACTION READ ONLY`);
      const orderQuery = tx.select().from(schema.sellerOrders).where(eq(schema.sellerOrders.id, sellerOrderId));
      const [order] = execute ? await orderQuery.for("update") : await orderQuery;
      if (!order) return { status: "NOT_FOUND" as const, changed: false };
      if (order.marketplaceOrderId !== marketplaceOrderId) return { status: "CONFLICTING_STATE" as const, changed: false };
      const decisionQuery = tx.select().from(schema.sellerAcceptanceDecisions).where(eq(schema.sellerAcceptanceDecisions.sellerOrderId, sellerOrderId));
      const [decision] = execute ? await decisionQuery.for("update") : await decisionQuery;
      const status = assessRoutingRecovery(order, decision);
      const identity = { partnerId: order.partnerId, changed: false };
      if (status !== "SAFE_TO_ROUTE" && status !== "ALREADY_ROUTED") return { status, ...identity };
      const proof = await tx.execute<{ canonical: boolean; outbox: number; outboxTotal: number }>(sql`
        SELECT EXISTS (
          SELECT 1 FROM marketplace_orders mo
          WHERE mo.id = ${marketplaceOrderId} AND mo.status = 'checkout_submitted'
            AND EXISTS (SELECT 1 FROM buyer_legal_context_snapshots bl WHERE bl.id = mo.buyer_legal_context_snapshot_id)
            AND EXISTS (SELECT 1 FROM marketplace_order_buyer_invoice_snapshots i WHERE i.marketplace_order_id = mo.id)
            AND EXISTS (SELECT 1 FROM marketplace_order_buyer_contact_snapshots c WHERE c.marketplace_order_id = mo.id)
            AND EXISTS (SELECT 1 FROM seller_order_seller_snapshots ss WHERE ss.seller_order_id = ${sellerOrderId})
            AND EXISTS (SELECT 1 FROM marketplace_order_seller_disclosures sd WHERE sd.marketplace_order_id = mo.id AND sd.partner_id = ${order.partnerId})
            AND EXISTS (SELECT 1 FROM seller_order_items si WHERE si.seller_order_id = ${sellerOrderId})
        ) AS canonical,
        (SELECT count(*)::int FROM notification_outbox_events WHERE seller_order_id = ${sellerOrderId}
          AND event_type = 'seller_order.routed_to_seller') AS outbox,
        (SELECT count(*)::int FROM notification_outbox_events WHERE seller_order_id = ${sellerOrderId}) AS "outboxTotal"
      `);
      const state = proof.rows[0];
      if (!state?.canonical) return { status: "NOT_ELIGIBLE" as const, ...identity };
      if (status === "ALREADY_ROUTED") {
        return { status: state.outbox === 1 && state.outboxTotal === 1 ? status : "CONFLICTING_STATE" as const, ...identity };
      }
      if (state.outboxTotal !== 0) return { status: "CONFLICTING_STATE" as const, ...identity };
      // A stale order must not route to a Seller whose present readiness has been revoked.
      if ((await querySellerReadiness(tx, order.partnerId)).status !== "ready") {
        return { status: "NOT_ELIGIBLE" as const, ...identity };
      }
      if (!execute) return { status, ...identity };
      const routed = await routeSellerOrderToPartnerInTransaction(tx, sellerOrderId);
      if (!routed.ok) throw new Error("RECOVERY_ROUTING_FAILED");
      const [afterOrder] = await tx.select().from(schema.sellerOrders).where(eq(schema.sellerOrders.id, sellerOrderId));
      const [afterDecision] = await tx.select().from(schema.sellerAcceptanceDecisions).where(eq(schema.sellerAcceptanceDecisions.sellerOrderId, sellerOrderId));
      const outbox = await tx.select().from(schema.notificationOutboxEvents).where(eq(schema.notificationOutboxEvents.sellerOrderId, sellerOrderId));
      if (assessRoutingRecovery(afterOrder, afterDecision) !== "ALREADY_ROUTED" ||
          outbox.length !== 1 || outbox[0].eventType !== "seller_order.routed_to_seller") throw new Error("RECOVERY_POSTCHECK_FAILED");
      return { status: "ALREADY_ROUTED" as const, changed: true, partnerId: order.partnerId };
    });
  } catch {
    return { status: "SYSTEM_ERROR", changed: false };
  }
}
