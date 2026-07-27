import { isLocale } from "@/lib/i18n/config";
import type { NormalizedCatalogSearchQuery, CatalogSearchErrorCode } from "./types";
import { CATALOG_SEARCH_LIMITS } from "./types";
import { normalizeCatalogSearchQuery } from "./normalization";

export class CatalogSearchParserError extends Error {
  constructor(
    public code: CatalogSearchErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CatalogSearchParserError";
  }
}


export function parseCatalogSearchInput(
  rawInput: unknown,
): NormalizedCatalogSearchQuery {
  if (!rawInput || typeof rawInput !== "object") {
    throw new CatalogSearchParserError("INVALID_INPUT", "Input must be an object");
  }

  const input = rawInput as Record<string, unknown>;

  if (typeof input.query !== "string") {
    throw new CatalogSearchParserError("INVALID_INPUT", "Query must be a string");
  }

  if (typeof input.locale !== "string" || !isLocale(input.locale)) {
    throw new CatalogSearchParserError("INVALID_LOCALE", "Invalid locale");
  }

  // categoryLimit defaults
  let categoryLimit: number = CATALOG_SEARCH_LIMITS.defaultCategoryLimit;
  if (input.categoryLimit !== undefined) {
    if (typeof input.categoryLimit !== "number" || !Number.isInteger(input.categoryLimit) || Number.isNaN(input.categoryLimit) || !Number.isFinite(input.categoryLimit)) {
      throw new CatalogSearchParserError("INVALID_CATEGORY_LIMIT", "Category limit must be an integer");
    }
    if (input.categoryLimit < 1 || input.categoryLimit > CATALOG_SEARCH_LIMITS.maxCategoryLimit) {
      throw new CatalogSearchParserError("INVALID_CATEGORY_LIMIT", "Category limit out of bounds");
    }
    categoryLimit = input.categoryLimit;
  }

  // offerLimit defaults
  let offerLimit: number = CATALOG_SEARCH_LIMITS.defaultOfferLimit;
  if (input.offerLimit !== undefined) {
    if (typeof input.offerLimit !== "number" || !Number.isInteger(input.offerLimit) || Number.isNaN(input.offerLimit) || !Number.isFinite(input.offerLimit)) {
      throw new CatalogSearchParserError("INVALID_OFFER_LIMIT", "Offer limit must be an integer");
    }
    if (input.offerLimit < 1 || input.offerLimit > CATALOG_SEARCH_LIMITS.maxOfferLimit) {
      throw new CatalogSearchParserError("INVALID_OFFER_LIMIT", "Offer limit out of bounds");
    }
    offerLimit = input.offerLimit;
  }

  const { query, matchQuery, tokens } = normalizeCatalogSearchQuery(
    input.query,
    input.locale,
  );

  const queryCodePoints = Array.from(query).length;

  if (queryCodePoints === 0) {
    return {
      query,
      matchQuery,
      tokens,
      locale: input.locale,
      categoryLimit,
      offerLimit,
      isEmpty: true,
    };
  }

  if (queryCodePoints < CATALOG_SEARCH_LIMITS.minQueryCodePoints) {
    throw new CatalogSearchParserError("QUERY_TOO_SHORT", "Query is too short");
  }

  if (queryCodePoints > CATALOG_SEARCH_LIMITS.maxQueryCodePoints) {
    throw new CatalogSearchParserError("QUERY_TOO_LONG", "Query is too long");
  }

  if (tokens.length === 0) {
    throw new CatalogSearchParserError(
      "QUERY_HAS_NO_SEARCH_TERMS",
      "Query contains no searchable terms",
    );
  }

  if (tokens.length > CATALOG_SEARCH_LIMITS.maxTokenCount) {
    throw new CatalogSearchParserError(
      "QUERY_TOO_COMPLEX",
      "Query contains too many unique terms",
    );
  }

  return {
    query,
    matchQuery,
    tokens,
    locale: input.locale,
    categoryLimit,
    offerLimit,
    isEmpty: false,
  };
}
