import React from "react";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";
import type { OfferPublicationStatus } from "@/lib/schema";
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
  publicationStatus: OfferPublicationStatus;
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
    offer.publicationStatus === "published" &&
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

export interface OfferBreadcrumbJsonLdSource {
  id: number;
  title: string;
}

export function createOfferBreadcrumbJsonLd(
  locale: Locale,
  offer: OfferBreadcrumbJsonLdSource,
): JsonLdValue {
  const homeUrl = getHomeCanonical(locale);
  const offerUrl = getOfferCanonical(locale, String(offer.id));

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${offerUrl}#breadcrumb`,
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "LogiMarket.pl",
        "item": homeUrl,
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": offer.title,
        "item": offerUrl,
      },
    ],
  };
}

export interface CatalogItemListSource {
  name: string;
  url: string;
}

export function createCatalogItemListJsonLd(
  items: CatalogItemListSource[],
): JsonLdValue {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "url": item.url,
    })),
  };
}

// ─── Category-level ItemList (Section / Group / Leaf) ─────────────────────────

export interface CategoryItemListItem {
  name: string;
  url: string;
}

/**
 * Generate an ItemList JSON-LD for a category landing page.
 *
 * - Section page  → items are direct Group children
 * - Group page    → items are direct Leaf children
 * - Leaf page     → items are the offers physically rendered on the page
 *
 * Guarantees:
 * - No Product schema
 * - No prices / availability
 * - No direct partner URLs (offer URLs are always /oferta/[id])
 * - Returns null when items list is empty (caller must guard before rendering)
 */
export function createCategoryItemListJsonLd({
  pageUrl,
  items,
}: {
  pageUrl: string;
  items: CategoryItemListItem[];
}): JsonLdValue | null {
  if (!items || items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${pageUrl}#itemlist`,
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "url": item.url,
    })),
  };
}

// ─── Category FAQPage JSON-LD ─────────────────────────────────────────────────

export interface FaqItemInput {
  question: string;
  answer: string;
}

/**
 * Generate a FAQPage JSON-LD for a category landing page.
 *
 * Guarantees:
 * - Decoupled from content templates and database models
 * - Null-safe: returns null when input has less than 2 valid Q&A entries
 * - Zero XSS: standard JSON serialization
 * - Strict schema guard: no Product/Offer schemas, no prices, no partner details
 */
export function createFaqPageJsonLd({
  faq,
  pageUrl,
}: {
  faq: FaqItemInput[] | null | undefined;
  pageUrl: string;
}): JsonLdValue | null {
  if (!faq) return null;

  const validFaq = faq.filter(
    (item) => item.question.trim().length > 0 && item.answer.trim().length > 0
  );

  if (validFaq.length < 2) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    "url": pageUrl,
    "mainEntity": validFaq.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer,
      },
    })),
  };
}

export interface DefinedTermItemInput {
  term: string;
  slug: string;
  description: string;
}

/**
 * Generate DefinedTermSet JSON-LD for the main glossary listing page.
 */
export function createDefinedTermSetJsonLd({
  terms,
  pageUrl,
}: {
  terms: DefinedTermItemInput[];
  pageUrl: string;
}): JsonLdValue {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": `${pageUrl}#definedtermset`,
    "name": "Słownik Branżowy LogiMarket",
    "description": "Baza wiedzy B2B pojęć z logistyki, magazynowania, intralogistyki, opakowań i procesów zakupowych.",
    "url": pageUrl,
    "hasDefinedTerm": terms.map((item) => ({
      "@type": "DefinedTerm",
      "name": item.term,
      "description": item.description,
      "url": `${pageUrl}/${item.slug}`,
    })),
  };
}

export interface DefinedTermInput {
  term: string;
  shortDefinition: string;
  synonyms?: string[];
  pageUrl: string;
  setUrl: string;
}

/**
 * Generate DefinedTerm JSON-LD for a single glossary entry page.
 */
export function createDefinedTermJsonLd({
  term,
  shortDefinition,
  synonyms,
  pageUrl,
  setUrl,
}: DefinedTermInput): JsonLdValue {
  const result: Record<string, JsonLdValue> = {
    "@type": "DefinedTerm",
    "@id": `${pageUrl}#definedterm`,
    "name": term,
    "description": shortDefinition,
    "url": pageUrl,
    "inDefinedTermSet": {
      "@type": "DefinedTermSet",
      "@id": `${setUrl}#definedtermset`,
      "name": "Słownik Branżowy LogiMarket",
      "url": setUrl,
    },
  };

  if (synonyms && synonyms.length > 0) {
    result["alternateName"] = synonyms;
  }

  return {
    "@context": "https://schema.org",
    ...result,
  };
}
