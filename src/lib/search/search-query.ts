import "server-only";
import { db } from "@/lib/db";
import { queryCatalogSearch } from "./search-query-core";
import type { NormalizedCatalogSearchQuery } from "./types";

export async function searchCatalogOffersFromDb(
  query: NormalizedCatalogSearchQuery
) {
  return await queryCatalogSearch(db, query);
}
