import { sql, or, and, eq, ilike, desc } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import { ADMIN_RFQ_PAGE_SIZE, isCanonicalPositiveInteger } from "./rfq-query";
import type { AdminRfqQuery } from "./rfq-query";

// ---------------------------------------------------------------------------
// List DTO — intentional PII minimization (no contactName/email/phone/message)
// ---------------------------------------------------------------------------
export interface AdminRfqListItemDto {
  id: number;
  createdAt: string | null;
  status: string;

  companyName: string | null;

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
  items: AdminRfqListItemDto[];
}

function buildFilters(query: AdminRfqQuery) {
  const clauses = [];

  // Text search across company/offer/partner (no PII fields)
  if (query.q) {
    const textConditions: ReturnType<typeof eq>[] = [
      ilike(schema.rfqLeads.companyName, `%${query.q}%`) as ReturnType<typeof eq>,
      ilike(schema.offers.title, `%${query.q}%`) as ReturnType<typeof eq>,
      ilike(schema.partners.companyName, `%${query.q}%`) as ReturnType<typeof eq>,
    ];

    if (isCanonicalPositiveInteger(query.q)) {
      const num = Number(query.q);
      textConditions.push(eq(schema.rfqLeads.id, num) as ReturnType<typeof eq>);
      textConditions.push(eq(schema.rfqLeads.offerId, num) as ReturnType<typeof eq>);
      textConditions.push(eq(schema.rfqLeads.partnerId, num) as ReturnType<typeof eq>);
    }

    clauses.push(or(...textConditions));
  }

  // Status server-side filter
  if (query.status) {
    clauses.push(eq(schema.rfqLeads.status, query.status));
  }

  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return and(...clauses);
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

  const items: AdminRfqListItemDto[] = itemsRows.map((row) => ({
    id: Number(row.id),
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    status: row.status,
    companyName: row.companyName,
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
