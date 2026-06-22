import 'server-only'
import { and, asc, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categories, offers, partners } from '@/lib/db/schema'
import type { TechnicalAttributes } from '@/lib/db/schema'

export type CatalogOffer = {
  id: number
  title: string
  description: string | null
  imageUrl: string | null
  priceBrutto: string | null
  priceOnRequest: boolean
  conversionType: string
  outboundUrl: string | null
  isFeatured: boolean
  technicalAttributes: TechnicalAttributes
  categoryName: string
  categorySlug: string
  partnerId: number
  partnerName: string
  partnerLogo: string | null
  partnerWebsite: string | null
  partnerEmail: string
}

function rowToOffer(row: {
  offer: typeof offers.$inferSelect
  category: typeof categories.$inferSelect | null
  partner: typeof partners.$inferSelect | null
}): CatalogOffer {
  return {
    id: row.offer.id,
    title: row.offer.title,
    description: row.offer.description,
    imageUrl: row.offer.imageUrl,
    priceBrutto: row.offer.priceBrutto,
    priceOnRequest: row.offer.priceOnRequest,
    conversionType: row.offer.conversionType,
    outboundUrl: row.offer.outboundUrl,
    isFeatured: row.offer.isFeatured,
    technicalAttributes:
      (row.offer.technicalAttributes as TechnicalAttributes) ?? {},
    categoryName: row.category?.name ?? 'Bez kategorii',
    categorySlug: row.category?.slug ?? '',
    partnerId: row.partner?.id ?? 0,
    partnerName: row.partner?.companyName ?? 'Partner',
    partnerLogo: row.partner?.logoUrl ?? null,
    partnerWebsite: row.partner?.websiteUrl ?? null,
    partnerEmail: row.partner?.contactEmail ?? '',
  }
}

export async function getCategories() {
  return db.select().from(categories).orderBy(asc(categories.name))
}

export async function getOffers(categorySlug?: string): Promise<CatalogOffer[]> {
  const conditions = [eq(offers.isActive, true)]
  if (categorySlug) {
    conditions.push(eq(categories.slug, categorySlug))
  }

  const rows = await db
    .select({ offer: offers, category: categories, partner: partners })
    .from(offers)
    .leftJoin(categories, eq(offers.categoryId, categories.id))
    .leftJoin(partners, eq(offers.partnerId, partners.id))
    .where(and(...conditions))
    .orderBy(desc(offers.isFeatured), desc(offers.createdAt))

  return rows.map(rowToOffer)
}

export async function getOfferById(id: number): Promise<CatalogOffer | null> {
  const rows = await db
    .select({ offer: offers, category: categories, partner: partners })
    .from(offers)
    .leftJoin(categories, eq(offers.categoryId, categories.id))
    .leftJoin(partners, eq(offers.partnerId, partners.id))
    .where(and(eq(offers.id, id), eq(offers.isActive, true)))
    .limit(1)

  if (rows.length === 0) return null
  return rowToOffer(rows[0])
}
