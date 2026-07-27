import { and, eq, sql, desc } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import type { NormalizedCatalogSearchQuery } from "./types";
import { CATALOG_SEARCH_LIMITS } from "./types";

export function escapeLike(str: string): string {
  return str.replace(/([\\%_])/g, "\\$1");
}

export function queryCatalogSearch(
  db: NodePgDatabase<typeof schema>,
  query: NormalizedCatalogSearchQuery
) {
  if (
    query.isEmpty ||
    query.tokens.length === 0 ||
    query.tokens.length > CATALOG_SEARCH_LIMITS.maxTokenCount ||
    query.literalTerms.length > CATALOG_SEARCH_LIMITS.maxTokenCount
  ) {
    throw new Error("Invalid normalized catalog search query");
  }

  const exactParam = escapeLike(query.matchQuery);
  const prefixParam = `${escapeLike(query.matchQuery)}%`;
  const phraseParam = `%${escapeLike(query.matchQuery)}%`;

  const exactMatches = sql`(${schema.offers.title} ILIKE ${exactParam} ESCAPE '\\')`;
  const prefixMatches = sql`(${schema.offers.title} ILIKE ${prefixParam} ESCAPE '\\')`;
  const phraseMatches = sql`(${schema.offers.title} ILIKE ${phraseParam} ESCAPE '\\')`;

  const tokenPredicates = query.tokens.map(
    (token) => sql`${schema.offers.title} ILIKE ${`%${escapeLike(token)}%`} ESCAPE '\\'`
  );

  const literalPredicates = query.literalTerms.map(
    (term) => sql`${schema.offers.title} ILIKE ${`%${escapeLike(term)}%`} ESCAPE '\\'`
  );

  const allTerms = [...tokenPredicates, ...literalPredicates];

  const allTermsSql = allTerms.length > 0
    ? sql`(${sql.join(allTerms, sql` AND `)})`
    : sql`TRUE`;

  const scoreExpression = sql<number>`
    CASE 
      WHEN ${exactMatches} THEN 100
      WHEN ${prefixMatches} THEN 80
      WHEN ${phraseMatches} THEN 60
      WHEN ${allTermsSql} THEN 40
      ELSE 0
    END
  `;
  const scoreField = scoreExpression.as("score");

  const filterConditions = and(
    eq(schema.offers.isActive, true),
    eq(schema.offers.publicationStatus, "published"),
    ...tokenPredicates,
    ...literalPredicates
  );

  return db
    .select({
      id: schema.offers.id,
      title: schema.offers.title,
      imageUrl: schema.offers.imageUrl,
      offerModel: schema.offers.offerModel,
      isFeatured: schema.offers.isFeatured,
      publishedAt: schema.offers.publishedAt,
      categoryId: schema.offers.categoryId,
      categorySlug: schema.categories.slug,
      categoryName: schema.categories.name,
      partnerName: schema.partners.companyName,
      score: scoreField,
    })
    .from(schema.offers)
    .innerJoin(schema.categories, eq(schema.offers.categoryId, schema.categories.id))
    .innerJoin(schema.partners, eq(schema.offers.partnerId, schema.partners.id))
    .where(filterConditions)
    .orderBy(
      desc(scoreExpression),
      desc(schema.offers.isFeatured),
      sql`${schema.offers.publishedAt} DESC NULLS LAST`,
      desc(schema.offers.id)
    )
    .limit(query.offerLimit);
}
