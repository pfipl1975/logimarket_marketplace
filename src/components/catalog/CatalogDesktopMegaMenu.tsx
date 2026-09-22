"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
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
  catalogMenuEmptyGroups: string;
  catalogMenuEmptyCategories: string;
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
  const [activePathSlugs, setActivePathSlugs] = useState<string[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Initialize active state based on current pathname
  useEffect(() => {
    if (!isOpen) return; // Only re-evaluate when opening
    
    const activePaths = getActivePathNodes(pathname, tree);
    // active menu branch is intentionally synchronized when menu opens
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActivePathSlugs(activePaths.pathSlugs);
    
    // Set active section
    let currentSectionSlug = "";
    if (activePaths.sectionSlug) {
      currentSectionSlug = activePaths.sectionSlug;
    } else if (tree.length > 0) {
      currentSectionSlug = tree[0].slug;
    }
    setActiveSectionSlug(currentSectionSlug);
    
    // Set active group
    if (activePaths.groupSlug) {
      setActiveGroupSlug(activePaths.groupSlug);
    } else {
      const activeSection = tree.find(s => s.slug === currentSectionSlug);
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
    <div className="static inline-block shrink-0" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        aria-expanded={isOpen}
        aria-controls="desktop-mega-menu"
        aria-label={isOpen ? labels.catalogMenuClose : labels.catalogMenuOpen}
        className={`flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy sm:px-3 ${
          isOpen ? "bg-white/15 text-white" : "text-white hover:bg-white/5"
        }`}
      >
        {labels.trigger}
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
          focusable="false"
        />
      </button>

      {isOpen && (
        <div
          id="desktop-mega-menu"
          className="absolute left-0 right-0 top-full z-50 mt-2 rounded-md border border-border bg-white shadow-xl"
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
                      type="button"
                      onMouseEnter={() => handleSectionHover(section.slug)}
                      onClick={() => handleSectionHover(section.slug)}
                      aria-pressed={activeSectionSlug === section.slug}
                      className={`flex w-full items-center justify-between border-l-2 px-4 py-2 text-left text-sm transition-colors hover:text-brand-teal ${
                        activeSectionSlug === section.slug
                          ? "border-brand-teal bg-white font-semibold text-brand-navy"
                          : "border-transparent text-brand-navy/80"
                      }`}
                    >
                      <span>{section.label}</span>
                      {activeSectionSlug === section.slug && (
                        <ChevronRight className="h-4 w-4 text-brand-teal" aria-hidden="true" focusable="false" />
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
                          type="button"
                          onMouseEnter={() => handleGroupHover(group.slug)}
                          onClick={() => handleGroupHover(group.slug)}
                          aria-pressed={activeGroupSlug === group.slug}
                          className={`flex w-full items-center justify-between border-l-2 px-4 py-2 text-left text-sm transition-colors hover:text-brand-teal ${
                            activeGroupSlug === group.slug
                              ? "border-brand-teal bg-white font-semibold text-brand-teal"
                              : "border-transparent text-brand-navy/80"
                          }`}
                        >
                          <span>{group.label}</span>
                          {activeGroupSlug === group.slug && (
                            <ChevronRight className="h-4 w-4 text-brand-teal" aria-hidden="true" focusable="false" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-2 text-sm text-muted-foreground">
                    {labels.catalogMenuEmptyGroups}
                  </div>
                )}
                <div className="mt-4 px-4 pt-4 border-t border-gray-50">
                  <Link
                    href={activeSection.href}
                    onClick={closeMenu}
                    className="group inline-flex items-center text-xs font-semibold text-brand-teal transition-colors hover:text-brand-navy"
                  >
                    {labels.catalogMenuViewSection}
                    <ChevronRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" focusable="false" />
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
                  <CatalogCategoryBranchLinks 
                    nodes={activeGroup.children} 
                    closeMenu={closeMenu} 
                    activePathSlugs={activePathSlugs}
                    depth={0}
                  />
                ) : (
                  <div className="px-4 py-2 text-sm text-muted-foreground">
                    {labels.catalogMenuEmptyCategories}
                  </div>
                )}
                <div className="mt-4 px-4 pt-4 border-t border-gray-50">
                  <Link
                    href={activeGroup.href}
                    onClick={closeMenu}
                    className="group inline-flex items-center text-xs font-semibold text-brand-teal transition-colors hover:text-brand-navy"
                  >
                    {labels.catalogMenuViewGroup}
                    <ChevronRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" focusable="false" />
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

function CatalogCategoryBranchLinks({ 
  nodes, 
  closeMenu, 
  activePathSlugs, 
  depth 
}: { 
  nodes: CatalogExplorerNode[]; 
  closeMenu: () => void; 
  activePathSlugs: string[];
  depth: number;
}) {
  if (nodes.length === 0) return null;
  return (
    <ul className="flex flex-col">
      {nodes.map((node) => {
        const isActive = activePathSlugs.includes(node.slug);
        // Is it the very exact current page? We assume if it's the last in the activePathSlugs.
        // Or if it's the specific target category being requested
        const isCurrentPage = activePathSlugs.length > 0 && activePathSlugs[activePathSlugs.length - 1] === node.slug;
        
        return (
          <li key={node.id}>
            <Link
              href={node.href}
              onClick={closeMenu}
              aria-current={isCurrentPage ? "page" : undefined}
              className={`block px-4 py-1.5 text-sm transition-colors hover:text-brand-teal ${
                isActive ? "font-semibold text-brand-teal" : "text-brand-navy/80"
              } ${depth === 0 ? "pl-4" : depth === 1 ? "pl-8" : depth === 2 ? "pl-12" : "pl-16"}`}
            >
              {node.label}
            </Link>
            <CatalogCategoryBranchLinks 
              nodes={node.children} 
              closeMenu={closeMenu} 
              activePathSlugs={activePathSlugs} 
              depth={depth + 1} 
            />
          </li>
        );
      })}
    </ul>
  );
}
