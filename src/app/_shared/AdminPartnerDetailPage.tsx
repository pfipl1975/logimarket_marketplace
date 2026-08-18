import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { getAdminPartnerDetail } from "@/app/actions";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, FileText, Landmark, ShieldCheck, FileKey } from "lucide-react";
import { AdminSellerEligibilityControl } from "@/components/admin/AdminSellerEligibilityControl";

export async function AdminPartnerDetailPage({
  locale,
  id,
}: {
  locale: Locale;
  id: string;
}) {
  const dictionary = await getDictionary(locale);
  const dict = dictionary.adminPartnerDetail;

  const result = await getAdminPartnerDetail(id);

  if (!result.ok) {
    if (result.code === "NOT_FOUND" || result.code === "INVALID_ID") {
      notFound();
    }
    return (
      <div className="rounded-industrial border border-border-industrial bg-white p-12 text-center shadow-soft">
        <h2 className="text-xl font-semibold text-brand-navy mb-2">{dict.errorTitle}</h2>
        <p className="text-muted-foreground">{dict.errorDescription}</p>
      </div>
    );
  }

  const { partner, legalIdentity, taxIdentifiers, registryIdentifiers, eligibility } = result.data;
  const backPath = locale === "pl" ? "/admin/partnerzy" : `/${locale}/admin/partners`;

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return dict.emptyValue;
    return new Date(isoStr).toLocaleString(locale);
  };

  const renderFieldValue = (val: string | null | undefined) => {
    return val ? val : <span className="text-muted-foreground italic">{dict.emptyValue}</span>;
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto w-full pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-industrial pb-6">
        <div>
          <Link
            href={backPath}
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-brand-navy transition-colors mb-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2 rounded-sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {dict.backToPartners}
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-semibold text-brand-navy">{partner.companyName}</h1>
            <span className="bg-brand-light-gray text-brand-navy border border-border-industrial px-2.5 py-0.5 rounded-industrial text-sm font-medium">
              ID: {partner.id}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Partner Base Data */}
        <section className="bg-white rounded-industrial border border-border-industrial shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-border-industrial bg-brand-light-gray/30 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-brand-teal" />
            <h2 className="font-medium text-brand-navy">{dict.partnerDataSection}</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.companyNameLabel}</p>
              <p className="text-sm font-medium text-brand-navy">{renderFieldValue(partner.companyName)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.contactEmailLabel}</p>
              <p className="text-sm font-medium text-brand-navy break-all">{renderFieldValue(partner.contactEmail)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.websiteUrlLabel}</p>
              <p className="text-sm font-medium text-brand-navy break-all">{renderFieldValue(partner.websiteUrl)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.createdAtLabel}</p>
              <p className="text-sm font-medium text-brand-navy">{formatDate(partner.createdAt)}</p>
            </div>
          </div>
        </section>

        {/* Seller Legal Identity */}
        <section className="bg-white rounded-industrial border border-border-industrial shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-border-industrial bg-brand-light-gray/30 flex items-center gap-2">
            <Landmark className="h-5 w-5 text-brand-teal" />
            <h2 className="font-medium text-brand-navy">{dict.legalIdentitySection}</h2>
          </div>
          <div className="p-6">
            {!legalIdentity ? (
              <p className="text-sm text-muted-foreground italic">{dict.noLegalIdentity}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.legalNameLabel}</p>
                  <p className="text-sm font-medium text-brand-navy">{renderFieldValue(legalIdentity.legalName)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.jurisdictionLabel}</p>
                  <p className="text-sm font-medium text-brand-navy">{renderFieldValue(legalIdentity.jurisdictionCountry)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.verificationStatusLabel}</p>
                  <p className="text-sm font-medium text-brand-navy">{renderFieldValue(legalIdentity.verificationStatus)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.verifiedAtLabel}</p>
                  <p className="text-sm font-medium text-brand-navy">{formatDate(legalIdentity.verifiedAt)}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.verificationSourceLabel}</p>
                  <p className="text-sm font-medium text-brand-navy">{renderFieldValue(legalIdentity.verificationSource)}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.verificationReferenceLabel}</p>
                  <p className="text-sm font-medium text-brand-navy break-all font-mono text-xs">{renderFieldValue(legalIdentity.verificationReference)}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Tax Identifiers */}
        <section className="bg-white rounded-industrial border border-border-industrial shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-border-industrial bg-brand-light-gray/30 flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-teal" />
            <h2 className="font-medium text-brand-navy">{dict.taxIdentifiersSection}</h2>
          </div>
          <div className="p-0">
            {taxIdentifiers.length === 0 ? (
              <div className="p-6"><p className="text-sm text-muted-foreground italic">{dict.noTaxIdentifiers}</p></div>
            ) : (
              <div className="divide-y divide-border-industrial/50">
                {taxIdentifiers.map((tax, idx) => (
                  <div key={idx} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 hover:bg-brand-light-gray/20 transition-colors">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.identifierTypeLabel}</p>
                      <p className="text-sm font-medium text-brand-navy">{renderFieldValue(tax.identifierType)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.identifierValueLabel}</p>
                      <p className="text-sm font-medium text-brand-navy">{renderFieldValue(tax.identifierValue)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.countryCodeLabel}</p>
                      <p className="text-sm font-medium text-brand-navy">{renderFieldValue(tax.countryCode)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.verificationStatusLabel}</p>
                      <p className="text-sm font-medium text-brand-navy">{renderFieldValue(tax.verificationStatus)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.verifiedAtLabel}</p>
                      <p className="text-sm font-medium text-brand-navy">{formatDate(tax.verifiedAt)}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.verificationSourceLabel}</p>
                      <p className="text-sm font-medium text-brand-navy">{renderFieldValue(tax.verificationSource)}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.verificationReferenceLabel}</p>
                      <p className="text-sm font-medium text-brand-navy break-all font-mono text-xs">{renderFieldValue(tax.verificationReference)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Registry Identifiers */}
        <section className="bg-white rounded-industrial border border-border-industrial shadow-soft overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-border-industrial bg-brand-light-gray/30 flex items-center gap-2">
            <FileKey className="h-5 w-5 text-brand-teal" />
            <h2 className="font-medium text-brand-navy">{dict.registryIdentifiersSection}</h2>
          </div>
          <div className="p-0">
            {registryIdentifiers.length === 0 ? (
              <div className="p-6"><p className="text-sm text-muted-foreground italic">{dict.noRegistryIdentifiers}</p></div>
            ) : (
              <div className="divide-y divide-border-industrial/50">
                {registryIdentifiers.map((reg, idx) => (
                  <div key={idx} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 hover:bg-brand-light-gray/20 transition-colors">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.registryTypeLabel}</p>
                      <p className="text-sm font-medium text-brand-navy">{renderFieldValue(reg.registryType)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.registryValueLabel}</p>
                      <p className="text-sm font-medium text-brand-navy">{renderFieldValue(reg.registryValue)}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.jurisdictionLabel}</p>
                      <p className="text-sm font-medium text-brand-navy">{renderFieldValue(reg.jurisdictionCountry)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Seller Eligibility */}
        <section className="bg-white rounded-industrial border border-border-industrial shadow-soft overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-border-industrial bg-brand-light-gray/30 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-teal" />
            <h2 className="font-medium text-brand-navy">{dict.eligibilitySection}</h2>
          </div>
          <div className="p-6">
            {!eligibility ? (
              <p className="text-sm text-muted-foreground italic">{dict.noEligibility}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.eligibilityStatusLabel}</p>
                  <p className="text-sm font-medium text-brand-navy">{renderFieldValue(eligibility.eligibilityStatus)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.eligibilityUpdatedAtLabel}</p>
                  <p className="text-sm font-medium text-brand-navy">{formatDate(eligibility.updatedAt)}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.eligibilityReasonLabel}</p>
                  <p className="text-sm font-medium text-brand-navy">{renderFieldValue(eligibility.reason)}</p>
                </div>
              </div>
            )}
            
            <AdminSellerEligibilityControl
              partnerId={partner.id}
              eligibility={eligibility}
              dictionary={{
                currentStatus: dict.eligibilityStatusLabel,
                targetStatusLabel: dict.targetStatusLabel ?? "Target status",
                reasonLabel: dict.eligibilityReasonLabel,
                saveStatus: dict.saveStatus ?? "Save status",
                statuses: {
                  pending: dict.statusPending ?? "Pending",
                  eligible: dict.statusEligible ?? "Eligible",
                  ineligible: dict.statusIneligible ?? "Ineligible",
                  suspended: dict.statusSuspended ?? "Suspended",
                  none: dict.statusNone ?? "None",
                },
                errors: {
                  invalidInput: dict.errorInvalidInput ?? "Invalid input",
                  conflict: dict.errorConflict ?? "Conflict",
                  reasonRequired: dict.errorReasonRequired ?? "Reason is required",
                  systemError: dict.errorSystemError ?? "System error",
                  partnerNotFound: dict.errorPartnerNotFound ?? "Partner not found",
                },
                pendingMessage: dict.pendingMessage ?? "Saving...",
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
