"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive } from "@/lib/navigation/active";
import { cn } from "@/lib/utils";
import { HeaderDesktopNavigation, type HeaderDesktopNavigationItem } from "@/components/HeaderDesktopNavigation";
import { CatalogDesktopMegaMenu, type CatalogDesktopMegaMenuLabels } from "@/components/catalog/CatalogDesktopMegaMenu";
import { type CatalogExplorerNode, getActivePathNodes } from "@/lib/catalog/navigation";

export type MobileNavigationItem = {
  label: string;
  href: string;
  external?: boolean;
};

export type MobileCatalogNavigationLabels = {
  mobileCatalogTitle: string;
  mobileCatalogClose: string;
  mobileCatalogBack: string;
  mobileCatalogBackToMenu: string;
  mobileCatalogViewCatalog: string;
  mobileCatalogViewCurrent: string;
  mobileCatalogOpenLevel: string;
};

export type CatalogNavigationClientProps = {
  tree: CatalogExplorerNode[];
  desktopItems: HeaderDesktopNavigationItem[];
  mobileItems: MobileNavigationItem[];
  desktopLabels: CatalogDesktopMegaMenuLabels;
  mobileLabels: MobileCatalogNavigationLabels;
  catalogHref: string;
  menuOpenLabel: string;
  menuCloseLabel: string;
  mainNavigationLabel: string;
};

type MobileNavigationMode = "main" | "catalog";

