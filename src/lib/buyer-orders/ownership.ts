import "server-only";
import { getDb } from "@/lib/db";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { listMyMarketplaceOrdersCore, requireMyMarketplaceOrderCore, OwnershipCheckResult } from "./ownership-core";

/**
 * Lists all Marketplace Orders owned by the currently authenticated Buyer.
 */
export async function listMyMarketplaceOrders() {
  const user = await requireAuthenticatedUser();
  const db = getDb();
  
  return listMyMarketplaceOrdersCore(user.id, db);
}

/**
 * Validates ownership of a specific Marketplace Order for the currently authenticated Buyer.
 * Returns a generic NOT_FOUND if the order does not exist OR is owned by someone else,
 * enforcing a fail-closed boundary.
 */
export async function requireMyMarketplaceOrder(orderId: number): Promise<OwnershipCheckResult> {
  const user = await requireAuthenticatedUser();
  const db = getDb();
  
  return requireMyMarketplaceOrderCore(orderId, user.id, db);
}
