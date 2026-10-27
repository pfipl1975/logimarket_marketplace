import { formatRfqNetPrice } from "@/lib/offers/rfq-net-price";
import type { CanonicalOfferModelResolution } from "@/lib/offers/model";

type AdminPricingFields = {
  canonicalModel: CanonicalOfferModelResolution;
  priceBrutto: string | null;
  priceNetto: string | null;
  rfqNetPriceVisible: boolean;
  priceOnRequest: boolean;
};

export type AdminOfferDetailPricing =
  | { kind: "rfq"; priceNetto: string | null; formattedNetto: string | null; rfqNetPriceVisible: boolean }
  | { kind: "other"; priceBrutto: string | null; priceOnRequest: boolean };

/** Admin-only: preserve raw DB values; never silently reclassify legacy gross as net. */
export function getAdminOfferDetailPricing(
  offer: AdminPricingFields,
  locale: string,
): AdminOfferDetailPricing {
  if (offer.canonicalModel !== "rfq") {
    return { kind: "other", priceBrutto: offer.priceBrutto, priceOnRequest: offer.priceOnRequest };
  }

  let formattedNetto: string | null = null;
  if (offer.priceNetto !== null) {
    try {
      formattedNetto = formatRfqNetPrice(offer.priceNetto, locale);
    } catch {
      // Keep anomalous historical data visible to admins as raw text.
    }
  }
  return { kind: "rfq", priceNetto: offer.priceNetto, formattedNetto, rfqNetPriceVisible: offer.rfqNetPriceVisible };
}
