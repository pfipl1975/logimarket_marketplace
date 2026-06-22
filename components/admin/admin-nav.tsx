"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const links = [
  { href: "/admin", label: "Pulpit" },
  { href: "/admin/oferty", label: "Oferty" },
  { href: "/admin/kategorie", label: "Kategorie" },
  { href: "/admin/partnerzy", label: "Partnerzy" },
  { href: "/admin/leady", label: "Zapytania (RFQ)" },
]

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="border-t border-white/10 bg-navy">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4">
        {links.map((link) => {
          const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                active
                  ? "border-teal text-navy-foreground"
                  : "border-transparent text-white/60 hover:text-navy-foreground",
              )}
            >
              {link.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
