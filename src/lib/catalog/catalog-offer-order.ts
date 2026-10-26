import { desc, sql } from "drizzle-orm";
import { offers } from "@/lib/schema";
import type { CatalogOfferSort } from "@/lib/filters/types";

// Match the public display contract: inbound RFQ sorts by published net price,
 // while ecommerce/outbound retain their legacy gross-price semantics.
 // Hidden RFQ prices must never be inferred from historical gross values.
const visibleCatalogPrice = sql`
  CASE
    WHEN ${offers.offerModel} = 'rfq' AND ${offers.conversionType} = 'inbound'
      THEN CASE WHEN ${offers.rfqNetPriceVisible} = true AND ${offers.priceNetto} > 0
        THEN ${offers.priceNetto} ELSE NULL END
    WHEN ${offers.priceOnRequest} = false AND ${offers.priceBrutto} IS NOT NULL
      THEN ${offers.priceBrutto}
    ELSE NULL
  END
`;

export const catalogOfferOrder = (sort: CatalogOfferSort = "default") => {
  if (sort === "newest") {
    return [
      desc(offers.createdAt),
      desc(offers.id),
    ] as const;
  }

  if (sort === "price-asc") {
    return [
      sql`${visibleCatalogPrice} ASC NULLS LAST`,
      desc(offers.createdAt),
      desc(offers.id),
    ] as const;
  }

  if (sort === "price-desc") {
    return [
      sql`${visibleCatalogPrice} DESC NULLS LAST`,
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
