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

export type PartnerOrderEffectiveStatus =
  | "pending_decision"
  | "accepted"
  | "rejected"
  | "expired"
  | "fulfillment_in_progress"
  | "fulfilled"
  | "cancelled";

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

export function deriveEffectiveStatus(
  persistedOrderStatus: string,
  decisionStatus: string | null,
  expiresAt: Date | null,
  serverNow: Date
): { effectiveStatus: PartnerOrderEffectiveStatus; decisionWindowOpen: boolean } {
  if (
    persistedOrderStatus === "submitted" ||
    (decisionStatus === "pending_seller_review" && persistedOrderStatus !== "expired")
  ) {
    if (expiresAt && serverNow.getTime() >= expiresAt.getTime()) {
      return { effectiveStatus: "expired", decisionWindowOpen: false };
    }
    return { effectiveStatus: "pending_decision", decisionWindowOpen: true };
  }

  if (persistedOrderStatus === "expired" || decisionStatus === "expired") {
    return { effectiveStatus: "expired", decisionWindowOpen: false };
  }

  if (persistedOrderStatus === "seller_accepted" || decisionStatus === "seller_accepted") {
    return { effectiveStatus: "accepted", decisionWindowOpen: false };
  }

  if (persistedOrderStatus === "seller_rejected" || decisionStatus === "seller_rejected") {
    return { effectiveStatus: "rejected", decisionWindowOpen: false };
  }

  if (persistedOrderStatus === "fulfillment_in_progress") {
    return { effectiveStatus: "fulfillment_in_progress", decisionWindowOpen: false };
  }

  if (persistedOrderStatus === "fulfilled") {
    return { effectiveStatus: "fulfilled", decisionWindowOpen: false };
  }

  if (persistedOrderStatus === "cancelled") {
    return { effectiveStatus: "cancelled", decisionWindowOpen: false };
  }

  return { effectiveStatus: "pending_decision", decisionWindowOpen: false }; // fallback
}

export async function getPartnerOrdersList(
  partnerId: number
): Promise<{ ok: true; items: PartnerOrderListItem[] } | { ok: false; code: string }> {
  try {
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

    const items: PartnerOrderListItem[] = rawData.map((row) => {
      const serverNow = new Date(row.serverNow);
      const { effectiveStatus, decisionWindowOpen } = deriveEffectiveStatus(
        row.status,
        row.decisionStatus,
        row.expiresAt,
        serverNow
      );

      if (row.currencyCount > 1) {
        throw new Error(`SellerOrder ${row.sellerOrderId} has mixed currencies`);
      }

      return {
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
        currency: row.currency || "EUR",
        orderTotal: row.orderTotal || "0",
        itemCount: row.itemCount || 0,
      };
    });

    return { ok: true, items };
  } catch (error) {
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
  
  decidedByAuthUserId: string | null;
  resolvedAt: Date | null;
};

export async function getPartnerOrderDetail(
  partnerId: number,
  sellerOrderId: number
): Promise<{ ok: true; data: PartnerOrderDetailDTO } | { ok: false; code: string }> {
  try {
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
        decidedByAuthUserId: sellerAcceptanceDecisions.decidedByAuthUserId,
        resolvedAt: sellerAcceptanceDecisions.resolvedAt,
        
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
      row.expiresAt,
      serverNow
    );

    const itemsData = await db
      .select()
      .from(sellerOrderItems)
      .where(eq(sellerOrderItems.sellerOrderId, sellerOrderId));

    let total = 0;
    const currencies = new Set<string>();
    
    const items: PartnerOrderItemDTO[] = itemsData.map(i => {
      currencies.add(i.currency);
      total += Number(i.unitPrice) * i.quantity;
      return {
        id: i.id,
        offerTitle: i.offerTitle,
        manufacturer: i.manufacturer,
        model: i.model,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        currency: i.currency
      };
    });

    if (currencies.size > 1) {
       return { ok: false, code: "MIXED_CURRENCIES_UNSUPPORTED" };
    }

    let contactInfo = {
      buyerContactName: null as string | null,
      buyerEmail: null as string | null,
      buyerPhone: null as string | null,
    };

    if (effectiveStatus === "accepted" || effectiveStatus === "fulfillment_in_progress" || effectiveStatus === "fulfilled") {
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
        contactInfo = {
          buyerContactName: contactData[0].contactName,
          buyerEmail: contactData[0].email,
          buyerPhone: contactData[0].phone,
        };
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
        
        items,
        orderTotal: total.toFixed(2),
        currency: itemsData[0]?.currency || "EUR",
        
        decidedByAuthUserId: row.decidedByAuthUserId,
        resolvedAt: row.resolvedAt,
      }
    };

  } catch (error) {
    console.error("getPartnerOrderDetail error", error);
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}
