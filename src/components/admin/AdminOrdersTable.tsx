import type { AdminOrdersDto } from "@/lib/admin/orders-read-model-core";

export function AdminOrdersTable({
  items,
  dict,
  locale,
}: {
  items: AdminOrdersDto[];
  dict: Record<string, string>;
  locale: string;
}) {
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-brand-light-gray/50 text-muted-foreground border-b border-border-industrial">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">{dict.idColumn}</th>
            <th scope="col" className="px-4 py-3 font-medium">{dict.createdColumn}</th>
            <th scope="col" className="px-4 py-3 font-medium">{dict.statusColumn}</th>
            <th scope="col" className="px-4 py-3 font-medium">{dict.companyColumn}</th>
            <th scope="col" className="px-4 py-3 font-medium">{dict.emailColumn}</th>
            <th scope="col" className="px-4 py-3 font-medium">{dict.itemsColumn}</th>
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
              <td className="px-4 py-3 text-brand-navy">
                <span className="bg-brand-light-gray px-2 py-1 rounded text-xs font-medium uppercase tracking-wider">
                  {item.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-brand-navy">{item.companyName || "—"}</span>
                  <span className="text-xs text-muted-foreground">{item.contactName}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-brand-navy">
                {item.email}
              </td>
              <td className="px-4 py-3">
                <span className="font-mono text-brand-navy">{item.itemCount}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
