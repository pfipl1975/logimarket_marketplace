import { asc, count, ilike, or, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import { partners } from "@/lib/schema";
import { ADMIN_PARTNERS_PAGE_SIZE, type AdminPartnersQuery, isCanonicalPositiveInteger } from "./partners-query";

export interface AdminPartnerDto {
  id: number;
  companyName: string;
  contactEmail: string;
  createdAt: string;
}

export interface AdminPartnersReadModel {
  requestedPage: number;
  currentPage: number;
  pageSize: number;
  total: number;
  pageCount: number;
  items: AdminPartnerDto[];
}

export async function getAdminPartnersReadModel(
  db: NodePgDatabase<typeof schema>,
  query: AdminPartnersQuery
): Promise<AdminPartnersReadModel> {
  const conditions = [];

  if (query.q) {
    if (isCanonicalPositiveInteger(query.q)) {
      conditions.push(
        or(
          eq(partners.id, parseInt(query.q, 10)),
          ilike(partners.companyName, `%${query.q}%`)
        )
      );
    } else {
      conditions.push(ilike(partners.companyName, `%${query.q}%`));
    }
  }

  const whereClause = conditions.length > 0 ? conditions[0] : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(partners)
    .where(whereClause);

  const pageCount = Math.max(1, Math.ceil(total / ADMIN_PARTNERS_PAGE_SIZE));
  const currentPage = total === 0 ? 1 : Math.min(query.page, pageCount);

  const limit = ADMIN_PARTNERS_PAGE_SIZE;
  const offset = (currentPage - 1) * limit;

  const rows = await db
    .select({
      id: partners.id,
      companyName: partners.companyName,
      contactEmail: partners.contactEmail,
      createdAt: partners.createdAt,
    })
    .from(partners)
    .where(whereClause)
    .orderBy(asc(partners.companyName), asc(partners.id))
    .limit(limit)
    .offset(offset);

  const items: AdminPartnerDto[] = rows.map((row) => ({
    id: row.id,
    companyName: row.companyName,
    contactEmail: row.contactEmail,
    createdAt: row.createdAt.toISOString(),
  }));

  return {
    requestedPage: query.page,
    currentPage,
    pageSize: ADMIN_PARTNERS_PAGE_SIZE,
    total,
    pageCount,
    items,
  };
}
