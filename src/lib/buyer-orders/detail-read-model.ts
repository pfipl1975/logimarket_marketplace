import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  marketplaceOrderBuyerContactSnapshots,
  marketplaceOrders,
  sellerAcceptanceDecisions,
  sellerOrderItems,
  sellerOrders,
  sellerOrderSellerSnapshots,
} from "@/lib/schema";
import {
  resolveOwnedBuyerOrderDetail,
  type BuyerOrderDetail,
  type BuyerOrderDetailDependencies,
} from "./detail-read-model-core";

export type BuyerOrderDetailReadResult =
  | { status: "unauthenticated" }
  | { status: "not_found" }
  | { status: "authenticated"; detail: BuyerOrderDetail };

const detailDependencies: BuyerOrderDetailDependencies = {
  async findOwnedParent(orderId, authUserId) {
    const rows = await db
      .select({
        orderId: marketplaceOrders.id,
        createdAt: marketplaceOrders.createdAt,
        customerPoNumber: marketplaceOrders.customerPoNumber,
      })
      .from(marketplaceOrders)
      .where(
        and(
          eq(marketplaceOrders.id, orderId),
          eq(marketplaceOrders.buyerAuthUserId, authUserId),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  },

  async loadContacts(orderId) {
    return db
      .select({
        contactName: marketplaceOrderBuyerContactSnapshots.contactName,
        email: marketplaceOrderBuyerContactSnapshots.email,
        phone: marketplaceOrderBuyerContactSnapshots.phone,
        message: marketplaceOrderBuyerContactSnapshots.message,
      })
      .from(marketplaceOrderBuyerContactSnapshots)
      .where(eq(marketplaceOrderBuyerContactSnapshots.marketplaceOrderId, orderId));
  },

  async loadSellers(orderId) {
    return db
      .select({
        sellerOrderId: sellerOrders.id,
        status: sellerOrders.status,
        routedAt: sellerOrders.e6RoutedToSellerAt,
        sellerLegalName: sellerOrderSellerSnapshots.sellerLegalName,
        sellerDisplayName: sellerOrderSellerSnapshots.sellerDisplayName,
        jurisdictionCountry: sellerOrderSellerSnapshots.jurisdictionCountry,
        registeredAddress: sellerOrderSellerSnapshots.registeredAddress,
        firmContactEmail: sellerOrderSellerSnapshots.firmContactEmail,
        taxIdentifierType: sellerOrderSellerSnapshots.taxIdentifierType,
        taxIdentifierValue: sellerOrderSellerSnapshots.taxIdentifierValue,
        registryIdentifierType: sellerOrderSellerSnapshots.registryIdentifierType,
        registryIdentifierValue: sellerOrderSellerSnapshots.registryIdentifierValue,
        decisionStatus: sellerAcceptanceDecisions.decisionStatus,
        decisionResolvedAt: sellerAcceptanceDecisions.resolvedAt,
        acceptedAt: sellerAcceptanceDecisions.acceptedAt,
        expiresAt: sellerAcceptanceDecisions.expiresAt,
      })
      .from(sellerOrders)
      .leftJoin(
        sellerOrderSellerSnapshots,
        eq(sellerOrderSellerSnapshots.sellerOrderId, sellerOrders.id),
      )
      .leftJoin(
        sellerAcceptanceDecisions,
        eq(sellerAcceptanceDecisions.sellerOrderId, sellerOrders.id),
      )
      .where(eq(sellerOrders.marketplaceOrderId, orderId))
      .orderBy(asc(sellerOrders.id));
  },

  async loadItems(orderId) {
    return db
      .select({
        itemId: sellerOrderItems.id,
        sellerOrderId: sellerOrderItems.sellerOrderId,
        offerTitle: sellerOrderItems.offerTitle,
        manufacturer: sellerOrderItems.manufacturer,
        model: sellerOrderItems.model,
        quantity: sellerOrderItems.quantity,
        unitPrice: sellerOrderItems.unitPrice,
        currency: sellerOrderItems.currency,
      })
      .from(sellerOrderItems)
      .innerJoin(sellerOrders, eq(sellerOrders.id, sellerOrderItems.sellerOrderId))
      .where(eq(sellerOrders.marketplaceOrderId, orderId))
      .orderBy(asc(sellerOrderItems.sellerOrderId), asc(sellerOrderItems.id));
  },
};

export async function loadBuyerOrderDetail(orderId: number): Promise<BuyerOrderDetailReadResult> {
  const auth = await getCurrentUser();
  if (auth.status === "unauthenticated") {
    return { status: "unauthenticated" };
  }
  if (auth.status === "unavailable") {
    throw new Error("Auth Infrastructure Unavailable");
  }

  const result = await resolveOwnedBuyerOrderDetail(detailDependencies, orderId, auth.user.id);
  if (!result.ok) {
    return { status: "not_found" };
  }

  return { status: "authenticated", detail: result.detail };
}
