import "server-only";
import { db } from "@/lib/db";
import {
  sellerOrders,
  marketplaceOrders,
  buyerLegalContextSnapshots,
  sellerAcceptanceDecisions,
  sellerOrderItems,
  marketplaceOrderBuyerContactSnapshots,
} from "@/lib/schema";
import { eq, and, sql, asc } from "drizzle-orm";
import { requirePartnerMembership } from "@/lib/auth/partner-membership";
import {
  deriveEffectiveStatus,
  type PartnerOrderEffectiveStatus,
} from "@/lib/partner-orders/read-model-core";

export { deriveEffectiveStatus };
export type { PartnerOrderEffectiveStatus };

export type PartnerOrderListItem = {
  sellerOrderId: number;
  publicOrderReference: string;
  createdAt: Date;
  routedAt: Date | null;
  expiresAt: Date | null;
  serverNow: Date;
  persistedStatus: string;
  effectiveStatus: PartnerOrderEffectiveStatus;
  decisionWindowOpen: boolean;
  buyerBusinessName: string;
  currency: string;
  orderTotal: string;
  itemCount: number;
};

export async function getPartnerOrdersList(
  partnerId: number
): Promise<{ ok: true; items: PartnerOrderListItem[] } | { ok: false; code: string }> {
  try {
    // Auth boundary constrain
    await requirePartnerMembership(partnerId);

    const rawData = await db
      .select({
        sellerOrderId: sellerOrders.id,
        status: sellerOrders.status,
        e6RoutedToSellerAt: sellerOrders.e6RoutedToSellerAt,
        createdAt: sellerOrders.createdAt,
        decisionStatus: sellerAcceptanceDecisions.decisionStatus,
        expiresAt: sellerAcceptanceDecisions.expiresAt,
        buyerBusinessName: buyerLegalContextSnapshots.businessName,
        serverNow: sql<string>`clock_timestamp()`,
        itemCount: sql<number>`CAST(COUNT(${sellerOrderItems.id}) AS INTEGER)`,
        orderTotal: sql<string>`CAST(SUM(${sellerOrderItems.unitPrice} * ${sellerOrderItems.quantity}) AS TEXT)`,
        currency: sql<string>`MAX(${sellerOrderItems.currency})`,
        currencyCount: sql<number>`COUNT(DISTINCT ${sellerOrderItems.currency})`
      })
      .from(sellerOrders)
      .innerJoin(marketplaceOrders, eq(sellerOrders.marketplaceOrderId, marketplaceOrders.id))
      .innerJoin(buyerLegalContextSnapshots, eq(marketplaceOrders.buyerLegalContextSnapshotId, buyerLegalContextSnapshots.id))
      .leftJoin(sellerAcceptanceDecisions, eq(sellerOrders.id, sellerAcceptanceDecisions.sellerOrderId))
      .leftJoin(sellerOrderItems, eq(sellerOrders.id, sellerOrderItems.sellerOrderId))
      .where(eq(sellerOrders.partnerId, partnerId))
      .groupBy(
        sellerOrders.id,
        sellerOrders.status,
        sellerOrders.e6RoutedToSellerAt,
        sellerOrders.createdAt,
        sellerAcceptanceDecisions.decisionStatus,
        sellerAcceptanceDecisions.expiresAt,
        buyerLegalContextSnapshots.businessName
      )
      .orderBy(
        sql`
          CASE WHEN ${sellerOrders.status} = 'submitted' OR ${sellerAcceptanceDecisions.decisionStatus} = 'pending_seller_review' THEN 0 ELSE 1 END
        `,
        asc(sellerAcceptanceDecisions.expiresAt),
        asc(sellerOrders.id)
      );

    const items: PartnerOrderListItem[] = [];
    for (const row of rawData) {
      if (row.itemCount === 0 || !row.currency) {
         // Fail closed if zero items or no currency (since our app requires valid items)
         return { ok: false, code: "INVALID_ORDER_STATE" };
      }
      if (row.currencyCount > 1) {
         return { ok: false, code: "MIXED_CURRENCIES_UNSUPPORTED" };
      }

      const serverNow = new Date(row.serverNow);
      const { effectiveStatus, decisionWindowOpen } = deriveEffectiveStatus(
        row.status,
        row.decisionStatus,
        row.e6RoutedToSellerAt,
        row.expiresAt,
        serverNow
      );

      if (!row.orderTotal) {
         return { ok: false, code: "MISSING_TOTAL" };
      }

      items.push({
        sellerOrderId: row.sellerOrderId,
        publicOrderReference: `ORD-SO-${row.sellerOrderId}`,
        createdAt: row.createdAt,
        routedAt: row.e6RoutedToSellerAt,
        expiresAt: row.expiresAt,
        serverNow,
        persistedStatus: row.status,
        effectiveStatus,
        decisionWindowOpen,
        buyerBusinessName: row.buyerBusinessName,
        currency: row.currency,
        orderTotal: row.orderTotal,
        itemCount: row.itemCount,
      });
    }

    return { ok: true, items };
  } catch (error) {
    if (error && typeof error === "object" && "name" in error) {
       if (error.name === "UnauthorizedError" || error.name === "ForbiddenError") {
         return { ok: false, code: "UNAUTHORIZED" };
       }
    }
    console.error("getPartnerOrdersList error", error);
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}

export type PartnerOrderItemDTO = {
  id: number;
  offerTitle: string;
  manufacturer: string | null;
  model: string | null;
  quantity: number;
  unitPrice: string;
  currency: string;
  lineTotal: string;
};

export type PartnerOrderDetailDTO = {
  sellerOrderId: number;
  publicOrderReference: string;
  createdAt: Date;
  routedAt: Date | null;
  expiresAt: Date | null;
  serverNow: Date;
  persistedStatus: string;
  effectiveStatus: PartnerOrderEffectiveStatus;
  decisionWindowOpen: boolean;

  buyerBusinessName: string;
  buyerCountryCode: string;
  buyerTaxId: string | null;
  buyerRegistryId: string | null;

  buyerContactName: string | null;
  buyerEmail: string | null;
  buyerPhone: string | null;

  customerPoNumber: string | null;

  items: PartnerOrderItemDTO[];
  orderTotal: string;
  currency: string;

  resolvedAt: Date | null;
};

export async function getPartnerOrderDetail(
  partnerId: number,
  sellerOrderId: number
): Promise<{ ok: true; data: PartnerOrderDetailDTO } | { ok: false; code: string }> {
  try {
    // Auth boundary constrain
    await requirePartnerMembership(partnerId);

    const orderData = await db
      .select({
        sellerOrderId: sellerOrders.id,
        status: sellerOrders.status,
        e6RoutedToSellerAt: sellerOrders.e6RoutedToSellerAt,
        createdAt: sellerOrders.createdAt,

        customerPoNumber: marketplaceOrders.customerPoNumber,

        buyerBusinessName: buyerLegalContextSnapshots.businessName,
        buyerCountryCode: buyerLegalContextSnapshots.countryCode,
        buyerTaxId: buyerLegalContextSnapshots.taxIdentifierValue,
        buyerRegistryId: buyerLegalContextSnapshots.registryIdentifierValue,

        decisionStatus: sellerAcceptanceDecisions.decisionStatus,
        expiresAt: sellerAcceptanceDecisions.expiresAt,
        resolvedAt: sellerAcceptanceDecisions.resolvedAt,
        acceptedAt: sellerAcceptanceDecisions.acceptedAt,
        decidedByAuthUserId: sellerAcceptanceDecisions.decidedByAuthUserId,
        decisionSource: sellerAcceptanceDecisions.decisionSource,

        serverNow: sql<string>`clock_timestamp()`,
      })
      .from(sellerOrders)
      .innerJoin(marketplaceOrders, eq(sellerOrders.marketplaceOrderId, marketplaceOrders.id))
      .innerJoin(buyerLegalContextSnapshots, eq(marketplaceOrders.buyerLegalContextSnapshotId, buyerLegalContextSnapshots.id))
      .leftJoin(sellerAcceptanceDecisions, eq(sellerOrders.id, sellerAcceptanceDecisions.sellerOrderId))
      .where(and(
        eq(sellerOrders.partnerId, partnerId),
        eq(sellerOrders.id, sellerOrderId)
      ))
      .limit(1);

    if (orderData.length === 0) {
      return { ok: false, code: "NOT_FOUND" };
    }

    const row = orderData[0];
    const serverNow = new Date(row.serverNow);
    const { effectiveStatus, decisionWindowOpen } = deriveEffectiveStatus(
      row.status,
      row.decisionStatus,
      row.e6RoutedToSellerAt,
      row.expiresAt,
      serverNow
    );

    // Get items and use SQL for exact decimal math
    const itemsData = await db
      .select({
        id: sellerOrderItems.id,
        offerTitle: sellerOrderItems.offerTitle,
        manufacturer: sellerOrderItems.manufacturer,
        model: sellerOrderItems.model,
        quantity: sellerOrderItems.quantity,
        unitPrice: sellerOrderItems.unitPrice,
        currency: sellerOrderItems.currency,
        lineTotal: sql<string>`CAST(${sellerOrderItems.unitPrice} * ${sellerOrderItems.quantity} AS TEXT)`
      })
      .from(sellerOrderItems)
      .where(eq(sellerOrderItems.sellerOrderId, sellerOrderId));

    if (itemsData.length === 0) {
       return { ok: false, code: "INVALID_ORDER_STATE" };
    }

    const currencies = new Set<string>();
    for (const i of itemsData) {
      currencies.add(i.currency);
    }
    if (currencies.size > 1) {
       return { ok: false, code: "MIXED_CURRENCIES_UNSUPPORTED" };
    }

    const orderTotalData = await db
      .select({
         total: sql<string>`CAST(SUM(${sellerOrderItems.unitPrice} * ${sellerOrderItems.quantity}) AS TEXT)`
      })
      .from(sellerOrderItems)
      .where(eq(sellerOrderItems.sellerOrderId, sellerOrderId));

    const orderTotalValue = orderTotalData[0]?.total;
    if (!orderTotalValue) {
       return { ok: false, code: "MISSING_TOTAL" };
    }

    const contactInfo = {
      buyerContactName: null as string | null,
      buyerEmail: null as string | null,
      buyerPhone: null as string | null,
    };

    const isCanonicalAccepted = (
      row.decisionStatus === "seller_accepted" &&
      row.acceptedAt !== null &&
      row.resolvedAt !== null &&
      row.decidedByAuthUserId !== null &&
      row.decisionSource === "partner_portal" &&
      (row.status === "seller_accepted" || row.status === "fulfillment_in_progress" || row.status === "fulfilled")
    );

    if (isCanonicalAccepted) {
      const contactData = await db
        .select({
          contactName: marketplaceOrderBuyerContactSnapshots.contactName,
          email: marketplaceOrderBuyerContactSnapshots.email,
          phone: marketplaceOrderBuyerContactSnapshots.phone,
        })
        .from(marketplaceOrderBuyerContactSnapshots)
        .innerJoin(marketplaceOrders, eq(marketplaceOrderBuyerContactSnapshots.marketplaceOrderId, marketplaceOrders.id))
        .innerJoin(sellerOrders, eq(marketplaceOrders.id, sellerOrders.marketplaceOrderId))
        .where(eq(sellerOrders.id, sellerOrderId))
        .limit(1);

      if (contactData.length > 0) {
        contactInfo.buyerContactName = contactData[0].contactName;
        contactInfo.buyerEmail = contactData[0].email;
        contactInfo.buyerPhone = contactData[0].phone;
      }
    }

    return {
      ok: true,
      data: {
        sellerOrderId: row.sellerOrderId,
        publicOrderReference: `ORD-SO-${row.sellerOrderId}`,
        createdAt: row.createdAt,
        routedAt: row.e6RoutedToSellerAt,
        expiresAt: row.expiresAt,
        serverNow,
        persistedStatus: row.status,
        effectiveStatus,
        decisionWindowOpen,

        buyerBusinessName: row.buyerBusinessName,
        buyerCountryCode: row.buyerCountryCode,
        buyerTaxId: row.buyerTaxId,
        buyerRegistryId: row.buyerRegistryId,

        ...contactInfo,

        customerPoNumber: row.customerPoNumber,

        items: itemsData,
        orderTotal: orderTotalValue,
        currency: itemsData[0].currency,

        resolvedAt: row.resolvedAt,
      }
    };

  } catch (error) {
    if (error && typeof error === "object" && "name" in error) {
       if (error.name === "UnauthorizedError" || error.name === "ForbiddenError") {
         return { ok: false, code: "UNAUTHORIZED" };
       }
    }
    console.error("getPartnerOrderDetail error", error);
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}
