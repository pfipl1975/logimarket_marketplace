import Link from "next/link";
import { getAdminDashboardPage } from "@/app/actions";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";

export async function AdminDashboardPage({ locale }: { locale: string }) {
  const dictionary = await getDictionary(locale as Locale);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = (dictionary as any).adminDashboard;
  const tStatus = dictionary.adminRfq; // For queue statuses

  const result = await getAdminDashboardPage();

  if (!result.ok) {
    return (
      <div className="p-6 text-red-600 bg-red-50 rounded-lg">
        {t.errors.unavailable}
      </div>
    );
  }

  const { counts, recentRfqQueue } = result.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
        <p className="text-gray-500 mt-1">{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Partners */}
        <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">
            {t.sections.partners}
          </h2>
          <div className="mb-4">
            <span className="text-sm text-gray-500 uppercase tracking-wider">{t.labels.total}</span>
            <div className="text-3xl font-bold text-gray-900">{counts.partners.total}</div>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
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
          <div className="mt-6">
            <Link href={`/${locale}/admin/partners`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              {t.actions.viewPartners} &rarr;
            </Link>
          </div>
        </div>

        {/* Offers */}
        <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">
            {t.sections.offers}
          </h2>
          <div className="mb-4">
            <span className="text-sm text-gray-500 uppercase tracking-wider">{t.labels.total}</span>
            <div className="text-3xl font-bold text-gray-900">{counts.offers.total}</div>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>{t.offers.draft}</span>
              <span className="font-medium">{counts.offers.draft}</span>
            </div>
            <div className="flex justify-between">
              <span>{t.offers.published}</span>
              <span className="font-medium">{counts.offers.published}</span>
            </div>
            <div className="flex justify-between">
              <span>{t.offers.hidden}</span>
              <span className="font-medium">{counts.offers.hidden}</span>
            </div>
            <div className="flex justify-between">
              <span>{t.offers.archived}</span>
              <span className="font-medium">{counts.offers.archived}</span>
            </div>
            <div className="flex justify-between">
              <span>{t.offers.deleted}</span>
              <span className="font-medium">{counts.offers.deleted}</span>
            </div>
          </div>
          <div className="mt-6">
            <Link href={`/${locale}/admin/offers`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              {t.actions.viewOffers} &rarr;
            </Link>
          </div>
        </div>

        {/* RFQ */}
        <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">
            {t.sections.rfq}
          </h2>
          <div className="mb-4">
            <span className="text-sm text-gray-500 uppercase tracking-wider">{t.labels.total}</span>
            <div className="text-3xl font-bold text-gray-900">{counts.rfq.total}</div>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>{t.rfq.new}</span>
              <span className="font-medium">{counts.rfq.new}</span>
            </div>
            <div className="flex justify-between">
              <span>{t.rfq.inProgress}</span>
              <span className="font-medium">{counts.rfq.inProgress}</span>
            </div>
            <div className="flex justify-between">
              <span>{t.rfq.responded}</span>
              <span className="font-medium">{counts.rfq.responded}</span>
            </div>
            <div className="flex justify-between">
              <span>{t.rfq.closed}</span>
              <span className="font-medium">{counts.rfq.closed}</span>
            </div>
          </div>
          <div className="mt-6">
            <Link href={`/${locale}/admin/rfq`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              {t.actions.viewRfq} &rarr;
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">
          {t.sections.recentRfq}
        </h2>
        {recentRfqQueue.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">{t.empty.recentRfq}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3">{t.table.id}</th>
                  <th className="px-4 py-3">{t.table.createdAt}</th>
                  <th className="px-4 py-3">{t.table.company}</th>
                  <th className="px-4 py-3">{t.table.status}</th>
                  <th className="px-4 py-3 text-right">{t.table.actions}</th>
                </tr>
              </thead>
              <tbody>
                {recentRfqQueue.map((item) => {
                  const sKey = `status_${item.status}` as keyof typeof tStatus;
                  return (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{item.id}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString(locale, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.companyName}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                        {tStatus[sKey]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/${locale}/admin/rfq/${item.id}`} className="text-blue-600 hover:underline">
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
