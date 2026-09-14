import Link from "next/link";
import { LogOut, Package } from "lucide-react";

export function PartnerWorkspaceShell({
  children,
  partnerId,
  partnerName = "Partner Portal", // Might be expanded later
}: {
  children: React.ReactNode;
  partnerId: string;
  partnerName?: string;
}) {
  return (
    <div className="min-h-screen bg-brand-light-gray flex flex-col font-sans">
      <header className="bg-brand-navy text-white shadow-soft sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto w-full px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href={`/partner/${partnerId}/zamowienia`} className="text-xl font-bold tracking-tight text-white focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 focus:ring-offset-brand-navy rounded-sm">
              LogiMarket <span className="font-light text-brand-teal">Partner</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-1">
              <Link 
                href={`/partner/${partnerId}/zamowienia`}
                className="px-4 py-2 rounded-industrial bg-white/10 text-white font-medium transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-brand-teal"
              >
                Zamówienia
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-sm font-medium text-brand-light-gray/70">
              {partnerName}
            </div>
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                aria-label="Wyloguj"
                className="p-2 rounded-industrial text-brand-light-gray/70 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-teal"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <div className="md:hidden bg-brand-navy border-t border-white/10 px-4 py-2 flex overflow-x-auto gap-2">
        <Link 
          href={`/partner/${partnerId}/zamowienia`}
          className="px-4 py-1.5 rounded-industrial bg-white/10 text-white text-sm font-medium whitespace-nowrap"
        >
          Zamówienia
        </Link>
      </div>

      <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      
      <footer className="bg-white border-t border-border-industrial py-6 mt-auto">
        <div className="max-w-[1400px] mx-auto w-full px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div>&copy; {new Date().getFullYear()} LogiMarket. Wszelkie prawa zastrzeżone.</div>
        </div>
      </footer>
    </div>
  );
}
