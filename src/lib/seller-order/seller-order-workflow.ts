import { db } from "@/lib/db";
import { sellerOrders, sellerAcceptanceDecisions } from "@/lib/schema";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { requirePartnerOrderDecisionAuthority } from "@/lib/auth/partner-membership";
import {
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/auth/authorization-errors";

export const SELLER_ACCEPTANCE_SLA_MS = 24 * 60 * 60 * 1000;

type SellerOrderState = {
  status: string;
  e6RoutedToSellerAt: Date | null;
};

type SellerDecisionState = {
  decisionStatus: string;
  expiresAt: Date | null;
  acceptedAt: Date | null;
  resolvedAt: Date | null;
  decidedByAuthUserId: string | null;
  decisionSource: string | null;
};

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
  | { ok: false; code: "SELLER_ORDER_EXPIRED" }
  | { ok: false; code: "SELLER_ORDER_DECISION_CONFLICT" }
  | { ok: false; code: "SELLER_ORDER_NOT_ELIGIBLE" }
  | { ok: false; code: "UNAUTHORIZED" }
  | { ok: false; code: "FORBIDDEN" }
  | { ok: false; code: "SYSTEM_ERROR" };

export type ExpireSellerOrderResult =
  | { ok: true; changed: boolean }
  | { ok: false; code: "SELLER_ORDER_NOT_FOUND" }
  | { ok: false; code: "SELLER_ORDER_NOT_ROUTED" }
  | { ok: false; code: "SELLER_ORDER_NOT_DUE" }
  | { ok: false; code: "SELLER_ORDER_DECISION_CONFLICT" }
  | { ok: false; code: "SELLER_ORDER_NOT_ELIGIBLE" }
  | { ok: false; code: "SYSTEM_ERROR" };

type ExpirationEvaluation =
  | { ok: true; shouldExpire: boolean }
  | Exclude<ExpireSellerOrderResult, { ok: true }>;

export function sellerAcceptanceDeadlineFromE6(e6At: Date): Date {
  return new Date(e6At.getTime() + SELLER_ACCEPTANCE_SLA_MS);
}

function hasCanonicalDeadline(e6At: Date, expiresAt: Date): boolean {
  return expiresAt.getTime() === sellerAcceptanceDeadlineFromE6(e6At).getTime();
}

function isCanonicalPending(order: SellerOrderState, decision: SellerDecisionState): boolean {
  return (
    order.status === "submitted" &&
    order.e6RoutedToSellerAt !== null &&
    decision.decisionStatus === "pending_seller_review" &&
    decision.expiresAt !== null &&
    decision.acceptedAt === null &&
    decision.resolvedAt === null &&
    decision.decidedByAuthUserId === null &&
    decision.decisionSource === null
  );
}

function isCanonicalAccepted(order: SellerOrderState, decision: SellerDecisionState): boolean {
  return (
    order.status === "seller_accepted" &&
    decision.decisionStatus === "seller_accepted" &&
    decision.expiresAt !== null &&
    decision.acceptedAt !== null &&
    decision.resolvedAt !== null &&
    decision.decidedByAuthUserId !== null &&
    decision.decisionSource === "partner_portal"
  );
}

function isCanonicalRejected(order: SellerOrderState, decision: SellerDecisionState): boolean {
  return (
    order.status === "seller_rejected" &&
    decision.decisionStatus === "seller_rejected" &&
    decision.expiresAt !== null &&
    decision.acceptedAt === null &&
    decision.resolvedAt !== null &&
    decision.decidedByAuthUserId !== null &&
    decision.decisionSource === "partner_portal"
  );
}

function isCanonicalExpired(order: SellerOrderState, decision: SellerDecisionState): boolean {
  return (
    order.status === "expired" &&
    decision.decisionStatus === "expired" &&
    decision.expiresAt !== null &&
    decision.acceptedAt === null &&
    decision.resolvedAt !== null &&
    decision.decidedByAuthUserId === null &&
    decision.decisionSource === null
  );
}

export function evaluateSellerOrderRoutingState(
  order: SellerOrderState,
  decision: Pick<SellerDecisionState, "decisionStatus" | "expiresAt"> | undefined
): RouteSellerOrderResult {
  if (order.status !== "submitted") {
    return { ok: false, code: "SELLER_ORDER_NOT_ELIGIBLE" };
  }
  if (!decision && order.e6RoutedToSellerAt === null) {
    return { ok: true };
  }
  if (decision?.decisionStatus !== "pending_seller_review") {
    return { ok: false, code: "SELLER_ORDER_NOT_ELIGIBLE" };
  }
  if (order.e6RoutedToSellerAt === null && decision.expiresAt === null) {
    return { ok: true };
  }
  if (
    order.e6RoutedToSellerAt !== null &&
    decision.expiresAt !== null &&
    hasCanonicalDeadline(order.e6RoutedToSellerAt, decision.expiresAt)
  ) {
    return { ok: true };
  }
  return { ok: false, code: "SELLER_ORDER_NOT_ELIGIBLE" };
}

export function evaluateSellerOrderDecisionState(
  order: SellerOrderState,
  decision: SellerDecisionState | undefined,
  desiredDecision: "seller_accepted" | "seller_rejected",
  currentDbTime: Date
): AcceptRejectResult {
  if (!decision || order.e6RoutedToSellerAt === null) {
    return { ok: false, code: "SELLER_ORDER_NOT_ROUTED" };
  }

  if (isCanonicalExpired(order, decision)) {
    return { ok: false, code: "SELLER_ORDER_EXPIRED" };
  }
  if (order.status === "expired" || decision.decisionStatus === "expired") {
    return { ok: false, code: "SELLER_ORDER_DECISION_CONFLICT" };
  }

  if (desiredDecision === "seller_accepted") {
    if (isCanonicalAccepted(order, decision)) return { ok: true };
    if (decision.decisionStatus === "seller_accepted" || order.status === "seller_accepted") {
      return { ok: false, code: "SELLER_ORDER_DECISION_CONFLICT" };
    }
    if (decision.decisionStatus === "seller_rejected") {
      return { ok: false, code: "SELLER_ORDER_ALREADY_REJECTED" };
    }
  } else {
    if (isCanonicalRejected(order, decision)) return { ok: true };
    if (decision.decisionStatus === "seller_rejected" || order.status === "seller_rejected") {
      return { ok: false, code: "SELLER_ORDER_DECISION_CONFLICT" };
    }
    if (decision.decisionStatus === "seller_accepted") {
      return { ok: false, code: "SELLER_ORDER_ALREADY_ACCEPTED" };
    }
  }
  if (isCanonicalPending(order, decision)) {
    return currentDbTime.getTime() >= decision.expiresAt!.getTime()
      ? { ok: false, code: "SELLER_ORDER_EXPIRED" }
      : { ok: true };
  }
  return { ok: false, code: "SELLER_ORDER_NOT_ELIGIBLE" };
}

export function evaluateSellerOrderExpirationState(
  order: SellerOrderState,
  decision: SellerDecisionState | undefined,
  currentDbTime: Date
): ExpirationEvaluation {
  if (!decision || order.e6RoutedToSellerAt === null) {
    return { ok: false, code: "SELLER_ORDER_NOT_ROUTED" };
  }
  if (isCanonicalExpired(order, decision)) {
    return { ok: true, shouldExpire: false };
  }
  if (order.status === "expired" || decision.decisionStatus === "expired") {
    return { ok: false, code: "SELLER_ORDER_DECISION_CONFLICT" };
  }
  if (isCanonicalAccepted(order, decision) || isCanonicalRejected(order, decision)) {
    return { ok: false, code: "SELLER_ORDER_NOT_ELIGIBLE" };
  }
  if (!isCanonicalPending(order, decision)) {
    return { ok: false, code: "SELLER_ORDER_DECISION_CONFLICT" };
  }
  if (currentDbTime.getTime() < decision.expiresAt!.getTime()) {
    return { ok: false, code: "SELLER_ORDER_NOT_DUE" };
  }
  return { ok: true, shouldExpire: true };
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

function canonicalExpirationDecisionUpdate(currentDbTime: Date) {
  return {
    decisionStatus: "expired",
    resolvedAt: currentDbTime,
    acceptedAt: null,
    decidedByAuthUserId: null,
    decisionSource: null,
  } as const;
}

type SellerOrderTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function readDbWallClock(tx: SellerOrderTransaction): Promise<Date> {
  const result = await tx.execute<{ currentDbTime: Date }>(sql`SELECT clock_timestamp() AS "currentDbTime"`);
  const currentDbTime = result.rows[0]?.currentDbTime;
  if (!currentDbTime) throw new Error("DB wall clock unavailable");
  return currentDbTime;
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
        const routedAt = await readDbWallClock(tx);
        await tx.insert(sellerAcceptanceDecisions).values({
          sellerOrderId,
          decisionStatus: "pending_seller_review",
          expiresAt: sql`${routedAt}::timestamptz + interval '24 hours'`,
        });
        await tx.update(sellerOrders).set({ e6RoutedToSellerAt: routedAt, updatedAt: routedAt }).where(eq(sellerOrders.id, sellerOrderId));
      } else if (
        existingDecision &&
        existingDecision.decisionStatus === "pending_seller_review" &&
        order.e6RoutedToSellerAt === null &&
        existingDecision.expiresAt === null
      ) {
        const routedAt = await readDbWallClock(tx);
        await tx.update(sellerAcceptanceDecisions).set({
          expiresAt: sql`${routedAt}::timestamptz + interval '24 hours'`,
        }).where(eq(sellerAcceptanceDecisions.id, existingDecision.id));
        await tx.update(sellerOrders).set({ e6RoutedToSellerAt: routedAt, updatedAt: routedAt }).where(eq(sellerOrders.id, sellerOrderId));
      }
      return { ok: true };
    });
  } catch {
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}

