"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useCart } from "@/hooks/useCart";

function CartIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        className="fill-none stroke-current"
        d="M6.5 7h14l-1.7 8.5H8.1L6.5 7ZM6.5 7 5.8 4H3.5M9 19.5h.1M18 19.5h.1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const portalLinks = [
  { label: "Strona główna", href: "https://logimarket.pl" },
  { label: "Baza wiedzy", href: "https://logimarket.pl/baza-wiedzy" },
  { label: "Blog", href: "https://logimarket.pl/blog" },
];

export function SiteHeader() {
  const { itemCount, setIsOpen } = useCart();

  return (
    <header className="sticky top-0 z-40 bg-brand-navy text-white shadow-lg">
      <div className="bg-brand-navy">
        <div className="mx-auto flex max-w-7xl items-center px-3 py-3 sm:px-4 md:px-6 md:py-4">
          <Link href="/" className="flex min-w-0 shrink-0 items-center">
            <Logo variant="light" compact />
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10 bg-brand-navy">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4 md:px-6">
          <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {portalLinks.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"
                className="rounded-md px-2.5 py-2 text-sm font-medium text-white/75 transition-colors hover:bg-white/5 hover:text-white sm:px-3">
                {link.label}
              </a>
            ))}
            <Link href="/" className="ml-1 rounded-md bg-white/5 px-3 py-2 text-sm font-semibold text-white">Katalog ofert</Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button onClick={() => setIsOpen(true)}
              className="relative flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white">
              <CartIcon />
              <span className="hidden sm:inline">Koszyk</span>
              {itemCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-teal text-[10px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
