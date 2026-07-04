"use client";

import { ShoppingCart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddToCartButton } from "@/components/AddToCartButton";
import { RfqDialog } from "@/components/RfqDialog";
import { useCart } from "@/hooks/useCart";
import type { Dictionary } from "@/lib/i18n/types";

interface OfferActionProps {
  offer: {
    id: number;
    title: string;
    offerModel: string;
    conversionType: string;
    partnerName: string;
  };
  ctaLabels: Pick<Dictionary["cta"], "addToCart" | "requestQuote" | "sendRequest">;
  rfqLabels: Dictionary["rfq"];
  formLabels: Dictionary["form"];
  systemLabels: Dictionary["system"];
  closeLabel: Dictionary["common"]["close"];
  externalOfferLabel: string;
  variant?: "card" | "detail";
}

export function OfferAction({
  offer,
  ctaLabels,
  rfqLabels,
  formLabels,
  systemLabels,
  closeLabel,
  externalOfferLabel,
  variant = "card",
}: OfferActionProps) {
  const { addToCart } = useCart();
  const isEcommerce = offer.offerModel === "ecommerce";

  // 1. E-Commerce
  if (isEcommerce) {
    if (variant === "detail") {
      return <AddToCartButton offerId={offer.id} label={ctaLabels.addToCart} />;
    }

    return (
      <Button
        onClick={() => addToCart(offer.id, 1)}
        className="w-full gap-2 font-semibold text-white border-0 bg-brand-teal hover:bg-[#0e5a6a]"
      >
        <ShoppingCart className="h-4 w-4" />
        {ctaLabels.addToCart}
      </Button>
    );
  }

  // 2. RFQ
  if (offer.offerModel !== "ecommerce" && offer.conversionType === "rfq") {
    return (
      <RfqDialog
        offerId={offer.id}
        offerTitle={offer.title}
        partnerName={offer.partnerName}
        className={variant === "detail" ? "w-full h-12 text-base" : "w-full"}
        rfqLabels={rfqLabels}
        formLabels={formLabels}
        systemLabels={systemLabels}
        ctaLabels={ctaLabels}
        closeLabel={closeLabel}
      />
    );
  }

  // 3. Outbound
  if (offer.offerModel !== "ecommerce" && offer.conversionType === "outbound") {
    if (variant === "detail") {
      return (
        <a
          href={`/go/${offer.id}`}
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border-0 bg-brand-navy px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-[#1e2940]"
        >
          {externalOfferLabel} <ExternalLink className="h-5 w-5" />
        </a>
      );
    }

    return (
      <a
        href={`/go/${offer.id}`}
        target="_blank"
        rel="nofollow noopener noreferrer"
        className="inline-flex items-center justify-center w-full gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white border-0 transition-colors bg-brand-navy hover:bg-[#1e2940]"
      >
        {externalOfferLabel} <ExternalLink className="h-4 w-4" />
      </a>
    );
  }

  // 4. Fallback for unknown / inconsistent state
  return (
    <button
      type="button"
      disabled
      className="inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-500 cursor-not-allowed"
    >
      Oferta wymaga weryfikacji
    </button>
  );
}
