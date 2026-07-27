"use client";

import React, { useState, useEffect, useRef, useId } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";
import { searchCatalog } from "@/app/actions";
import { CatalogSearchResults } from "./CatalogSearchResults";
import {
  normalizeSearchInput,
  getSearchCodePointLength,
  flattenSearchResults,
  getNextActiveIndex,
  getPreviousActiveIndex,
  getHomeActiveIndex,
  getEndActiveIndex,
  createSearchOptionId,
  isSafeCatalogSearchHref,
  type FlattenedSearchResult,
  getCatalogSearchErrorMessageKey,
} from "./catalog-search-state";
import { cn } from "@/lib/utils";

type CatalogSearchSuggestionsProps = {
  locale: Locale;
  labels: Dictionary["search"];
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
};

type SearchState = {
  status: "idle" | "debouncing" | "loading" | "success" | "error";
  results: FlattenedSearchResult[];
  errorCodeKey?: string;
};

export function CatalogSearchSuggestions({
  locale,
  labels,
  variant,
  onNavigate,
}: CatalogSearchSuggestionsProps) {
  const router = useRouter();
  const reactId = useId();
  
  const inputId = `${reactId}-input`;
  const listboxId = `${reactId}-listbox`;
  const statusId = `${reactId}-status`;
  const categoriesHeadingId = `${reactId}-categories`;
  const offersHeadingId = `${reactId}-offers`;
  const optionIdFactory = (index: number) => createSearchOptionId(reactId, index);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchState, setSearchState] = useState<SearchState>({
    status: "idle",
    results: [],
  });
  
  const [showMinimumCharactersGuard, setShowMinimumCharactersGuard] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      requestIdRef.current += 1;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  // Outside click listener
  useEffect(() => {
    if (!isOpen) return;
    
    const handlePointerDown = (event: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setQuery(rawValue);
    setIsOpen(true);
    setActiveIndex(-1);
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    const normalized = normalizeSearchInput(rawValue);
    const codePointLength = getSearchCodePointLength(normalized);

    // Empty query
    if (codePointLength === 0) {
      setShowMinimumCharactersGuard(false);
      setIsOpen(false);
      setSearchState({ status: "idle", results: [] });
      requestIdRef.current += 1; // invalidate pending
      return;
    }

    // 1 char query
    if (codePointLength === 1) {
      setShowMinimumCharactersGuard(true);
      setSearchState({ status: "idle", results: [] });
      requestIdRef.current += 1;
      return;
    }

    // >= 2 chars
    setShowMinimumCharactersGuard(false);
    const currentRequestId = ++requestIdRef.current;

    setActiveIndex(-1);
    setSearchState({
      status: "debouncing",
      results: [],
    });
    setIsOpen(true);

    debounceTimerRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;
      if (requestIdRef.current !== currentRequestId) return;
      
      setSearchState({ status: "loading", results: [] });
      setIsOpen(true);

      try {
        const response = await searchCatalog({
          query: normalized,
          locale,
          categoryLimit: 3,
          offerLimit: 5,
        });

        if (!isMountedRef.current || requestIdRef.current !== currentRequestId) return;

        if (response.ok) {
          const flat = flattenSearchResults(response.categories, response.offers);
          setSearchState({ status: "success", results: flat });
        } else {
          const mainErrorCode = response.errors[0]?.code || "SYSTEM_ERROR";
          setSearchState({
            status: "error",
            results: [],
            errorCodeKey: getCatalogSearchErrorMessageKey(mainErrorCode),
          });
        }
      } catch (error) {
        if (!isMountedRef.current || requestIdRef.current !== currentRequestId) return;
        setSearchState({
          status: "error",
          results: [],
          errorCodeKey: "systemError",
        });
      }
    }, 300);
  };

  const executeNavigation = (index: number) => {
    if (index >= 0 && index < searchState.results.length) {
      const result = searchState.results[index];
      const href = result.type === "category" ? result.item.href : result.item.href;
      
      if (href && isSafeCatalogSearchHref(href)) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        requestIdRef.current += 1;

        setIsOpen(false);
        setActiveIndex(-1);
        setSearchState({
          status: "idle",
          results: [],
        });

        if (onNavigate) {
          onNavigate();
        }
        router.push(href);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && searchState.results.length > 0 && e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex(0);
      scrollOptionIntoView(0);
      return;
    }

    if (!isOpen && searchState.results.length > 0 && e.key === "ArrowUp") {
      e.preventDefault();
      const lastIndex = searchState.results.length - 1;
      setIsOpen(true);
      setActiveIndex(lastIndex);
      scrollOptionIntoView(lastIndex);
      return;
    }

    if (!isOpen) return;

    const totalItems = searchState.results.length;

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const next = getNextActiveIndex(activeIndex, totalItems);
        setActiveIndex(next);
        scrollOptionIntoView(next);
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const prev = getPreviousActiveIndex(activeIndex, totalItems);
        setActiveIndex(prev);
        scrollOptionIntoView(prev);
        break;
      }
      case "Home": {
        e.preventDefault();
        const home = getHomeActiveIndex(totalItems);
        setActiveIndex(home);
        scrollOptionIntoView(home);
        break;
      }
      case "End": {
        e.preventDefault();
        const end = getEndActiveIndex(totalItems);
        setActiveIndex(end);
        scrollOptionIntoView(end);
        break;
      }
      case "Enter": {
        if (activeIndex >= 0) {
          e.preventDefault();
          executeNavigation(activeIndex);
        }
        break;
      }
      case "Escape": {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      }
      case "Tab": {
        setIsOpen(false);
        break;
      }
    }
  };

  const scrollOptionIntoView = (index: number) => {
    if (index === -1) return;
    const optionElement = document.getElementById(optionIdFactory(index));
    if (optionElement) {
      optionElement.scrollIntoView({ block: "nearest" });
    }
  };

  const handleClear = () => {
    setQuery("");
    setIsOpen(false);
    setSearchState({ status: "idle", results: [] });
    setActiveIndex(-1);
    setShowMinimumCharactersGuard(false);
    requestIdRef.current += 1;
    // Input automatically gets focus if button clicked, but we can't reliably force it
    // without ref. Let's add ref to input.
    inputRef.current?.focus();
  };

  const inputRef = useRef<HTMLInputElement>(null);

  const activeDescendant = activeIndex >= 0 && isOpen ? optionIdFactory(activeIndex) : undefined;

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative",
        variant === "desktop" ? "hidden lg:block shrink-0 min-w-0 lg:w-56 xl:w-80 2xl:w-[28rem]" : "w-full mb-3"
      )}
    >
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-brand-navy/50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onClick={() => {
            const normalized = normalizeSearchInput(query);
            const length = getSearchCodePointLength(normalized);
            if (length >= 2 || searchState.results.length > 0) setIsOpen(true);
          }}
          placeholder={labels.placeholder}
          aria-label={labels.label}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={isOpen && searchState.results.length > 0 ? listboxId : undefined}
          aria-describedby={statusId}
          aria-activedescendant={activeDescendant}
          autoComplete="off"
          spellCheck={false}
          className="w-full min-h-[44px] rounded-[2px] border-none bg-white pl-10 pr-10 text-brand-navy placeholder:text-brand-navy/60 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 focus:ring-offset-brand-navy text-sm"
        />
        {query && (
          <button
            type="button"
            aria-label={labels.clear}
            onClick={handleClear}
            className="absolute right-0 top-0 flex h-full min-h-[44px] min-w-[44px] items-center justify-center text-brand-navy/60 hover:text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-teal rounded-r-[2px]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && (
        <div
          className={cn(
            "bg-white border-brand-navy/10",
            variant === "desktop"
              ? "absolute left-0 right-0 top-full mt-1 z-[60] max-h-[min(28rem,70vh)] overflow-y-auto border shadow-lg rounded-[2px]"
              : "static w-full mt-2 border-l-2 border-brand-teal/30 rounded-none bg-white/5 text-white"
          )}
        >
          {showMinimumCharactersGuard ? (
            <div id={statusId} role="status" aria-live="polite" aria-atomic="true" className={cn("px-4 py-3 text-sm", variant === "mobile" ? "text-white/60" : "text-brand-navy/60")}>
              {labels.minimumCharacters}
            </div>
          ) : (
            <CatalogSearchResults
              results={searchState.results}
              status={searchState.status === "debouncing" ? "loading" : searchState.status}
              labels={labels}
              errorCodeKey={searchState.errorCodeKey}
              activeIndex={activeIndex}
              listboxId={listboxId}
              statusId={statusId}
              categoriesHeadingId={categoriesHeadingId}
              offersHeadingId={offersHeadingId}
              onOptionHover={(index) => setActiveIndex(index)}
              onOptionSelect={(index) => executeNavigation(index)}
              getOptionId={optionIdFactory}
              variant={variant}
            />
          )}
        </div>
      )}
    </div>
  );
}
