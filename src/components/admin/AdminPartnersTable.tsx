import type { AdminPartnerDto } from "@/lib/admin/partners-read-model-core";

export function AdminPartnersTable({
  items,
  dict,
  locale,
}: {
  items: AdminPartnerDto[];
  dict: Record<string, string>;
  locale: string;
}) {
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <table className="w-full text-left text-sm whitespace-nowrap">
      <thead className="bg-brand-light-gray/50 text-muted-foreground border-b border-border-industrial">
        <tr>
          <th scope="col" className="px-4 py-3 font-medium">{dict.partnerColumn}</th>
          <th scope="col" className="px-4 py-3 font-medium">{dict.contactEmailColumn}</th>
          <th scope="col" className="px-4 py-3 font-medium">{dict.createdColumn}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border-industrial/50 bg-white">
        {items.map((item) => (
          <tr key={item.id} className="hover:bg-brand-light-gray/30 transition-colors group">
            <td className="px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-brand-navy">{item.companyName}</span>
                <span className="font-mono text-xs text-muted-foreground">#{item.id}</span>
              </div>
            </td>
            <td className="px-4 py-3 text-brand-navy">
              {item.contactEmail}
            </td>
            <td className="px-4 py-3 text-muted-foreground">
              {dateFormatter.format(new Date(item.createdAt))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
