import type { Locale } from "@/lib/i18n/config";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPageAccessCore } from "@/lib/auth/admin-page-access-core";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { getAdminBuyerOrganizationDetail } from "@/lib/buyer-trust/admin-service";
import { BuyerVerificationControls } from "./BuyerVerificationControls";

export async function AdminBuyerDetailPage({ locale, id }: { locale: Locale; id: number }) {
  await requireAdminPageAccessCore(requireAdmin);

  const buyer = await getAdminBuyerOrganizationDetail(db, id);

  if (!buyer) {
    notFound();
  }

  const listPath = locale === "pl" ? "/admin/kupujacy" : `/${locale}/admin/buyers`;

  const activeTaxId = buyer.taxIdentifiers[0]?.id || null;
  const activeRegId = buyer.registryIdentifiers[0]?.id || null;

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      <div>
        <Link
          href={listPath}
          className="text-sm text-brand-teal hover:text-brand-navy mb-4 inline-block focus:outline-none focus-visible:underline"
        >
          &larr; Wróć do listy / Back to list
        </Link>

        <h1 className="text-3xl font-bold tracking-tight">{buyer.legalName}</h1>
        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
          <span>ID: {buyer.id}</span>
          <span>Kraj: {buyer.countryCode}</span>
          <span className="uppercase font-medium">Status: {buyer.verificationStatus}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white p-6 border border-border-industrial rounded-industrial shadow-sm">
            <h3 className="font-semibold text-lg border-b border-border-industrial pb-2 mb-4">Identyfikatory / Identifiers</h3>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Identyfikatory podatkowe (Tax)</h4>
                {buyer.taxIdentifiers.length === 0 ? (
                  <p className="text-sm mt-1 italic">Brak</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {buyer.taxIdentifiers.map(t => (
                      <li key={t.id} className="text-sm p-2 bg-brand-light-gray rounded">
                        <span className="font-mono">{t.country}{t.value}</span> ({t.type})
                        {t.trusted && <span className="ml-2 text-xs text-emerald-600 font-medium">TRUSTED</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Rejestry (Registry)</h4>
                {buyer.registryIdentifiers.length === 0 ? (
                  <p className="text-sm mt-1 italic">Brak</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {buyer.registryIdentifiers.map(r => (
                      <li key={r.id} className="text-sm p-2 bg-brand-light-gray rounded">
                        <span className="font-mono">{r.country}:{r.value}</span> ({r.type})
                        {r.trusted && <span className="ml-2 text-xs text-emerald-600 font-medium">TRUSTED</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <BuyerVerificationControls
            organizationId={buyer.id}
            currentStatus={buyer.verificationStatus}
            taxIdentifierId={activeTaxId}
            registryIdentifierId={activeRegId}
          />

          <div className="bg-white p-6 border border-border-industrial rounded-industrial shadow-sm">
            <h3 className="font-semibold text-lg border-b border-border-industrial pb-2 mb-4">Historia zdarzeń / Event History</h3>

            {buyer.history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Brak historii.</p>
            ) : (
              <ul className="space-y-4">
                {buyer.history.map(evt => (
                  <li key={evt.id} className="text-sm border-l-2 border-border-industrial pl-3 py-1">
                    <div className="flex justify-between">
                      <span className="font-medium uppercase text-xs tracking-wider">{evt.eventType}</span>
                      <span className="text-xs text-muted-foreground">{new Date(evt.occurredAt).toLocaleString()}</span>
                    </div>
                    <div className="text-muted-foreground mt-1">
                      Wynik: <span className="font-medium">{evt.outcomeStatus}</span> <br/>
                      Aktor: {evt.actorType} | Źródło: {evt.sourceType} <br/>
                      {evt.reasonCode && <span>Powód: {evt.reasonCode}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
