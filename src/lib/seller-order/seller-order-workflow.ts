import { db } from "@/lib/db";
import { sellerOrders, sellerAcceptanceDecisions } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { requirePartnerOrderDecisionAuthority } from "@/lib/auth/partner-membership";

export type RouteSellerOrderResult =
  | { ok: true }
  | { ok: false; code: "SELLER_ORDER_NOT_FOUND" }
  | { ok: false; code: "SELLER_ORDER_NOT_ELIGIBLE" }
  | { ok: false; code: "SYSTEM_ERROR" };

export async function routeSellerOrderToPartner(sellerOrderId: number): Promise<RouteSellerOrderResult> {
  try {
    return await db.transaction(async (tx) => {
      // 1. Lock SellerOrder
      const [order] = await tx
        .select()
        .from(sellerOrders)
        .where(eq(sellerOrders.id, sellerOrderId))
        .for("update");

      if (!order) {
        return { ok: false, code: "SELLER_ORDER_NOT_FOUND" };
      }

      if (order.status !== "submitted") {
        return { ok: false, code: "SELLER_ORDER_NOT_ELIGIBLE" };
      }

      // Check existing decision row
      const [existingDecision] = await tx
        .select()
        .from(sellerAcceptanceDecisions)
        .where(eq(sellerAcceptanceDecisions.sellerOrderId, sellerOrderId))
        .for("update");

      if (existingDecision) {
        if (existingDecision.decisionStatus !== "pending_seller_review") {
            return { ok: false, code: "SELLER_ORDER_NOT_ELIGIBLE" };
        }
        return { ok: true };
      }

      await tx.insert(sellerAcceptanceDecisions).values({
        sellerOrderId,
        decisionStatus: "pending_seller_review",
      });

      await tx.update(sellerOrders)
        .set({
           e6RoutedToSellerAt: sql`now()`,
           updatedAt: sql`now()`
        })
        .where(eq(sellerOrders.id, sellerOrderId));

      return { ok: true };
    });
  } catch {
    console.error("routeSellerOrderToPartner failed");
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}

export type AcceptRejectResult =
  | { ok: true }
  | { ok: false; code: "SELLER_ORDER_NOT_FOUND" }
  | { ok: false; code: "SELLER_ORDER_NOT_ROUTED" }
  | { ok: false; code: "SELLER_ORDER_ALREADY_ACCEPTED" }
  | { ok: false; code: "SELLER_ORDER_ALREADY_REJECTED" }
  | { ok: false; code: "SELLER_ORDER_DECISION_CONFLICT" }
  | { ok: false; code: "SELLER_ORDER_NOT_ELIGIBLE" }
  | { ok: false; code: "UNAUTHORIZED" }
  | { ok: false; code: "FORBIDDEN" }
  | { ok: false; code: "SYSTEM_ERROR" };

export async function acceptSellerOrder(sellerOrderId: number): Promise<AcceptRejectResult> {
  try {
    return await db.transaction(async (tx) => {
      // 1. Lock seller order first (Canonical Lock Order)
      const [order] = await tx
        .select()
        .from(sellerOrders)
        .where(eq(sellerOrders.id, sellerOrderId))
        .for("update");

      if (!order) {
        return { ok: false, code: "SELLER_ORDER_NOT_FOUND" };
      }

      let identity;
      try {
        identity = await requirePartnerOrderDecisionAuthority(order.partnerId);
      } catch {
        return { ok: false, code: "FORBIDDEN" };
      }

      // 2. Lock decision second
      const [decision] = await tx
        .select()
        .from(sellerAcceptanceDecisions)
        .where(eq(sellerAcceptanceDecisions.sellerOrderId, sellerOrderId))
        .for("update");

      if (!decision) {
        return { ok: false, code: "SELLER_ORDER_NOT_ROUTED" };
      }

      if (decision.decisionStatus === "seller_accepted") {
        return { ok: true };
      }

      if (decision.decisionStatus === "seller_rejected") {
        return { ok: false, code: "SELLER_ORDER_ALREADY_REJECTED" };
      }

      if (decision.decisionStatus !== "pending_seller_review") {
        return { ok: false, code: "SELLER_ORDER_NOT_ELIGIBLE" };
      }

      await tx.update(sellerAcceptanceDecisions)
        .set({
          decisionStatus: "seller_accepted",
          decidedByAuthUserId: identity.id,
          decisionSource: "partner_portal",
          resolvedAt: sql`now()`,
          acceptedAt: sql`now()`,
        })
        .where(eq(sellerAcceptanceDecisions.id, decision.id));

      await tx.update(sellerOrders)
        .set({
          status: "seller_accepted",
          updatedAt: sql`now()`,
        })
        .where(eq(sellerOrders.id, order.id));

      return { ok: true };
    });
  } catch {
    console.error("acceptSellerOrder failed");
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}

export async function rejectSellerOrder(sellerOrderId: number): Promise<AcceptRejectResult> {
  try {
    return await db.transaction(async (tx) => {
      // 1. Lock seller order first (Canonical Lock Order)
      const [order] = await tx
        .select()
        .from(sellerOrders)
        .where(eq(sellerOrders.id, sellerOrderId))
        .for("update");

      if (!order) {
        return { ok: false, code: "SELLER_ORDER_NOT_FOUND" };
      }

      let identity;
      try {
        identity = await requirePartnerOrderDecisionAuthority(order.partnerId);
      } catch {
        return { ok: false, code: "FORBIDDEN" };
      }

      // 2. Lock decision second
      const [decision] = await tx
        .select()
        .from(sellerAcceptanceDecisions)
        .where(eq(sellerAcceptanceDecisions.sellerOrderId, sellerOrderId))
        .for("update");

      if (!decision) {
        return { ok: false, code: "SELLER_ORDER_NOT_ROUTED" };
      }

      if (decision.decisionStatus === "seller_rejected") {
        return { ok: true };
      }

      if (decision.decisionStatus === "seller_accepted") {
        return { ok: false, code: "SELLER_ORDER_ALREADY_ACCEPTED" };
      }

      if (decision.decisionStatus !== "pending_seller_review") {
        return { ok: false, code: "SELLER_ORDER_NOT_ELIGIBLE" };
      }

      await tx.update(sellerAcceptanceDecisions)
        .set({
          decisionStatus: "seller_rejected",
          decidedByAuthUserId: identity.id,
          decisionSource: "partner_portal",
          resolvedAt: sql`now()`,
          acceptedAt: null,
        })
        .where(eq(sellerAcceptanceDecisions.id, decision.id));

      await tx.update(sellerOrders)
        .set({
          status: "seller_rejected",
          updatedAt: sql`now()`,
        })
        .where(eq(sellerOrders.id, order.id));

      return { ok: true };
    });
  } catch {
    console.error("rejectSellerOrder failed");
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}

export function isSellerOrderContractFormed(
  sellerOrder: { status: string },
  decision: {
    decisionStatus: string;
    acceptedAt: Date | null;
    decidedByAuthUserId: string | null;
    decisionSource: string | null;
  } | null
): boolean {
  if (!decision) return false;
  return (
    sellerOrder.status === "seller_accepted" &&
    decision.decisionStatus === "seller_accepted" &&
    decision.acceptedAt !== null &&
    decision.decidedByAuthUserId !== null &&
    decision.decisionSource === "partner_portal"
  );
}

export function isSellerOrderFulfillmentEligible(
  sellerOrder: { status: string },
  decision: {
    decisionStatus: string;
    acceptedAt: Date | null;
    decidedByAuthUserId: string | null;
    decisionSource: string | null;
  } | null
): boolean {
  return isSellerOrderContractFormed(sellerOrder, decision);
}
