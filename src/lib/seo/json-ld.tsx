import React from "react";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";
import { getHomeCanonical, getOfferCanonical, absoluteUrl } from "./urls";
import { siteBrand, localeLanguageTags } from "./site";
import { getLocalizedCategoryLabel } from "@/lib/i18n/category-labels";

type JsonLdPrimitive = string | number | boolean | null;

export type JsonLdValue =
  | JsonLdPrimitive
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

export function serializeJsonLd(data: JsonLdValue): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLdScript({ data }: { data: JsonLdValue }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

export function createHomeJsonLd(locale: Locale, dict: Dictionary): JsonLdValue {
  const canonicalUrl = getHomeCanonical(locale);
  const langTag = localeLanguageTags[locale];

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteBrand.url}/#organization`,
        "name": siteBrand.name,
        "alternateName": siteBrand.alternateName,
        "url": siteBrand.url,
        "logo": {
          "@type": "ImageObject",
          "url": siteBrand.logoUrl,
        },
        "description": dict.meta.description,
      },
      {
        "@type": "WebSite",
        "@id": `${siteBrand.url}/#website`,
        "url": siteBrand.url,
        "name": siteBrand.name,
        "inLanguage": langTag,
        "publisher": {
          "@id": `${siteBrand.url}/#organization`,
        },
      },
      {
        "@type": "CollectionPage",
        "@id": `${canonicalUrl}#webpage`,
        "url": canonicalUrl,
        "name": dict.meta.title,
        "description": dict.meta.description,
        "inLanguage": langTag,
        "isPartOf": {
          "@id": `${siteBrand.url}/#website`,
        },
        "publisher": {
          "@id": `${siteBrand.url}/#organization`,
        },
        "about": "B2B marketplace for logistics, warehousing, intralogistics and warehouse equipment",
      },
    ],
  };
}

export interface OfferJsonLdSource {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  priceBrutto: string | null;
  priceOnRequest: boolean;
  categorySlug: string;
  categoryName: string;
  partnerName: string;
  offerModel: string;
  conversionType: string;
}

function parsePrice(priceStr: string | null): number | null {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/\s+/g, "").replace(",", ".");
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

function resolveImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }
  return absoluteUrl(imageUrl);
}

export function createOfferJsonLd(
  locale: Locale,
  offer: OfferJsonLdSource,
  dict: Dictionary
): JsonLdValue {
  const canonicalUrl = getOfferCanonical(locale, String(offer.id));
  const categoryLabels = dict.categories.bySlug as Record<string, string>;
  const localizedCategory = getLocalizedCategoryLabel(
    categoryLabels,
    offer.categorySlug,
    offer.categoryName
  );

  const productDescription = offer.description?.trim() || dict.meta.description;
  const productImage = resolveImageUrl(offer.imageUrl);
  const parsedPrice = parsePrice(offer.priceBrutto);

  const hasValidPrice =
    parsedPrice !== null &&
    !offer.priceOnRequest &&
    offer.offerModel !== "rfq" &&
    offer.conversionType !== "rfq";

  const productJsonLd: Record<string, JsonLdValue> = {
    "@type": "Product",
    "@id": `${canonicalUrl}#product`,
    "name": offer.title,
    "description": productDescription,
    "url": canonicalUrl,
  };

  if (productImage) {
    productJsonLd["image"] = productImage;
  }

  if (localizedCategory) {
    productJsonLd["category"] = localizedCategory;
  }

  if (hasValidPrice && parsedPrice !== null) {
    productJsonLd["offers"] = {
      "@type": "Offer",
      "@id": `${canonicalUrl}#offer`,
      "url": canonicalUrl,
      "price": parsedPrice,
      "priceCurrency": "PLN",
      "seller": {
        "@type": "Organization",
        "name": offer.partnerName,
      },
    };
  }

  return {
    "@context": "https://schema.org",
    ...productJsonLd,
  };
}
