"use client";

import Link from "next/link";
import { ShoppingCart, ExternalLink, Wrench, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { getLocalizedCategoryLabel } from "@/lib/i18n/category-labels";
import { getLocalizedTechnicalAttributeLabel } from "@/lib/i18n/technical-attributes";
import { formatPrice } from "@/lib/utils";
import { RfqDialog } from "./RfqDialog";
import type { CatalogOffer } from "@/app/actions";
import type { Dictionary } from "@/lib/i18n/types";

interface OfferCardProps {
  offer: CatalogOffer;
  detailHref?: string;
  offerLabels: Dictionary["offers"];
  ctaLabels: Pick<Dictionary["cta"], "addToCart" | "requestQuote" | "sendRequest">;
  rfqLabels: Dictionary["rfq"];
  formLabels: Dictionary["form"];
  systemLabels: Dictionary["system"];
  closeLabel: Dictionary["common"]["close"];
  categoryLabels: Record<string, string>;
  technicalAttributeLabels: Record<string, string>;
}

export function OfferCard({ offer, detailHref, offerLabels, ctaLabels, rfqLabels, formLabels, systemLabels, closeLabel, categoryLabels, technicalAttributeLabels }: OfferCardProps) {
  const { addToCart } = useCart();
  const attributes = Object.entries(offer.technicalAttributes).slice(0, 4);
  const isEcommerce = offer.offerModel === "ecommerce";
  const offerDetailHref = detailHref ?? `/oferta/${offer.id}`;
  const categoryLabel = getLocalizedCategoryLabel(categoryLabels, offer.categorySlug, offer.categoryName);

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border bg-white shadow-sm transition-all duration-200 hover:shadow-md"
      style={{ borderColor: "#d9dde2" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#1474874d")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#d9dde2")}>
      <Link href={offerDetailHref} className="relative block aspect-[4/3] overflow-hidden bg-gray-100">
        {offer.imageUrl ? (
          <img src={offer.imageUrl} alt={offer.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: "#141c2c0d" }}>
            <Package className="h-12 w-12" style={{ color: "#5a64724d" }} />
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {offer.isFeatured && (
            <Badge className="border-0 bg-brand-teal text-[10px] font-semibold uppercase tracking-wider text-white">{offerLabels.featured}</Badge>
          )}
          <Badge variant="secondary" className={`border-0 text-[10px] font-semibold uppercase tracking-wider text-white ${isEcommerce ? "bg-green-600" : "bg-brand-navy"}`}>
            {isEcommerce ? offerLabels.ecommerceModel : offerLabels.rfqModel}
          </Badge>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-teal">{categoryLabel}</span>
        <h3 className="mt-1.5 text-base font-bold leading-snug">
          <Link href={offerDetailHref} className="text-[#141c2c] transition-colors hover:text-[#147487]">{offer.title}</Link>
        </h3>
        <p className="mt-1 text-xs flex items-center gap-1" style={{ color: "#5a6472" }}>
          <Wrench className="h-3 w-3" />{offer.partnerName}
        </p>

        {attributes.length > 0 && (
          <div className="mt-3 rounded border overflow-hidden" style={{ borderColor: "#d9dde299" }}>
            <table className="w-full text-xs">
              <tbody>
                {attributes.map(([key, value], idx) => (
                  <tr key={key} className={idx % 2 === 0 ? "bg-white/50" : "bg-transparent"}>
                    <td className="px-2.5 py-1.5 font-medium w-1/2 border-r text-muted-foreground border-border">{getLocalizedTechnicalAttributeLabel(technicalAttributeLabels, key)}</td>
                    <td className="px-2.5 py-1.5 font-bold w-1/2" style={{ color: "#141c2c" }}>{String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 pt-3 border-t" style={{ borderColor: "#d9dde299" }}>
          <p className="text-lg font-bold text-brand-navy">{formatPrice(offer.priceBrutto, offer.priceOnRequest, offerLabels.priceOnRequest)}</p>
          {isEcommerce ? (
            <Button onClick={() => addToCart(offer.id, 1)} className="w-full gap-2 font-semibold text-white border-0"
              style={{ backgroundColor: "#147487" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0e5a6a")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#147487")}>
              <ShoppingCart className="h-4 w-4" />{ctaLabels.addToCart}
            </Button>
          ) : offer.conversionType === "rfq" ? (
            <RfqDialog
              offerId={offer.id}
              offerTitle={offer.title}
              partnerName={offer.partnerName}
              className="w-full"
              rfqLabels={rfqLabels}
              formLabels={formLabels}
              systemLabels={systemLabels}
              ctaLabels={ctaLabels}
              closeLabel={closeLabel}
            />
          ) : (
            <a
              href={`/go/${offer.id}`}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="inline-flex items-center justify-center w-full gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white border-0 transition-colors"
              style={{ backgroundColor: "#141c2c" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1e2940"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#141c2c"; }}
            >
              {offerLabels.externalOffer} <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
