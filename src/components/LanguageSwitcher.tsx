import Link from "next/link";
import { localeLabels, locales, type Locale } from "@/lib/i18n/config";

type LanguageSwitcherProps = {
  currentLocale: Locale;
  links: Record<Locale, string>;
};

export function LanguageSwitcher({
  currentLocale,
  links,
}: LanguageSwitcherProps) {
  return (
    <nav
      aria-label="Wybór języka"
      className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 p-1"
    >
      {locales.map((locale) => {
        const isActive = locale === currentLocale;

        return (
          <Link
            key={locale}
            href={links[locale]}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "rounded-button bg-white px-2 py-1 text-xs font-semibold text-brand-navy"
                : "rounded-button px-2 py-1 text-xs font-medium text-white/70 transition-colors hover:text-white"
            }
          >
            {localeLabels[locale]}
          </Link>
        );
      })}
    </nav>
  );
}
