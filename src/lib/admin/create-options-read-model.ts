import { asc } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";

export interface AdminCreateOptionsResult {
  partners: { id: number; companyName: string }[];
  categories: { id: number; name: string; slug: string; parentId: number | null }[];
}

export async function getAdminCreateOptionsReadModel(
  db: NodePgDatabase<typeof schema>
): Promise<AdminCreateOptionsResult> {
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
      slug: schema.categories.slug,
      parentId: schema.categories.parentId,
    })
    .from(schema.categories)
    .orderBy(asc(schema.categories.name), asc(schema.categories.id));

  return {
    partners: partnerRows.map(p => ({ id: Number(p.id), companyName: p.companyName })),
    categories: categoryRows.map(c => ({
      id: Number(c.id),
      name: c.name,
      slug: c.slug,
      parentId: c.parentId !== null ? Number(c.parentId) : null,
    })),
  };
}
