/**
 * Pure buyer-order ownership core.
 *
 * Deterministic and dependency-injected: no database singleton, no ambient
 * authentication state, and no browser-supplied ownership authority.
 * Every privileged capability is supplied by the caller.
 */

export type OwnedOrderSummary = {
  orderId: number;
  status: string;
  createdAt: Date;
};

export type OwnershipFailureReason = "INVALID_ORDER_ID" | "NOT_FOUND";

export type OwnedOrderLookup =
  | { ok: true; order: OwnedOrderSummary }
  | { ok: false; reason: OwnershipFailureReason };

export type OwnershipAuthUser = {
  id: string;
};

/**
 * Trusted server-side dependencies. Ownership is expressed only as
 * (orderId, authenticatedUserId); no email, tax identifier, company,
 * session hash or other client-visible fact is part of this contract.
 */
export interface OwnershipDependencies {
  /** Resolves the trusted authenticated user. Rejects on auth failure. */
  requireUser(): Promise<OwnershipAuthUser>;
  /** Returns the order only when it belongs to authUserId, otherwise null. */
  findOwnedOrder(
    orderId: number,
    authUserId: string
  ): Promise<OwnedOrderSummary | null>;
  /** Returns the orders owned by authUserId. */
  listOwnedOrders(authUserId: string): Promise<OwnedOrderSummary[]>;
}

export function isValidMarketplaceOrderId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/**
 * Resolves a single owned order.
 *
 * Invalid identifiers fail closed before any authentication or database
 * lookup occurs. Cross-user and nonexistent orders are indistinguishable:
 * both resolve to the same NOT_FOUND reason. Authentication failures
 * propagate unchanged and are never converted into NOT_FOUND.
 */
export async function getOwnedOrder(
  deps: OwnershipDependencies,
  orderId: unknown
): Promise<OwnedOrderLookup> {
  if (!isValidMarketplaceOrderId(orderId)) {
    return { ok: false, reason: "INVALID_ORDER_ID" };
  }

  const user = await deps.requireUser();
  const order = await deps.findOwnedOrder(orderId, user.id);

  if (!order) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  return { ok: true, order };
}

/**
 * Lists the orders owned by the authenticated user. Authentication failures
 * propagate unchanged.
 */
export async function listOwnedOrders(
  deps: OwnershipDependencies
): Promise<OwnedOrderSummary[]> {
  const user = await deps.requireUser();
  return deps.listOwnedOrders(user.id);
}