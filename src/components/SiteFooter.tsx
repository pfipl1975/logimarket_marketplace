import Link from "next/link";
import Logo from "@/components/Logo";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-brand-navy text-white/70">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3 md:px-6">
        <div>
          <Logo variant="light" />
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
            <a className="text-brand-teal hover:underline" href="mailto:partnerzy@logimarket.pl">partnerzy@logimarket.pl</a>
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
