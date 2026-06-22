import Link from 'next/link'
import { Boxes } from 'lucide-react'

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-navy text-navy-foreground/70">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3 md:px-6">
        <div>
          <div className="flex items-center gap-2.5 text-navy-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-teal">
              <Boxes className="h-4 w-4 text-teal-foreground" aria-hidden="true" />
            </span>
            <span className="text-base font-bold">
              LogiMarket<span className="text-teal">.pl</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">
            Giełda B2B sprzętu i wyposażenia magazynowego. Katalog ofertowy
            łączący kupujących ze zweryfikowanymi partnerami.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-navy-foreground">Portal</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a className="hover:text-navy-foreground" href="https://logimarket.pl">
                Strona główna
              </a>
            </li>
            <li>
              <a
                className="hover:text-navy-foreground"
                href="https://logimarket.pl/baza-wiedzy"
              >
                Baza wiedzy
              </a>
            </li>
            <li>
              <Link className="hover:text-navy-foreground" href="/">
                Katalog ofert
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-navy-foreground">
            Dla partnerów
          </h2>
          <p className="mt-3 text-sm leading-relaxed">
            Chcesz wystawić swoje produkty w katalogu LogiMarket.pl? Napisz do
            nas:{' '}
            <a
              className="text-teal hover:underline"
              href="mailto:partnerzy@logimarket.pl"
            >
              partnerzy@logimarket.pl
            </a>
          </p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-5 text-xs md:px-6">
          © {new Date().getFullYear()} LogiMarket.pl — Sprzedaż realizowana
          bezpośrednio przez partnerów. Portal pełni rolę katalogu ofertowego.
        </div>
      </div>
    </footer>
  )
}
