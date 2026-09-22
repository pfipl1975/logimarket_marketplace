import { db } from "@/lib/db";
import { sellerOrders, sellerAcceptanceDecisions } from "@/lib/schema";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { requirePartnerOrderDecisionAuthority } from "@/lib/auth/partner-membership";
import { enqueueNotificationIntent } from "@/lib/notifications/outbox";
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

type SellerAcceptanceClockRow = {
  routedAt: unknown;
  expiresAt: unknown;
};

function parseDbTimestamp(value: unknown): Date {
  if (typeof value !== "string") throw new Error("DB wall clock unavailable");
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("DB wall clock unavailable");
  return parsed;
}

export function parseSellerAcceptanceClockRow(
  row: SellerAcceptanceClockRow | undefined
): { routedAt: Date; expiresAt: Date } {
  const routedAt = parseDbTimestamp(row?.routedAt);
  const expiresAt = parseDbTimestamp(row?.expiresAt);
  if (expiresAt.getTime() - routedAt.getTime() !== SELLER_ACCEPTANCE_SLA_MS) {
    throw new Error("DB seller acceptance clock invalid");
  }
  return { routedAt, expiresAt };
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

function hasCanonicalAcceptedDecision(decision: SellerDecisionState): boolean {
  return (
    decision.decisionStatus === "seller_accepted" &&
    decision.expiresAt !== null &&
    decision.acceptedAt !== null &&
    decision.resolvedAt !== null &&
    decision.decidedByAuthUserId !== null &&
    decision.decisionSource === "partner_portal"
  );
}

function isCanonicalAccepted(order: SellerOrderState, decision: SellerDecisionState): boolean {
  return order.status === "seller_accepted" && hasCanonicalAcceptedDecision(decision);
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
  const result = await tx.execute<{ currentDbTime: string }>(sql`SELECT clock_timestamp() AS "currentDbTime"`);
  return parseDbTimestamp(result.rows[0]?.currentDbTime);
}

async function readSellerAcceptanceClock(
  tx: SellerOrderTransaction
): Promise<{ routedAt: Date; expiresAt: Date }> {
  const result = await tx.execute<{ routedAt: string; expiresAt: string }>(sql`
    SELECT
      routed_at AS "routedAt",
      routed_at + interval '24 hours' AS "expiresAt"
    FROM (SELECT clock_timestamp() AS routed_at) AS seller_acceptance_clock
  `);
  return parseSellerAcceptanceClockRow(result.rows[0]);
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
        const { routedAt, expiresAt } = await readSellerAcceptanceClock(tx);
        await tx.insert(sellerAcceptanceDecisions).values({
          sellerOrderId,
          decisionStatus: "pending_seller_review",
          expiresAt,
        });
        await tx.update(sellerOrders).set({ e6RoutedToSellerAt: routedAt, updatedAt: routedAt }).where(eq(sellerOrders.id, sellerOrderId));
        const outbox = await enqueueNotificationIntent(tx, sellerOrderId, "seller_order.routed_to_seller");
        if (!outbox.ok) throw new Error("OUTBOX_FAIL");
      } else if (
        existingDecision &&
        existingDecision.decisionStatus === "pending_seller_review" &&
        order.e6RoutedToSellerAt === null &&
        existingDecision.expiresAt === null
      ) {
        const { routedAt, expiresAt } = await readSellerAcceptanceClock(tx);
        await tx.update(sellerAcceptanceDecisions).set({
          expiresAt,
        }).where(eq(sellerAcceptanceDecisions.id, existingDecision.id));
        await tx.update(sellerOrders).set({ e6RoutedToSellerAt: routedAt, updatedAt: routedAt }).where(eq(sellerOrders.id, sellerOrderId));
        const outbox = await enqueueNotificationIntent(tx, sellerOrderId, "seller_order.routed_to_seller");
        if (!outbox.ok) throw new Error("OUTBOX_FAIL");
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
          const ob1 = await enqueueNotificationIntent(tx, sellerOrderId, "seller_order.expired_for_seller");
          const ob2 = await enqueueNotificationIntent(tx, sellerOrderId, "seller_order.expired_for_buyer");
          if (!ob1.ok || !ob2.ok) throw new Error("OUTBOX_FAIL");
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
        const ob = await enqueueNotificationIntent(tx, sellerOrderId, "seller_order.accepted_for_buyer");
        if (!ob.ok) throw new Error("OUTBOX_FAIL");
      } else {
        await tx.update(sellerAcceptanceDecisions).set({
          decisionStatus: "seller_rejected",
          decidedByAuthUserId: identity.id,
          decisionSource: "partner_portal",
          resolvedAt: currentDbTime,
          acceptedAt: null,
        }).where(eq(sellerAcceptanceDecisions.id, decision!.id));
        await tx.update(sellerOrders).set({ status: "seller_rejected", updatedAt: currentDbTime }).where(eq(sellerOrders.id, order.id));
        const ob = await enqueueNotificationIntent(tx, sellerOrderId, "seller_order.rejected_for_buyer");
        if (!ob.ok) throw new Error("OUTBOX_FAIL");
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
      const ob1 = await enqueueNotificationIntent(tx, sellerOrderId, "seller_order.expired_for_seller");
      const ob2 = await enqueueNotificationIntent(tx, sellerOrderId, "seller_order.expired_for_buyer");
      if (!ob1.ok || !ob2.ok) throw new Error("OUTBOX_FAIL");
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

export type FulfillmentResult =
  | { ok: true }
  | { ok: false; code: "SELLER_ORDER_NOT_FOUND" }
  | { ok: false; code: "SELLER_ORDER_INVALID_STATE" }
  | { ok: false; code: "UNAUTHORIZED" }
  | { ok: false; code: "FORBIDDEN" }
  | { ok: false; code: "SYSTEM_ERROR" };

type FulfillmentTarget = "fulfillment_in_progress" | "fulfilled";

export function evaluateSellerOrderFulfillmentTransition(
  order: Pick<SellerOrderState, "status">,
  decision: SellerDecisionState | undefined,
  target: FulfillmentTarget
): FulfillmentResult {
  if (!decision || !hasCanonicalAcceptedDecision(decision)) {
    return { ok: false, code: "SELLER_ORDER_INVALID_STATE" };
  }

  const expectedStatus = target === "fulfillment_in_progress"
    ? "seller_accepted"
    : "fulfillment_in_progress";

  return order.status === expectedStatus
    ? { ok: true }
    : { ok: false, code: "SELLER_ORDER_INVALID_STATE" };
}

async function transitionSellerOrderFulfillmentWithAuthority(
  sellerOrderId: number,
  target: FulfillmentTarget,
  authorizePartner: AuthorizeFn
): Promise<FulfillmentResult> {
  try {
    return await db.transaction(async (tx) => {
      const [order] = await tx.select().from(sellerOrders).where(eq(sellerOrders.id, sellerOrderId)).for("update");
      if (!order) return { ok: false, code: "SELLER_ORDER_NOT_FOUND" };

      const [decision] = await tx
        .select()
        .from(sellerAcceptanceDecisions)
        .where(eq(sellerAcceptanceDecisions.sellerOrderId, sellerOrderId))
        .for("update");

      try {
        await authorizePartner(order.partnerId);
      } catch (err) {
        if (err instanceof UnauthorizedError) return { ok: false, code: "UNAUTHORIZED" };
        if (err instanceof ForbiddenError) return { ok: false, code: "FORBIDDEN" };
        return { ok: false, code: "SYSTEM_ERROR" };
      }

      const stateResult = evaluateSellerOrderFulfillmentTransition(order, decision, target);
      if (!stateResult.ok) return stateResult;

      const currentDbTime = await readDbWallClock(tx);
      const expectedStatus = target === "fulfillment_in_progress"
        ? "seller_accepted"
        : "fulfillment_in_progress";
      const [updated] = await tx
        .update(sellerOrders)
        .set({ status: target, updatedAt: currentDbTime })
        .where(and(eq(sellerOrders.id, order.id), eq(sellerOrders.status, expectedStatus)))
        .returning({ id: sellerOrders.id });
      if (!updated) throw new Error("SELLER_ORDER_CONCURRENT_UPDATE");

      return { ok: true };
    });
  } catch {
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}

export async function markSellerOrderFulfillmentInProgressWithAuthority(
  sellerOrderId: number,
  authorizePartner: AuthorizeFn
): Promise<FulfillmentResult> {
  return transitionSellerOrderFulfillmentWithAuthority(
    sellerOrderId,
    "fulfillment_in_progress",
    authorizePartner
  );
}

export async function markSellerOrderFulfilledWithAuthority(sellerOrderId: number, authorizePartner: AuthorizeFn): Promise<FulfillmentResult> {
  return transitionSellerOrderFulfillmentWithAuthority(sellerOrderId, "fulfilled", authorizePartner);
}

export async function markSellerOrderFulfillmentInProgress(sellerOrderId: number): Promise<FulfillmentResult> {
  return markSellerOrderFulfillmentInProgressWithAuthority(sellerOrderId, requirePartnerOrderDecisionAuthority);
}

export async function markSellerOrderFulfilled(sellerOrderId: number): Promise<FulfillmentResult> {
  return markSellerOrderFulfilledWithAuthority(sellerOrderId, requirePartnerOrderDecisionAuthority);
}
