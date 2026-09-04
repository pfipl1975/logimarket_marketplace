"use client";

import { useState, useId } from "react";
import type { Dictionary } from "@/lib/i18n/types";
import { computePickerState } from "@/lib/catalog/category-picker-core";
import { ChevronRight, CheckCircle2 } from "lucide-react";

interface CategoryOption {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
}

interface AdminCategoryPickerProps {
  categories: CategoryOption[];
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
  const [selectedPath, setSelectedPath] = useState<number[]>([]);
  const baseId = useId();

  const state = computePickerState(categories, selectedPath);

  const handleLevelChange = (depth: number, valueStr: string) => {
    let nextPath: number[];
    if (!valueStr) {
      // Clear selection at this level and all descendants
      nextPath = selectedPath.slice(0, depth);
    } else {
      const selectedId = Number(valueStr);
      nextPath = [...selectedPath.slice(0, depth), selectedId];
    }

    setSelectedPath(nextPath);

    if (onSelectionChange) {
      const nextState = computePickerState(categories, nextPath);
      onSelectionChange(nextState.selectedLeafId, nextState.isLeafSelected);
    }
  };

  return (
    <div className="space-y-3">
      {/* Hidden input strictly for form data submission (transport state, not security gate) */}
      <input
        type="hidden"
        id="categoryId"
        name={name}
        value={state.isLeafSelected && state.selectedLeafId !== null ? String(state.selectedLeafId) : ""}
      />

      {/* Dynamic cascading selectors */}
      {state.levels.map((level) => {
        const selectId = `${baseId}-level-${level.depth}`;
        const isRoot = level.depth === 0;
        const parentNode = !isRoot && level.depth - 1 < state.selectedNodes.length
          ? state.selectedNodes[level.depth - 1]
          : null;

        const labelText = isRoot
          ? dict.createCategoryLabel
          : parentNode
            ? `${dict.createCategorySubcategoryLabel} (${parentNode.name}) *`
            : `${dict.createCategorySubcategoryLabel} *`;

        const placeholder = isRoot
          ? dict.createCategorySelectRoot
          : dict.createCategorySelectSubcategory;

        return (
          <div key={level.depth} className="space-y-1">
            <label
              htmlFor={selectId}
              className="block text-sm font-medium text-brand-navy"
            >
              {labelText}
            </label>
            <select
              id={selectId}
              required
              value={level.selectedId !== null ? String(level.selectedId) : ""}
              onChange={(e) => handleLevelChange(level.depth, e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
            >
              <option value="">{placeholder}</option>
              {level.options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
        );
      })}

      {/* Full localized path confirmation shown when an exact leaf category is reached */}
      {state.isLeafSelected && state.selectedNodes.length > 0 && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-3 text-sm text-emerald-950">
          <div className="flex items-center gap-1.5 font-medium text-emerald-800 mb-1">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{dict.createCategorySelectedPath}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-semibold text-emerald-900 break-words">
            {state.selectedNodes.map((node, index) => (
              <span key={node.id} className="inline-flex items-center gap-1.5">
                {index > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                )}
                <span>{node.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
