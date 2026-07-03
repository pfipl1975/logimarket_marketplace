import { eq, asc, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { offers, categories } from "@/lib/schema";
import { getCategoryDescendantIds } from "@/lib/catalog/tree";

export interface SitemapOfferEntry {
  id: number;
  createdAt: Date;
}

export interface SitemapCategoryEntry {
  slug: string;
}

export async function getSitemapOfferEntries(): Promise<SitemapOfferEntry[]> {
  return db
    .select({
      id: offers.id,
      createdAt: offers.createdAt,
    })
    .from(offers)
    .where(and(eq(offers.isActive, true), eq(offers.publicationStatus, "published")))
    .orderBy(asc(offers.id));
}

export async function getSitemapCategoryEntries(): Promise<SitemapCategoryEntry[]> {
  const allCats = await db.select().from(categories);
  if (allCats.length === 0) return [];

  const normalizedCats = allCats.map((row) => ({
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    parentId: row.parentId !== null ? Number(row.parentId) : null,
    createdAt: row.createdAt,
  }));

  const activeOffers = await db
    .select({
      categoryId: offers.categoryId,
    })
    .from(offers)
    .where(and(eq(offers.isActive, true), eq(offers.publicationStatus, "published")));

  const eligibleCategories: SitemapCategoryEntry[] = [];
  for (const cat of normalizedCats) {
    const descendantIds = getCategoryDescendantIds(normalizedCats, cat.id);
    const targetIds = [cat.id, ...descendantIds];

    const hasOffers = activeOffers.some((o) => targetIds.includes(Number(o.categoryId)));
    if (hasOffers) {
      eligibleCategories.push({
        slug: cat.slug,
      });
    }
  }

  return eligibleCategories;
}
