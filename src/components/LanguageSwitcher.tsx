"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { localeLabels, locales, type Locale } from "@/lib/i18n/config";

type LanguageSwitcherProps = {
  currentLocale: Locale;
  links: Record<Locale, string>;
  ariaLabel: string;
};

const fullLabels: Record<Locale, string> = {
  pl: "PL — Polski",
  en: "EN — English",
  de: "DE — Deutsch",
  fr: "FR — Français",
  uk: "UK — Українська",
  es: "ES — Español",
  zh: "ZH — 中文",
};

export function LanguageSwitcher({
  currentLocale,
  links,
  ariaLabel,
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  const activeDisplayLabel = currentLocale === "uk" ? "UK" : localeLabels[currentLocale];

  return (
    <>
      {/* Desktop Inline Switcher */}
      <nav
        aria-label={ariaLabel}
        className="hidden md:flex items-center gap-1 rounded-md border border-white/10 bg-white/5 p-1"
      >
        {locales.map((locale) => {
          const isActive = locale === currentLocale;
          const displayLabel = locale === "uk" ? "UK" : localeLabels[locale];

          return (
            <Link
              key={locale}
              href={links[locale]}
              aria-current={isActive ? "page" : undefined}
              className={
                isActive
                  ? "rounded-button bg-white px-2 py-1 text-xs font-semibold text-brand-navy"
                  : "rounded-button px-2 py-1 text-xs font-medium text-white/70 transition-colors hover:text-white"
              }
            >
              {displayLabel}
            </Link>
          );
        })}
      </nav>

      {/* Mobile Dropdown Switcher */}
      <div className="relative md:hidden">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls="language-menu-mobile"
          aria-label={ariaLabel}
          className="flex min-h-[36px] items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white transition-all hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 focus:ring-offset-brand-navy"
        >
          <span>{activeDisplayLabel}</span>
          <svg
            className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <>
            {/* Backdrop for click outside */}
            <button
              type="button"
              tabIndex={-1}
              aria-label="Zamknij wybór języka"
              className="fixed inset-0 z-40 cursor-default bg-transparent focus:outline-none"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Menu */}
            <ul
              id="language-menu-mobile"
              className="absolute right-0 top-full z-50 mt-2 w-48 rounded-md border border-white/10 bg-brand-navy p-1 shadow-xl pointer-events-auto"
            >
              {locales.map((locale) => {
                const isActive = locale === currentLocale;

                return (
                  <li key={locale}>
                    <Link
                      href={links[locale]}
                      onClick={() => setIsOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex w-full items-center rounded-md px-3 py-2.5 text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-white/10 text-white font-semibold"
                          : "text-white/70 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {fullLabels[locale]}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
