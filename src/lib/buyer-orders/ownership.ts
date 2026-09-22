import "server-only";

import { and, eq } from "drizzle-orm";

import { requireAuthenticatedUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { marketplaceOrders } from "@/lib/schema";
import {
  getOwnedOrder,
  listOwnedOrders,
  type OwnedOrderLookup,
  type OwnedOrderSummary,
  type OwnershipDependencies,
} from "./ownership-core";

/**
 * Minimum ownership proof. Deliberately excludes session hash, buyer auth
 * user id, buyer legal context and contact data.
 */
const ownedOrderProjection = {
  orderId: marketplaceOrders.id,
  status: marketplaceOrders.status,
  createdAt: marketplaceOrders.createdAt,
};

export const marketplaceOwnershipDependencies: OwnershipDependencies = {
  async requireUser() {
    const user = await requireAuthenticatedUser();
    return { id: user.id };
  },

  async findOwnedOrder(orderId, authUserId) {
    const rows = await db
      .select(ownedOrderProjection)
      .from(marketplaceOrders)
      .where(
        and(
          eq(marketplaceOrders.id, orderId),
          eq(marketplaceOrders.buyerAuthUserId, authUserId)
        )
      )
      .limit(1);

    return rows[0] ?? null;
  },

  async listOwnedOrders(authUserId) {
    return db
      .select(ownedOrderProjection)
      .from(marketplaceOrders)
      .where(eq(marketplaceOrders.buyerAuthUserId, authUserId));
  },
};

export function findOwnedMarketplaceOrder(
  orderId: unknown
): Promise<OwnedOrderLookup> {
  return getOwnedOrder(marketplaceOwnershipDependencies, orderId);
}

export function listOwnedMarketplaceOrders(): Promise<OwnedOrderSummary[]> {
  return listOwnedOrders(marketplaceOwnershipDependencies);
}