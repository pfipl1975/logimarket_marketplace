import { db } from "@/lib/db";
import { sellerOrders, sellerAcceptanceDecisions } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { requirePartnerOrderDecisionAuthority } from "@/lib/auth/partner-membership";
import {
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/auth/authorization-errors";

export type RouteSellerOrderResult =
  | { ok: true }
  | { ok: false; code: "SELLER_ORDER_NOT_FOUND" }
  | { ok: false; code: "SELLER_ORDER_NOT_ELIGIBLE" }
  | { ok: false; code: "SYSTEM_ERROR" };

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

export function evaluateSellerOrderRoutingState(
  order: { status: string; e6RoutedToSellerAt: Date | null },
  decision: { decisionStatus: string } | undefined
): RouteSellerOrderResult {
  if (order.status !== "submitted") {
    return { ok: false, code: "SELLER_ORDER_NOT_ELIGIBLE" };
  }
  if (!decision && order.e6RoutedToSellerAt === null) {
    return { ok: true };
  }
  if (decision && decision.decisionStatus === "pending_seller_review" && order.e6RoutedToSellerAt !== null) {
    return { ok: true };
  }
  if (decision && decision.decisionStatus === "pending_seller_review" && order.e6RoutedToSellerAt === null) {
    return { ok: true };
  }
  return { ok: false, code: "SELLER_ORDER_NOT_ELIGIBLE" };
}

export function evaluateSellerOrderDecisionState(
  order: { status: string; e6RoutedToSellerAt: Date | null },
  decision: {
    decisionStatus: string;
    acceptedAt: Date | null;
    resolvedAt: Date | null;
    decidedByAuthUserId: string | null;
    decisionSource: string | null;
  } | undefined,
  desiredDecision: "seller_accepted" | "seller_rejected"
): AcceptRejectResult {
  if (!decision || order.e6RoutedToSellerAt === null) {
    return { ok: false, code: "SELLER_ORDER_NOT_ROUTED" };
  }
  if (desiredDecision === "seller_accepted") {
    if (
      order.status === "seller_accepted" &&
      decision.decisionStatus === "seller_accepted" &&
      decision.acceptedAt !== null &&
      decision.resolvedAt !== null &&
      decision.decidedByAuthUserId !== null &&
      decision.decisionSource === "partner_portal"
    ) {
      return { ok: true };
    }
    if (decision.decisionStatus === "seller_accepted" || order.status === "seller_accepted") {
      return { ok: false, code: "SELLER_ORDER_DECISION_CONFLICT" };
    }
    if (decision.decisionStatus === "seller_rejected") {
      return { ok: false, code: "SELLER_ORDER_ALREADY_REJECTED" };
    }
  } else {
    if (
      order.status === "seller_rejected" &&
      decision.decisionStatus === "seller_rejected" &&
      decision.acceptedAt === null &&
      decision.resolvedAt !== null &&
      decision.decidedByAuthUserId !== null &&
      decision.decisionSource === "partner_portal"
    ) {
      return { ok: true };
    }
    if (decision.decisionStatus === "seller_rejected" || order.status === "seller_rejected") {
      return { ok: false, code: "SELLER_ORDER_DECISION_CONFLICT" };
    }
    if (decision.decisionStatus === "seller_accepted") {
      return { ok: false, code: "SELLER_ORDER_ALREADY_ACCEPTED" };
    }
  }
  if (order.status === "submitted" && decision.decisionStatus === "pending_seller_review") {
    return { ok: true };
  }
  return { ok: false, code: "SELLER_ORDER_NOT_ELIGIBLE" };
}

export function isSellerOrderContractFormed(
  sellerOrder: { status: string },
  decision: {
    decisionStatus: string;
    acceptedAt: Date | null;
    resolvedAt: Date | null;
    decidedByAuthUserId: string | null;
    decisionSource: string | null;
  } | null
): boolean {
  if (!decision) return false;
  return (
    sellerOrder.status === "seller_accepted" &&
    decision.decisionStatus === "seller_accepted" &&
    decision.acceptedAt !== null &&
    decision.resolvedAt !== null &&
    decision.decidedByAuthUserId !== null &&
    decision.decisionSource === "partner_portal"
  );
}

export function isSellerOrderFulfillmentEligible(
  sellerOrder: { status: string },
  decision: {
    decisionStatus: string;
    acceptedAt: Date | null;
    resolvedAt: Date | null;
    decidedByAuthUserId: string | null;
    decisionSource: string | null;
  } | null
): boolean {
  return isSellerOrderContractFormed(sellerOrder, decision);
}

export async function routeSellerOrderToPartner(sellerOrderId: number): Promise<RouteSellerOrderResult> {
  try {
    return await db.transaction(async (tx) => {
      const [order] = await tx.select().from(sellerOrders).where(eq(sellerOrders.id, sellerOrderId)).for("update");
      if (!order) return { ok: false, code: "SELLER_ORDER_NOT_FOUND" };

      const [existingDecision] = await tx.select().from(sellerAcceptanceDecisions).where(eq(sellerAcceptanceDecisions.sellerOrderId, sellerOrderId)).for("update");
      const stateResult = evaluateSellerOrderRoutingState(order, existingDecision);
      if (!stateResult.ok) return stateResult;

      if (!existingDecision && order.e6RoutedToSellerAt === null) {
        await tx.insert(sellerAcceptanceDecisions).values({
          sellerOrderId, decisionStatus: "pending_seller_review",
        });
        await tx.update(sellerOrders).set({ e6RoutedToSellerAt: sql`now()`, updatedAt: sql`now()` }).where(eq(sellerOrders.id, sellerOrderId));
      } else if (existingDecision && existingDecision.decisionStatus === "pending_seller_review" && order.e6RoutedToSellerAt === null) {
        await tx.update(sellerOrders).set({ e6RoutedToSellerAt: sql`now()`, updatedAt: sql`now()` }).where(eq(sellerOrders.id, sellerOrderId));
      }
      return { ok: true };
    });
  } catch {
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}

type AuthorizeFn = (partnerId: number) => Promise<{ id: string }>;

export async function acceptSellerOrderWithAuthority(sellerOrderId: number, authorizePartner: AuthorizeFn): Promise<AcceptRejectResult> {
  try {
    return await db.transaction(async (tx) => {
      const [order] = await tx.select().from(sellerOrders).where(eq(sellerOrders.id, sellerOrderId)).for("update");
      if (!order) return { ok: false, code: "SELLER_ORDER_NOT_FOUND" };

      let identity;
      try {
        identity = await authorizePartner(order.partnerId);
      } catch (err) {
        if (err instanceof UnauthorizedError) return { ok: false, code: "UNAUTHORIZED" };
        if (err instanceof ForbiddenError) return { ok: false, code: "FORBIDDEN" };
        return { ok: false, code: "SYSTEM_ERROR" };
      }

      const [decision] = await tx.select().from(sellerAcceptanceDecisions).where(eq(sellerAcceptanceDecisions.sellerOrderId, sellerOrderId)).for("update");
      const stateResult = evaluateSellerOrderDecisionState(order, decision, "seller_accepted");
      if (!stateResult.ok) return stateResult;
      
      if (decision && decision.decisionStatus === "seller_accepted") return { ok: true };

      await tx.update(sellerAcceptanceDecisions).set({
        decisionStatus: "seller_accepted", decidedByAuthUserId: identity.id, decisionSource: "partner_portal", resolvedAt: sql`now()`, acceptedAt: sql`now()`,
      }).where(eq(sellerAcceptanceDecisions.id, decision!.id));

      await tx.update(sellerOrders).set({ status: "seller_accepted", updatedAt: sql`now()` }).where(eq(sellerOrders.id, order.id));
      return { ok: true };
    });
  } catch {
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}

export async function rejectSellerOrderWithAuthority(sellerOrderId: number, authorizePartner: AuthorizeFn): Promise<AcceptRejectResult> {
  try {
    return await db.transaction(async (tx) => {
      const [order] = await tx.select().from(sellerOrders).where(eq(sellerOrders.id, sellerOrderId)).for("update");
      if (!order) return { ok: false, code: "SELLER_ORDER_NOT_FOUND" };

      let identity;
      try {
        identity = await authorizePartner(order.partnerId);
      } catch (err) {
        if (err instanceof UnauthorizedError) return { ok: false, code: "UNAUTHORIZED" };
        if (err instanceof ForbiddenError) return { ok: false, code: "FORBIDDEN" };
        return { ok: false, code: "SYSTEM_ERROR" };
      }

      const [decision] = await tx.select().from(sellerAcceptanceDecisions).where(eq(sellerAcceptanceDecisions.sellerOrderId, sellerOrderId)).for("update");
      const stateResult = evaluateSellerOrderDecisionState(order, decision, "seller_rejected");
      if (!stateResult.ok) return stateResult;

      if (decision && decision.decisionStatus === "seller_rejected") return { ok: true };

      await tx.update(sellerAcceptanceDecisions).set({
        decisionStatus: "seller_rejected", decidedByAuthUserId: identity.id, decisionSource: "partner_portal", resolvedAt: sql`now()`, acceptedAt: null,
      }).where(eq(sellerAcceptanceDecisions.id, decision!.id));

      await tx.update(sellerOrders).set({ status: "seller_rejected", updatedAt: sql`now()` }).where(eq(sellerOrders.id, order.id));
      return { ok: true };
    });
  } catch {
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}

export async function acceptSellerOrder(sellerOrderId: number): Promise<AcceptRejectResult> {
  return acceptSellerOrderWithAuthority(sellerOrderId, requirePartnerOrderDecisionAuthority);
}

export async function rejectSellerOrder(sellerOrderId: number): Promise<AcceptRejectResult> {
  return rejectSellerOrderWithAuthority(sellerOrderId, requirePartnerOrderDecisionAuthority);
}
