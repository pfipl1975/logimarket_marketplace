"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addAdminSellerRegistryIdentifier, deleteAdminSellerRegistryIdentifier } from "@/app/actions";
import { Loader2, Plus, Trash2, AlertCircle } from "lucide-react";

export type AdminSellerRegistryIdentifiersFormProps = {
  partnerId: number;
  hasLegalIdentity: boolean;
  registryIdentifiers: Array<{
    id: number;
    registryType: string;
    registryValue: string;
    jurisdictionCountry: string;
  }>;
  dictionary: {
    registryTypeLabel: string;
    registryValueLabel: string;
    jurisdictionLabel: string;
    addAction: string;
    removeAction: string;
    noRegistryIdentifiers: string;
    legalIdentityRequired: string;
    sellerLegalErrorInvalidInput: string;
    sellerLegalErrorSystem: string;
    sellerLegalErrorPartnerNotFound: string;
    registryIdentifierConflict: string;
    registryIdentifierNotFound: string;
    addRegistryIdentifierTitle: string;
    confirmDelete: string;
    placeholderRegistry: string;
  };
};

export function AdminSellerRegistryIdentifiersForm({
  partnerId,
  hasLegalIdentity,
  registryIdentifiers,
  dictionary,
}: AdminSellerRegistryIdentifiersFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;

    if (!hasLegalIdentity) {
      setErrorMsg(dictionary.legalIdentityRequired);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const registryType = formData.get("registryType")?.toString().trim();
    const registryValue = formData.get("registryValue")?.toString().trim();
    const jurisdictionCountry = formData.get("jurisdictionCountry")?.toString().trim().toUpperCase();

    if (!registryType || !registryValue || !jurisdictionCountry) {
      setErrorMsg(dictionary.sellerLegalErrorInvalidInput);
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      const result = await addAdminSellerRegistryIdentifier({
        partnerId,
        registryType,
        registryValue,
        jurisdictionCountry,
      });

      if (result.ok) {
        // Clear form
        const form = e.target as HTMLFormElement;
        form.reset();
        router.refresh();
      } else {
        switch (result.code) {
          case "INVALID_INPUT":
            setErrorMsg(dictionary.sellerLegalErrorInvalidInput);
            break;
          case "PARTNER_NOT_FOUND":
            setErrorMsg(dictionary.sellerLegalErrorPartnerNotFound);
            break;
          case "LEGAL_IDENTITY_REQUIRED":
            setErrorMsg(dictionary.legalIdentityRequired);
            break;
          case "REGISTRY_IDENTIFIER_CONFLICT":
            setErrorMsg(dictionary.registryIdentifierConflict);
            break;
          case "SYSTEM_ERROR":
          default:
            setErrorMsg(dictionary.sellerLegalErrorSystem);
            break;
        }
      }
    });
  };

  const handleDelete = (id: number) => {
    if (isPending) return;
    if (!window.confirm(dictionary.confirmDelete)) return;

    setErrorMsg(null);
    startTransition(async () => {
      const result = await deleteAdminSellerRegistryIdentifier({
        partnerId,
        registryIdentifierId: id,
      });

      if (result.ok) {
        router.refresh();
      } else {
        switch (result.code) {
          case "NOT_FOUND":
            setErrorMsg(dictionary.registryIdentifierNotFound);
            break;
          case "SYSTEM_ERROR":
          default:
            setErrorMsg(dictionary.sellerLegalErrorSystem);
            break;
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-industrial flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{errorMsg}</p>
        </div>
      )}

      {registryIdentifiers.length === 0 ? (
        <div className="p-6 bg-brand-light-gray rounded-industrial border border-border-industrial text-center">
          <p className="text-sm text-brand-navy/60">{dictionary.noRegistryIdentifiers}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {registryIdentifiers.map((identifier) => (
            <div
              key={identifier.id}
              className="flex items-center justify-between p-4 bg-white border border-border-industrial rounded-industrial shadow-soft"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                <div>
                  <span className="block text-xs font-medium text-brand-navy/60 mb-1">
                    {dictionary.registryTypeLabel}
                  </span>
                  <span className="text-sm text-brand-navy font-semibold">{identifier.registryType}</span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-brand-navy/60 mb-1">
                    {dictionary.jurisdictionLabel}
                  </span>
                  <span className="text-sm text-brand-navy">{identifier.jurisdictionCountry}</span>
                </div>
                <div>
                  <span className="block text-xs font-medium text-brand-navy/60 mb-1">
                    {dictionary.registryValueLabel}
                  </span>
                  <span className="text-sm text-brand-navy">{identifier.registryValue}</span>
                </div>
              </div>

              <div className="ml-4 pl-4 border-l border-border-industrial">
                <button
                  type="button"
                  onClick={() => handleDelete(identifier.id)}
                  disabled={isPending}
                  title={dictionary.removeAction}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-industrial transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasLegalIdentity && (
        <div className="mt-8 pt-6 border-t border-border-industrial">
          <h4 className="text-sm font-semibold text-brand-navy mb-4">{dictionary.addRegistryIdentifierTitle}</h4>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label htmlFor="registryType" className="block text-xs font-medium text-brand-navy mb-1">
                {dictionary.registryTypeLabel}
              </label>
              <input
                id="registryType"
                name="registryType"
                type="text"
                required
                maxLength={50}
                placeholder="KRS"
                disabled={isPending}
                className="w-full px-3 py-2 border border-border-industrial rounded-industrial text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent disabled:opacity-50"
              />
            </div>
            <div>
              <label htmlFor="jurisdictionCountry" className="block text-xs font-medium text-brand-navy mb-1">
                {dictionary.jurisdictionLabel}
              </label>
              <input
                id="jurisdictionCountry"
                name="jurisdictionCountry"
                type="text"
                required
                maxLength={2}
                placeholder="PL"
                disabled={isPending}
                className="w-full px-3 py-2 border border-border-industrial rounded-industrial text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent disabled:opacity-50 uppercase"
              />
            </div>
            <div>
              <label htmlFor="registryValue" className="block text-xs font-medium text-brand-navy mb-1">
                {dictionary.registryValueLabel}
              </label>
              <input
                id="registryValue"
                name="registryValue"
                type="text"
                required
                maxLength={100}
                placeholder={dictionary.placeholderRegistry}
                disabled={isPending}
                className="w-full px-3 py-2 border border-border-industrial rounded-industrial text-sm focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent disabled:opacity-50"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full px-4 py-2 bg-white border border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white rounded-industrial text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-teal disabled:opacity-50 flex items-center justify-center"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                {!isPending && dictionary.addAction}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
