import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminMarketplaceOrderDetail } from "@/app/actions";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { AdminOrderLifecycleSummary, formatAdminOrderDate } from "@/components/admin/AdminOrdersTable";

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-0"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 wrap-anywhere font-medium text-brand-navy">{children}</dd></div>;
}
export async function AdminMarketplaceOrderDetailPage({ locale, orderId }: { locale: Locale; orderId: string }) {
  const result = await getAdminMarketplaceOrderDetail(orderId);
  if (!result.ok && result.code === "ADMIN_ORDER_NOT_FOUND") notFound();
  const { adminOrders: dict } = await getDictionary(locale);
  const basePath = locale === "pl" ? "/admin/zamowienia" : `/${locale}/admin/orders`;
  if (!result.ok) return <section className="rounded-industrial border border-border-industrial bg-white p-6"><h1 className="text-xl font-semibold">{dict.errorTitle}</h1><p className="mt-2">{dict.errorDescription}</p><Link href={basePath} className="mt-4 inline-flex min-h-11 items-center underline focus-visible:ring-2 focus-visible:ring-brand-teal">{dict.backToOrders}</Link></section>;
  const order = result.data;
  const date = (value: string | null) => formatAdminOrderDate(value, locale);
  return <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6">
    <header>
      <Link href={basePath} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-teal underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal">{dict.backToOrders}</Link>
      <h1 className="mt-2 text-2xl font-semibold text-brand-navy wrap-anywhere">{dict.orderLabel} #{order.id}</h1>
      <p className="mt-2 text-muted-foreground">{dict.readOnlyNotice}</p>
    </header>
    <section aria-labelledby="marketplace-record-title" className="rounded-industrial border border-border-industrial bg-white p-5 sm:p-6">
      <h2 id="marketplace-record-title" className="text-xl font-semibold text-brand-navy">{dict.recordTitle}</h2>
      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DetailField label={dict.idColumn}>{order.id}</DetailField>
        <DetailField label={dict.createdColumn}>{date(order.createdAt)}</DetailField>
        <DetailField label={dict.e2Timestamp}>{date(order.e2BuyerIntentAt)}</DetailField>
        <DetailField label={dict.recordState}>{dict.recordStates[order.recordState]}</DetailField>
        {order.customerPoNumber !== null ? <DetailField label={dict.customerPo}>{order.customerPoNumber}</DetailField> : null}
      </dl>
    </section>
    <section aria-labelledby="marketplace-buyer-title" className="rounded-industrial border border-border-industrial bg-white p-5 sm:p-6">
      <h2 id="marketplace-buyer-title" className="text-xl font-semibold text-brand-navy">{dict.buyerTitle}</h2>
      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DetailField label={dict.companyColumn}>{order.buyerBusinessName}</DetailField>
        <DetailField label={dict.buyerCountry}>{order.buyerCountry}</DetailField>
        {order.buyerTaxIdentifier !== null ? <DetailField label={dict.buyerTaxId}>{order.buyerTaxIdentifier}</DetailField> : null}
      </dl>
    </section>
    <section aria-labelledby="marketplace-sellers-title" className="space-y-4">
      <h2 id="marketplace-sellers-title" className="text-xl font-semibold text-brand-navy">{dict.sellerOrdersTitle} ({order.sellerOrderCount})</h2>
      <AdminOrderLifecycleSummary counts={order.lifecycleCounts} dict={dict} />
      {order.sellerOrders.map(seller => <article key={seller.id} aria-labelledby={`seller-order-${seller.id}`} className="min-w-0 rounded-industrial border border-border-industrial bg-white p-5 sm:p-6">
        <h3 id={`seller-order-${seller.id}`} className="text-lg font-semibold text-brand-navy">ORD-SO-{seller.id}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{dict.sellerSnapshotNotice}</p>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DetailField label={dict.sellerLegalName}>{seller.sellerLegalName}</DetailField>
          <DetailField label={dict.sellerDisplayName}>{seller.sellerDisplayName}</DetailField>
          <DetailField label={dict.partnerId}>{seller.partnerId}</DetailField>
          <DetailField label={dict.lifecycleColumn}>{dict.lifecycleLabels[seller.lifecycle]}</DetailField>
          <DetailField label={dict.routedAt}>{date(seller.routedAt)}</DetailField>
          <DetailField label={dict.decisionState}>{dict.decisionLabels[seller.decisionState]}</DetailField>
          <DetailField label={dict.expiresAt}>{date(seller.expiresAt)}</DetailField>
          <DetailField label={dict.resolvedAt}>{date(seller.resolvedAt)}</DetailField>
          <DetailField label={dict.acceptedAt}>{date(seller.acceptedAt)}</DetailField>
        </dl>
        {seller.lifecycle === "not_routed" ? <p className="mt-4 border-l-4 border-amber-400 bg-amber-50 p-3 text-sm text-amber-950">{dict.notRoutedDescription}</p> : null}
        <h4 className="mt-6 font-semibold text-brand-navy">{dict.itemsTitle}</h4>
        <ul className="mt-3 space-y-3">
          {seller.items.map(item => <li key={item.id} className="min-w-0 rounded-industrial border border-border-industrial p-4">
            <p className="wrap-anywhere font-medium text-brand-navy">{item.offerTitle}</p>
            <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <DetailField label={dict.quantity}>{item.quantity}</DetailField>
              <DetailField label={dict.unitPrice}>{item.unitPrice}</DetailField>
              <DetailField label={dict.currency}>{item.currency}</DetailField>
            </dl>
          </li>)}
        </ul>
      </article>)}
    </section>
  </div>;
}
