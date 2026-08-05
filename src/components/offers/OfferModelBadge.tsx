import { cn } from "@/lib/utils";
import type { CanonicalOfferModelResolution } from "@/lib/offers/model";

type OfferModelBadgeProps = {
  offerModel: CanonicalOfferModelResolution;
  labels: {
    rfqModel: string;
    ecommerceModel: string;
    outboundModel: string;
  };
  className?: string;
};

export function OfferModelBadge({ offerModel, labels, className }: OfferModelBadgeProps) {
  switch (offerModel) {
    case "rfq":
      return (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center font-semibold uppercase tracking-wider text-white bg-brand-navy",
            className
          )}
        >
          {labels.rfqModel}
        </span>
      );

    case "ecommerce":
      return (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center font-semibold uppercase tracking-wider text-white bg-green-600",
            className
          )}
        >
          {labels.ecommerceModel}
        </span>
      );

    case "outbound":
      return (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center font-semibold uppercase tracking-wider text-white bg-slate-700",
            className
          )}
        >
          {labels.outboundModel}
        </span>
      );

    default:
      return null;
  }
}