type AuthorizeFn = (partnerId: number) => Promise<{ id: string }>;

async function decideSellerOrderWithAuthority(
  sellerOrderId: number,
  authorizePartner: AuthorizeFn,
  desiredDecision: "seller_accepted" | "seller_rejected"
): Promise<AcceptRejectResult> {
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
      const currentDbTime = await readDbWallClock(tx);
      const stateResult = evaluateSellerOrderDecisionState(order, decision, desiredDecision, currentDbTime);
      if (!stateResult.ok) {
        if (
          stateResult.code === "SELLER_ORDER_EXPIRED" &&
          decision &&
          isCanonicalPending(order, decision)
        ) {
          await tx.update(sellerAcceptanceDecisions).set(canonicalExpirationDecisionUpdate(currentDbTime)).where(eq(sellerAcceptanceDecisions.id, decision.id));
          await tx.update(sellerOrders).set({ status: "expired", updatedAt: currentDbTime }).where(eq(sellerOrders.id, order.id));
        }
        return stateResult;
      }

      if (decision?.decisionStatus === desiredDecision) return { ok: true };

      if (desiredDecision === "seller_accepted") {
        await tx.update(sellerAcceptanceDecisions).set({
          decisionStatus: "seller_accepted",
          decidedByAuthUserId: identity.id,
          decisionSource: "partner_portal",
          resolvedAt: currentDbTime,
          acceptedAt: currentDbTime,
        }).where(eq(sellerAcceptanceDecisions.id, decision!.id));
        await tx.update(sellerOrders).set({ status: "seller_accepted", updatedAt: currentDbTime }).where(eq(sellerOrders.id, order.id));
      } else {
        await tx.update(sellerAcceptanceDecisions).set({
          decisionStatus: "seller_rejected",
          decidedByAuthUserId: identity.id,
          decisionSource: "partner_portal",
          resolvedAt: currentDbTime,
          acceptedAt: null,
        }).where(eq(sellerAcceptanceDecisions.id, decision!.id));
        await tx.update(sellerOrders).set({ status: "seller_rejected", updatedAt: currentDbTime }).where(eq(sellerOrders.id, order.id));
      }
      return { ok: true };
    });
  } catch {
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}

