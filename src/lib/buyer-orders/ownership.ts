import "server-only";
import { getDb } from "@/lib/db";
import { marketplaceOrders } from "@/lib/schema";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { eq, and } from "drizzle-orm";

export type OwnershipCheckResult = 
  | { ok: true; order: typeof marketplaceOrders.$inferSelect }
  | { ok: false; reason: "NOT_FOUND" };

/**
 * Lists all Marketplace Orders owned by the currently authenticated Buyer.
 */
export async function listMyMarketplaceOrders() {
  const user = await requireAuthenticatedUser();
  const db = getDb();
  
  const rows = await db
    .select()
    .from(marketplaceOrders)
    .where(eq(marketplaceOrders.buyerAuthUserId, user.id));
    
  return rows;
}

/**
 * Validates ownership of a specific Marketplace Order for the currently authenticated Buyer.
 * Returns a generic NOT_FOUND if the order does not exist OR is owned by someone else,
 * enforcing a fail-closed boundary.
 */
export async function requireMyMarketplaceOrder(orderId: number): Promise<OwnershipCheckResult> {
  const user = await requireAuthenticatedUser();
  const db = getDb();
  
  const rows = await db
    .select()
    .from(marketplaceOrders)
    .where(
      and(
        eq(marketplaceOrders.id, orderId),
        eq(marketplaceOrders.buyerAuthUserId, user.id)
      )
    )
    .limit(1);
    
  if (rows.length === 0) {
    return { ok: false, reason: "NOT_FOUND" };
  }
  
  return { ok: true, order: rows[0] };
}
