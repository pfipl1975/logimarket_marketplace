import { formatPrice } from "@/lib/utils";
import { formatRfqNetPrice, getPublicRfqNetPrice } from "@/lib/offers/rfq-net-price";
import type { CatalogOffer } from "@/app/actions";
import type { Dictionary, Locale } from "@/lib/i18n/types";

export function PublicOfferPrice({
  offer,
  labels,
  className = "",
  locale,
}: {
  offer: Pick<CatalogOffer, "offerModel" | "priceBrutto" | "priceOnRequest" | "priceNetto" | "rfqNetPriceVisible">;
  labels: Dictionary["offers"];
  className?: string;
  locale: Locale;
}) {
  if (offer.offerModel === "rfq") {
    const value = getPublicRfqNetPrice(offer);
    if (!value) {
      return <span className={className}>{labels.priceOnRequest}</span>;
    }
    return (
      <div className={className}>
        <span className="block text-xs font-medium text-muted-foreground">{labels.netPriceLabel}</span>
        <span className="block">{formatRfqNetPrice(value, locale)}</span>
        <span className="block text-xs font-normal text-muted-foreground">+ {labels.netPriceVat}</span>
      </div>
    );
  }
  return <span className={className}>{formatPrice(offer.priceBrutto, offer.priceOnRequest, labels.priceOnRequest)}</span>;
}
