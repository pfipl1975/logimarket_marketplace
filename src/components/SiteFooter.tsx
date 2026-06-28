import Link from "next/link";
import { Boxes } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-auto text-white/70" style={{ backgroundColor: "#141c2c" }}>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3 md:px-6">
        <div>
          <div className="flex items-center gap-2.5 text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-md" style={{ backgroundColor: "#147487" }}>
              <Boxes className="h-4 w-4 text-white" />
            </span>
            <span className="text-base font-bold">LogiMarket<span style={{ color: "#147487" }}>.pl</span></span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">
            Giełda B2B sprzętu i wyposażenia magazynowego. Katalog ofertowy łączący kupujących ze zweryfikowanymi partnerami.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Portal</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a className="hover:text-white transition-colors" href="https://logimarket.pl" target="_blank" rel="noopener noreferrer">Strona główna</a></li>
            <li><a className="hover:text-white transition-colors" href="https://logimarket.pl/baza-wiedzy" target="_blank" rel="noopener noreferrer">Baza wiedzy</a></li>
            <li><Link className="hover:text-white transition-colors" href="/">Katalog ofert</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Dla partnerów</h2>
          <p className="mt-3 text-sm leading-relaxed">
            Chcesz wystawić swoje produkty? Napisz do nas:{" "}
            <a className="hover:underline" href="mailto:partnerzy@logimarket.pl" style={{ color: "#147487" }}>partnerzy@logimarket.pl</a>
          </p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-5 text-xs md:px-6">
          &copy; {new Date().getFullYear()} LogiMarket.pl — Sprzedaż realizowana bezpośrednio przez partnerów.
        </div>
      </div>
    </footer>
  );
}
