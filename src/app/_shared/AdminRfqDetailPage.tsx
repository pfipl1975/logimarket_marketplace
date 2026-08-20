import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { getAdminRfqDetail } from "@/app/actions";
import { AdminRfqStatusControl, getRfqStatusLabel } from "@/components/admin/AdminRfqStatusControl";
import Link from "next/link";

export async function AdminRfqDetailPage({
  locale,
  rawId,
}: {
  locale: Locale;
  rawId: string;
}) {
  const dictionary = await getDictionary(locale);
  const dict = dictionary.adminRfq;
  const adminOffersDict = dictionary.adminOffers;

  const listPath = locale === "pl" ? "/admin/zapytania" : `/${locale}/admin/rfq`;
  const offerAdminPathPrefix = locale === "pl" ? "/admin/oferty" : `/${locale}/admin/offers`;
  const partnerAdminPathPrefix = locale === "pl" ? "/admin/partnerzy" : `/${locale}/admin/partners`;

  const result = await getAdminRfqDetail(rawId);

  if (!result.ok) {
    const errorKey =
      result.code === "INVALID_ID" ? "detailErrorInvalidId" :
      result.code === "SYSTEM_ERROR" ? "errorDescription" : "detailErrorNotFound";
    const errorMessage = dict[errorKey as keyof typeof dict] ?? dict.errorDescription;
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-industrial border border-border-industrial bg-white p-12 text-center shadow-soft">
          <h2 className="text-xl font-semibold text-brand-navy mb-2">{dict.errorTitle}</h2>
          <p className="text-muted-foreground mb-6">{errorMessage}</p>
          <Link
            href={listPath}
            className="inline-block px-6 py-2 bg-brand-navy hover:bg-brand-teal text-white rounded-industrial text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-teal"
          >
            {dict.detailBackToList}
          </Link>
        </div>
      </div>
    );
  }

  const rfq = result.data;
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const getOfferPublicationLabel = (status: string | null): string => {
    if (status === null) return "—";
    switch (status) {
      case "draft": return adminOffersDict.statusDraft;
      case "published": return adminOffersDict.statusPublished;
      case "hidden": return adminOffersDict.statusHidden;
      case "archived": return adminOffersDict.statusArchived;
      case "deleted": return adminOffersDict.statusDeleted;
      default: return adminOffersDict.statusUnknown;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={listPath} className="hover:text-brand-navy transition-colors focus:outline-none focus:underline">
          {dict.title}
        </Link>
        <span>/</span>
        <span className="text-brand-navy font-medium">#{rfq.id}</span>
      </div>

      {/* Header */}
      <div>
        <span className="text-brand-teal text-sm font-bold uppercase tracking-wider block mb-1">{dict.eyebrow}</span>
        <h1 className="text-2xl md:text-3xl font-semibold text-brand-navy">
          {dict.detailTitle} #{rfq.id}
        </h1>
        {rfq.createdAt && (
          <p className="text-muted-foreground mt-1 text-sm">
            {dict.detailCreated}: {dateFormatter.format(new Date(rfq.createdAt))}
          </p>
        )}
      </div>

      {/* Contact section — full PII only on detail */}
      <section className="bg-white rounded-industrial border border-border-industrial shadow-soft">
        <div className="px-6 py-4 border-b border-border-industrial bg-brand-light-gray/30">
          <h2 className="font-medium text-brand-navy">{dict.detailContactSection}</h2>
        </div>
        <dl className="divide-y divide-border-industrial/40">
          <div className="px-6 py-3 flex flex-col sm:flex-row sm:gap-8">
            <dt className="text-sm font-medium text-muted-foreground sm:w-48 shrink-0">{dict.detailCompany}</dt>
            <dd className="text-sm text-brand-navy mt-0.5 sm:mt-0">{rfq.companyName || "—"}</dd>
          </div>
          <div className="px-6 py-3 flex flex-col sm:flex-row sm:gap-8">
            <dt className="text-sm font-medium text-muted-foreground sm:w-48 shrink-0">{dict.detailContactPerson}</dt>
            <dd className="text-sm text-brand-navy mt-0.5 sm:mt-0">{rfq.contactName}</dd>
          </div>
          <div className="px-6 py-3 flex flex-col sm:flex-row sm:gap-8">
            <dt className="text-sm font-medium text-muted-foreground sm:w-48 shrink-0">{dict.detailEmail}</dt>
            <dd className="text-sm text-brand-navy mt-0.5 sm:mt-0">{rfq.email}</dd>
          </div>
          {rfq.phone && (
            <div className="px-6 py-3 flex flex-col sm:flex-row sm:gap-8">
              <dt className="text-sm font-medium text-muted-foreground sm:w-48 shrink-0">{dict.detailPhone}</dt>
              <dd className="text-sm text-brand-navy mt-0.5 sm:mt-0">{rfq.phone}</dd>
            </div>
          )}
          {rfq.message && (
            <div className="px-6 py-3 flex flex-col sm:flex-row sm:gap-8">
              <dt className="text-sm font-medium text-muted-foreground sm:w-48 shrink-0">{dict.detailMessage}</dt>
              <dd className="text-sm text-brand-navy mt-0.5 sm:mt-0 whitespace-pre-wrap break-words max-w-prose">
                {rfq.message}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* Offer context */}
      <section className="bg-white rounded-industrial border border-border-industrial shadow-soft">
        <div className="px-6 py-4 border-b border-border-industrial bg-brand-light-gray/30 flex items-center justify-between">
          <h2 className="font-medium text-brand-navy">{dict.detailOfferSection}</h2>
          <Link
            href={`${offerAdminPathPrefix}/${rfq.offerId}`}
            className="text-sm text-brand-teal hover:underline font-medium focus:outline-none focus:underline"
          >
            {dict.detailOpenOffer}
          </Link>
        </div>
        <dl className="divide-y divide-border-industrial/40">
          <div className="px-6 py-3 flex flex-col sm:flex-row sm:gap-8">
            <dt className="text-sm font-medium text-muted-foreground sm:w-48 shrink-0">ID</dt>
            <dd className="text-sm font-mono text-brand-navy mt-0.5 sm:mt-0">{rfq.offerId}</dd>
          </div>
          <div className="px-6 py-3 flex flex-col sm:flex-row sm:gap-8">
            <dt className="text-sm font-medium text-muted-foreground sm:w-48 shrink-0">{dict.detailOfferTitle}</dt>
            <dd className="text-sm text-brand-navy mt-0.5 sm:mt-0">{rfq.offerTitle || "—"}</dd>
          </div>
          <div className="px-6 py-3 flex flex-col sm:flex-row sm:gap-8">
            <dt className="text-sm font-medium text-muted-foreground sm:w-48 shrink-0">{dict.detailOfferStatus}</dt>
            <dd className="text-sm mt-0.5 sm:mt-0">
              <span className="bg-brand-light-gray/50 text-muted-foreground px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider">
                {getOfferPublicationLabel(rfq.offerPublicationStatus)}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      {/* Partner context */}
      <section className="bg-white rounded-industrial border border-border-industrial shadow-soft">
        <div className="px-6 py-4 border-b border-border-industrial bg-brand-light-gray/30 flex items-center justify-between">
          <h2 className="font-medium text-brand-navy">{dict.detailPartnerSection}</h2>
          <Link
            href={`${partnerAdminPathPrefix}/${rfq.partnerId}`}
            className="text-sm text-brand-teal hover:underline font-medium focus:outline-none focus:underline"
          >
            {dict.detailOpenPartner}
          </Link>
        </div>
        <dl className="divide-y divide-border-industrial/40">
          <div className="px-6 py-3 flex flex-col sm:flex-row sm:gap-8">
            <dt className="text-sm font-medium text-muted-foreground sm:w-48 shrink-0">ID</dt>
            <dd className="text-sm font-mono text-brand-navy mt-0.5 sm:mt-0">{rfq.partnerId}</dd>
          </div>
          <div className="px-6 py-3 flex flex-col sm:flex-row sm:gap-8">
            <dt className="text-sm font-medium text-muted-foreground sm:w-48 shrink-0">{dict.detailPartnerName}</dt>
            <dd className="text-sm text-brand-navy mt-0.5 sm:mt-0">{rfq.partnerCompanyName || "—"}</dd>
          </div>
        </dl>
      </section>

      {/* Workflow section */}
      <section className="bg-white rounded-industrial border border-border-industrial shadow-soft">
        <div className="px-6 py-4 border-b border-border-industrial bg-brand-light-gray/30">
          <h2 className="font-medium text-brand-navy">{dict.detailWorkflowSection}</h2>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">{dict.detailCurrentStatus}:</span>
            <span className="bg-brand-light-gray/50 text-muted-foreground px-2 py-1 rounded text-xs font-medium uppercase tracking-wider">
              {getRfqStatusLabel(rfq.status, dict)}
            </span>
          </div>
          <AdminRfqStatusControl
            key={`${rfq.id}:${rfq.status}`}
            rfqId={rfq.id}
            currentStatus={rfq.status}
            dict={dict}
          />
        </div>
      </section>

      {/* Back link */}
      <div className="pb-6">
        <Link
          href={listPath}
          className="text-sm text-muted-foreground hover:text-brand-navy transition-colors focus:outline-none focus:underline"
        >
          ← {dict.detailBackToList}
        </Link>
      </div>
    </div>
  );
}
