"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveAdminSellerLegalData } from "@/app/actions";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export type AdminSellerLegalIdentityFormProps = {
  partnerId: number;
  initialData: {
    legalName: string;
    businessEmail: string;
    jurisdictionCountry: string;
    registeredAddressLine1: string | null;
    registeredAddressLine2: string | null;
    registeredPostalCode: string | null;
    registeredCity: string | null;
    registeredRegion: string | null;
    registeredCountryCode: string | null;
  };
  dictionary: {
    legalNameLabel: string;
    businessEmailLabel: string;
    jurisdictionCountryLabel: string;
    registeredAddressLine1Label: string;
    registeredAddressLine2Label: string;
    registeredPostalCodeLabel: string;
    registeredCityLabel: string;
    registeredRegionLabel: string;
    registeredCountryCodeLabel: string;
    saveAction: string;
    successSaved: string;
    errorInvalidInput: string;
    errorSystem: string;
    errorPartnerNotFound: string;
  };
};

export function AdminSellerLegalIdentityForm({
  partnerId,
  initialData,
  dictionary,
}: AdminSellerLegalIdentityFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    legalName: initialData.legalName || "",
    businessEmail: initialData.businessEmail || "",
    jurisdictionCountry: initialData.jurisdictionCountry || "",
    registeredAddressLine1: initialData.registeredAddressLine1 || "",
    registeredAddressLine2: initialData.registeredAddressLine2 || "",
    registeredPostalCode: initialData.registeredPostalCode || "",
    registeredCity: initialData.registeredCity || "",
    registeredRegion: initialData.registeredRegion || "",
    registeredCountryCode: initialData.registeredCountryCode || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await saveAdminSellerLegalData({
        partnerId,
        legalName: formData.legalName,
        businessEmail: formData.businessEmail,
        jurisdictionCountry: formData.jurisdictionCountry,
        registeredAddressLine1: formData.registeredAddressLine1,
        registeredAddressLine2: formData.registeredAddressLine2,
        registeredPostalCode: formData.registeredPostalCode,
        registeredCity: formData.registeredCity,
        registeredRegion: formData.registeredRegion,
        registeredCountryCode: formData.registeredCountryCode,
      });

      if (result.ok) {
        setSuccess(dictionary.successSaved);
        router.refresh();
      } else {
        if (result.code === "INVALID_INPUT") {
          setError(dictionary.errorInvalidInput);
        } else if (result.code === "PARTNER_NOT_FOUND") {
          setError(dictionary.errorPartnerNotFound);
        } else {
          setError(dictionary.errorSystem);
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
        <div>
          <label htmlFor="legalName" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {dictionary.legalNameLabel} <span className="text-red-500">*</span>
          </label>
          <input
            id="legalName"
            name="legalName"
            type="text"
            required
            maxLength={255}
            value={formData.legalName}
            onChange={handleChange}
            disabled={isPending}
            className="w-full h-10 px-3 bg-white border border-border-industrial rounded-industrial text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent disabled:opacity-50"
          />
        </div>
        <div>
          <label htmlFor="businessEmail" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {dictionary.businessEmailLabel} <span className="text-red-500">*</span>
          </label>
          <input
            id="businessEmail"
            name="businessEmail"
            type="email"
            required
            autoComplete="email"
            value={formData.businessEmail}
            onChange={handleChange}
            disabled={isPending}
            className="w-full h-10 px-3 bg-white border border-border-industrial rounded-industrial text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent disabled:opacity-50"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="jurisdictionCountry" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {dictionary.jurisdictionCountryLabel} <span className="text-red-500">*</span>
          </label>
          <input
            id="jurisdictionCountry"
            name="jurisdictionCountry"
            type="text"
            required
            maxLength={2}
            value={formData.jurisdictionCountry}
            onChange={handleChange}
            disabled={isPending}
            placeholder="e.g. PL"
            className="w-full sm:w-1/4 h-10 px-3 bg-white border border-border-industrial rounded-industrial text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent disabled:opacity-50"
          />
        </div>

        <div className="sm:col-span-2 pt-4 border-t border-border-industrial/50">
          <h3 className="font-medium text-brand-navy mb-4">Registered Office</h3>
        </div>

        <div>
          <label htmlFor="registeredAddressLine1" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {dictionary.registeredAddressLine1Label}
          </label>
          <input
            id="registeredAddressLine1"
            name="registeredAddressLine1"
            type="text"
            maxLength={255}
            autoComplete="street-address"
            value={formData.registeredAddressLine1}
            onChange={handleChange}
            disabled={isPending}
            className="w-full h-10 px-3 bg-white border border-border-industrial rounded-industrial text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent disabled:opacity-50"
          />
        </div>
        <div>
          <label htmlFor="registeredAddressLine2" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {dictionary.registeredAddressLine2Label}
          </label>
          <input
            id="registeredAddressLine2"
            name="registeredAddressLine2"
            type="text"
            maxLength={255}
            autoComplete="address-line2"
            value={formData.registeredAddressLine2}
            onChange={handleChange}
            disabled={isPending}
            className="w-full h-10 px-3 bg-white border border-border-industrial rounded-industrial text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent disabled:opacity-50"
          />
        </div>
        <div>
          <label htmlFor="registeredPostalCode" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {dictionary.registeredPostalCodeLabel}
          </label>
          <input
            id="registeredPostalCode"
            name="registeredPostalCode"
            type="text"
            maxLength={32}
            autoComplete="postal-code"
            value={formData.registeredPostalCode}
            onChange={handleChange}
            disabled={isPending}
            className="w-full h-10 px-3 bg-white border border-border-industrial rounded-industrial text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent disabled:opacity-50"
          />
        </div>
        <div>
          <label htmlFor="registeredCity" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {dictionary.registeredCityLabel}
          </label>
          <input
            id="registeredCity"
            name="registeredCity"
            type="text"
            maxLength={120}
            autoComplete="address-level2"
            value={formData.registeredCity}
            onChange={handleChange}
            disabled={isPending}
            className="w-full h-10 px-3 bg-white border border-border-industrial rounded-industrial text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent disabled:opacity-50"
          />
        </div>
        <div>
          <label htmlFor="registeredRegion" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {dictionary.registeredRegionLabel}
          </label>
          <input
            id="registeredRegion"
            name="registeredRegion"
            type="text"
            maxLength={120}
            autoComplete="address-level1"
            value={formData.registeredRegion}
            onChange={handleChange}
            disabled={isPending}
            className="w-full h-10 px-3 bg-white border border-border-industrial rounded-industrial text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent disabled:opacity-50"
          />
        </div>
        <div>
          <label htmlFor="registeredCountryCode" className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {dictionary.registeredCountryCodeLabel}
          </label>
          <input
            id="registeredCountryCode"
            name="registeredCountryCode"
            type="text"
            maxLength={2}
            autoComplete="country"
            placeholder="e.g. PL"
            value={formData.registeredCountryCode}
            onChange={handleChange}
            disabled={isPending}
            className="w-full h-10 px-3 bg-white border border-border-industrial rounded-industrial text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent disabled:opacity-50"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center px-4 py-2 bg-brand-teal text-white text-sm font-medium rounded-industrial hover:bg-brand-teal-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-teal disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[120px]"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {dictionary.saveAction}
        </button>
      </div>
    </form>
  );
}
