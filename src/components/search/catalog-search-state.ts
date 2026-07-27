import type { CatalogSearchErrorCode, CatalogCategorySearchResult, CatalogOfferSearchResult } from "@/lib/search/types";

export function normalizeSearchInput(value: string): string {
  // Unicode NFC, collapse whitespace, trim
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

export function getSearchCodePointLength(value: string): number {
  return Array.from(value).length;
}

export type FlattenedSearchResult = 
  | { type: "category"; item: CatalogCategorySearchResult }
  | { type: "offer"; item: CatalogOfferSearchResult };

export function flattenSearchResults(
  categories: CatalogCategorySearchResult[],
  offers: CatalogOfferSearchResult[]
): FlattenedSearchResult[] {
  const flattened: FlattenedSearchResult[] = [];
  
  for (const cat of categories) {
    flattened.push({ type: "category", item: cat });
  }
  
  for (const off of offers) {
    flattened.push({ type: "offer", item: off });
  }
  
  return flattened;
}

export function getNextActiveIndex(currentIndex: number, totalItems: number): number {
  if (totalItems === 0) return -1;
  if (currentIndex === -1) return 0;
  return currentIndex < totalItems - 1 ? currentIndex + 1 : 0;
}

export function getPreviousActiveIndex(currentIndex: number, totalItems: number): number {
  if (totalItems === 0) return -1;
  if (currentIndex <= 0) return totalItems - 1;
  return currentIndex - 1;
}

export function getHomeActiveIndex(totalItems: number): number {
  return totalItems > 0 ? 0 : -1;
}

export function getEndActiveIndex(totalItems: number): number {
  return totalItems > 0 ? totalItems - 1 : -1;
}

export function getCatalogSearchErrorMessageKey(
  errorCode: CatalogSearchErrorCode | string
): string {
  switch (errorCode) {
    case "QUERY_TOO_SHORT": return "minimumCharacters";
    case "QUERY_TOO_LONG": return "queryTooLong";
    case "QUERY_HAS_NO_SEARCH_TERMS": return "queryHasNoSearchTerms";
    case "QUERY_TOO_COMPLEX": return "queryTooComplex";
    case "SYSTEM_ERROR": return "systemError";
    default: return "invalidRequest";
  }
}

export function createSearchOptionId(baseId: string, index: number): string {
  return `${baseId}-option-${index}`;
}
