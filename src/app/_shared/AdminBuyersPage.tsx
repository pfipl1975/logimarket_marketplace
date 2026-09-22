import type { Locale } from "@/lib/i18n/config";
import Link from "next/link";
import { requireAdminPageAccessCore } from "@/lib/auth/admin-page-access-core";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { listAdminBuyerOrganizations } from "@/lib/buyer-trust/admin-service";
import { Building2, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export async function AdminBuyersPage({ locale }: { locale: Locale; searchParams: unknown }) {
  await requireAdminPageAccessCore(requireAdmin);

  const buyers = await listAdminBuyerOrganizations(db);
  const basePath = locale === "pl" ? "/admin/kupujacy" : `/${locale}/admin/buyers`;

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kupujący / Buyers</h1>
          <p className="text-muted-foreground mt-1">
            Weryfikacja organizacji kupujących
          </p>
        </div>
      </header>

      <div className="bg-white rounded-industrial border border-border-industrial shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-brand-light-gray/50 border-b border-border-industrial">
              <tr>
                <th scope="col" className="px-6 py-4 font-medium">Firma</th>
                <th scope="col" className="px-6 py-4 font-medium">Kraj</th>
                <th scope="col" className="px-6 py-4 font-medium">Status weryfikacji</th>
                <th scope="col" className="px-6 py-4 font-medium">NIP / Tax ID</th>
                <th scope="col" className="px-6 py-4 font-medium">REGON / Registry</th>
                <th scope="col" className="px-6 py-4 text-right font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-industrial">
              {buyers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    Brak kupujących.
                  </td>
                </tr>
              ) : (
                buyers.map((buyer) => (
                  <tr key={buyer.id} className="hover:bg-brand-light-gray/30 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        {buyer.legalName}
                      </div>
                    </td>
                    <td className="px-6 py-4">{buyer.countryCode}</td>
                    <td className="px-6 py-4">
                      {buyer.verificationStatus === "pending" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><AlertTriangle className="w-3.5 h-3.5" /> Pending</span>}
                      {buyer.verificationStatus === "verified" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3.5 h-3.5" /> Verified</span>}
                      {buyer.verificationStatus === "rejected" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3.5 h-3.5" /> Rejected</span>}
                      {buyer.verificationStatus === "revoked" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><XCircle className="w-3.5 h-3.5" /> Revoked</span>}
                    </td>
                    <td className="px-6 py-4">{buyer.taxIdentifier || "-"}</td>
                    <td className="px-6 py-4">{buyer.registryIdentifier || "-"}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`${basePath}/${buyer.id}`}
                        className="inline-flex items-center justify-center text-sm font-medium text-brand-teal hover:text-brand-navy transition-colors focus:outline-none focus-visible:underline"
                      >
                        Szczegóły
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
