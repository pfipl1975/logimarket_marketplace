import Link from "next/link";
import { getAdminDashboardPage } from "@/app/actions";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { getRfqStatusLabel } from "@/lib/admin/rfq-status-label";

export interface AdminDashboardRoutes {
  partners: string;
  offers: string;
  rfq: string;
  rfqDetail: (id: number) => string;
}

export async function AdminDashboardPage({ 
  locale,
  routes
}: { 
  locale: string;
  routes: AdminDashboardRoutes;
}) {
  const dictionary = await getDictionary(locale as Locale);
  const t = dictionary.adminDashboard;
  const dictOffers = dictionary.adminOffers;
  const dictRfq = dictionary.adminRfq;

  const result = await getAdminDashboardPage();

  if (!result.ok) {
    return (
      <div className="p-6 text-brand-navy bg-brand-light-gray rounded-industrial border border-industrial">
        {t.errors.unavailable}
      </div>
    );
  }

  const { counts, recentRfqQueue } = result.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">{t.title}</h1>
        <p className="text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      {/* PRIMARY KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href={routes.offers} className="block bg-white shadow rounded-industrial p-6 border border-industrial hover:border-brand-teal transition-colors">
          <h2 className="text-lg font-semibold text-brand-navy border-b border-industrial pb-2 mb-4">
            {t.sections.offers}
          </h2>
          <div className="mb-4">
            <span className="text-sm text-muted-foreground tracking-wider">{t.labels.total}</span>
            <div className="text-3xl font-bold text-brand-navy">{counts.offers.total}</div>
          </div>
        </Link>

        <Link href={routes.partners} className="block bg-white shadow rounded-industrial p-6 border border-industrial hover:border-brand-teal transition-colors">
          <h2 className="text-lg font-semibold text-brand-navy border-b border-industrial pb-2 mb-4">
            {t.sections.partners}
          </h2>
          <div className="mb-4">
            <span className="text-sm text-muted-foreground tracking-wider">{t.labels.total}</span>
            <div className="text-3xl font-bold text-brand-navy">{counts.partners.total}</div>
          </div>
        </Link>

        <Link href={routes.rfq} className="block bg-white shadow rounded-industrial p-6 border border-industrial hover:border-brand-teal transition-colors">
          <h2 className="text-lg font-semibold text-brand-navy border-b border-industrial pb-2 mb-4">
            {t.sections.rfq}
          </h2>
          <div className="mb-4">
            <span className="text-sm text-muted-foreground tracking-wider">{t.labels.total}</span>
            <div className="text-3xl font-bold text-brand-navy">{counts.rfq.total}</div>
          </div>
        </Link>
      </div>

      {/* STATUS PANELS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* OFFER STATUS PANEL */}
        <div className="bg-white shadow rounded-industrial p-6 border border-industrial">
          <h3 className="text-md font-semibold text-brand-navy border-b border-industrial pb-2 mb-4">
            {t.sections.offers}
          </h3>
          <div className="space-y-2 text-sm text-brand-navy">
            <Link href={`${routes.offers}?status=draft`} className="flex justify-between hover:text-brand-teal">
              <span>{dictOffers.statusDraft}</span>
              <span className="font-medium">{counts.offers.draft}</span>
            </Link>
            <Link href={`${routes.offers}?status=published`} className="flex justify-between hover:text-brand-teal">
              <span>{dictOffers.statusPublished}</span>
              <span className="font-medium">{counts.offers.published}</span>
            </Link>
            <Link href={`${routes.offers}?status=hidden`} className="flex justify-between hover:text-brand-teal">
              <span>{dictOffers.statusHidden}</span>
              <span className="font-medium">{counts.offers.hidden}</span>
            </Link>
            <Link href={`${routes.offers}?status=archived`} className="flex justify-between hover:text-brand-teal">
              <span>{dictOffers.statusArchived}</span>
              <span className="font-medium">{counts.offers.archived}</span>
            </Link>
            <Link href={`${routes.offers}?status=deleted`} className="flex justify-between hover:text-brand-teal">
              <span>{dictOffers.statusDeleted}</span>
              <span className="font-medium">{counts.offers.deleted}</span>
            </Link>
          </div>
        </div>

        {/* SELLER ELIGIBILITY PANEL */}
        <div className="bg-white shadow rounded-industrial p-6 border border-industrial">
          <h3 className="text-md font-semibold text-brand-navy border-b border-industrial pb-2 mb-4">
            <Link href={routes.partners} className="hover:text-brand-teal">{t.sections.partners}</Link>
          </h3>
          <div className="space-y-2 text-sm text-brand-navy">
            <div className="flex justify-between">
              <span>{t.eligibility.none}</span>
              <span className="font-medium">{counts.sellerEligibility.none}</span>
            </div>
            <div className="flex justify-between">
              <span>{t.eligibility.pending}</span>
              <span className="font-medium">{counts.sellerEligibility.pending}</span>
            </div>
            <div className="flex justify-between">
              <span>{t.eligibility.eligible}</span>
              <span className="font-medium">{counts.sellerEligibility.eligible}</span>
            </div>
            <div className="flex justify-between">
              <span>{t.eligibility.ineligible}</span>
              <span className="font-medium">{counts.sellerEligibility.ineligible}</span>
            </div>
            <div className="flex justify-between">
              <span>{t.eligibility.suspended}</span>
              <span className="font-medium">{counts.sellerEligibility.suspended}</span>
            </div>
          </div>
        </div>

        {/* RFQ STATUS PANEL */}
        <div className="bg-white shadow rounded-industrial p-6 border border-industrial">
          <h3 className="text-md font-semibold text-brand-navy border-b border-industrial pb-2 mb-4">
            {t.sections.rfq}
          </h3>
          <div className="space-y-2 text-sm text-brand-navy">
            <Link href={`${routes.rfq}?status=new`} className="flex justify-between hover:text-brand-teal">
              <span>{getRfqStatusLabel("new", dictRfq)}</span>
              <span className="font-medium">{counts.rfq.new}</span>
            </Link>
            <Link href={`${routes.rfq}?status=in_progress`} className="flex justify-between hover:text-brand-teal">
              <span>{getRfqStatusLabel("in_progress", dictRfq)}</span>
              <span className="font-medium">{counts.rfq.inProgress}</span>
            </Link>
            <Link href={`${routes.rfq}?status=responded`} className="flex justify-between hover:text-brand-teal">
              <span>{getRfqStatusLabel("responded", dictRfq)}</span>
              <span className="font-medium">{counts.rfq.responded}</span>
            </Link>
            <Link href={`${routes.rfq}?status=closed`} className="flex justify-between hover:text-brand-teal">
              <span>{getRfqStatusLabel("closed", dictRfq)}</span>
              <span className="font-medium">{counts.rfq.closed}</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-industrial p-6 border border-industrial">
        <h2 className="text-lg font-semibold text-brand-navy border-b border-industrial pb-2 mb-4">
          {t.sections.recentRfq}
        </h2>
        {recentRfqQueue.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t.empty.recentRfq}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-xs text-muted-foreground bg-brand-light-gray border-b border-industrial">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t.table.createdAt}</th>
                  <th className="px-4 py-3 font-semibold">{t.table.status}</th>
                  <th className="px-4 py-3 font-semibold">{t.table.company}</th>
                  <th className="px-4 py-3 font-semibold">{t.table.offer}</th>
                  <th className="px-4 py-3 font-semibold">{t.table.partner}</th>
                  <th className="px-4 py-3 font-semibold text-right">{t.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {recentRfqQueue.map((item) => {
                  return (
                  <tr key={item.id} className="border-b border-industrial hover:bg-brand-light-gray">
                    <td className="px-4 py-3 whitespace-nowrap text-brand-navy">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString(locale, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-brand-navy">
                      {getRfqStatusLabel(item.status, dictRfq)}
                    </td>
                    <td className="px-4 py-3 font-medium text-brand-navy">{item.companyName || "—"}</td>
                    <td className="px-4 py-3 text-brand-navy">
                      <Link href={`${routes.offers}?q=${item.offerId}`} className="hover:text-brand-teal">
                        {item.offerTitle || item.offerId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-brand-navy">
                      <Link href={`${routes.partners}?q=${item.partnerId}`} className="hover:text-brand-teal">
                        {item.partnerCompanyName || item.partnerId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={routes.rfqDetail(item.id)} className="text-brand-teal hover:underline font-semibold">
                        {t.actions.viewDetail}
                      </Link>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
