import type { Locale } from "@/lib/i18n/config";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPageAccessCore } from "@/lib/auth/admin-page-access-core";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { getAdminBuyerOrganizationDetail } from "@/lib/buyer-trust/admin-service";
import { BuyerVerificationControls } from "./BuyerVerificationControls";
import { getDictionary } from "@/lib/i18n/dictionaries";

export async function AdminBuyerDetailPage({ locale, id }: { locale: Locale; id: number }) {
  await requireAdminPageAccessCore(requireAdmin);

  const buyer = await getAdminBuyerOrganizationDetail(db, id);
  const { adminBuyers: t } = await getDictionary(locale);

  if (!buyer) {
    notFound();
  }

  const listPath = locale === "pl" ? "/admin/kupujacy" : `/${locale}/admin/buyers`;

  const activeTaxId = buyer.taxIdentifiers[0]?.id || null;
  const activeRegId = buyer.registryIdentifiers[0]?.id || null;

  return (
    <div className="max-w-5xl min-w-0 space-y-8 pb-12">
      <div>
        <Link
          href={listPath}
          className="text-sm text-brand-teal hover:text-brand-navy mb-4 inline-block focus:outline-none focus-visible:underline"
        >
          &larr; {t.back}
        </Link>

        <h1 className="text-3xl font-bold tracking-tight">{buyer.legalName}</h1>
        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2 text-sm text-muted-foreground">
          <span>{t.country}: {buyer.countryCode}</span>
          <span>{t.statusLabel}: {t.status[buyer.verificationStatus]}</span>
          <span>{t.createdAt}: {new Date(buyer.createdAt).toLocaleDateString(locale)}</span>
          {buyer.verifiedAt && <span>{t.verifiedAt}: {new Date(buyer.verifiedAt).toLocaleDateString(locale)}</span>}
        </div>
      </div>

      <section className="bg-white p-6 border border-border-industrial rounded-industrial shadow-sm">
        <h2 className="font-semibold text-lg border-b border-border-industrial pb-2 mb-4">{t.registeredAddress}</h2>
        {buyer.registeredAddress ? (
          <address className="not-italic text-sm text-brand-navy">
            {buyer.registeredAddress.street} {buyer.registeredAddress.buildingNumber}
            {buyer.registeredAddress.unitNumber ? `/${buyer.registeredAddress.unitNumber}` : ""}<br />
            {buyer.registeredAddress.postalCode} {buyer.registeredAddress.city}<br />
            {buyer.registeredAddress.countryCode}
          </address>
        ) : <p className="text-sm text-muted-foreground">{t.emptyAddress}</p>}
      </section>

      <section className="bg-white p-6 border border-border-industrial rounded-industrial shadow-sm">
        <h2 className="font-semibold text-lg border-b border-border-industrial pb-2 mb-4">{t.users}</h2>
        {buyer.memberships.length === 0 ? <p className="text-sm text-muted-foreground">{t.emptyUsers}</p> : (
          <div className="overflow-x-auto" role="region" aria-label={t.users} tabIndex={0}>
            <table className="w-full min-w-[650px] text-sm text-left">
              <thead><tr className="border-b border-border-industrial text-muted-foreground">
                <th scope="col" className="p-3">{t.table.contact}</th>
                <th scope="col" className="p-3">{t.table.email}</th>
                <th scope="col" className="p-3">{t.phone}</th>
                <th scope="col" className="p-3">{t.roleLabel}</th>
                <th scope="col" className="p-3">{t.membershipStatusLabel}</th>
                <th scope="col" className="p-3">{t.memberSince}</th>
              </tr></thead>
              <tbody>{buyer.memberships.map((member) => (
                <tr key={member.id} className="border-b border-border-industrial">
                  <td className="p-3">{member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : "—"}</td>
                  <td className="p-3 break-all">{member.contactEmail || "—"}</td>
                  <td className="p-3">{member.phone || "—"}</td>
                  <td className="p-3">{t.roles[member.role]}</td>
                  <td className="p-3">{t.membershipStatus[member.status]}</td>
                  <td className="p-3 whitespace-nowrap">{new Date(member.createdAt).toLocaleDateString(locale)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white p-6 border border-border-industrial rounded-industrial shadow-sm">
            <h2 className="font-semibold text-lg border-b border-border-industrial pb-2 mb-4">{t.identifiers}</h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">{t.taxIdentifiers}</h3>
                {buyer.taxIdentifiers.length === 0 ? (
                  <p className="text-sm mt-1 italic">{t.emptyIdentifiers}</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {buyer.taxIdentifiers.map(tax => (
                      <li key={tax.id} className="text-sm p-2 bg-brand-light-gray rounded">
                        <span className="font-mono">{tax.country}{tax.value}</span> ({tax.type})
                        <span className={`ml-2 text-xs font-medium ${tax.trusted ? "text-emerald-700" : "text-muted-foreground"}`}>{tax.trusted ? t.trustedLabel : t.declaredLabel}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground">{t.registryIdentifiers}</h3>
                {buyer.registryIdentifiers.length === 0 ? (
                  <p className="text-sm mt-1 italic">{t.emptyIdentifiers}</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {buyer.registryIdentifiers.map(r => (
                      <li key={r.id} className="text-sm p-2 bg-brand-light-gray rounded">
                        <span className="font-mono">{r.country}:{r.value}</span> ({r.type})
                        <span className={`ml-2 text-xs font-medium ${r.trusted ? "text-emerald-700" : "text-muted-foreground"}`}>{r.trusted ? t.trustedLabel : t.declaredLabel}</span>
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
            labels={t.controls}
            organizationId={buyer.id}
            currentStatus={buyer.verificationStatus}
            taxIdentifierId={activeTaxId}
            registryIdentifierId={activeRegId}
          />

          <div className="bg-white p-6 border border-border-industrial rounded-industrial shadow-sm">
            <h2 className="font-semibold text-lg border-b border-border-industrial pb-2 mb-4">{t.history}</h2>

            {buyer.history.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.emptyHistory}</p>
            ) : (
              <ul className="space-y-4">
                {buyer.history.map(evt => (
                  <li key={evt.id} className="text-sm border-l-2 border-border-industrial pl-3 py-1">
                    <div className="flex justify-between">
                      <span className="font-medium uppercase text-xs tracking-wider">{evt.eventType}</span>
                      <span className="text-xs text-muted-foreground">{new Date(evt.occurredAt).toLocaleString()}</span>
                    </div>
                    <div className="text-muted-foreground mt-1">
                      {t.eventOutcome}: <span className="font-medium">{evt.outcomeStatus}</span> <br/>
                      {t.eventActor}: {evt.actorType} | {t.eventSource}: {evt.sourceType} <br/>
                      {evt.reasonCode && <span>{t.eventReason}: {evt.reasonCode}</span>}
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
