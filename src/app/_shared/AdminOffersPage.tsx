import Link from "next/link";
import { AdminOffersTable } from "@/components/admin/AdminOffersTable";
import { getAdminOffersPage } from "@/app/actions";
import { buildAdminOffersUrl } from "@/lib/admin/offers-query";
import type { Locale } from "@/lib/i18n/config";

import type { Dictionary } from "@/lib/i18n/types";

interface AdminOffersPageProps {
  locale: Locale;
  searchParams: unknown;
  dict: Dictionary["adminOffers"];
  basePath: string;
}

export async function AdminOffersPage({ locale, searchParams, dict, basePath }: AdminOffersPageProps) {
  const result = await getAdminOffersPage(searchParams);

  if (!result.ok) {
    return (
      <div className="max-w-4xl bg-card text-card-foreground p-8 sm:p-12 rounded-industrial shadow-sm border border-destructive/20">
        <h1 className="text-2xl font-medium text-destructive mb-4">{dict.errorTitle}</h1>
        <p className="text-muted-foreground">{dict.errorDescription}</p>
      </div>
    );
  }

  const { items, total, pageCount, currentPage, filterOptions, query: currentQuery } = result.data;

  const hasFilters = Boolean(currentQuery.q || currentQuery.status || currentQuery.model || currentQuery.partner || currentQuery.category);
  const isEmpty = items.length === 0;

  const createUrl = locale === "pl" ? "/admin/oferty/nowa" : `/${locale}/admin/offers/new`;

  return (
    <div className="space-y-8 max-w-7xl">
      <header className="border-b border-border-industrial pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <p className="text-accent text-xs font-semibold tracking-widest uppercase mb-2">
            {dict.eyebrow}
          </p>
          <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-primary mb-2">
            {dict.title}
          </h1>
          <p className="text-muted-foreground max-w-3xl">
            {dict.description}
          </p>
        </div>
        <Link
          href={createUrl}
          className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-industrial bg-brand-navy text-white hover:bg-brand-navy/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal whitespace-nowrap shrink-0"
        >
          {dict.addOffer}
        </Link>
      </header>

      <div className="bg-card p-6 rounded-industrial border border-border-industrial shadow-sm">
        <form action={basePath} method="GET" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="q" className="text-xs font-medium text-muted-foreground">{dict.searchLabel}</label>
            <input 
              id="q"
              name="q" 
              type="text" 
              defaultValue={currentQuery.q}
              placeholder={dict.searchPlaceholder}
              className="px-3 py-2 bg-background border border-input rounded-industrial text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label htmlFor="status" className="text-xs font-medium text-muted-foreground">{dict.statusLabel}</label>
            <select 
              id="status"
              name="status" 
              defaultValue={currentQuery.status || ""}
              className="px-3 py-2 bg-background border border-input rounded-industrial text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{dict.allStatuses}</option>
              <option value="draft">{dict.statusDraft}</option>
              <option value="published">{dict.statusPublished}</option>
              <option value="archived">{dict.statusArchived}</option>
              <option value="hidden">{dict.statusHidden}</option>
              <option value="deleted">{dict.statusDeleted}</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="model" className="text-xs font-medium text-muted-foreground">{dict.modelLabel}</label>
            <select 
              id="model"
              name="model" 
              defaultValue={currentQuery.model || ""}
              className="px-3 py-2 bg-background border border-input rounded-industrial text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{dict.allModels}</option>
              <option value="rfq">{dict.modelRfq}</option>
              <option value="ecommerce">{dict.modelEcommerce}</option>
              <option value="outbound">{dict.modelOutbound}</option>
              <option value="unknown">{dict.modelUnknown}</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="partner" className="text-xs font-medium text-muted-foreground">{dict.partnerLabel}</label>
            <select 
              id="partner"
              name="partner" 
              defaultValue={currentQuery.partner?.toString() || ""}
              className="px-3 py-2 bg-background border border-input rounded-industrial text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{dict.allPartners}</option>
              {filterOptions.partners.map(p => (
                <option key={p.id} value={p.id}>{p.companyName}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="category" className="text-xs font-medium text-muted-foreground">{dict.categoryLabel}</label>
            <select 
              id="category"
              name="category" 
              defaultValue={currentQuery.category?.toString() || ""}
              className="px-3 py-2 bg-background border border-input rounded-industrial text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{dict.allCategories}</option>
              {filterOptions.categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-5 flex items-center justify-between mt-2 pt-4 border-t border-border-industrial/50">
            <div className="text-sm text-muted-foreground">
              {total > 0 && dict.resultsCount.replace("{count}", total.toString())}
            </div>
            <div className="flex items-center gap-3">
              {hasFilters && (
                <Link href={basePath} className="text-sm px-4 py-2 text-muted-foreground hover:text-foreground transition-colors">
                  {dict.clearFilters}
                </Link>
              )}
              <button type="submit" className="px-5 py-2 bg-brand-teal text-primary-foreground text-sm font-medium rounded-industrial hover:bg-brand-teal/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring">
                {dict.applyFilters}
              </button>
            </div>
          </div>
        </form>
      </div>

      {isEmpty && hasFilters ? (
        <div className="bg-card text-card-foreground p-12 rounded-industrial border border-border-industrial text-center">
          <h3 className="text-lg font-medium mb-2">{dict.filteredEmptyTitle}</h3>
          <p className="text-muted-foreground mb-6">{dict.filteredEmptyDescription}</p>
          <Link href={basePath} className="px-5 py-2 bg-secondary text-secondary-foreground text-sm font-medium rounded-industrial hover:bg-secondary/80 transition-colors inline-block">
            {dict.clearFilters}
          </Link>
        </div>
      ) : (
        <AdminOffersTable items={items} locale={locale} dict={dict} />
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-border-industrial pt-6 mt-8">
          <div className="text-sm text-muted-foreground">
            {dict.paginationSummary.replace("{current}", currentPage.toString()).replace("{total}", pageCount.toString())}
          </div>
          <div className="flex gap-2">
            {currentPage > 1 ? (
              <Link 
                href={buildAdminOffersUrl(basePath, { page: currentPage - 1 }, currentQuery)}
                className="px-4 py-2 border border-input bg-background rounded-industrial text-sm hover:bg-muted transition-colors"
              >
                {dict.paginationPrevious}
              </Link>
            ) : (
              <span className="px-4 py-2 border border-input bg-muted text-muted-foreground/50 rounded-industrial text-sm cursor-not-allowed">
                {dict.paginationPrevious}
              </span>
            )}
            
            {currentPage < pageCount ? (
              <Link 
                href={buildAdminOffersUrl(basePath, { page: currentPage + 1 }, currentQuery)}
                className="px-4 py-2 border border-input bg-background rounded-industrial text-sm hover:bg-muted transition-colors"
              >
                {dict.paginationNext}
              </Link>
            ) : (
              <span className="px-4 py-2 border border-input bg-muted text-muted-foreground/50 rounded-industrial text-sm cursor-not-allowed">
                {dict.paginationNext}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
