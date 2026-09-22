"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addAdminSellerTaxIdentifier, deleteAdminSellerTaxIdentifier } from "@/app/actions";
import { Loader2, Plus, Trash2, AlertCircle } from "lucide-react";

export type AdminSellerTaxIdentifiersFormProps = {
  partnerId: number;
  hasLegalIdentity: boolean;
  taxIdentifiers: Array<{
    id: number;
    identifierType: string;
    identifierValue: string;
    countryCode: string;
    verificationStatus: string;
    verifiedAt: string | null;
    verificationSource: string | null;
    verificationReference: string | null;
  }>;
  dictionary: {
    identifierTypeLabel: string;
    taxIdTypeOption: string;
    vatIdTypeOption: string;
    identifierValueLabel: string;
    countryCodeLabel: string;
    verificationStatusLabel: string;
    verifiedAtLabel: string;
    verificationSourceLabel: string;
    verificationReferenceLabel: string;
    addAction: string;
    removeAction: string;
    noTaxIdentifiers: string;
    legalIdentityRequired: string;
    sellerLegalErrorInvalidInput: string;
    sellerLegalErrorSystem: string;
    sellerLegalErrorPartnerNotFound: string;
    taxIdentifierConflict: string;
    taxIdentifierNotFound: string;
      verificationHistoryExists: string;
    addTaxIdentifierTitle: string;
    confirmDelete: string;
        placeholderVat: string;
    placeholderCountry: string;
  
          };
  emptyValue: string;
  locale: string;
};

