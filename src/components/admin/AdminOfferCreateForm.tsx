"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";
import type { AdminCreateOptionsResult } from "@/lib/admin/create-options-read-model";
import { createAdminOfferDraft } from "@/app/actions";
import { AlertTriangle } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/types";

interface AdminOfferCreateFormProps {
  options: AdminCreateOptionsResult;
  locale: Locale;
  dict: Dictionary["adminOffers"];
}

export function AdminOfferCreateForm({ options, locale, dict }: AdminOfferCreateFormProps) {
  const router = useRouter();

  const [isPending, setIsPending] = useState(false);
  const submitLockRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const backUrl = locale === "pl" ? `/admin/oferty` : `/${locale}/admin/offers`;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitLockRef.current) return;

    submitLockRef.current = true;
    setIsPending(true);
    setError(null);

    try {
      const fd = new FormData(e.currentTarget);
      
      const input = {
        partnerId: fd.get("partnerId")?.toString() || "",
        categoryId: fd.get("categoryId")?.toString() || "",
        title: fd.get("title")?.toString() || "",
        offerModel: fd.get("offerModel")?.toString() || "",
        conversionType: fd.get("conversionType")?.toString() || "",
      };

      const result = await createAdminOfferDraft(input);

      if (result.ok) {
        // Redirect to the existing edit page for this new ID
        const targetUrl = locale === "pl" 
          ? `/admin/oferty/${result.offerId}/edytuj`
          : `/${locale}/admin/offers/${result.offerId}/edit`;
        router.push(targetUrl);
        router.refresh();
      } else {
        const errorMsg = (result.code in dict.createErrors)
          ? dict.createErrors[result.code as keyof typeof dict.createErrors]
          : dict.createErrors.SYSTEM_ERROR;
        setError(errorMsg);
        setIsPending(false);
        submitLockRef.current = false;
      }
    } catch (err) {
      console.error(err);
      setError(dict.createErrors.SYSTEM_ERROR);
      setIsPending(false);
      submitLockRef.current = false;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl bg-white rounded-industrial border border-border-industrial shadow-soft p-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-industrial text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="partnerId" className="block text-sm font-medium text-brand-navy mb-1">{dict.createPartnerLabel}</label>
          <select
            id="partnerId"
            name="partnerId"
            required
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
          >
            <option value="">{dict.createSelectPartner}</option>
            {options.partners.map(p => (
              <option key={p.id} value={p.id}>{p.companyName}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="categoryId" className="block text-sm font-medium text-brand-navy mb-1">{dict.createCategoryLabel}</label>
          <select
            id="categoryId"
            name="categoryId"
            required
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
          >
            <option value="">{dict.createSelectCategory}</option>
            {options.categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-brand-navy mb-1">{dict.createTitleLabel}</label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={255}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="offerModel" className="block text-sm font-medium text-brand-navy mb-1">{dict.createModelLabel}</label>
            <select
              id="offerModel"
              name="offerModel"
              required
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
            >
              <option value="">{dict.createSelectModel}</option>
              <option value="rfq">{dict.createModelRfq}</option>
              <option value="marketplace">{dict.createModelMarketplace}</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="conversionType" className="block text-sm font-medium text-brand-navy mb-1">{dict.createConversionTypeLabel}</label>
            <select
              id="conversionType"
              name="conversionType"
              required
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
            >
              <option value="">{dict.createSelectConversion}</option>
              <option value="outbound">{dict.createConversionOutbound}</option>
              <option value="inbound">{dict.createConversionInbound}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-border-industrial flex flex-col sm:flex-row gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium rounded-industrial bg-brand-navy text-white hover:bg-brand-navy/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? dict.createSaving : dict.createSave}
        </button>
        
        <Link
          href={backUrl}
          className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium rounded-industrial bg-white border border-border-industrial text-brand-navy hover:bg-brand-light-gray transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
        >
          {dict.createCancel}
        </Link>
      </div>
    </form>
  );
}
