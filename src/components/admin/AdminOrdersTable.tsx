import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/types";
import { ADMIN_ORDER_LIFECYCLES, type AdminLifecycleCounts, type AdminOrdersDto } from "@/lib/admin/orders-read-model-core";

export function formatAdminOrderDate(value: string | null, locale: string): string {
  return value === null ? "—" : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
export function AdminOrderLifecycleSummary({ counts, dict }: { counts: AdminLifecycleCounts; dict: Dictionary["adminOrders"] }) {
  const states = ADMIN_ORDER_LIFECYCLES.filter(state => counts[state] > 0);
  return states.length === 0 ? <p className="text-sm text-muted-foreground">{dict.noSellerOrders}</p> : (
    <ul className="flex flex-wrap gap-2" aria-label={dict.lifecycleColumn}>
      {states.map(state => <li key={state} className={`rounded-industrial border px-2 py-1 text-sm ${state === "invalid_order_state" || state === "not_routed" ? "border-amber-400 bg-amber-50 text-amber-950 font-semibold" : "border-border-industrial bg-brand-light-gray text-brand-navy"}`}>
        {dict.lifecycleLabels[state]} <span className="font-semibold tabular-nums">{counts[state]}</span>
      </li>)}
    </ul>
  );
}
export function AdminOrdersTable({ items, dict, locale, basePath }: {
  items: AdminOrdersDto[]; dict: Dictionary["adminOrders"]; locale: string; basePath: string;
}) {
  return <>
    <ul className="space-y-4 p-4 lg:hidden">
      {items.map(item => <li key={item.id}>
        <article className="min-w-0 rounded-industrial border border-border-industrial p-4 space-y-4" aria-labelledby={`order-card-${item.id}`}>
          <h3 id={`order-card-${item.id}`} className="font-semibold text-brand-navy">{dict.orderLabel} #{item.id}</h3>
          <p className="wrap-anywhere font-medium">{item.buyerBusinessName}</p>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-muted-foreground">{dict.createdColumn}</dt><dd><time dateTime={item.createdAt}>{formatAdminOrderDate(item.createdAt, locale)}</time></dd></div>
            <div className="flex gap-2"><dt className="text-muted-foreground">{dict.sellerCountColumn}</dt><dd className="font-semibold">{item.sellerOrderCount}</dd></div>
          </dl>
          <AdminOrderLifecycleSummary counts={item.lifecycleCounts} dict={dict} />
          <Link href={`${basePath}/${item.id}`} aria-label={`${dict.details} — ${dict.orderLabel} #${item.id}`} className="inline-flex min-h-11 items-center rounded-industrial border border-brand-teal px-4 text-sm font-semibold text-brand-navy hover:bg-brand-light-gray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2">{dict.details}</Link>
        </article>
      </li>)}
    </ul>
    <div className="hidden lg:block overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{dict.tableCaption}</caption>
        <thead className="bg-brand-light-gray text-brand-navy"><tr>
          {[dict.idColumn, dict.createdColumn, dict.companyColumn, dict.sellerCountColumn, dict.lifecycleColumn, dict.details].map(label => <th key={label} scope="col" className="p-4 font-semibold">{label}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-border-industrial">
          {items.map(item => <tr key={item.id}>
            <th scope="row" className="p-4 font-semibold">{dict.orderLabel} #{item.id}</th>
            <td className="p-4"><time dateTime={item.createdAt}>{formatAdminOrderDate(item.createdAt, locale)}</time></td>
            <td className="p-4 wrap-anywhere">{item.buyerBusinessName}</td>
            <td className="p-4 tabular-nums">{item.sellerOrderCount}</td>
            <td className="p-4"><AdminOrderLifecycleSummary counts={item.lifecycleCounts} dict={dict} /></td>
            <td className="p-4"><Link href={`${basePath}/${item.id}`} aria-label={`${dict.details} — ${dict.orderLabel} #${item.id}`} className="inline-flex min-h-11 items-center rounded-industrial px-2 font-semibold text-brand-teal underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal">{dict.details}</Link></td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </>;
}
