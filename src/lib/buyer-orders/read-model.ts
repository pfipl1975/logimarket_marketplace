import "server-only";

import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { marketplaceOrders, sellerAcceptanceDecisions, sellerOrders } from "@/lib/schema";
import { buildBuyerOrderList, type BuyerOrderListItem } from "./read-model-core";

export type BuyerOrdersReadResult =
  | { status: "unauthenticated"; orders: [] }
  | { status: "authenticated"; orders: BuyerOrderListItem[] };

/**
 * The parent MarketplaceOrder is the authorization root. The joined seller
 * rows and decisions are returned only for parents owned by trusted user.id.
 */
export async function loadBuyerOrders(): Promise<BuyerOrdersReadResult> {
  const auth = await getCurrentUser();
  if (auth.status === "unauthenticated") {
    return { status: "unauthenticated", orders: [] };
  }
  if (auth.status === "unavailable") {
    throw new Error("Auth Infrastructure Unavailable");
  }

  const rows = await db
    .select({
      orderId: marketplaceOrders.id,
      createdAt: marketplaceOrders.createdAt,
      sellerOrderId: sellerOrders.id,
      sellerOrderStatus: sellerOrders.status,
      decisionStatus: sellerAcceptanceDecisions.decisionStatus,
    })
    .from(marketplaceOrders)
    .leftJoin(sellerOrders, eq(sellerOrders.marketplaceOrderId, marketplaceOrders.id))
    .leftJoin(sellerAcceptanceDecisions, eq(sellerAcceptanceDecisions.sellerOrderId, sellerOrders.id))
    .where(eq(marketplaceOrders.buyerAuthUserId, auth.user.id));

  return { status: "authenticated", orders: buildBuyerOrderList(rows) };
}