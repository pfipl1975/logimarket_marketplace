"use client";

import { useState, useEffect } from "react";
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

  // Close menu on ESC key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className="relative md:hidden">
      <button
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
        <nav
          id="mobile-menu"
          aria-label={mainNavigationLabel}
          className="absolute top-full right-0 z-50 mt-2 w-56 rounded-md border border-white/10 bg-brand-navy shadow-xl focus:outline-none"
        >
          <div className="p-2">
            {items.map((item) => {
              const isActive = !item.external && isNavItemActive(pathname, item.href);
              const className = cn(
                "flex min-h-[44px] items-center rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-white/5 hover:text-white",
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
        </nav>
      )}
    </div>
  );
}
