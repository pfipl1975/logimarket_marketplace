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
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls="language-menu"
        aria-haspopup="true"
        aria-label={`${ariaLabel}: ${fullLabels[currentLocale]}`}
        className="flex min-h-10 min-w-[58px] items-center justify-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 py-2 text-xs font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 focus:ring-offset-brand-navy"
      >
        <svg
          className="h-4 w-4 text-white/70"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
          <path d="M3 12h18M12 3c2.2 2.5 3.4 5.5 3.4 9S14.2 18.5 12 21c-2.2-2.5-3.4-5.5-3.4-9S9.8 5.5 12 3Z" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span>{activeDisplayLabel}</span>
        <svg
          className={`h-3 w-3 ${isOpen ? "rotate-180" : ""}`}
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
          <button
            type="button"
            tabIndex={-1}
            aria-label={ariaLabel}
            className="fixed inset-0 z-40 cursor-default bg-transparent focus:outline-none"
            onClick={() => setIsOpen(false)}
          />

          <nav aria-label={ariaLabel}>
            <ul
              id="language-menu"
              className="pointer-events-auto absolute right-0 top-full z-50 mt-2 w-44 rounded-md border border-white/15 bg-brand-navy p-1.5 shadow-xl"
            >
              {locales.map((locale) => {
                const isActive = locale === currentLocale;

                return (
                  <li key={locale}>
                    <Link
                      href={links[locale]}
                      onClick={() => setIsOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex min-h-10 w-full items-center rounded-md px-3 py-2 text-xs font-medium transition-colors ${
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
          </nav>
        </>
      )}
    </div>
  );
}
