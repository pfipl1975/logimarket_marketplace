import { and, desc, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import { isRfqStatus, PARTNER_RFQ_PAGE_SIZE, type PartnerRfqFilter, type PartnerRfqQuery } from "./query";

export type PartnerRfqCounts = Record<PartnerRfqFilter, number>;
export type PartnerRfqListItem = {
  id: number;
  createdAt: string | null;
  status: schema.RfqStatus;
  companyName: string | null;
  offerTitle: string | null;
};
export type PartnerRfqDetail = PartnerRfqListItem & {
  contactName: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  ownedOfferId: number | null;
};

export function projectPartnerRfqCounts(rows: readonly { status: unknown; count: number }[]): PartnerRfqCounts {
  const counts: PartnerRfqCounts = { new: 0, in_progress: 0, responded: 0, closed: 0, all: 0 };
  const seen = new Set<string>();
  for (const row of rows) {
    if (!isRfqStatus(row.status) || seen.has(row.status) || !Number.isSafeInteger(row.count) || row.count < 0) {
      throw new Error("INVALID_RFQ_STATE");
    }
    seen.add(row.status);
    counts[row.status] = row.count;
    counts.all += row.count;
  }
  if (!Number.isSafeInteger(counts.all)) throw new Error("INVALID_RFQ_STATE");
  return counts;
}

export function projectPartnerRfqListItem(row: {
  id: number; createdAt: Date | null; status: unknown; companyName: string | null; offerTitle: string | null;
}): PartnerRfqListItem {
  if (!isRfqStatus(row.status) || !Number.isSafeInteger(row.id) || row.id <= 0) throw new Error("INVALID_RFQ_STATE");
  return { id: row.id, createdAt: row.createdAt?.toISOString() ?? null, status: row.status,
    companyName: row.companyName, offerTitle: row.offerTitle };
}

export function partnerRfqPage(query: PartnerRfqQuery, total: number) {
  const pageCount = Math.max(1, Math.ceil(total / PARTNER_RFQ_PAGE_SIZE));
  const currentPage = Math.min(query.page, pageCount);
  return { currentPage, pageCount, offset: (currentPage - 1) * PARTNER_RFQ_PAGE_SIZE };
}

export async function getPartnerRfqListCore(db: NodePgDatabase<typeof schema>, partnerId: number, query: PartnerRfqQuery) {
  const grouped = await db.select({ status: schema.rfqLeads.status, count: sql<number>`count(*)::int` })
    .from(schema.rfqLeads).where(eq(schema.rfqLeads.partnerId, partnerId)).groupBy(schema.rfqLeads.status);
  const counts = projectPartnerRfqCounts(grouped);
  const total = counts[query.status];
  const { currentPage, pageCount, offset } = partnerRfqPage(query, total);
  const rows = await db.select({
    id: schema.rfqLeads.id, createdAt: schema.rfqLeads.createdAt, status: schema.rfqLeads.status,
    companyName: schema.rfqLeads.companyName, offerTitle: schema.offers.title,
  }).from(schema.rfqLeads)
    .leftJoin(schema.offers, and(eq(schema.offers.id, schema.rfqLeads.offerId), eq(schema.offers.partnerId, partnerId)))
    .where(and(eq(schema.rfqLeads.partnerId, partnerId), query.status === "all" ? undefined : eq(schema.rfqLeads.status, query.status)))
    .orderBy(sql`${schema.rfqLeads.createdAt} DESC NULLS LAST`, desc(schema.rfqLeads.id))
    .limit(PARTNER_RFQ_PAGE_SIZE).offset(offset);
  return { counts, items: rows.map(projectPartnerRfqListItem), total, currentPage, pageCount };
}

export async function getPartnerRfqDetailCore(db: NodePgDatabase<typeof schema>, partnerId: number, rfqId: number): Promise<PartnerRfqDetail | null> {
  if (!Number.isSafeInteger(rfqId) || rfqId <= 0) return null;
  const rows = await db.select({
    id: schema.rfqLeads.id, createdAt: schema.rfqLeads.createdAt, status: schema.rfqLeads.status,
    companyName: schema.rfqLeads.companyName, offerTitle: schema.offers.title,
    contactName: schema.rfqLeads.contactName, email: schema.rfqLeads.email,
    phone: schema.rfqLeads.phone, message: schema.rfqLeads.message, ownedOfferId: schema.offers.id,
  }).from(schema.rfqLeads)
    .leftJoin(schema.offers, and(eq(schema.offers.id, schema.rfqLeads.offerId), eq(schema.offers.partnerId, partnerId)))
    .where(and(eq(schema.rfqLeads.id, rfqId), eq(schema.rfqLeads.partnerId, partnerId))).limit(1);
  const row = rows[0];
  if (!row) return null;
  return { ...projectPartnerRfqListItem(row), contactName: row.contactName, email: row.email,
    phone: row.phone, message: row.message, ownedOfferId: row.ownedOfferId };
}
