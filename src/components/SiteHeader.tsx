"use client";

import Link from "next/link";
import { Boxes, ShoppingCart, ExternalLink } from "lucide-react";
import { useCart } from "@/hooks/useCart";

const portalLinks = [
  { label: "Strona główna", href: "https://logimarket.pl" },
  { label: "Baza wiedzy", href: "https://logimarket.pl/baza-wiedzy" },
  { label: "Blog", href: "https://logimarket.pl/blog" },
];

export function SiteHeader() {
  const { itemCount, setIsOpen } = useCart();

  return (
    <header className="sticky top-0 z-40 text-white shadow-lg" style={{ backgroundColor: "#141c2c" }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md" style={{ backgroundColor: "#147487" }}>
            <Boxes className="h-5 w-5 text-white" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-lg font-bold tracking-tight">
              LogiMarket<span style={{ color: "#147487" }}>.pl</span>
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/60">Giełda B2B</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {portalLinks.map((link) => (
            <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"
              className="rounded-md px-3 py-2 text-sm font-medium text-white/75 transition-colors hover:bg-white/5 hover:text-white">
              {link.label}
            </a>
          ))}
          <Link href="/" className="ml-1 rounded-md bg-white/5 px-3 py-2 text-sm font-semibold text-white">Katalog ofert</Link>
        </nav>

        <div className="flex items-center gap-2">
          <button onClick={() => setIsOpen(true)}
            className="relative flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Koszyk</span>
            {itemCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: "#147487" }}>
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
