import Link from "next/link";
import type { AdminOfferDto } from "@/lib/admin/offers-read-model-core";
import type { Locale } from "@/lib/i18n/config";

interface AdminOffersTableProps {
  items: AdminOfferDto[];
  locale: Locale;
  dict: Record<string, string>;
}

export function AdminOffersTable({ items, locale, dict }: AdminOffersTableProps) {
  const getDetailUrl = (id: number) => {
    return locale === "pl" ? `/admin/oferty/${id}` : `/${locale}/admin/offers/${id}`;
  };

  const getModelLabel = (model: string) => {
    switch (model) {
      case "rfq": return dict.modelRfq;
      case "ecommerce": return dict.modelEcommerce;
      case "outbound": return dict.modelOutbound;
      case "unknown": return dict.modelUnknown;
      default: return dict.modelUnknown;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft": return dict.statusDraft;
      case "published": return dict.statusPublished;
      case "archived": return dict.statusArchived;
      case "hidden": return dict.statusHidden;
      case "deleted": return dict.statusDeleted;
      default: return dict.statusUnknown;
    }
  };

  const formatPrice = (item: AdminOfferDto) => {
    if (item.priceOnRequest || item.priceBrutto === null) {
      return dict.priceOnRequest;
    }
    const num = Number(item.priceBrutto);
    if (isNaN(num)) return dict.priceOnRequest;
    return new Intl.NumberFormat(locale, { style: "currency", currency: "PLN" }).format(num);
  };

  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getPreviewUrl = (id: number) => {
    return locale === "pl" ? `/oferta/${id}` : `/${locale}/oferta/${id}`;
  };

  if (items.length === 0) {
    return (
      <div className="bg-card text-card-foreground p-8 rounded-industrial border border-border-industrial text-center">
        <h3 className="text-lg font-medium mb-2">{dict.emptyTitle}</h3>
        <p className="text-muted-foreground">{dict.emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-industrial border border-border-industrial bg-card">
      <table className="w-full text-sm text-left text-card-foreground">
        <caption className="sr-only">{dict.tableCaption}</caption>
        <thead className="bg-secondary text-secondary-foreground text-xs uppercase font-semibold">
          <tr>
            <th scope="col" className="px-4 py-3">{dict.offerColumn}</th>
            <th scope="col" className="px-4 py-3">{dict.partnerColumn}</th>
            <th scope="col" className="px-4 py-3">{dict.categoryColumn}</th>
            <th scope="col" className="px-4 py-3">{dict.modelColumn}</th>
            <th scope="col" className="px-4 py-3">{dict.statusColumn}</th>
            <th scope="col" className="px-4 py-3 text-right">{dict.priceColumn}</th>
            <th scope="col" className="px-4 py-3 text-center">{dict.activeColumn}</th>
            <th scope="col" className="px-4 py-3">{dict.createdColumn}</th>
            <th scope="col" className="px-4 py-3 text-right">{dict.previewColumn}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-industrial/50">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-muted/50 transition-colors">
              <td className="px-4 py-3">
                <Link
                  href={getDetailUrl(item.id)}
                  className="font-medium text-brand-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  #{item.id}
                </Link>
                <div className="mt-0.5">
                  <Link
                    href={getDetailUrl(item.id)}
                    className="text-muted-foreground text-xs truncate max-w-[200px] block hover:text-brand-navy transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    title={item.title}
                  >
                    {item.title}
                  </Link>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {item.partnerName}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {item.categoryName}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.canonicalModel === 'unknown' ? 'border border-border-industrial bg-muted' : 'bg-secondary text-secondary-foreground'}`}>
                  {getModelLabel(item.canonicalModel)}
                </span>
              </td>
              <td className="px-4 py-3">
                {getStatusLabel(item.publicationStatus)}
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap text-muted-foreground">
                {formatPrice(item)}
              </td>
              <td className="px-4 py-3 text-center">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                  {item.isActive ? dict.activeYes : dict.activeNo}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                {formatDate(item.createdAt)}
              </td>
              <td className="px-4 py-3 text-right">
                {item.publicPreviewAllowed ? (
                  <Link
                    href={getPreviewUrl(item.id)}
                    target="_blank"
                    className="text-brand-teal hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                  >
                    {dict.publicPreview}
                  </Link>
                ) : (
                  <span className="text-muted-foreground/60">{dict.previewUnavailable}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
