import type { Locale } from "@/lib/i18n/types";

export const CATALOG_SEARCH_LIMITS = {
  minQueryCodePoints: 2,
  maxQueryCodePoints: 100,
  maxTokenCount: 8,
  defaultCategoryLimit: 3,
  maxCategoryLimit: 5,
  defaultOfferLimit: 5,
  maxOfferLimit: 10,
} as const;

export type CatalogSearchInput = {
  query: unknown;
  locale: unknown;
  categoryLimit?: unknown;
  offerLimit?: unknown;
};

export type NormalizedCatalogSearchQuery = {
  query: string;
  matchQuery: string;
  tokens: string[];
  literalTerms: string[];
  locale: Locale;
  categoryLimit: number;
  offerLimit: number;
  isEmpty: boolean;
};

export type CatalogCategorySearchResult = {
  type: "category";
  id: number;
  slug: string;
  label: string;
  breadcrumbLabels: string[];
  href: string;
  score: number;
};

export type CatalogOfferSearchResult = {
  type: "offer";
  id: number;
  title: string;
  categoryLabel: string;
  partnerName: string;
  imageUrl: string | null;
  offerModel: string;
  href: string;
  score: number;
};

export type CatalogSearchErrorCode =
  | "INVALID_INPUT"
  | "INVALID_LOCALE"
  | "QUERY_TOO_SHORT"
  | "QUERY_TOO_LONG"
  | "QUERY_HAS_NO_SEARCH_TERMS"
  | "QUERY_TOO_COMPLEX"
  | "INVALID_CATEGORY_LIMIT"
  | "INVALID_OFFER_LIMIT"
  | "SYSTEM_ERROR";

export type CatalogSearchError = {
  code: CatalogSearchErrorCode;
};

export type CatalogSearchResult =
  | {
      ok: true;
      normalizedQuery: string;
      categories: CatalogCategorySearchResult[];
      offers: CatalogOfferSearchResult[];
    }
  | {
      ok: false;
      errors: CatalogSearchError[];
    };
