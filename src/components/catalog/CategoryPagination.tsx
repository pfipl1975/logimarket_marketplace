import React from "react";
import Link from "next/link";
import { buildCategoryPaginationHref } from "@/lib/catalog/pagination";
import type { CategoryOfferQueryState } from "@/lib/catalog/query";

interface CategoryPaginationProps {
  basePath: string;
  state: CategoryOfferQueryState;
  currentPage: number;
  totalPages: number;
  labels: {
    paginationLabel: string;
    paginationPrevious: string;
    paginationNext: string;
    paginationPage: string;
    paginationCurrentPage: string;
  };
}

export function CategoryPagination({
  basePath,
  state,
  currentPage,
  totalPages,
  labels,
}: CategoryPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const renderPageLink = (page: number) => {
    const isCurrent = page === currentPage;
    const ariaLabel = isCurrent
      ? labels.paginationCurrentPage.replace("{page}", String(page))
      : labels.paginationPage.replace("{page}", String(page));

    if (isCurrent) {
      return (
        <span
          key={`page-${page}`}
          aria-current="page"
          aria-label={ariaLabel}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded border border-brand-navy bg-brand-navy px-3.5 py-2 text-sm font-semibold text-white shadow-sm"
        >
          {page}
        </span>
      );
    }

    const href = buildCategoryPaginationHref(basePath, state, page);

    return (
      <Link
        key={`page-${page}`}
        href={href}
        aria-label={ariaLabel}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded border border-border bg-white px-3.5 py-2 text-sm font-medium text-brand-navy shadow-sm transition-colors hover:border-brand-teal hover:text-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
      >
        {page}
      </Link>
    );
  };

  const renderEllipsis = (key: string) => {
    return (
      <span
        key={key}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center px-2 text-muted-foreground"
        aria-hidden="true"
      >
        &hellip;
      </span>
    );
  };

  const pages: React.ReactNode[] = [];

  // Logic to show 1, 2, ... current-1, current, current+1 ... last
  // We want to show first page, last page, and up to 1 adjacent pages next to current page
  
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(renderPageLink(i));
    }
  } else {
    // First page
    pages.push(renderPageLink(1));

    if (currentPage > 3) {
      pages.push(renderEllipsis("ellipsis-start"));
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(renderPageLink(i));
    }

    if (currentPage < totalPages - 2) {
      pages.push(renderEllipsis("ellipsis-end"));
    }

    // Last page
    pages.push(renderPageLink(totalPages));
  }

  const prevHref = currentPage > 1 ? buildCategoryPaginationHref(basePath, state, currentPage - 1) : null;
  const nextHref = currentPage < totalPages ? buildCategoryPaginationHref(basePath, state, currentPage + 1) : null;

  return (
    <nav aria-label={labels.paginationLabel} className="mt-10 mb-6 flex w-full justify-center">
      <ul className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {/* Previous */}
        <li>
          {prevHref ? (
            <Link
              href={prevHref}
              aria-label={labels.paginationPrevious}
              className="flex min-h-[44px] items-center justify-center rounded border border-border bg-white px-3 sm:px-4 py-2 text-sm font-medium text-brand-navy shadow-sm transition-colors hover:border-brand-teal hover:text-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
            >
              <svg aria-hidden="true" className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">{labels.paginationPrevious}</span>
            </Link>
          ) : (
            <span
              aria-hidden="true"
              className="flex min-h-[44px] items-center justify-center rounded border border-border bg-gray-50 px-3 sm:px-4 py-2 text-sm font-medium text-muted-foreground opacity-50 shadow-sm"
            >
              <svg aria-hidden="true" className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">{labels.paginationPrevious}</span>
            </span>
          )}
        </li>

        {/* Page Numbers */}
        {pages.map((node, index) => (
          <li key={`node-${index}`}>{node}</li>
        ))}

        {/* Next */}
        <li>
          {nextHref ? (
            <Link
              href={nextHref}
              aria-label={labels.paginationNext}
              className="flex min-h-[44px] items-center justify-center rounded border border-border bg-white px-3 sm:px-4 py-2 text-sm font-medium text-brand-navy shadow-sm transition-colors hover:border-brand-teal hover:text-brand-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
            >
              <span className="hidden sm:inline">{labels.paginationNext}</span>
              <svg aria-hidden="true" className="ml-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <span
              aria-hidden="true"
              className="flex min-h-[44px] items-center justify-center rounded border border-border bg-gray-50 px-3 sm:px-4 py-2 text-sm font-medium text-muted-foreground opacity-50 shadow-sm"
            >
              <span className="hidden sm:inline">{labels.paginationNext}</span>
              <svg aria-hidden="true" className="ml-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
