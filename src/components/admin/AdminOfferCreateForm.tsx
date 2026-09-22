"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";
import type { AdminCreateOptionsResult } from "@/lib/admin/create-options-read-model";
import { createAdminOfferDraft } from "@/app/actions";
import { AlertTriangle } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/types";
import { AdminCategoryPicker } from "./AdminCategoryPicker";
import { AdminOfferTypeSelector } from "./AdminOfferTypeSelector";
import type { AdminOfferType } from "@/lib/admin/offer-type";

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
  const [adminOfferType, setAdminOfferType] = useState<AdminOfferType | "">("");

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
        adminOfferType: fd.get("adminOfferType")?.toString() || "",
      };

      if (!input.categoryId) {
        setError(dict.createErrors.CATEGORY_NOT_LEAF || dict.createErrors.OFFER_INVALID_INPUT);
        setIsPending(false);
        submitLockRef.current = false;
        return;
      }

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
    <form
      onSubmit={handleSubmit}
      className="w-full space-y-8 rounded-industrial border border-border-industrial bg-white p-5 shadow-soft sm:p-8"
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-industrial text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="space-y-7">
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

        <AdminOfferTypeSelector
          value={adminOfferType}
          onChange={setAdminOfferType}
          dict={dict}
        />

        <AdminCategoryPicker categories={options.categories} dict={dict} />

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

      </div>

      <div className="flex flex-col gap-3 border-t border-border-industrial pt-6 sm:flex-row">
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
