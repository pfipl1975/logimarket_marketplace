import { sql, and, or, eq, inArray, desc, ilike, asc } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import { resolveCanonicalOfferModel } from "@/lib/offers/model";
import type { CanonicalOfferModelResolution } from "@/lib/offers/model";
import { isPublicOfferDetailStatus } from "@/lib/offers/status";
import { ADMIN_OFFERS_PAGE_SIZE, isCanonicalPositiveInteger } from "./offers-query";
import type { AdminOffersQuery, AdminOfferStatusFilter } from "./offers-query";

export interface AdminOfferDto {
  id: number;
  title: string;
  partnerId: number;
  partnerName: string;
  categoryId: number;
  categoryName: string;
  canonicalModel: CanonicalOfferModelResolution;
  publicationStatus: AdminOfferStatusFilter | "unknown";
  isActive: boolean;
  isFeatured: boolean;
  priceBrutto: string | null;
  priceOnRequest: boolean;
  createdAt: string;
  updatedAt: string | null;
  publicPreviewAllowed: boolean;
}

export interface AdminPartnerOption {
  id: number;
  companyName: string;
}

export interface AdminCategoryOption {
  id: number;
  name: string;
}

export interface AdminOffersReadResult {
  requestedPage: number;
  currentPage: number;
  pageSize: number;
  total: number;
  pageCount: number;
  items: AdminOfferDto[];
  filterOptions: {
    partners: AdminPartnerOption[];
    categories: AdminCategoryOption[];
  };
}

function buildFilters(query: AdminOffersQuery) {
  const conditions = [];

  if (query.status) {
    conditions.push(eq(schema.offers.publicationStatus, query.status));
  }

  if (query.partner) {
    conditions.push(eq(schema.offers.partnerId, query.partner));
  }

  if (query.category) {
    conditions.push(eq(schema.offers.categoryId, query.category));
  }

  if (query.model) {
    const isRfq = and(eq(schema.offers.offerModel, "rfq"), eq(schema.offers.conversionType, "inbound"));
    const isEcommerce = and(eq(schema.offers.offerModel, "marketplace"), eq(schema.offers.conversionType, "inbound"));
    const isOutbound = and(inArray(schema.offers.offerModel, ["rfq", "marketplace"]), eq(schema.offers.conversionType, "outbound"));
    
    if (query.model === "rfq") {
      conditions.push(isRfq);
    } else if (query.model === "ecommerce") {
      conditions.push(isEcommerce);
    } else if (query.model === "outbound") {
      conditions.push(isOutbound);
    } else if (query.model === "unknown") {
      conditions.push(sql`NOT (${isRfq} OR ${isEcommerce} OR ${isOutbound})`);
    }
  }

  if (query.q) {
    const searchConditions = [
      ilike(schema.offers.title, `%${query.q}%`),
      ilike(schema.partners.companyName, `%${query.q}%`),
      ilike(schema.categories.name, `%${query.q}%`)
    ];

    if (isCanonicalPositiveInteger(query.q)) {
      searchConditions.push(eq(schema.offers.id, Number(query.q)));
    }

    conditions.push(or(...searchConditions));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function getAdminOffersReadModel(
  db: NodePgDatabase<typeof schema>,
  query: AdminOffersQuery
): Promise<AdminOffersReadResult> {
  const filters = buildFilters(query);

  // 1. Fetch total count
  const countResult = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(schema.offers)
    .leftJoin(schema.partners, eq(schema.offers.partnerId, schema.partners.id))
    .leftJoin(schema.categories, eq(schema.offers.categoryId, schema.categories.id))
    .where(filters);

  const total = countResult[0]?.count ?? 0;

  // 2. Pagination clamp
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_OFFERS_PAGE_SIZE));
  const effectivePage = total === 0 ? 1 : Math.min(query.page, pageCount);
  const offset = (effectivePage - 1) * ADMIN_OFFERS_PAGE_SIZE;

  // 3. Fetch items
  const itemsRows = await db
    .select({
      offer: schema.offers,
      partner: schema.partners,
      category: schema.categories,
    })
    .from(schema.offers)
    .leftJoin(schema.partners, eq(schema.offers.partnerId, schema.partners.id))
    .leftJoin(schema.categories, eq(schema.offers.categoryId, schema.categories.id))
    .where(filters)
    .orderBy(desc(schema.offers.createdAt), desc(schema.offers.id))
    .limit(ADMIN_OFFERS_PAGE_SIZE)
    .offset(offset);

  const items: AdminOfferDto[] = itemsRows.map((row) => {
    const rawStatus = row.offer.publicationStatus;
    const isExpectedStatus = rawStatus === "draft" || rawStatus === "published" || rawStatus === "archived" || rawStatus === "hidden" || rawStatus === "deleted";
    
    return {
      id: Number(row.offer.id),
      title: row.offer.title,
      partnerId: Number(row.offer.partnerId),
      partnerName: row.partner?.companyName ?? "—",
      categoryId: Number(row.offer.categoryId),
      categoryName: row.category?.name ?? "—",
      canonicalModel: resolveCanonicalOfferModel(row.offer.offerModel, row.offer.conversionType),
      publicationStatus: isExpectedStatus ? (rawStatus as AdminOfferStatusFilter) : "unknown",
      isActive: row.offer.isActive,
      isFeatured: row.offer.isFeatured,
      priceBrutto: row.offer.priceBrutto,
      priceOnRequest: row.offer.priceOnRequest,
      createdAt: row.offer.createdAt.toISOString(),
      updatedAt: row.offer.updatedAt?.toISOString() ?? null,
      publicPreviewAllowed: isPublicOfferDetailStatus(row.offer.publicationStatus),
    };
  });

  // 4. Fetch filter options deterministically
  const partnerRows = await db
    .select({
      id: schema.partners.id,
      companyName: schema.partners.companyName,
    })
    .from(schema.partners)
    .orderBy(asc(schema.partners.companyName), asc(schema.partners.id));

  const categoryRows = await db
    .select({
      id: schema.categories.id,
      name: schema.categories.name,
    })
    .from(schema.categories)
    .orderBy(asc(schema.categories.name), asc(schema.categories.id));

  return {
    requestedPage: query.page,
    currentPage: effectivePage,
    pageSize: ADMIN_OFFERS_PAGE_SIZE,
    total,
    pageCount,
    items,
    filterOptions: {
      partners: partnerRows.map(p => ({ id: Number(p.id), companyName: p.companyName })),
      categories: categoryRows.map(c => ({ id: Number(c.id), name: c.name })),
    },
  };
}
