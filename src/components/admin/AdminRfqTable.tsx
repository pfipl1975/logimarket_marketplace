import type { AdminRfqDto } from "@/lib/admin/rfq-read-model-core";
import { AdminRfqStatusControl } from "./AdminRfqStatusControl";

export function AdminRfqTable({
  items,
  dict,
  locale,
}: {
  items: AdminRfqDto[];
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
            <th scope="col" className="px-4 py-3 font-medium">{dict.offerColumn}</th>
            <th scope="col" className="px-4 py-3 font-medium">{dict.partnerColumn}</th>
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
                <AdminRfqStatusControl rfqId={item.id} currentStatus={item.status as import("@/lib/schema").RfqStatus} dict={dict} />
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