export function AdminSellerTaxIdentifiersForm({
  partnerId,
  hasLegalIdentity,
  taxIdentifiers,
  dictionary,
  emptyValue,
  locale,
}: AdminSellerTaxIdentifiersFormProps) {
  const router = useRouter();

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return emptyValue;
    return new Date(isoStr).toLocaleString(locale);
  };

  const renderFieldValue = (val: string | null | undefined) => {
    return val ? val : <span className="text-muted-foreground italic">{emptyValue}</span>;
  };
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    identifierType: "",
    identifierValue: "",
    countryCode: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    setError(null);
    startTransition(async () => {
      const result = await addAdminSellerTaxIdentifier({
        partnerId,
        identifierType: formData.identifierType,
        identifierValue: formData.identifierValue,
        countryCode: formData.countryCode,
      });

      if (result.ok) {
        setFormData({ identifierType: "", identifierValue: "", countryCode: "" });
        router.refresh();
      } else {
        if (result.code === "INVALID_INPUT") setError(dictionary.sellerLegalErrorInvalidInput);
        else if (result.code === "PARTNER_NOT_FOUND") setError(dictionary.sellerLegalErrorPartnerNotFound);
        else if (result.code === "LEGAL_IDENTITY_REQUIRED") setError(dictionary.legalIdentityRequired);
        else if (result.code === "TAX_IDENTIFIER_CONFLICT") setError(dictionary.taxIdentifierConflict);
        else setError(dictionary.sellerLegalErrorSystem);
      }
    });
  };

  const handleRemove = (taxId: number) => {
    if (isPending) return;
    if (!confirm(dictionary.confirmDelete)) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteAdminSellerTaxIdentifier({
        partnerId,
        taxIdentifierId: taxId,
      });

      if (result.ok) {
        router.refresh();
      } else {
        if (result.code === "NOT_FOUND") setError(dictionary.taxIdentifierNotFound);
        else if (result.code === "VERIFICATION_HISTORY_EXISTS") setError(dictionary.verificationHistoryExists);
        else setError(dictionary.sellerLegalErrorSystem);
      }
    });
  };

  return (
    <div className="flex flex-col">
      {error && (
        <div className="mx-6 mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {taxIdentifiers.length === 0 ? (
        <div className="p-6 border-b border-border-industrial/50">
          <p className="text-sm text-muted-foreground italic">{dictionary.noTaxIdentifiers}</p>
        </div>
      ) : (
        <div className="divide-y divide-border-industrial/50 border-b border-border-industrial/50">
          {taxIdentifiers.map((tax) => (
            <div key={tax.id} className="p-6 relative hover:bg-brand-light-gray/20 transition-colors">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 pr-12">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dictionary.identifierTypeLabel}</p>
                  <p className="text-sm font-medium text-brand-navy">{renderFieldValue(tax.identifierType)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dictionary.identifierValueLabel}</p>
                  <p className="text-sm font-medium text-brand-navy">{renderFieldValue(tax.identifierValue)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dictionary.countryCodeLabel}</p>
                  <p className="text-sm font-medium text-brand-navy">{renderFieldValue(tax.countryCode)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dictionary.verificationStatusLabel}</p>
                  <p className="text-sm font-medium text-brand-navy">{renderFieldValue(tax.verificationStatus)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dictionary.verifiedAtLabel}</p>
                  <p className="text-sm font-medium text-brand-navy">{formatDate(tax.verifiedAt)}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dictionary.verificationSourceLabel}</p>
                  <p className="text-sm font-medium text-brand-navy">{renderFieldValue(tax.verificationSource)}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dictionary.verificationReferenceLabel}</p>
                  <p className="text-sm font-medium text-brand-navy break-all font-mono text-xs">{renderFieldValue(tax.verificationReference)}</p>
                </div>
              </div>
              <button
                type="button"
                title={dictionary.removeAction}
                onClick={() => handleRemove(tax.id)}
                disabled={isPending}
                className="absolute top-6 right-6 p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-industrial transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="p-6 bg-brand-light-gray/10">
        {!hasLegalIdentity ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm">{dictionary.legalIdentityRequired}</p>
          </div>
        ) : (
          <form onSubmit={handleAdd} className="space-y-4">
            <h3 className="text-sm font-medium text-brand-navy">{dictionary.addTaxIdentifierTitle}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="identifierType" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  {dictionary.identifierTypeLabel} <span className="text-red-500">*</span>
                </label>
                <select
                  id="identifierType"
                  name="identifierType"
                  required
                  value={formData.identifierType}
                  onChange={handleChange}
                  disabled={isPending}
                  className="w-full h-10 px-3 bg-white border border-border-industrial rounded-industrial text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent disabled:opacity-50"
                >
                  <option value="">—</option>
                  <option value="tax_id">{dictionary.taxIdTypeOption}</option>
                  <option value="vat_id">{dictionary.vatIdTypeOption}</option>
                </select>
              </div>
              <div>
                <label htmlFor="identifierValue" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  {dictionary.identifierValueLabel} <span className="text-red-500">*</span>
                </label>
                <input
                  id="identifierValue"
                  name="identifierValue"
                  type="text"
                  required
                  maxLength={100}
                  value={formData.identifierValue}
                  onChange={handleChange}
                  disabled={isPending}
                  className="w-full h-10 px-3 bg-white border border-border-industrial rounded-industrial text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent disabled:opacity-50"
                />
              </div>
              <div>
                <label htmlFor="countryCode" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  {dictionary.countryCodeLabel} <span className="text-red-500">*</span>
                </label>
                <input
                  id="countryCode"
                  name="countryCode"
                  type="text"
                  required
                  maxLength={2}
                  placeholder={dictionary.placeholderCountry}
                  value={formData.countryCode}
                  onChange={handleChange}
                  disabled={isPending}
                  className="w-full h-10 px-3 bg-white border border-border-industrial rounded-industrial text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent disabled:opacity-50"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPending || !formData.identifierType || !formData.identifierValue || !formData.countryCode}
                className="inline-flex items-center justify-center px-4 py-2 bg-brand-navy text-white text-sm font-medium rounded-industrial hover:bg-brand-navy-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-navy disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {dictionary.addAction}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
