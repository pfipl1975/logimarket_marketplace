import { desc, eq, ilike, inArray, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import { deriveEffectiveStatus, canDisclosePartnerBuyerDetails, type PartnerOrderEffectiveStatus } from "@/lib/partner-orders/read-model-core";
import { ADMIN_ORDERS_PAGE_SIZE, isCanonicalPositiveInteger, type AdminOrdersQuery } from "./orders-query";

export const ADMIN_ORDER_LIFECYCLES = ["not_routed", "pending_decision", "accepted", "fulfillment_in_progress", "fulfilled", "rejected", "expired", "cancelled", "invalid_order_state"] as const;
export type AdminOrderLifecycle = PartnerOrderEffectiveStatus | "not_routed";
export const MARKETPLACE_RECORD_STATES = ["intent_created", "checkout_submitted", "pending_seller_review", "completed", "cancelled"] as const;
export type MarketplaceRecordState = typeof MARKETPLACE_RECORD_STATES[number];
export type AdminLifecycleCounts = Record<AdminOrderLifecycle, number>;
export interface AdminOrderParentRow {
  id: number; createdAt: Date; status: string; buyerBusinessName: string | null;
}
export interface AdminSellerOrderRow {
  id: number; marketplaceOrderId: number; partnerId: number; status: string;
  routedAt: Date | null; sellerLegalName: string | null; sellerDisplayName: string | null;
  decisionStatus: string | null; expiresAt: Date | null; resolvedAt: Date | null;
  acceptedAt: Date | null; decidedByAuthUserId: string | null; decisionSource: string | null;
}
export interface AdminOrdersDto {
  id: number; createdAt: string; buyerBusinessName: string;
  sellerOrderCount: number; lifecycleCounts: AdminLifecycleCounts;
}
export interface AdminOrdersReadResult {
  items: AdminOrdersDto[]; totalCount: number; currentPage: number; pageSize: number; totalPages: number;
}
export interface AdminOrderDetailParentRow extends AdminOrderParentRow {
  e2BuyerIntentAt: Date; customerPoNumber: string | null;
  buyerCountry: string | null; buyerTaxIdentifier: string | null;
}
export interface AdminOrderItemRow {
  id: number; sellerOrderId: number; offerTitle: string; quantity: number; unitPrice: string; currency: string;
}
export interface AdminMarketplaceOrderDetail extends AdminOrdersDto {
  recordState: MarketplaceRecordState; e2BuyerIntentAt: string; customerPoNumber: string | null;
  buyerCountry: string; buyerTaxIdentifier: string | null;
  sellerOrders: {
    id: number; partnerId: number; sellerLegalName: string; sellerDisplayName: string;
    lifecycle: AdminOrderLifecycle; routedAt: string | null;
    decisionState: "pending_seller_review" | "seller_accepted" | "seller_rejected" | "expired" | "none" | "invalid";
    expiresAt: string | null; resolvedAt: string | null; acceptedAt: string | null;
    items: Omit<AdminOrderItemRow, "sellerOrderId">[];
  }[];
}
function assertParent(row: AdminOrderParentRow) {
  if (!MARKETPLACE_RECORD_STATES.some(state => state === row.status) || !row.buyerBusinessName?.trim()) {
    throw new Error("Marketplace order evidence is inconsistent");
  }
}
function canonicalDecision(row: AdminSellerOrderRow): boolean {
  if (row.decisionStatus === null) {
    return row.expiresAt === null && row.acceptedAt === null && row.resolvedAt === null && row.decidedByAuthUserId === null && row.decisionSource === null;
  }
  if (row.routedAt === null || row.expiresAt === null) return false;
  switch (row.decisionStatus) {
    case "pending_seller_review":
      return row.acceptedAt === null && row.resolvedAt === null && row.decidedByAuthUserId === null && row.decisionSource === null;
    case "seller_accepted":
      return canDisclosePartnerBuyerDetails({ ...row, status: "seller_accepted" });
    case "seller_rejected":
      return row.acceptedAt === null && row.resolvedAt !== null && row.decidedByAuthUserId !== null && row.decisionSource === "partner_portal";
    case "expired":
      return row.acceptedAt === null && row.resolvedAt !== null && row.decidedByAuthUserId === null && row.decisionSource === null;
    default: return false;
  }
}
export function deriveAdminSellerLifecycle(row: AdminSellerOrderRow, serverNow: Date): AdminOrderLifecycle {
  if (!row.sellerLegalName?.trim() || !row.sellerDisplayName?.trim() || !canonicalDecision(row)) return "invalid_order_state";
  if (row.status === "submitted" && row.decisionStatus === null && row.routedAt === null) return "not_routed";
  return deriveEffectiveStatus(row.status, row.decisionStatus, row.routedAt, row.expiresAt, serverNow).effectiveStatus;
}
/** One parent stays one row. Unexpected ownership or duplicates fail closed. */
export function projectAdminOrders(parents: readonly AdminOrderParentRow[], sellers: readonly AdminSellerOrderRow[], serverNow: Date): AdminOrdersDto[] {
  const groups = new Map<number, AdminOrdersDto>();
  for (const parent of parents) {
    assertParent(parent);
    if (groups.has(parent.id)) throw new Error("Duplicate Marketplace order");
    groups.set(parent.id, {
      id: parent.id, createdAt: parent.createdAt.toISOString(), buyerBusinessName: parent.buyerBusinessName!, sellerOrderCount: 0,
      lifecycleCounts: Object.fromEntries(ADMIN_ORDER_LIFECYCLES.map(state => [state, 0])) as AdminLifecycleCounts,
    });
  }
  const seen = new Set<number>();
  for (const seller of sellers) {
    const parent = groups.get(seller.marketplaceOrderId);
    if (!parent || seen.has(seller.id)) throw new Error("Seller order ownership is inconsistent");
    seen.add(seller.id);
    parent.sellerOrderCount++;
    parent.lifecycleCounts[deriveAdminSellerLifecycle(seller, serverNow)]++;
  }
  return [...groups.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
}
export function projectAdminOrderDetail(parent: AdminOrderDetailParentRow, sellers: readonly AdminSellerOrderRow[], items: readonly AdminOrderItemRow[], serverNow: Date): AdminMarketplaceOrderDetail {
  const summary = projectAdminOrders([parent], sellers, serverNow)[0];
  if (!parent.buyerCountry?.trim()) throw new Error("Buyer snapshot is inconsistent");
  const bySeller = new Map(sellers.map(seller => [seller.id, [] as AdminOrderItemRow[]]));
  const seen = new Set<number>();
  for (const item of items) {
    const group = bySeller.get(item.sellerOrderId);
    if (!group || seen.has(item.id) || !item.offerTitle.trim() || !Number.isSafeInteger(item.quantity) || item.quantity <= 0 ||
        !/^\d+(?:\.\d+)?$/.test(item.unitPrice) || !/^[A-Z]{3}$/.test(item.currency)) {
      throw new Error("Seller order items are inconsistent");
    }
    seen.add(item.id);
    group.push(item);
  }
  return {
    ...summary, recordState: parent.status as MarketplaceRecordState,
    e2BuyerIntentAt: parent.e2BuyerIntentAt.toISOString(), customerPoNumber: parent.customerPoNumber,
    buyerCountry: parent.buyerCountry, buyerTaxIdentifier: parent.buyerTaxIdentifier,
    sellerOrders: sellers.map(seller => {
      const sellerItems = bySeller.get(seller.id)!;
      if (!seller.sellerLegalName?.trim() || !seller.sellerDisplayName?.trim() || sellerItems.length === 0 || new Set(sellerItems.map(item => item.currency)).size !== 1) {
        throw new Error("Seller transaction evidence is inconsistent");
      }
      const decisionState = seller.decisionStatus === null ? "none" :
        ["pending_seller_review", "seller_accepted", "seller_rejected", "expired"].includes(seller.decisionStatus) ?
          seller.decisionStatus as "pending_seller_review" | "seller_accepted" | "seller_rejected" | "expired" : "invalid";
      return {
        id: seller.id, partnerId: seller.partnerId, sellerLegalName: seller.sellerLegalName, sellerDisplayName: seller.sellerDisplayName,
        lifecycle: deriveAdminSellerLifecycle(seller, serverNow), decisionState,
        routedAt: seller.routedAt?.toISOString() ?? null, expiresAt: seller.expiresAt?.toISOString() ?? null,
        resolvedAt: seller.resolvedAt?.toISOString() ?? null, acceptedAt: seller.acceptedAt?.toISOString() ?? null,
        items: sellerItems.map(({ id, offerTitle, quantity, unitPrice, currency }) => ({ id, offerTitle, quantity, unitPrice, currency })),
      };
    }),
  };
}
export function adminOrdersPagination(totalCount: number, requestedPage: number) {
  const totalPages = Math.max(1, Math.ceil(totalCount / ADMIN_ORDERS_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  return { totalPages, currentPage, offset: (currentPage - 1) * ADMIN_ORDERS_PAGE_SIZE };
}
export function adminOrdersSearchPredicate(q: string) {
  if (!q) return undefined;
  return isCanonicalPositiveInteger(q) ? eq(schema.marketplaceOrders.id, Number(q)) :
    ilike(schema.buyerLegalContextSnapshots.businessName, `%${q.replace(/[\\%_]/g, "\\$&")}%`);
}
const parentColumns = {
  id: schema.marketplaceOrders.id, createdAt: schema.marketplaceOrders.createdAt, status: schema.marketplaceOrders.status,
  buyerBusinessName: schema.buyerLegalContextSnapshots.businessName,
};
const sellerColumns = {
  id: schema.sellerOrders.id, marketplaceOrderId: schema.sellerOrders.marketplaceOrderId, partnerId: schema.sellerOrders.partnerId,
  status: schema.sellerOrders.status, routedAt: schema.sellerOrders.e6RoutedToSellerAt,
  sellerLegalName: schema.sellerOrderSellerSnapshots.sellerLegalName, sellerDisplayName: schema.sellerOrderSellerSnapshots.sellerDisplayName,
  decisionStatus: schema.sellerAcceptanceDecisions.decisionStatus, expiresAt: schema.sellerAcceptanceDecisions.expiresAt,
  resolvedAt: schema.sellerAcceptanceDecisions.resolvedAt, acceptedAt: schema.sellerAcceptanceDecisions.acceptedAt,
  decidedByAuthUserId: schema.sellerAcceptanceDecisions.decidedByAuthUserId, decisionSource: schema.sellerAcceptanceDecisions.decisionSource,
};
async function loadSellers(db: NodePgDatabase<typeof schema>, parentIds: number[]) {
  if (parentIds.length === 0) return [];
  return db.select(sellerColumns).from(schema.sellerOrders)
    .leftJoin(schema.sellerAcceptanceDecisions, eq(schema.sellerAcceptanceDecisions.sellerOrderId, schema.sellerOrders.id))
    .leftJoin(schema.sellerOrderSellerSnapshots, eq(schema.sellerOrderSellerSnapshots.sellerOrderId, schema.sellerOrders.id))
    .where(inArray(schema.sellerOrders.marketplaceOrderId, parentIds)).orderBy(schema.sellerOrders.id);
}
export async function getAdminOrdersReadModel(db: NodePgDatabase<typeof schema>, query: AdminOrdersQuery): Promise<AdminOrdersReadResult> {
  return db.transaction(async tx => {
    const predicate = adminOrdersSearchPredicate(query.q);
    const [count] = await tx.select({ count: sql<number>`count(*)::int` }).from(schema.marketplaceOrders)
      .leftJoin(schema.buyerLegalContextSnapshots, eq(schema.buyerLegalContextSnapshots.id, schema.marketplaceOrders.buyerLegalContextSnapshotId)).where(predicate);
    const totalCount = count.count;
    const { totalPages, currentPage, offset } = adminOrdersPagination(totalCount, query.page);
    const parents = await tx.select(parentColumns).from(schema.marketplaceOrders)
      .leftJoin(schema.buyerLegalContextSnapshots, eq(schema.buyerLegalContextSnapshots.id, schema.marketplaceOrders.buyerLegalContextSnapshotId))
      .where(predicate).orderBy(desc(schema.marketplaceOrders.createdAt), desc(schema.marketplaceOrders.id)).limit(ADMIN_ORDERS_PAGE_SIZE).offset(offset);
    const sellers = await loadSellers(tx, parents.map(parent => parent.id));
    return { items: projectAdminOrders(parents, sellers, new Date()), totalCount, currentPage, pageSize: ADMIN_ORDERS_PAGE_SIZE, totalPages };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
export async function getAdminMarketplaceOrderDetailReadModel(db: NodePgDatabase<typeof schema>, id: number): Promise<AdminMarketplaceOrderDetail | null> {
  return db.transaction(async tx => {
    const parents = await tx.select({ ...parentColumns, e2BuyerIntentAt: schema.marketplaceOrders.e2BuyerIntentAt,
      customerPoNumber: schema.marketplaceOrders.customerPoNumber, buyerCountry: schema.buyerLegalContextSnapshots.countryCode,
      buyerTaxIdentifier: schema.buyerLegalContextSnapshots.taxIdentifierValue }).from(schema.marketplaceOrders)
      .leftJoin(schema.buyerLegalContextSnapshots, eq(schema.buyerLegalContextSnapshots.id, schema.marketplaceOrders.buyerLegalContextSnapshotId))
      .where(eq(schema.marketplaceOrders.id, id)).limit(1);
    if (parents.length === 0) return null;
    const sellers = await loadSellers(tx, [id]);
    const items = sellers.length === 0 ? [] : await tx.select({ id: schema.sellerOrderItems.id, sellerOrderId: schema.sellerOrderItems.sellerOrderId,
      offerTitle: schema.sellerOrderItems.offerTitle, quantity: schema.sellerOrderItems.quantity, unitPrice: schema.sellerOrderItems.unitPrice, currency: schema.sellerOrderItems.currency })
      .from(schema.sellerOrderItems).where(inArray(schema.sellerOrderItems.sellerOrderId, sellers.map(seller => seller.id))).orderBy(schema.sellerOrderItems.id);
    return projectAdminOrderDetail(parents[0], sellers, items, new Date());
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
