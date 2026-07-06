"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";

export type CatalogExplorerNode = {
  id: number;
  slug: string;
  label: string;
  href: string;
  children: CatalogExplorerNode[];
};

export type CatalogCategoryExplorerLabels = {
  trigger: string;
  close: string;
  allCategories: string;
};

interface CatalogCategoryExplorerProps {
  tree: CatalogExplorerNode[];
  labels: CatalogCategoryExplorerLabels;
  initialActiveSectionSlug?: string;
}

function ExplorerChildLinks({
  nodes,
  onNavigate,
  level = 0,
}: {
  nodes: CatalogExplorerNode[];
  onNavigate: () => void;
  level?: number;
}) {
  if (nodes.length === 0) return null;

  return (
    <ul className={level === 0 ? "space-y-1.5 border-t border-gray-50 pt-2" : "mt-1.5 space-y-1.5 border-l border-border/60 pl-3"}>
      {nodes.map((node) => (
        <li key={node.id}>
          <Link
            href={node.href}
            onClick={onNavigate}
            className={`block transition-colors hover:text-brand-teal ${
              level === 0
                ? "text-xs text-muted-foreground"
                : "text-xs text-muted-foreground/90"
            }`}
          >
            {node.label}
          </Link>
          <ExplorerChildLinks
            nodes={node.children}
            onNavigate={onNavigate}
            level={level + 1}
          />
        </li>
      ))}
    </ul>
  );
}

export function CatalogCategoryExplorer({
  tree,
  labels,
  initialActiveSectionSlug,
}: CatalogCategoryExplorerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSectionSlug, setActiveSectionSlug] = useState<string>(
    initialActiveSectionSlug || (tree.length > 0 ? tree[0].slug : "")
  );
  const [openMobileSectionSlug, setOpenMobileSectionSlug] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);


  // Click outside and Escape listener to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isOpen]);

  if (tree.length === 0) return null;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger button/bar */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls="catalog-explorer-panel"
          className="flex items-center gap-2 border border-border bg-white px-4 py-2.5 text-sm font-semibold text-brand-navy hover:text-brand-teal hover:border-brand-teal transition-all focus:outline-none focus:ring-2 focus:ring-brand-teal"
        >
          <span>{labels.trigger}</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Explorer mega-menu panel */}
      <div
        id="catalog-explorer-panel"
        aria-hidden={!isOpen}
        className={`absolute left-0 right-0 top-full z-50 mt-2 border border-border bg-white shadow-lg transition-all ${
          isOpen ? "block" : "hidden"
        }`}
      >
        {/* Desktop view */}
        <div className="hidden lg:grid grid-cols-4 min-h-[380px]">
          {/* Left Column: Section selection */}
          <div className="col-span-1 border-r border-border bg-brand-light-gray/20 p-4 space-y-1">
            {tree.map((section) => (
              <div key={section.slug}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveSectionSlug(section.slug)}
                  onClick={() => setActiveSectionSlug(section.slug)}
                  aria-pressed={section.slug === activeSectionSlug}
                  className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors flex items-center justify-between border-l-2 ${
                    section.slug === activeSectionSlug
                      ? "border-brand-teal text-brand-teal bg-white"
                      : "border-transparent text-brand-navy hover:text-brand-teal hover:bg-white/50"
                  }`}
                >
                  <span>{section.label}</span>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </button>
              </div>
            ))}
          </div>

          {/* Right Column: Groups and leaf categories for all sections (always in DOM, hidden via class) */}
          <div className="col-span-3 p-6 bg-white overflow-y-auto max-h-[500px]">
            {tree.map((section) => (
              <div
                key={section.slug}
                className={`${section.slug === activeSectionSlug ? "grid grid-cols-3 gap-6" : "hidden"}`}
              >
                {/* Header with link to section */}
                <div className="col-span-3 border-b border-border pb-3 mb-2 flex items-center justify-between">
                  <Link
                    href={section.href}
                    onClick={() => setIsOpen(false)}
                    className="text-lg font-bold text-brand-navy hover:text-brand-teal transition-colors"
                  >
                    {section.label}
                  </Link>
                  <Link
                    href={section.href}
                    onClick={() => setIsOpen(false)}
                    className="text-xs font-semibold text-brand-teal hover:underline"
                  >
                    {labels.allCategories} &rarr;
                  </Link>
                </div>

                {/* Groups and categories mapping */}
                {section.children.map((group) => (
                  <div key={group.id} className="space-y-2">
                    <Link
                      href={group.href}
                      onClick={() => setIsOpen(false)}
                      className="block text-sm font-bold text-brand-navy hover:text-brand-teal transition-colors"
                    >
                      {group.label}
                    </Link>
                    <ExplorerChildLinks
                      nodes={group.children}
                      onNavigate={() => setIsOpen(false)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Mobile view */}
        <div className="block lg:hidden border-t border-border bg-white max-h-[450px] overflow-y-auto">
          {tree.map((section) => {
            const isExpanded = openMobileSectionSlug === section.slug;
            return (
              <div key={section.slug} className="border-b border-border">
                {/* Section Header Accordion Trigger */}
                <button
                  type="button"
                  onClick={() => setOpenMobileSectionSlug(isExpanded ? null : section.slug)}
                  aria-expanded={isExpanded}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-bold text-brand-navy hover:bg-brand-light-gray/20 transition-colors"
                >
                  <span>{section.label}</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Accordion Content (always in DOM, toggled via display class) */}
                <div
                  className={`px-4 pb-4 bg-brand-light-gray/5 space-y-4 ${
                    isExpanded ? "block" : "hidden"
                  }`}
                >
                  {/* Link to all categories of this section */}
                  <div className="pt-2 border-b border-border pb-2">
                    <Link
                      href={section.href}
                      onClick={() => setIsOpen(false)}
                      className="text-xs font-semibold text-brand-teal hover:underline"
                    >
                      {labels.allCategories} &rarr;
                    </Link>
                  </div>

                  {section.children.map((group) => (
                    <div key={group.id} className="space-y-1.5">
                      <Link
                        href={group.href}
                        onClick={() => setIsOpen(false)}
                        className="block text-xs font-bold text-brand-navy hover:text-brand-teal transition-colors"
                      >
                        {group.label}
                      </Link>
                      <ExplorerChildLinks
                        nodes={group.children}
                        onNavigate={() => setIsOpen(false)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
