"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive } from "@/lib/navigation/active";
import { cn } from "@/lib/utils";

export type MobileNavigationItem = {
  label: string;
  href: string;
  external?: boolean;
};

export type MobileNavigationProps = {
  items: MobileNavigationItem[];
  menuOpenLabel: string;
  menuCloseLabel: string;
  mainNavigationLabel: string;
};

export function MobileNavigation({
  items,
  menuOpenLabel,
  menuCloseLabel,
  mainNavigationLabel,
}: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close menu on ESC key press and return focus to trigger button
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Prevent body scroll when drawer is open and restore previous overflow
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Focus close button immediately after open
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    closeButtonRef.current?.focus();
  }, [isOpen]);

  const closeAndFocusTrigger = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleDrawerKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab" || !drawerRef.current) {
      return;
    }

    const focusableElements = Array.from(
      drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter(
      (element) =>
        element.offsetParent !== null &&
        element.getAttribute("aria-hidden") !== "true",
    );

    if (focusableElements.length === 0) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  return (
    <div className="relative md:hidden">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
        aria-label={isOpen ? menuCloseLabel : menuOpenLabel}
        className="flex min-h-[44px] items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 focus:ring-offset-brand-navy"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
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
          <nav
            ref={drawerRef}
            id="mobile-menu"
            aria-label={mainNavigationLabel}
            onKeyDown={handleDrawerKeyDown}
            className="fixed top-0 right-0 bottom-0 z-50 w-72 max-w-[80vw] h-dvh bg-brand-navy shadow-2xl flex flex-col focus:outline-none pointer-events-auto"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <span className="text-sm font-bold uppercase tracking-wider text-white">Menu</span>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeAndFocusTrigger}
                aria-label={menuCloseLabel}
                className="rounded-md p-1.5 text-white/80 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-teal"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Drawer Navigation Links */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-2">
                {items.map((item) => {
                  const isActive = !item.external && isNavItemActive(pathname, item.href);
                  const className = cn(
                    "flex min-h-[44px] items-center rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-teal",
                    isActive
                      ? "bg-white/5 font-semibold text-white"
                      : "font-medium text-white/80",
                  );

                  if (item.external) {
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setIsOpen(false)}
                        className={className}
                      >
                        {item.label}
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={className}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
