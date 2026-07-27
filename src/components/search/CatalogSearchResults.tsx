import React from "react";
import type { Dictionary } from "@/lib/i18n/types";
import { type FlattenedSearchResult } from "./catalog-search-state";

type CatalogSearchResultsProps = {
  status: "idle" | "loading" | "success" | "error";
  results: FlattenedSearchResult[];
  activeIndex: number;
  labels: Dictionary["search"];
  errorCodeKey?: string;
  listboxId: string;
  statusId: string;
  categoriesHeadingId: string;
  offersHeadingId: string;
  onOptionHover: (index: number) => void;
  onOptionSelect: (index: number) => void;
  getOptionId: (index: number) => string;
  variant: "desktop" | "mobile";
};

export function CatalogSearchResults({
  status,
  results,
  activeIndex,
  labels,
  errorCodeKey,
  listboxId,
  statusId,
  categoriesHeadingId,
  offersHeadingId,
  onOptionHover,
  onOptionSelect,
  getOptionId,
  variant,
}: CatalogSearchResultsProps) {
  if (status === "idle" && results.length === 0) {
    return null;
  }

  return (
    <>
      <div id={statusId} role="status" aria-live="polite" aria-atomic="true">
        {status === "error" && (
          <div className={`px-4 py-3 text-sm ${variant === "mobile" ? "text-red-300" : "text-red-600"}`}>
            {errorCodeKey ? (labels as Record<string, string>)[errorCodeKey] || labels.systemError : labels.systemError}
          </div>
        )}

        {status === "loading" && results.length === 0 && (
          <div className={`px-4 py-3 text-sm ${variant === "mobile" ? "text-white/60" : "text-brand-navy/60"}`}>
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin text-brand-teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" focusable="false">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v2m0 12v2m8-8h-2M6 12H4m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414M16.95 16.95l1.414 1.414M7.05 7.05L5.636 5.636" />
              </svg>
              {labels.loading}
            </div>
          </div>
        )}

        {status === "success" && results.length === 0 && (
          <div className={`px-4 py-3 text-sm ${variant === "mobile" ? "text-white/60" : "text-brand-navy/60"}`}>
            {labels.noResults}
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          className="py-2 flex flex-col min-h-0"
          onMouseLeave={() => onOptionHover(-1)}
        >
          <div role="presentation" className={`flex flex-col min-h-0 ${status === "loading" ? "opacity-50 pointer-events-none" : ""}`}>
            {/* We group them by type in rendering while keeping the flattened index array */}
            {results.some((r) => r.type === "category") && (
              <div role="group" aria-labelledby={categoriesHeadingId}>
                <div
                  id={categoriesHeadingId}
                  className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wider ${variant === "mobile" ? "text-white/50" : "text-brand-navy/50"}`}
                >
                {labels.categoriesHeading}
              </div>
              {results.map((result, index) => {
                if (result.type !== "category") return null;
                const isSelected = index === activeIndex;
                const cat = result.item;
                return (
                  <div
                    key={cat.id}
                    id={getOptionId(index)}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={-1}
                    onMouseEnter={() => onOptionHover(index)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                    }}
                    onClick={() => {
                      onOptionSelect(index);
                    }}
                    className={`cursor-pointer px-4 py-2 flex flex-col gap-0.5 ${
                      isSelected
                        ? (variant === "mobile" ? "bg-brand-teal/15" : "bg-brand-teal/10")
                        : (variant === "mobile" ? "hover:bg-white/5" : "hover:bg-brand-navy/5")
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-brand-teal uppercase tracking-wider">{labels.resultTypeCategory}</span>
                      <span className={`text-sm font-semibold ${variant === "mobile" ? "text-white" : "text-brand-navy"}`}>{cat.label}</span>
                    </div>
                    {cat.breadcrumbLabels && cat.breadcrumbLabels.length > 0 && (
                      <div className={`text-xs truncate ${variant === "mobile" ? "text-white/60" : "text-brand-navy/60"}`}>
                        {cat.breadcrumbLabels.join(" › ")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {results.some((r) => r.type === "offer") && (
            <div role="group" aria-labelledby={offersHeadingId} className={results.some((r) => r.type === "category") ? `border-t mt-2 pt-2 ${variant === "mobile" ? "border-white/10" : "border-gray-200"}` : ""}>
              <div
                id={offersHeadingId}
                className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wider ${variant === "mobile" ? "text-white/50" : "text-brand-navy/50"}`}
              >
                {labels.offersHeading}
              </div>
              {results.map((result, index) => {
                if (result.type !== "offer") return null;
                const isSelected = index === activeIndex;
                const off = result.item;
                return (
                  <div
                    key={off.id}
                    id={getOptionId(index)}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={-1}
                    onMouseEnter={() => onOptionHover(index)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                    }}
                    onClick={() => {
                      onOptionSelect(index);
                    }}
                    className={`cursor-pointer px-4 py-2 flex flex-col gap-0.5 ${
                      isSelected
                        ? (variant === "mobile" ? "bg-brand-teal/15" : "bg-brand-teal/10")
                        : (variant === "mobile" ? "hover:bg-white/5" : "hover:bg-brand-navy/5")
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-medium text-brand-teal uppercase tracking-wider shrink-0">{labels.resultTypeOffer}</span>
                        <span className={`text-sm font-semibold truncate ${variant === "mobile" ? "text-white" : "text-brand-navy"}`}>{off.title}</span>
                      </div>
                    </div>
                    <div className={`text-xs flex items-center justify-between truncate gap-2 ${variant === "mobile" ? "text-white/60" : "text-brand-navy/60"}`}>
                      <span className="truncate">{off.categoryLabel}</span>
                      {off.partnerName && <span className="font-medium shrink-0">{off.partnerName}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </div>
      )}
    </>
  );
}
