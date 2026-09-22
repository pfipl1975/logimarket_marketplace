import { asc } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";

export interface PartnerCreateOptionsResult {
  categories: { id: number; name: string; slug: string; parentId: number | null }[];
}

export async function getPartnerCreateOptionsReadModel(
  db: NodePgDatabase<typeof schema>
): Promise<PartnerCreateOptionsResult> {
  const categoryRows = await db
    .select({
      id: schema.categories.id,
      name: schema.categories.name,
      slug: schema.categories.slug,
      parentId: schema.categories.parentId,
    })
    .from(schema.categories)
    .orderBy(asc(schema.categories.name), asc(schema.categories.id));

  return {
    categories: categoryRows.map(c => ({
      id: Number(c.id),
      name: c.name,
      slug: c.slug,
      parentId: c.parentId !== null ? Number(c.parentId) : null,
    })),
  };
}
