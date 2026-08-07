import { sql, and, eq, ilike, desc } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import { ADMIN_ORDERS_PAGE_SIZE } from "./orders-query";
import type { AdminOrdersQuery } from "./orders-query";

export interface AdminOrdersDto {
  id: number;
  createdAt: string | null;
  status: string;

  companyName: string | null;
  contactName: string | null;
  email: string | null;

  itemCount: number;
}

export interface AdminOrdersReadResult {
  items: AdminOrdersDto[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

export async function getAdminOrdersReadModel(
  db: NodePgDatabase<typeof schema>,
  query: AdminOrdersQuery
): Promise<AdminOrdersReadResult> {
  const conditions = [];

  if (query.q) {
    if (/^[1-9]\d*$/.test(query.q) && Number.isSafeInteger(Number(query.q))) {
      conditions.push(eq(schema.orders.id, Number(query.q)));
    } else {
      conditions.push(ilike(schema.orders.companyName, `%${query.q}%`));
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db
    .select({ value: sql<number>`cast(count(*) as integer)` })
    .from(schema.orders)
    .where(whereClause);

  const totalCount = countResult[0]?.value ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / ADMIN_ORDERS_PAGE_SIZE));
  const currentPage = totalCount === 0 ? 1 : Math.max(1, Math.min(query.page, totalPages));
  const offset = (currentPage - 1) * ADMIN_ORDERS_PAGE_SIZE;

  // Correlated scalar subquery for itemCount — prevents row multiplication
  const orderRows = await db
    .select({
      id: schema.orders.id,
      createdAt: schema.orders.createdAt,
      status: schema.orders.status,
      companyName: schema.orders.companyName,
      contactName: schema.orders.contactName,
      email: schema.orders.email,
      itemCount: sql<number>`(select cast(count(*) as integer) from ${schema.orderItems} where ${schema.orderItems.orderId} = ${schema.orders.id})`,
    })
    .from(schema.orders)
    .where(whereClause)
    .orderBy(
      sql`${schema.orders.createdAt} DESC NULLS LAST`,
      desc(schema.orders.id)
    )
    .limit(ADMIN_ORDERS_PAGE_SIZE)
    .offset(offset);

  const items: AdminOrdersDto[] = orderRows.map((row) => ({
    id: Number(row.id),
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    status: row.status,
    companyName: row.companyName,
    contactName: row.contactName,
    email: row.email,
    itemCount: row.itemCount ?? 0,
  }));

  return {
    items,
    totalCount,
    currentPage,
    pageSize: ADMIN_ORDERS_PAGE_SIZE,
    totalPages,
  };
}
