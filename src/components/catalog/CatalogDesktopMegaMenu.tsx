"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { type CatalogExplorerNode, getActivePathNodes } from "@/lib/catalog/navigation";

export type CatalogDesktopMegaMenuLabels = {
  trigger: string;
  catalogMenuOpen: string;
  catalogMenuClose: string;
  catalogMenuSections: string;
  catalogMenuGroups: string;
  catalogMenuCategories: string;
  catalogMenuViewSection: string;
  catalogMenuViewGroup: string;
};

interface CatalogDesktopMegaMenuProps {
  tree: CatalogExplorerNode[];
  labels: CatalogDesktopMegaMenuLabels;
}

export function CatalogDesktopMegaMenu({ tree, labels }: CatalogDesktopMegaMenuProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSectionSlug, setActiveSectionSlug] = useState<string>("");
  const [activeGroupSlug, setActiveGroupSlug] = useState<string>("");
  
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Initialize active state based on current pathname
  useEffect(() => {
    if (!isOpen) return; // Only re-evaluate when opening
    
    const activePaths = getActivePathNodes(pathname, tree);
    if (activePaths.sectionSlug) {
      setActiveSectionSlug(activePaths.sectionSlug);
    } else if (tree.length > 0) {
      setActiveSectionSlug(tree[0].slug);
    }
    
    if (activePaths.groupSlug) {
      setActiveGroupSlug(activePaths.groupSlug);
    } else {
      // Find first group of the active section
      const activeSection = tree.find(s => s.slug === (activePaths.sectionSlug || tree[0]?.slug));
      if (activeSection && activeSection.children.length > 0) {
        setActiveGroupSlug(activeSection.children[0].slug);
      } else {
        setActiveGroupSlug("");
      }
    }
  }, [isOpen, pathname, tree]);

  // Handle Escape and click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
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

  const toggleOpen = () => setIsOpen((prev) => !prev);
  const closeMenu = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleSectionHover = (slug: string) => {
    if (isOpen && activeSectionSlug !== slug) {
      setActiveSectionSlug(slug);
      const section = tree.find(s => s.slug === slug);
      if (section && section.children.length > 0) {
        setActiveGroupSlug(section.children[0].slug);
      } else {
        setActiveGroupSlug("");
      }
    }
  };

  const handleGroupHover = (slug: string) => {
    if (isOpen && activeGroupSlug !== slug) {
      setActiveGroupSlug(slug);
    }
  };

  const activeSection = tree.find((s) => s.slug === activeSectionSlug);
  const activeGroup = activeSection?.children.find((g) => g.slug === activeGroupSlug);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-controls="desktop-mega-menu"
        aria-label={isOpen ? labels.catalogMenuClose : labels.catalogMenuOpen}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy sm:px-3 ${
          isOpen ? "bg-white/15 text-white" : "text-white hover:bg-white/5"
        }`}
      >
        {labels.trigger}
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          id="desktop-mega-menu"
          className="absolute left-0 top-full z-50 mt-2 w-[800px] max-w-[calc(100vw-2rem)] rounded-md border border-border bg-white shadow-xl"
        >
          <div className="flex max-h-[70vh] flex-row overflow-hidden rounded-md">
            {/* Sections Column */}
            <div className="w-1/3 flex-shrink-0 border-r border-border bg-gray-50/50 py-4 overflow-y-auto">
              <div className="mb-2 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {labels.catalogMenuSections}
              </div>
              <ul className="flex flex-col">
                {tree.map((section) => (
                  <li key={section.id}>
                    <button
                      onMouseEnter={() => handleSectionHover(section.slug)}
                      onClick={() => handleSectionHover(section.slug)}
                      className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:text-brand-teal ${
                        activeSectionSlug === section.slug
                          ? "bg-white font-semibold text-brand-navy shadow-[inset_2px_0_0_0_#0F6A68]"
                          : "text-brand-navy/80"
                      }`}
                    >
                      <span>{section.label}</span>
                      {activeSectionSlug === section.slug && (
                        <ChevronRight className="h-4 w-4 text-brand-teal" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Groups Column */}
            {activeSection && (
              <div className="w-1/3 flex-shrink-0 border-r border-border bg-white py-4 overflow-y-auto">
                <div className="mb-2 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {labels.catalogMenuGroups}
                </div>
                {activeSection.children.length > 0 ? (
                  <ul className="flex flex-col">
                    {activeSection.children.map((group) => (
                      <li key={group.id}>
                        <button
                          onMouseEnter={() => handleGroupHover(group.slug)}
                          onClick={() => handleGroupHover(group.slug)}
                          className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:text-brand-teal ${
                            activeGroupSlug === group.slug
                              ? "font-semibold text-brand-teal"
                              : "text-brand-navy/80"
                          }`}
                        >
                          <span>{group.label}</span>
                          {activeGroupSlug === group.slug && (
                            <ChevronRight className="h-4 w-4 text-brand-teal" aria-hidden="true" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-2 text-sm text-muted-foreground">
                    Brak grup
                  </div>
                )}
                <div className="mt-4 px-4 pt-4 border-t border-gray-50">
                  <Link
                    href={activeSection.href}
                    onClick={closeMenu}
                    className="group inline-flex items-center text-xs font-semibold text-brand-teal transition-colors hover:text-brand-navy"
                  >
                    {labels.catalogMenuViewSection}
                    <ChevronRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            )}

            {/* Categories Column */}
            {activeGroup && (
              <div className="w-1/3 flex-shrink-0 bg-white py-4 overflow-y-auto">
                <div className="mb-2 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {labels.catalogMenuCategories}
                </div>
                {activeGroup.children.length > 0 ? (
                  <ul className="flex flex-col">
                    {activeGroup.children.map((category) => (
                      <li key={category.id}>
                        <Link
                          href={category.href}
                          onClick={closeMenu}
                          className="block px-4 py-1.5 text-sm text-brand-navy/80 transition-colors hover:text-brand-teal"
                        >
                          {category.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-2 text-sm text-muted-foreground">
                    Brak kategorii
                  </div>
                )}
                <div className="mt-4 px-4 pt-4 border-t border-gray-50">
                  <Link
                    href={activeGroup.href}
                    onClick={closeMenu}
                    className="group inline-flex items-center text-xs font-semibold text-brand-teal transition-colors hover:text-brand-navy"
                  >
                    {labels.catalogMenuViewGroup}
                    <ChevronRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
