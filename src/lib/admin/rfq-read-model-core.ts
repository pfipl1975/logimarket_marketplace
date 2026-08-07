import { sql, or, eq, ilike, desc } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import { ADMIN_RFQ_PAGE_SIZE, isCanonicalPositiveInteger } from "./rfq-query";
import type { AdminRfqQuery } from "./rfq-query";

export interface AdminRfqDto {
  id: number;
  createdAt: string | null;
  status: string;

  companyName: string | null;
  contactName: string;
  email: string;

  offerId: number;
  offerTitle: string | null;

  partnerId: number;
  partnerCompanyName: string | null;
}

export interface AdminRfqReadModel {
  requestedPage: number;
  currentPage: number;
  pageSize: number;
  total: number;
  pageCount: number;
  items: AdminRfqDto[];
}

function buildFilters(query: AdminRfqQuery) {
  if (!query.q) return undefined;

  const searchConditions = [
    ilike(schema.rfqLeads.companyName, `%${query.q}%`),
    ilike(schema.offers.title, `%${query.q}%`),
    ilike(schema.partners.companyName, `%${query.q}%`),
  ];

  if (isCanonicalPositiveInteger(query.q)) {
    const num = Number(query.q);
    searchConditions.push(eq(schema.rfqLeads.id, num));
    searchConditions.push(eq(schema.rfqLeads.offerId, num));
    searchConditions.push(eq(schema.rfqLeads.partnerId, num));
  }

  return or(...searchConditions);
}

export async function getAdminRfqReadModel(
  db: NodePgDatabase<typeof schema>,
  query: AdminRfqQuery
): Promise<AdminRfqReadModel> {
  const filters = buildFilters(query);

  const countResult = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(schema.rfqLeads)
    .leftJoin(schema.offers, eq(schema.offers.id, schema.rfqLeads.offerId))
    .leftJoin(schema.partners, eq(schema.partners.id, schema.rfqLeads.partnerId))
    .where(filters);

  const total = countResult[0]?.count ?? 0;

  const pageCount = Math.max(1, Math.ceil(total / ADMIN_RFQ_PAGE_SIZE));
  const effectivePage = total === 0 ? 1 : Math.min(query.page, pageCount);
  const offset = (effectivePage - 1) * ADMIN_RFQ_PAGE_SIZE;

  const itemsRows = await db
    .select({
      id: schema.rfqLeads.id,
      createdAt: schema.rfqLeads.createdAt,
      status: schema.rfqLeads.status,
      companyName: schema.rfqLeads.companyName,
      contactName: schema.rfqLeads.contactName,
      email: schema.rfqLeads.email,
      offerId: schema.rfqLeads.offerId,
      offerTitle: schema.offers.title,
      partnerId: schema.rfqLeads.partnerId,
      partnerCompanyName: schema.partners.companyName,
    })
    .from(schema.rfqLeads)
    .leftJoin(schema.offers, eq(schema.offers.id, schema.rfqLeads.offerId))
    .leftJoin(schema.partners, eq(schema.partners.id, schema.rfqLeads.partnerId))
    .where(filters)
    .orderBy(
      sql`${schema.rfqLeads.createdAt} DESC NULLS LAST`,
      desc(schema.rfqLeads.id)
    )
    .limit(ADMIN_RFQ_PAGE_SIZE)
    .offset(offset);

  const items: AdminRfqDto[] = itemsRows.map((row) => ({
    id: Number(row.id),
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    status: row.status,
    companyName: row.companyName,
    contactName: row.contactName,
    email: row.email,
    offerId: Number(row.offerId),
    offerTitle: row.offerTitle,
    partnerId: Number(row.partnerId),
    partnerCompanyName: row.partnerCompanyName,
  }));

  return {
    requestedPage: query.page,
    currentPage: effectivePage,
    pageSize: ADMIN_RFQ_PAGE_SIZE,
    total,
    pageCount,
    items,
  };
}