export async function acceptSellerOrderWithAuthority(sellerOrderId: number, authorizePartner: AuthorizeFn): Promise<AcceptRejectResult> {
  return decideSellerOrderWithAuthority(sellerOrderId, authorizePartner, "seller_accepted");
}

export async function rejectSellerOrderWithAuthority(sellerOrderId: number, authorizePartner: AuthorizeFn): Promise<AcceptRejectResult> {
  return decideSellerOrderWithAuthority(sellerOrderId, authorizePartner, "seller_rejected");
}

export async function expireSellerOrder(sellerOrderId: number): Promise<ExpireSellerOrderResult> {
  try {
    return await db.transaction(async (tx) => {
      const [order] = await tx.select().from(sellerOrders).where(eq(sellerOrders.id, sellerOrderId)).for("update");
      if (!order) return { ok: false, code: "SELLER_ORDER_NOT_FOUND" };

      const [decision] = await tx.select().from(sellerAcceptanceDecisions).where(eq(sellerAcceptanceDecisions.sellerOrderId, sellerOrderId)).for("update");
      const currentDbTime = await readDbWallClock(tx);
      const stateResult = evaluateSellerOrderExpirationState(order, decision, currentDbTime);
      if (!stateResult.ok) return stateResult;
      if (!stateResult.shouldExpire) return { ok: true, changed: false };

      await tx.update(sellerAcceptanceDecisions).set(canonicalExpirationDecisionUpdate(currentDbTime)).where(eq(sellerAcceptanceDecisions.id, decision!.id));
      await tx.update(sellerOrders).set({ status: "expired", updatedAt: currentDbTime }).where(eq(sellerOrders.id, order.id));
      return { ok: true, changed: true };
    });
  } catch {
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}

export async function expireDueSellerOrders(limit = 100): Promise<
  | { ok: true; processed: number; expired: number }
  | { ok: false; code: "SYSTEM_ERROR" }
> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    return { ok: false, code: "SYSTEM_ERROR" };
  }

  try {
    const candidates = await db
      .select({ sellerOrderId: sellerAcceptanceDecisions.sellerOrderId })
      .from(sellerAcceptanceDecisions)
      .where(and(
        eq(sellerAcceptanceDecisions.decisionStatus, "pending_seller_review"),
        lte(sellerAcceptanceDecisions.expiresAt, sql`clock_timestamp()`)
      ))
      .orderBy(asc(sellerAcceptanceDecisions.expiresAt))
      .limit(limit);

    let expired = 0;
    for (const candidate of candidates) {
      const result = await expireSellerOrder(candidate.sellerOrderId);
      if (result.ok && result.changed) expired++;
    }
    return { ok: true, processed: candidates.length, expired };
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
