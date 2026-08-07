import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { getAdminPartnersPage } from "@/app/actions";
import { buildAdminPartnersUrl } from "@/lib/admin/partners-query";
import { AdminPartnersTable } from "@/components/admin/AdminPartnersTable";
import Link from "next/link";
import { Search } from "lucide-react";

export async function AdminPartnersPage({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: unknown;
}) {
  const dictionary = await getDictionary(locale);
  const dict = dictionary.adminPartners;

  const result = await getAdminPartnersPage(searchParams);

  if (!result.ok) {
    return (
      <div className="rounded-industrial border border-border-industrial bg-white p-12 text-center shadow-soft">
        <h2 className="text-xl font-semibold text-brand-navy mb-2">{dict.errorTitle}</h2>
        <p className="text-muted-foreground">{dict.errorDescription}</p>
      </div>
    );
  }

  const { items, total, pageCount, query } = result.data;
  const hasFilters = Boolean(query.q);
  const basePath = locale === "pl" ? "/admin/partnerzy" : `/${locale}/admin/partners`;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto w-full">
      <div>
        <span className="text-brand-teal text-sm font-bold uppercase tracking-wider block mb-1">
          {dict.eyebrow}
        </span>
        <h1 className="text-2xl md:text-3xl font-semibold text-brand-navy">{dict.title}</h1>
        <p className="text-muted-foreground mt-2">{dict.description}</p>
      </div>

      <div className="bg-white p-4 rounded-industrial border border-border-industrial shadow-soft">
        <form method="GET" action={basePath} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-96 flex flex-col gap-1.5">
            <label htmlFor="q" className="text-xs font-medium text-muted-foreground">{dict.searchLabel}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="q"
                type="text"
                name="q"
                defaultValue={query.q}
                placeholder={dict.searchPlaceholder}
                className="w-full pl-9 pr-4 py-2 bg-brand-light-gray border border-border-industrial rounded-industrial text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal transition-all"
              />
            </div>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <button
              type="submit"
              className="px-6 py-2 bg-brand-navy hover:bg-brand-teal text-white rounded-industrial text-sm font-medium transition-colors whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-teal"
            >
              {dict.applyFilters}
            </button>
            {hasFilters && (
              <Link
                href={basePath}
                className="px-6 py-2 bg-white border border-border-industrial text-brand-navy hover:bg-brand-light-gray rounded-industrial text-sm font-medium transition-colors whitespace-nowrap text-center focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-teal"
              >
                {dict.clearFilters}
              </Link>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-industrial border border-border-industrial shadow-soft overflow-hidden flex flex-col min-h-[500px]">
        <div className="px-6 py-4 border-b border-border-industrial flex justify-between items-center bg-brand-light-gray/30">
          <h2 className="font-medium text-brand-navy">{dict.tableCaption}</h2>
          <span className="text-sm text-muted-foreground font-medium bg-white px-3 py-1 border border-border-industrial/50">
            {dict.resultsCount.replace("{count}", total.toString())}
          </span>
        </div>

        {total === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <h3 className="text-lg font-medium text-brand-navy mb-2">
              {hasFilters ? dict.filteredEmptyTitle : dict.emptyTitle}
            </h3>
            <p className="text-muted-foreground max-w-md">
              {hasFilters ? dict.filteredEmptyDescription : dict.emptyDescription}
            </p>
            {hasFilters && (
              <Link
                href={basePath}
                className="mt-6 px-4 py-2 bg-brand-light-gray hover:bg-border-industrial/30 text-brand-navy rounded-industrial text-sm font-medium transition-colors"
              >
                {dict.clearFilters}
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-x-auto">
              <AdminPartnersTable items={items} dict={dict} locale={locale} />
            </div>

            {pageCount > 1 && (
              <div className="px-6 py-4 border-t border-border-industrial bg-brand-light-gray/30 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {dict.paginationSummary
                    .replace("{current}", query.page.toString())
                    .replace("{total}", pageCount.toString())}
                </p>
                <div className="flex gap-2">
                  {query.page > 1 ? (
                    <Link
                      href={buildAdminPartnersUrl(basePath, { page: query.page - 1 }, query)}
                      className="px-4 py-2 border border-border-industrial bg-white rounded-industrial text-sm font-medium text-brand-navy hover:bg-brand-light-gray transition-colors"
                    >
                      {dict.paginationPrevious}
                    </Link>
                  ) : (
                    <span className="px-4 py-2 border border-border-industrial/50 bg-brand-light-gray/50 rounded-industrial text-sm font-medium text-muted-foreground/50 cursor-not-allowed">
                      {dict.paginationPrevious}
                    </span>
                  )}
                  
                  {query.page < pageCount ? (
                    <Link
                      href={buildAdminPartnersUrl(basePath, { page: query.page + 1 }, query)}
                      className="px-4 py-2 border border-border-industrial bg-white rounded-industrial text-sm font-medium text-brand-navy hover:bg-brand-light-gray transition-colors"
                    >
                      {dict.paginationNext}
                    </Link>
                  ) : (
                    <span className="px-4 py-2 border border-border-industrial/50 bg-brand-light-gray/50 rounded-industrial text-sm font-medium text-muted-foreground/50 cursor-not-allowed">
                      {dict.paginationNext}
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
