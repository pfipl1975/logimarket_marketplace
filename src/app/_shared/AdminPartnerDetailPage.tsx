import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { getAdminPartnerDetail } from "@/app/actions";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Landmark, ShieldCheck, Building2, FileText, FileKey, ArrowLeft } from "lucide-react";
import { AdminSellerEligibilityControl } from "@/components/admin/AdminSellerEligibilityControl";
import { AdminSellerLegalIdentityForm } from "@/components/admin/AdminSellerLegalIdentityForm";
import { AdminSellerTaxIdentifiersForm } from "@/components/admin/AdminSellerTaxIdentifiersForm";

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
        <section className="bg-white rounded-industrial border border-border-industrial shadow-soft overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-border-industrial bg-brand-light-gray/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-brand-teal" />
              <h2 className="font-medium text-brand-navy">{dict.legalIdentitySection}</h2>
            </div>
            {result.data.sellerDisclosureCompleteness && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-muted-foreground">{dict.sellerDisclosureReadiness}:</span>
                {result.data.sellerDisclosureCompleteness.complete ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {dict.statusComplete}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {dict.statusIncomplete}
                  </span>
                )}
              </div>
            )}
          </div>

          {result.data.sellerDisclosureCompleteness && !result.data.sellerDisclosureCompleteness.complete && (
            <div className="bg-red-50 px-6 py-3 border-b border-red-100">
              <p className="text-xs text-red-800">
                <span className="font-medium">{dict.missingFields}</span>
                {result.data.sellerDisclosureCompleteness.missing
                  .map((key) => {
                    const missingFieldLabels: Record<string, string> = {
                      legal_name: dict.missing_legal_name,
                      business_email: dict.missing_business_email,
                      registered_address_line1: dict.missing_registered_address_line1,
                      registered_postal_code: dict.missing_registered_postal_code,
                      registered_city: dict.missing_registered_city,
                      registered_country_code: dict.missing_registered_country_code,
                      tax_identifier: dict.missing_tax_identifier,
                    };
                    return missingFieldLabels[key] || key;
                  })
                  .join(", ")}
              </p>
            </div>
          )}

          <div className="p-0 border-b border-border-industrial/50">
            <AdminSellerLegalIdentityForm
              partnerId={partner.id}
              initialData={{
                legalName: legalIdentity?.legalName || "",
                businessEmail: partner.contactEmail || "",
                jurisdictionCountry: legalIdentity?.jurisdictionCountry || "",
                registeredAddressLine1: legalIdentity?.registeredAddressLine1 || "",
                registeredAddressLine2: legalIdentity?.registeredAddressLine2 || "",
                registeredPostalCode: legalIdentity?.registeredPostalCode || "",
                registeredCity: legalIdentity?.registeredCity || "",
                registeredRegion: legalIdentity?.registeredRegion || "",
                registeredCountryCode: legalIdentity?.registeredCountryCode || "",
              }}
              dictionary={{
                legalNameLabel: dict.legalNameLabel,
                businessEmailLabel: dict.businessEmailLabel,
                jurisdictionCountryLabel: dict.jurisdictionLabel,
                registeredAddressLine1Label: dict.registeredAddressLine1Label,
                registeredAddressLine2Label: dict.registeredAddressLine2Label,
                registeredPostalCodeLabel: dict.registeredPostalCodeLabel,
                registeredCityLabel: dict.registeredCityLabel,
                registeredRegionLabel: dict.registeredRegionLabel,
                registeredCountryCodeLabel: dict.registeredCountryCodeLabel,
                saveAction: dict.saveAction,
                sellerLegalSuccessSaved: dict.sellerLegalSuccessSaved,
                sellerLegalErrorInvalidInput: dict.sellerLegalErrorInvalidInput,
                sellerLegalErrorSystem: dict.sellerLegalErrorSystem,
                sellerLegalErrorPartnerNotFound: dict.sellerLegalErrorPartnerNotFound,
                registeredOfficeTitle: dict.registeredOfficeTitle,
                placeholderCountry: dict.placeholderCountry,
              }}
            />
          </div>

          {legalIdentity && (
            <div className="p-6 bg-brand-light-gray/10">
              <h3 className="font-medium text-brand-navy mb-4">{dict.verificationMetadataTitle}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
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
            </div>
          )}
        </section>

        {/* Tax Identifiers */}
        <section className="bg-white rounded-industrial border border-border-industrial shadow-soft overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-border-industrial bg-brand-light-gray/30 flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-teal" />
            <h2 className="font-medium text-brand-navy">{dict.taxIdentifiersSection}</h2>
          </div>
          <div className="p-0">
            <AdminSellerTaxIdentifiersForm
              partnerId={partner.id}
              hasLegalIdentity={!!legalIdentity}
              taxIdentifiers={taxIdentifiers}
              dictionary={{
                identifierTypeLabel: dict.identifierTypeLabel,
                identifierValueLabel: dict.identifierValueLabel,
                countryCodeLabel: dict.countryCodeLabel,
                verificationStatusLabel: dict.verificationStatusLabel,
                verifiedAtLabel: dict.verifiedAtLabel,
                verificationSourceLabel: dict.verificationSourceLabel,
                verificationReferenceLabel: dict.verificationReferenceLabel,
                addAction: dict.addAction,
                removeAction: dict.removeAction,
                noTaxIdentifiers: dict.noTaxIdentifiers,
                legalIdentityRequired: dict.legalIdentityRequired,
                sellerLegalErrorInvalidInput: dict.sellerLegalErrorInvalidInput,
                sellerLegalErrorSystem: dict.sellerLegalErrorSystem,
                sellerLegalErrorPartnerNotFound: dict.sellerLegalErrorPartnerNotFound,
                taxIdentifierConflict: dict.taxIdentifierConflict,
                taxIdentifierNotFound: dict.taxIdentifierNotFound,
                addTaxIdentifierTitle: dict.addTaxIdentifierTitle,
                confirmDelete: dict.confirmDelete,
                placeholderVat: dict.placeholderVat,
                placeholderCountry: dict.placeholderCountry,
              }}
              emptyValue={dict.emptyValue}
              locale={locale}
            />
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
                targetStatusLabel: dict.targetStatusLabel,
                reasonLabel: dict.eligibilityReasonLabel,
                reasonOptionalLabel: dict.reasonOptionalLabel,
                saveStatus: dict.saveStatus,
                statuses: {
                  pending: dict.statusPending,
                  eligible: dict.statusEligible,
                  ineligible: dict.statusIneligible,
                  suspended: dict.statusSuspended,
                  none: dict.statusNone,
                },
                errors: {
                  invalidInput: dict.errorInvalidInput,
                  conflict: dict.errorConflict,
                  reasonRequired: dict.errorReasonRequired,
                  systemError: dict.errorSystemError,
                  partnerNotFound: dict.errorPartnerNotFound,
                },
                success: {
                  saved: dict.successSaved,
                  unchanged: dict.successUnchanged,
                },
                pendingMessage: dict.pendingMessage,
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
