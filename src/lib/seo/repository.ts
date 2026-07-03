import { eq, asc, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { offers } from "@/lib/schema";

export interface SitemapOfferEntry {
  id: number;
  createdAt: Date;
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
