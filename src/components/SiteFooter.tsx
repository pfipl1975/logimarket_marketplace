import Link from "next/link";
import Logo from "@/components/Logo";
import type { Locale } from "@/lib/i18n/config";
import { getHomePath, getGlossaryPath } from "@/lib/i18n/paths";
import type { Dictionary } from "@/lib/i18n/types";

interface SiteFooterProps {
  locale: Locale;
  navLabels: Dictionary["nav"];
  footerLabels: Dictionary["footer"];
}

export function SiteFooter({
  locale,
  navLabels,
  footerLabels,
}: SiteFooterProps) {
  const homeHref = getHomePath(locale);
  const glossaryHref = getGlossaryPath(locale);

  return (
    <footer className="mt-auto bg-brand-navy text-white/70">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[minmax(0,1.45fr)_minmax(0,0.75fr)_minmax(0,0.8fr)] md:px-6">
        <div className="min-w-0">
          <Logo variant="light" />
          <p className="mt-3 max-w-xs text-sm leading-relaxed">
            {footerLabels.description}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">{footerLabels.portal}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><a className="hover:text-white transition-colors" href="https://logimarket.pl" target="_blank" rel="noopener noreferrer">{navLabels.portal}</a></li>
            <li><Link className="hover:text-white transition-colors" href={homeHref}>{navLabels.catalog}</Link></li>
            {glossaryHref && (
              <li>
                <Link className="hover:text-white transition-colors" href={glossaryHref}>
                  {navLabels.glossary}
                </Link>
              </li>
            )}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">{footerLabels.partners}</h2>
          <p className="mt-3 text-sm leading-relaxed">
            {footerLabels.partnerPrompt}{" "}
            <a className="text-brand-teal hover:underline" href="mailto:partnerzy@logimarket.pl">partnerzy@logimarket.pl</a>
          </p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-5 text-xs md:px-6">
          &copy; {new Date().getFullYear()} {navLabels.portal} — {footerLabels.copyrightSuffix}
        </div>
      </div>
    </footer>
  );
}
