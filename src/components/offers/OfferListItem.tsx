import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { getLocalizedCategoryLabel } from "@/lib/i18n/category-labels";
import type { CatalogOffer } from "@/app/actions";
import type { Dictionary } from "@/lib/i18n/types";

interface OfferListItemProps {
  offer: CatalogOffer;
  detailHref: string;
  offerLabels: Dictionary["offers"];
  categoryLabels: Record<string, string>;
  viewOfferLabel: string;
}

export function OfferListItem({ offer, detailHref, offerLabels, categoryLabels, viewOfferLabel }: OfferListItemProps) {
  const categoryLabel = getLocalizedCategoryLabel(categoryLabels, offer.categorySlug, offer.categoryName);
  const isEcommerce = offer.offerModel === "ecommerce";
  const priceLabel = formatPrice(offer.priceBrutto, offer.priceOnRequest, offerLabels.priceOnRequest);
  const modelLabel = isEcommerce ? offerLabels.ecommerceModel : offerLabels.rfqModel;

  return (
    <article className="flex items-start gap-4 rounded-lg border border-border bg-white px-4 py-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Model badge column */}
      <div className="hidden shrink-0 sm:flex sm:w-16 sm:flex-col sm:items-center sm:justify-center sm:pt-0.5">
        <span
          className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ${
            isEcommerce ? "bg-green-600" : "bg-brand-navy"
          }`}
        >
          {modelLabel}
        </span>
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-teal">
            {categoryLabel}
          </span>
          {/* Mobile model badge */}
          <span
            className={`inline-block rounded px-1.5 py-0 text-[10px] font-bold uppercase tracking-wider text-white sm:hidden ${
              isEcommerce ? "bg-green-600" : "bg-brand-navy"
            }`}
          >
            {modelLabel}
          </span>
        </div>

        <h3 className="text-sm font-bold leading-snug text-brand-navy">
          <Link href={detailHref} className="hover:text-brand-teal transition-colors">
            {offer.title}
          </Link>
        </h3>

        <p className="text-xs text-muted-foreground">
          {offer.partnerName}
        </p>

        {offer.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
            {offer.description}
          </p>
        )}
      </div>

      {/* Price + action column */}
      <div className="flex shrink-0 flex-col items-end gap-2 pl-2">
        <p className="text-sm font-bold text-brand-navy tabular-nums">
          {priceLabel}
        </p>
        <Link
          href={detailHref}
          className="inline-flex items-center rounded border border-brand-navy px-3 py-1.5 text-xs font-semibold text-brand-navy transition-colors hover:border-brand-teal hover:text-brand-teal"
        >
          {viewOfferLabel}
        </Link>
      </div>
    </article>
  );
}
