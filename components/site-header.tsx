import Link from 'next/link'
import { Boxes, ExternalLink } from 'lucide-react'

const portalLinks = [
  { label: 'Strona główna', href: 'https://logimarket.pl' },
  { label: 'Baza wiedzy', href: 'https://logimarket.pl/baza-wiedzy' },
  { label: 'Blog', href: 'https://logimarket.pl/blog' },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-navy text-navy-foreground">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal">
            <Boxes className="h-5 w-5 text-teal-foreground" aria-hidden="true" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-lg font-bold tracking-tight">
              LogiMarket
              <span className="text-teal">.pl</span>
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-navy-foreground/60">
              Giełda B2B
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {portalLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-navy-foreground/75 transition-colors hover:bg-white/5 hover:text-navy-foreground"
            >
              {link.label}
            </a>
          ))}
          <span className="ml-1 rounded-md bg-white/5 px-3 py-2 text-sm font-semibold text-navy-foreground">
            Katalog ofert
          </span>
        </nav>

        <a
          href="https://logimarket.pl"
          className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-2 text-xs font-medium text-navy-foreground/80 transition-colors hover:border-white/30 hover:text-navy-foreground md:hidden"
        >
          Portal
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </header>
  )
}
