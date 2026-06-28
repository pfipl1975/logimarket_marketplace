"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Category } from "@/lib/schema";

export function CategoryFilter({ categories }: { categories: Category[] }) {
  const searchParams = useSearchParams();
  const active = searchParams.get("kategoria") || "";
  const items = [{ name: "Wszystkie kategorie", slug: "" }, ...categories];

  return (
    <nav aria-label="Kategorie" className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isActive = active === item.slug;
        const href = item.slug ? `/?kategoria=${item.slug}` : "/";
        return (
          <Link key={item.slug || "all"} href={href}
            className={isActive
              ? "rounded-full px-4 py-2 text-sm font-medium text-white shadow-sm"
              : "rounded-full border bg-white px-4 py-2 text-sm font-medium transition-all hover:border-[#147487] hover:text-[#147487]"
            }
            style={isActive ? { backgroundColor: "#141c2c" } : { borderColor: "#d9dde2", color: "#141c2c" }}>
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