export function CatalogNavigationClient({
  tree,
  desktopItems,
  mobileItems,
  desktopLabels,
  mobileLabels,
  catalogHref,
  menuOpenLabel,
  menuCloseLabel,
  mainNavigationLabel,
}: CatalogNavigationClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<MobileNavigationMode>("main");
  const [navigationStack, setNavigationStack] = useState<CatalogExplorerNode[]>([]);

  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const levelTitleRef = useRef<HTMLSpanElement>(null);

  // Close menu on ESC key press and return focus
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setMode("main");
        setNavigationStack([]);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (!isOpen) return;
    const root = document.documentElement;
    const wasLocked = root.classList.contains("overflow-hidden");

    if (!wasLocked) {
      root.classList.add("overflow-hidden");
    }

    return () => {
      if (!wasLocked) {
        root.classList.remove("overflow-hidden");
      }
    };
  }, [isOpen]);

  // Close menu on pathname change
  useEffect(() => {
    setIsOpen(false);
    setMode("main");
    setNavigationStack([]);
  }, [pathname]);

  // Focus management on open and view change
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      if (mode === "main") {
        closeButtonRef.current?.focus();
      } else {
        levelTitleRef.current?.focus();
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, mode, navigationStack.length]);

  const resetNavigation = () => {
    setIsOpen(false);
    setMode("main");
    setNavigationStack([]);
  };

  const closeAndFocusTrigger = () => {
    resetNavigation();
    triggerRef.current?.focus();
  };

  const handleDrawerKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab" || !drawerRef.current) return;

    const focusableElements = Array.from(
      drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(
      (element) => element.offsetParent !== null && element.getAttribute("aria-hidden") !== "true"
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const activeElement = document.activeElement;
    const activeIndex = focusableElements.indexOf(activeElement as HTMLElement);

    if (activeIndex === -1) {
      event.preventDefault();
      (event.shiftKey ? lastElement : firstElement).focus();
      return;
    }

    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  const handleCatalogTriggerClick = () => {
    setMode("catalog");
    setNavigationStack([]);
  };

  const handleNodeClick = (node: CatalogExplorerNode) => {
    setNavigationStack((current) => [...current, node]);
  };

  const handleBackClick = () => {
    if (navigationStack.length > 0) {
      setNavigationStack((current) => current.slice(0, -1));
    } else {
      setMode("main");
    }
  };

  const currentNode = navigationStack.at(-1);
  const visibleNodes = currentNode ? currentNode.children : tree;

  // Path active check
  const activeNodes = isOpen ? getActivePathNodes(pathname, tree) : { pathSlugs: [] };
  const activeSlugs = new Set(activeNodes.pathSlugs || []);
  const currentSlug = activeNodes.pathSlugs?.at(-1);

  return (
    <>
      <HeaderDesktopNavigation items={desktopItems}>
        {tree.length > 0 ? (
          <CatalogDesktopMegaMenu tree={tree} labels={desktopLabels} />
        ) : (
          <Link
            href={catalogHref}
            className="rounded-md px-2.5 py-2 text-sm font-medium text-white hover:bg-white/5 transition-colors sm:px-3"
          >
            {desktopLabels.trigger}
          </Link>
        )}
      </HeaderDesktopNavigation>

      <div className="relative lg:hidden">
        {/* Trigger Button */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            if (isOpen) {
              closeAndFocusTrigger();
              return;
            }
            setIsOpen(true);
          }}
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
          aria-label={isOpen ? menuCloseLabel : menuOpenLabel}
          className="flex min-h-[44px] items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 focus:ring-offset-brand-navy"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
          <span>{menuOpenLabel}</span>
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <button
              type="button"
              tabIndex={-1}
              aria-label={menuCloseLabel}
              className="fixed inset-0 z-40 bg-black/60 cursor-default focus:outline-none"
              onClick={closeAndFocusTrigger}
            />

            {/* Drawer Panel */}
            <div
              ref={drawerRef as React.RefObject<HTMLDivElement>}
              id="mobile-menu"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-navigation-title"
              onKeyDown={handleDrawerKeyDown}
              className={cn(
                "fixed top-0 right-0 bottom-0 z-50 h-dvh bg-brand-navy shadow-2xl flex flex-col focus:outline-none pointer-events-auto transition-[width] motion-reduce:transition-none",
                mode === "main" ? "w-72 max-w-[80vw]" : "w-full max-w-none"
              )}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <span
                  ref={levelTitleRef}
                  id="mobile-navigation-title"
                  tabIndex={-1}
                  aria-live="polite"
                  aria-atomic="true"
                  className="text-sm font-bold uppercase tracking-wider text-white focus:outline-none"
                >
                  {mode === "main"
                    ? mainNavigationLabel
                    : (currentNode ? currentNode.label : mobileLabels.mobileCatalogTitle)}
                </span>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={closeAndFocusTrigger}
                  aria-label={mode === "main" ? menuCloseLabel : mobileLabels.mobileCatalogClose}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-teal"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <nav aria-label={mode === "main" ? mainNavigationLabel : mobileLabels.mobileCatalogTitle} className="flex flex-col gap-2">
                  {mode === "main" ? (
                    <>
                      {/* Catalog Trigger / Link */}
                      {tree.length > 0 ? (
                        <button
                          type="button"
                          onClick={handleCatalogTriggerClick}
                          className="flex min-h-[44px] w-full items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-teal text-white/90"
                        >
                          <span>{desktopLabels.trigger}</span>
                          <svg className="h-5 w-5 text-brand-teal/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      ) : (
                        <Link
                          href={catalogHref}
                          onClick={resetNavigation}
                          className="flex min-h-[44px] items-center rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-teal text-white/90"
                        >
                          {desktopLabels.trigger}
                        </Link>
                      )}

                      {/* Normal Links */}
                      {mobileItems.map((item) => {
                        const isActive = !item.external && isNavItemActive(pathname, item.href);
                        if (item.external) {
                          return (
                            <a
                              key={item.href}
                              href={item.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={resetNavigation}
                              className={cn(
                                "flex min-h-[44px] items-center rounded-md px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-teal",
                                "text-white/90 hover:bg-white/5 hover:text-white"
                              )}
                            >
                              {item.label}
                              <svg className="ml-2 h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          );
                        }

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={resetNavigation}
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                              "flex min-h-[44px] items-center rounded-md px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-teal",
                              isActive
                                ? "bg-brand-teal/10 font-semibold text-brand-teal"
                                : "text-white/90 hover:bg-white/5 hover:text-white"
                            )}
                          >
                            {item.label}
                          </Link>
                        );
                      })}
                    </>
                  ) : (
                    <>
                      {/* Catalog Drill-Down View */}
                      <button
                        type="button"
                        onClick={handleBackClick}
                        className="flex min-h-[44px] w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-teal mb-2 border border-white/10"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>{navigationStack.length === 0 ? mobileLabels.mobileCatalogBackToMenu : mobileLabels.mobileCatalogBack}</span>
                      </button>
                      <Link
                        href={currentNode ? currentNode.href : catalogHref}
                        onClick={resetNavigation}
                        className="flex min-h-[44px] w-full items-center rounded-md px-3 py-2.5 text-sm font-semibold text-brand-teal transition-colors hover:bg-brand-teal/10 focus:outline-none focus:ring-2 focus:ring-brand-teal mb-4 border border-brand-teal/20"
                      >
                        {currentNode ? mobileLabels.mobileCatalogViewCurrent : mobileLabels.mobileCatalogViewCatalog}
                      </Link>

                      <div className="flex flex-col gap-1">
                        {visibleNodes.map((node) => {
                          const hasChildren = node.children.length > 0;
                          const isActive = activeSlugs.has(node.slug);

                          if (hasChildren) {
                            return (
                              <button
                                key={node.slug}
                                type="button"
                                onClick={() => handleNodeClick(node)}
                                aria-label={`${node.label}, ${mobileLabels.mobileCatalogOpenLevel}`}
                                className={cn(
                                  "flex min-h-[44px] w-full items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-teal text-left",
                                  isActive ? "text-brand-teal font-medium" : "text-white/90"
                                )}
                              >
                                <span>{node.label}</span>
                                <svg className="h-5 w-5 text-brand-teal/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            );
                          }

                          const isLeafActive = currentSlug === node.slug;

                          return (
                            <Link
                              key={node.slug}
                              href={node.href}
                              onClick={resetNavigation}
                              aria-current={isLeafActive ? "page" : undefined}
                              className={cn(
                                "flex min-h-[44px] items-center rounded-md px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-teal",
                                isLeafActive
                                  ? "bg-brand-teal/10 font-semibold text-brand-teal"
                                  : (isActive ? "text-brand-teal font-medium hover:bg-white/5" : "text-white/90 hover:bg-white/5 hover:text-white")
                              )}
                            >
                              {node.label}
                            </Link>
                          );
                        })}
                      </div>
                    </>
                  )}
                </nav>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
