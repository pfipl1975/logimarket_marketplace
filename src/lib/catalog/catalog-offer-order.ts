import { desc, asc, sql } from "drizzle-orm";
import { offers } from "@/lib/schema";
import type { CatalogOfferSort } from "@/lib/filters/types";

export const catalogOfferOrder = (sort: CatalogOfferSort = "default") => {
  if (sort === "newest") {
    return [
      desc(offers.createdAt),
      desc(offers.id),
    ] as const;
  }

  if (sort === "price-asc") {
    return [
      sql`
        CASE
          WHEN ${offers.priceOnRequest} = false
           AND ${offers.priceBrutto} IS NOT NULL
          THEN 0
          ELSE 1
        END ASC
      `,
      asc(offers.priceBrutto),
      desc(offers.createdAt),
      desc(offers.id),
    ] as const;
  }

  if (sort === "price-desc") {
    return [
      sql`
        CASE
          WHEN ${offers.priceOnRequest} = false
           AND ${offers.priceBrutto} IS NOT NULL
          THEN 0
          ELSE 1
        END ASC
      `,
      desc(offers.priceBrutto),
      desc(offers.createdAt),
      desc(offers.id),
    ] as const;
  }

  return [
    desc(offers.isFeatured),
    desc(offers.createdAt),
    desc(offers.id),
  ] as const;
};
