import { and, eq, sql, desc } from "drizzle-orm";
import { categories, offers, partners } from "@/lib/schema";
import type { NormalizedCatalogSearchQuery } from "./types";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";

export function escapeLike(str: string): string {
  return str.replace(/([\\%_])/g, "\\$1");
}

import { CATALOG_SEARCH_LIMITS } from "./types";

export function queryCatalogSearch(
  db: NodePgDatabase<typeof schema>,
  query: NormalizedCatalogSearchQuery
) {
  if (
    query.isEmpty ||
    query.tokens.length === 0 ||
    query.tokens.length > CATALOG_SEARCH_LIMITS.maxTokenCount
  ) {
    throw new Error("Invalid normalized catalog search query");
  }

  const exactParam = escapeLike(query.matchQuery);
  const prefixParam = `${escapeLike(query.matchQuery)}%`;
  const phraseParam = `%${escapeLike(query.matchQuery)}%`;

  const exactMatches = sql`(${offers.title} ILIKE ${exactParam} ESCAPE '\\')`;
  const prefixMatches = sql`(${offers.title} ILIKE ${prefixParam} ESCAPE '\\')`;
  const phraseMatches = sql`(${offers.title} ILIKE ${phraseParam} ESCAPE '\\')`;

  const allTokensSql = query.tokens.length > 0
    ? sql`(${sql.join(
        query.tokens.map((t) => sql`${offers.title} ILIKE ${`%${escapeLike(t)}%`} ESCAPE '\\'`),
        sql` AND `
      )})`
    : sql`TRUE`;

  const scoreExpression = sql<number>`
    CASE 
      WHEN ${exactMatches} THEN 100
      WHEN ${prefixMatches} THEN 80
      WHEN ${phraseMatches} THEN 60
      WHEN ${allTokensSql} THEN 40
      ELSE 0
    END
  `;
  const scoreField = scoreExpression.as("score");

  const filterConditions = and(
    eq(offers.isActive, true),
    eq(offers.publicationStatus, "published"),
    ...query.tokens.map((t) => sql`${offers.title} ILIKE ${`%${escapeLike(t)}%`} ESCAPE '\\'`)
  );

  return db
    .select({
      id: offers.id,
      title: offers.title,
      imageUrl: offers.imageUrl,
      offerModel: offers.offerModel,
      isFeatured: offers.isFeatured,
      publishedAt: offers.publishedAt,
      categoryId: offers.categoryId,
      categorySlug: categories.slug,
      categoryName: categories.name,
      partnerName: partners.companyName,
      score: scoreField,
    })
    .from(offers)
    .innerJoin(categories, eq(offers.categoryId, categories.id))
    .innerJoin(partners, eq(offers.partnerId, partners.id))
    .where(filterConditions)
    .orderBy(
      desc(scoreExpression),
      desc(offers.isFeatured),
      sql`${offers.publishedAt} DESC NULLS LAST`,
      desc(offers.id)
    )
    .limit(query.offerLimit);
}
