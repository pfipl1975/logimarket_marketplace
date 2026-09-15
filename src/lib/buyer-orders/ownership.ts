import "server-only";
import { getDb } from "@/lib/db";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { listOwnedOrders, findOwnedOrder } from "./ownership-core";
import type { OwnershipCheckResult, MarketplaceDatabaseCore } from "./ownership-core";

// ---------- injectable types for testability ----------
type AuthResolver = () => Promise<{ id: string }>;
type DbResolver = () => MarketplaceDatabaseCore;

// ---------- injectable core (for unit tests) ----------
export async function listMyMarketplaceOrdersWith(
  authResolver: AuthResolver,
  dbResolver: DbResolver
) {
  const user = await authResolver();
  return listOwnedOrders(user.id, dbResolver());
}

export async function requireMyMarketplaceOrderWith(
  orderId: number,
  authResolver: AuthResolver,
  dbResolver: DbResolver
): Promise<OwnershipCheckResult> {
  const user = await authResolver();
  return findOwnedOrder(orderId, user.id, dbResolver());
}

// ---------- server production wrappers ----------
export async function listMyMarketplaceOrders() {
  return listMyMarketplaceOrdersWith(
    () => requireAuthenticatedUser(),
    () => getDb() as MarketplaceDatabaseCore
  );
}

export async function requireMyMarketplaceOrder(orderId: number): Promise<OwnershipCheckResult> {
  return requireMyMarketplaceOrderWith(
    orderId,
    () => requireAuthenticatedUser(),
    () => getDb() as MarketplaceDatabaseCore
  );
}
