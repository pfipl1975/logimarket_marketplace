import Link from "next/link";


export function PartnerWorkspaceShell({
  children,
  partnerId,
  partnerName = "Partner Portal",
  ordersHref,
  dict,
}: {
  children: React.ReactNode;
  partnerId: string;
  partnerName?: string;
  ordersHref: string;
  dict: Record<string, string>;
}) {
  return (
    <div className="min-h-screen bg-brand-light-gray flex flex-col font-sans">
      <header className="bg-brand-navy text-white shadow-soft sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto w-full px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href={ordersHref} className="text-xl font-bold tracking-tight text-white focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 focus:ring-offset-brand-navy rounded-sm">
              {dict.title}
            </Link>
            
            <nav className="hidden md:flex items-center gap-1">
              <Link 
                href={ordersHref}
                className="px-4 py-2 rounded-industrial bg-white/10 text-white font-medium transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-brand-teal"
              >
                {dict.orders}
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-sm font-medium text-brand-light-gray/70">
              {partnerName}
            </div>
            {/* PARTNER_LOGOUT_REQUIRED_BEFORE_LAUNCH=YES */}
          </div>
        </div>
      </header>

      <div className="md:hidden bg-brand-navy border-t border-white/10 px-4 py-2 flex overflow-x-auto gap-2">
        <Link 
          href={ordersHref}
          className="px-4 py-1.5 rounded-industrial bg-white/10 text-white text-sm font-medium whitespace-nowrap"
        >
          {dict.orders}
        </Link>
      </div>

      <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      
      <footer className="bg-white border-t border-border-industrial py-6 mt-auto">
        <div className="max-w-[1400px] mx-auto w-full px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div>&copy; {new Date().getFullYear()} LogiMarket. {dict.copyright || "Wszelkie prawa zastrzeżone"}</div>
        </div>
      </footer>
    </div>
  );
}
