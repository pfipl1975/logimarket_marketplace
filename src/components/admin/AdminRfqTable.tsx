import type { AdminRfqListItemDto } from "@/lib/admin/rfq-read-model-core";
import Link from "next/link";

export function AdminRfqTable({
  items,
  dict,
  locale,
  basePath,
}: {
  items: AdminRfqListItemDto[];
  dict: Record<string, string>;
  locale: string;
  basePath: string;
}) {
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Detail route shares the list basePath (/admin/zapytania or /[locale]/admin/rfq)
  const detailPathPrefix = basePath;

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-brand-light-gray/50 text-muted-foreground border-b border-border-industrial">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">{dict.idColumn}</th>
            <th scope="col" className="px-4 py-3 font-medium">{dict.createdColumn}</th>
            <th scope="col" className="px-4 py-3 font-medium">{dict.statusColumn}</th>
            <th scope="col" className="px-4 py-3 font-medium">{dict.companyColumn}</th>
            <th scope="col" className="px-4 py-3 font-medium">{dict.offerColumn}</th>
            <th scope="col" className="px-4 py-3 font-medium">{dict.partnerColumn}</th>
            <th scope="col" className="px-4 py-3 font-medium">{dict.detailColumn}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-industrial/50 bg-white">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-brand-light-gray/30 transition-colors group">
              <td className="px-4 py-3 text-brand-navy font-mono">
                #{item.id}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {item.createdAt ? dateFormatter.format(new Date(item.createdAt)) : "—"}
              </td>
              <td className="px-4 py-3">
                <span className="bg-brand-light-gray/50 text-muted-foreground px-2 py-1 rounded text-xs font-medium uppercase tracking-wider">
                  {dict[`status_${item.status}`] ?? item.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="font-medium text-brand-navy">{item.companyName || "—"}</span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-brand-navy max-w-[200px] truncate" title={item.offerTitle || dict.unknownOffer}>
                    {item.offerTitle || dict.unknownOffer}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">ID: {item.offerId}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-brand-navy max-w-[200px] truncate" title={item.partnerCompanyName || dict.unknownPartner}>
                    {item.partnerCompanyName || dict.unknownPartner}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">ID: {item.partnerId}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`${detailPathPrefix}/${item.id}`}
                  className="inline-flex items-center px-3 py-1.5 bg-brand-navy hover:bg-brand-teal text-white rounded-industrial text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-teal"
                >
                  {dict.detailLink}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
