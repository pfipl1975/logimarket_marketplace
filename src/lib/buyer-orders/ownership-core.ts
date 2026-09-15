import { marketplaceOrders } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export type OwnershipCheckResult = 
  | { ok: true; order: typeof marketplaceOrders.$inferSelect }
  | { ok: false; reason: "NOT_FOUND" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function listMyMarketplaceOrdersCore(authUserId: string, db: any) {
  const rows = await db
    .select()
    .from(marketplaceOrders)
    .where(eq(marketplaceOrders.buyerAuthUserId, authUserId));
    
  return rows;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function requireMyMarketplaceOrderCore(orderId: number, authUserId: string, db: any): Promise<OwnershipCheckResult> {
  if (typeof orderId !== "number" || orderId <= 0 || !Number.isInteger(orderId)) {
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
