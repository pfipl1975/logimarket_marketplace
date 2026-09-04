"use client";

import { useState, useMemo, useId } from "react";
import type { Dictionary } from "@/lib/i18n/types";
import {
  type CategoryItem,
  type DrillDownItem,
  initDrillDown,
  drillDownNavigate,
  drillDownBack,
  drillDownJumpToAncestor,
  drillDownResetSelection,
  drillDownSelectLeafDirect,
  drillDownNavigateDirect,
  searchCategories,
} from "@/lib/catalog/category-picker-core";
import { ChevronRight, ArrowLeft, Search, X, CheckCircle2, RotateCcw } from "lucide-react";

interface AdminCategoryPickerProps {
  categories: CategoryItem[];
  dict: Dictionary["adminOffers"];
  name?: string;
  onSelectionChange?: (leafId: number | null, isLeaf: boolean) => void;
}

export function AdminCategoryPicker({
  categories,
  dict,
  name = "categoryId",
  onSelectionChange,
}: AdminCategoryPickerProps) {
  const searchInputId = useId();
  const [drillState, setDrillState] = useState(() => initDrillDown(categories));
  const [searchQuery, setSearchQuery] = useState("");

  const searchResults = useMemo(() => {
    return searchCategories(categories, searchQuery);
  }, [categories, searchQuery]);

  const handleItemClick = (item: DrillDownItem) => {
    const nextState = drillDownNavigate(categories, drillState, item.id);
    setDrillState(nextState);

    if (onSelectionChange) {
      const isLeaf = nextState.selectedLeaf !== null;
      onSelectionChange(nextState.selectedLeaf?.id ?? null, isLeaf);
    }
  };

  const handleSearchResultClick = (item: DrillDownItem) => {
    if (item.isLeaf) {
      const nextState = drillDownSelectLeafDirect(categories, item.id);
      setDrillState(nextState);
      setSearchQuery("");
      if (onSelectionChange) {
        onSelectionChange(item.id, true);
      }
    } else {
      // Non-leaf: navigate directly into this parent branch reconstructing full ancestor path
      const nextState = drillDownNavigateDirect(categories, item.id);
      setDrillState(nextState);
      setSearchQuery("");
    }
  };

  const handleBack = () => {
    const nextState = drillDownBack(categories, drillState);
    setDrillState(nextState);
    if (onSelectionChange && drillState.selectedLeaf !== null) {
      onSelectionChange(null, false);
    }
  };

  const handleJumpToAncestor = (index: number) => {
    const nextState = drillDownJumpToAncestor(categories, drillState, index);
    setDrillState(nextState);
    if (onSelectionChange && drillState.selectedLeaf !== null) {
      onSelectionChange(null, false);
    }
  };

  const handleChangeCategory = () => {
    const nextState = drillDownResetSelection(categories, drillState);
    setDrillState(nextState);
    setSearchQuery("");
    if (onSelectionChange) {
      onSelectionChange(null, false);
    }
  };

  const isLeafSelected = drillState.selectedLeaf !== null;
  const isSearching = searchQuery.trim().length > 0;

  return (
    <fieldset className="space-y-2 border-0 p-0 m-0">
      {/* Hidden input for HTML form submission */}
      <input
        type="hidden"
        id="categoryId"
        name={name}
        value={isLeafSelected && drillState.selectedLeaf ? String(drillState.selectedLeaf.id) : ""}
      />

      {/* Semantic Legend / Label */}
      <legend className="block text-sm font-medium text-brand-navy">
        {dict.createCategoryLabel}
      </legend>

      {/* CASE A: Leaf is Selected — Show compact selected-state card */}
      {isLeafSelected && drillState.selectedLeaf && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{dict.createCategorySelectedPath}</span>
            </div>
            <button
              type="button"
              onClick={handleChangeCategory}
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-900 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded px-1 py-0.5"
            >
              <RotateCcw className="h-3 w-3" />
              <span>{dict.createCategoryChange}</span>
            </button>
          </div>

          <div className="space-y-1 text-sm text-emerald-950 font-medium">
            {drillState.selectedPath.map((node, idx) => (
              <div key={node.id} className="flex items-center gap-2">
                {idx > 0 && <span className="text-emerald-500 select-none">→</span>}
                <span
                  className={
                    idx === drillState.selectedPath.length - 1
                      ? "font-bold text-emerald-900"
                      : "text-emerald-800"
                  }
                >
                  {node.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CASE B: Browsing / Drill-Down State */}
      {!isLeafSelected && (
        <div className="rounded-md border border-input bg-white p-3 space-y-3 shadow-xs">
          {/* Search Field with Explicit Accessible Name */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              id={searchInputId}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={dict.createCategorySearchAriaLabel}
              placeholder={dict.createCategorySearchPlaceholder}
              className="w-full pl-8 pr-8 py-1.5 text-sm rounded-md border border-input focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
            />
            {isSearching && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label={dict.createCategoryClearSearch}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground text-xs"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Drill-down Navigation Header (when not searching) */}
          {!isSearching && (
            <div className="flex items-center justify-between border-b pb-2 pt-1">
              {drillState.navigationPath.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="inline-flex items-center gap-1 font-semibold text-brand-navy hover:text-brand-teal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal rounded px-1.5 py-0.5 -ml-1.5"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>{dict.createCategoryBack}</span>
                  </button>

                  <span className="text-muted-foreground">|</span>

                  <button
                    type="button"
                    onClick={() => handleJumpToAncestor(-1)}
                    className="text-muted-foreground hover:text-brand-navy hover:underline"
                  >
                    {dict.createCategoryNavStart}
                  </button>

                  {drillState.navigationPath.map((item, idx) => (
                    <span key={item.id} className="inline-flex items-center gap-1.5">
                      <span className="text-muted-foreground">/</span>
                      <button
                        type="button"
                        onClick={() => handleJumpToAncestor(idx)}
                        className={
                          idx === drillState.navigationPath.length - 1
                            ? "font-bold text-brand-navy"
                            : "text-muted-foreground hover:text-brand-navy hover:underline"
                        }
                      >
                        {item.name}
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {dict.createCategorySelectRoot}
                </div>
              )}
            </div>
          )}

          {/* Items List */}
          <div className="divide-y divide-border/60 border rounded-md overflow-hidden max-h-72 overflow-y-auto">
            {isSearching ? (
              // Search Results
              searchResults.length > 0 ? (
                searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSearchResultClick(item)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left text-sm text-brand-navy hover:bg-slate-50 transition-colors focus-visible:bg-slate-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
                  >
                    <div className="flex flex-col gap-0.5 pr-2 min-w-0">
                      <span className="font-semibold text-slate-900 break-words">{item.name}</span>
                      <span className="text-xs text-muted-foreground break-words">
                        {item.pathFormatted}
                      </span>
                    </div>
                    {item.hasChildren ? (
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    ) : (
                      <span className="text-xs font-medium text-emerald-700 shrink-0 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {dict.createCategorySelectLeaf}
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {dict.createCategoryNoResults}
                </div>
              )
            ) : (
              // Standard Drill-Down Visible Items
              drillState.visibleItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left text-sm text-brand-navy hover:bg-slate-50 transition-colors focus-visible:bg-slate-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
                >
                  <span className="font-medium text-slate-800 break-words pr-2">{item.name}</span>
                  {item.hasChildren ? (
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  ) : (
                    <span className="text-xs font-medium text-brand-teal shrink-0 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {dict.createCategorySelectLeaf}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </fieldset>
  );
}
