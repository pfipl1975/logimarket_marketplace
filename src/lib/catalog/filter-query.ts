import "server-only";

import { db } from "@/lib/db";
import type { NormalizedFilterQuery } from "@/lib/filters/types";
import { queryFilteredCategoryOffers } from "./filter-query-core";

export function getFilteredCategoryOffersFromDb(input: NormalizedFilterQuery) {
  return queryFilteredCategoryOffers(db, input);
}
