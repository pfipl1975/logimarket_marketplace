import Link from "next/link";
import { getLandingPageByIntent, getSolutionsIndexPath } from "@/lib/landing";
import type { LandingIntent, LandingLocale, LandingPageContent } from "@/lib/landing";
import type { Locale } from "@/lib/i18n/config";

const FEATURED_SOLUTION_INTENTS = [
  "warehouse-equipment",
  "intralogistics",
  "storage-systems",
  "warehouse-robotics",
  "picking-packing",
  "warehouse-safety",
] as const satisfies readonly LandingIntent[];

interface HomepageSolutionsDiscoveryProps {
  locale: Locale;
  labels: {
    label: string;
    title: string;
    description: string;
    viewAll: string;
  };
}

export async function HomepageSolutionsDiscovery({
  locale,
  labels,
}: HomepageSolutionsDiscoveryProps) {
  const landingLocale = locale as LandingLocale;

  const featuredLandings: LandingPageContent[] = FEATURED_SOLUTION_INTENTS.map(
    (intent) => getLandingPageByIntent(intent, landingLocale)
  );

  const solutionsIndexPath = getSolutionsIndexPath(landingLocale);

  return (
    <section
      className="mb-10"
      aria-labelledby="homepage-solutions-title"
    >
      <div className="flex flex-col gap-1.5 mb-6">
        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-teal">
          {labels.label}
        </span>
        <h2
          id="homepage-solutions-title"
          className="text-xl font-bold tracking-tight text-brand-navy"
        >
          {labels.title}
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          {labels.description}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {featuredLandings.map((landing) => (
          <Link
            key={landing.intent}
            href={landing.path}
            className="group flex flex-col justify-between rounded-lg border border-[#d9dde2] bg-white p-4 shadow-sm transition-all duration-200 hover:border-brand-teal hover:shadow-md"
          >
            <div>
              <h3 className="text-sm font-bold text-brand-navy transition-colors group-hover:text-brand-teal">
                {landing.title}
              </h3>
              <p className="mt-1.5 text-[11px] leading-normal text-muted-foreground line-clamp-3">
                {landing.intro}
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-brand-teal pt-2 border-t border-gray-50">
              <span>{labels.viewAll}</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <Link
          href={solutionsIndexPath}
          className="inline-flex items-center justify-center rounded-md border border-border bg-white px-5 py-3 text-sm font-semibold text-brand-navy transition-colors hover:border-brand-teal hover:text-brand-teal"
        >
          {labels.viewAll} →
        </Link>
      </div>
    </section>
  );
}
