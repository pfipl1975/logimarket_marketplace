import Link from "next/link";
import { OfferAction } from "@/components/OfferAction";
import { getLocalizedCategoryLabel } from "@/lib/i18n/category-labels";
import { getLocalizedTechnicalAttributeLabel } from "@/lib/i18n/technical-attributes";
import { formatPrice } from "@/lib/utils";
import type { CatalogOffer } from "@/app/actions";
import type { Dictionary } from "@/lib/i18n/types";

interface OfferProcurementListRowProps {
  offer: CatalogOffer;
  detailHref: string;
  offerLabels: Dictionary["offers"];
  ctaLabels: Pick<Dictionary["cta"], "addToCart" | "requestQuote" | "sendRequest">;
  rfqLabels: Dictionary["rfq"];
  formLabels: Dictionary["form"];
  systemLabels: Dictionary["system"];
  closeLabel: Dictionary["common"]["close"];
  categoryLabels: Record<string, string>;
  technicalAttributeLabels: Record<string, string>;
}

export function OfferProcurementListRow({
  offer,
  detailHref,
  offerLabels,
  ctaLabels,
  rfqLabels,
  formLabels,
  systemLabels,
  closeLabel,
  categoryLabels,
  technicalAttributeLabels,
}: OfferProcurementListRowProps) {
  const isEcommerce = offer.offerModel === "ecommerce";
  const categoryLabel = getLocalizedCategoryLabel(
    categoryLabels,
    offer.categorySlug,
    offer.categoryName,
  );
  const priceLabel = formatPrice(
    offer.priceBrutto,
    offer.priceOnRequest,
    offerLabels.priceOnRequest,
  );
  const modelLabel = isEcommerce ? offerLabels.ecommerceModel : offerLabels.rfqModel;
  const highlights = Object.entries(offer.technicalAttributes).slice(0, 3);

  return (
    <article className="grid gap-4 rounded border border-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-teal">
            {categoryLabel}
          </span>
          {offer.isFeatured && (
            <span className="rounded bg-brand-teal px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              {offerLabels.featured}
            </span>
          )}
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ${
              isEcommerce ? "bg-green-600" : "bg-brand-navy"
            }`}
          >
            {modelLabel}
          </span>
        </div>

        <h3 className="mt-2 text-base font-bold leading-snug text-brand-navy">
          <Link href={detailHref} className="transition-colors hover:text-brand-teal">
            {offer.title}
          </Link>
        </h3>

        <p className="mt-1 text-xs font-medium text-muted-foreground">
          {offer.partnerName}
        </p>

        {highlights.length > 0 ? (
          <dl className="mt-3 grid gap-2 sm:grid-cols-3">
            {highlights.map(([key, value]) => (
              <div key={key} className="border-l border-border pl-3">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {getLocalizedTechnicalAttributeLabel(technicalAttributeLabels, key)}
                </dt>
                <dd className="mt-0.5 text-xs font-semibold text-brand-navy">
                  {String(value)}
                </dd>
              </div>
            ))}
          </dl>
        ) : offer.description ? (
          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {offer.description}
          </p>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col justify-between gap-3 border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
        <p className="text-base font-bold text-brand-navy">
          {priceLabel}
        </p>
        <OfferAction
          offer={{
            id: offer.id,
            title: offer.title,
            offerModel: offer.offerModel,
            conversionType: offer.conversionType,
            partnerName: offer.partnerName,
          }}
          ctaLabels={ctaLabels}
          rfqLabels={rfqLabels}
          formLabels={formLabels}
          systemLabels={systemLabels}
          closeLabel={closeLabel}
          externalOfferLabel={offerLabels.externalOffer}
          variant="card"
        />
      </div>
    </article>
  );
}
