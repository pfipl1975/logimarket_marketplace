import { marketplaceOrders } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@/lib/schema";

export type MarketplaceDatabaseCore = PostgresJsDatabase<typeof schema> | NodePgDatabase<typeof schema>;

export type OwnershipCheckResult = 
  | { ok: true; order: typeof marketplaceOrders.$inferSelect }
  | { ok: false; reason: "NOT_FOUND" };

export async function listOwnedOrders(authUserId: string, db: MarketplaceDatabaseCore) {
  const rows = await db
    .select()
    .from(marketplaceOrders)
    .where(eq(marketplaceOrders.buyerAuthUserId, authUserId));
    
  return rows;
}

export async function findOwnedOrder(orderId: number, authUserId: string, db: MarketplaceDatabaseCore): Promise<OwnershipCheckResult> {
  if (typeof orderId !== "number" || orderId <= 0 || !Number.isInteger(orderId) || orderId > Number.MAX_SAFE_INTEGER) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  const rows = await db
    .select()
    .from(marketplaceOrders)
    .where(
      and(
        eq(marketplaceOrders.id, orderId),
        eq(marketplaceOrders.buyerAuthUserId, authUserId)
      )
    )
    .limit(1);
    
  if (rows.length === 0) {
    return { ok: false, reason: "NOT_FOUND" };
  }
  
  return { ok: true, order: rows[0] };
}
