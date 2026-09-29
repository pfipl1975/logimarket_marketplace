import type { Locale } from "@/lib/i18n/config";
import Link from "next/link";
import { requireAdminPageAccessCore } from "@/lib/auth/admin-page-access-core";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { listAdminBuyerOrganizations } from "@/lib/buyer-trust/admin-service";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function AdminBuyersPage({ locale }: { locale: Locale; searchParams: unknown }) {
  await requireAdminPageAccessCore(requireAdmin);

  const buyers = await listAdminBuyerOrganizations(db);
  const { adminBuyers: t } = await getDictionary(locale);
  const basePath = locale === "pl" ? "/admin/kupujacy" : `/${locale}/admin/buyers`;

  return (
    <div className="space-y-6">
      <header>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.title}</h1>
          <p className="text-muted-foreground mt-1">
            {t.subtitle}
          </p>
        </div>
      </header>

      <div className="bg-white rounded-industrial border border-border-industrial shadow-sm overflow-hidden">
        <div className="overflow-x-auto" role="region" aria-label={t.title} tabIndex={0}>
          <table className="w-full min-w-[960px] text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-brand-light-gray/50 border-b border-border-industrial">
              <tr>
                <th scope="col" className="px-4 py-4 font-medium">{t.table.company}</th>
                <th scope="col" className="px-4 py-4 font-medium">{t.table.taxIdentifier}</th>
                <th scope="col" className="px-4 py-4 font-medium">{t.table.city}</th>
                <th scope="col" className="px-4 py-4 font-medium">{t.table.contact}</th>
                <th scope="col" className="px-4 py-4 font-medium">{t.table.email}</th>
                <th scope="col" className="px-4 py-4 font-medium">{t.table.status}</th>
                <th scope="col" className="px-4 py-4 font-medium">{t.table.createdAt}</th>
                <th scope="col" className="px-4 py-4 text-right font-medium">{t.table.details}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-industrial">
              {buyers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    {t.emptyList}
                  </td>
                </tr>
              ) : (
                buyers.map((buyer) => (
                  <tr key={buyer.id} className="hover:bg-brand-light-gray/30 transition-colors">
                    <td className="px-4 py-4 font-medium text-brand-navy">{buyer.legalName}</td>
                    <td className="px-4 py-4 font-mono">{buyer.taxIdentifier || "—"}</td>
                    <td className="px-4 py-4">{buyer.city || "—"}</td>
                    <td className="px-4 py-4">{buyer.primaryContactName || "—"}</td>
                    <td className="px-4 py-4 break-all">{buyer.primaryContactEmail || "—"}</td>
                    <td className="px-4 py-4">{t.status[buyer.verificationStatus]}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{new Date(buyer.createdAt).toLocaleDateString(locale)}</td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`${basePath}/${buyer.id}`}
                        className="inline-flex items-center justify-center text-sm font-medium text-brand-teal hover:text-brand-navy transition-colors focus:outline-none focus-visible:underline"
                      >
                        {t.table.details}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
