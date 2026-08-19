"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";
import type { AdminOfferDetailResult } from "@/lib/admin/offer-detail-read-model-core";
import { updateAdminOffer } from "@/app/actions";
import { Check, AlertTriangle, Info } from "lucide-react";

import type { Dictionary } from "@/lib/i18n/types";

interface AdminOfferEditFormProps {
  offer: Extract<AdminOfferDetailResult, { ok: true }>["data"];
  locale: Locale;
  dict: Dictionary["adminOfferEdit"];
}

export function AdminOfferEditForm({ offer, locale, dict }: AdminOfferEditFormProps) {
  const router = useRouter();

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [success, setSuccess] = useState<"updated" | "unchanged" | null>(null);

  const backUrl = locale === "pl" ? `/admin/oferty/${offer.id}` : `/${locale}/admin/offers/${offer.id}`;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPending) return;

    setIsPending(true);
    setError(null);
    setConflict(false);
    setSuccess(null);

    const fd = new FormData(e.currentTarget);
    
    const input = {
      offerId: offer.id.toString(),
      expectedUpdatedAt: offer.updatedAt,
      title: fd.get("title")?.toString() || "",
      description: fd.get("description")?.toString() || null,
      imageUrl: fd.get("imageUrl")?.toString() || null,
      priceBrutto: fd.get("priceBrutto")?.toString() || null,
      priceOnRequest: fd.get("priceOnRequest") === "on",
      offerModel: fd.get("offerModel")?.toString() as "rfq" | "marketplace",
      conversionType: fd.get("conversionType")?.toString() as "inbound" | "outbound",
      outboundUrl: fd.get("outboundUrl")?.toString() || null,
      isFeatured: fd.get("isFeatured") === "on",
    };

    const result = await updateAdminOffer(input);

    if (result.ok) {
      setSuccess(result.changed ? "updated" : "unchanged");
    } else {
      if (result.code === "OFFER_CONFLICT") {
        setConflict(true);
      } else if (result.code === "OFFER_TARGET_INVALID") {
        setError(dict.errors[result.reason as keyof typeof dict.errors] || `Invalid target: ${result.reason}`);
      } else {
        setError(dict.errors[result.code as keyof typeof dict.errors] || `Error: ${result.code}`);
      }
    }
    setIsPending(false);
  };

  if (success) {
    return (
      <div className="bg-white rounded-industrial border border-border-industrial shadow-soft p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
          <Check className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-semibold text-brand-navy mb-2">
          {success === "updated" ? dict.successUpdated : dict.successUnchanged}
        </h2>
        <div className="mt-8">
          <Link
            href={backUrl}
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium rounded-industrial bg-brand-navy text-white hover:bg-brand-navy/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
          >
            {dict.backToOffer}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {conflict && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-industrial flex gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-red-800">{dict.conflictTitle}</h3>
            <p className="text-sm text-red-700 mt-1">{dict.conflictDescription}</p>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => router.refresh()}
                className="text-sm font-medium text-red-800 hover:text-red-900 underline"
              >
                {dict.conflictReload}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-industrial text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-industrial border border-border-industrial shadow-soft p-6 space-y-4">
            <h2 className="text-lg font-medium text-brand-navy border-b border-border-industrial pb-2">{dict.sectionBasic}</h2>
            
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-brand-navy mb-1">{dict.fieldTitle}</label>
              <input
                id="title"
                name="title"
                type="text"
                defaultValue={offer.title}
                required
                maxLength={255}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-brand-navy mb-1">{dict.fieldDescription}</label>
              <textarea
                id="description"
                name="description"
                defaultValue={offer.description || ""}
                rows={5}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
              />
            </div>

            <div>
              <label htmlFor="imageUrl" className="block text-sm font-medium text-brand-navy mb-1">{dict.fieldImageUrl}</label>
              <input
                id="imageUrl"
                name="imageUrl"
                type="text"
                defaultValue={offer.imageUrl || ""}
                maxLength={512}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
              />
            </div>
          </section>

          <section className="bg-white rounded-industrial border border-border-industrial shadow-soft p-6 space-y-4">
            <h2 className="text-lg font-medium text-brand-navy border-b border-border-industrial pb-2">{dict.sectionBusiness}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="offerModel" className="block text-sm font-medium text-brand-navy mb-1">{dict.fieldOfferModel}</label>
                <select
                  id="offerModel"
                  name="offerModel"
                  defaultValue={offer.rawOfferModel}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
                >
                  <option value="rfq">rfq</option>
                  <option value="marketplace">marketplace</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="conversionType" className="block text-sm font-medium text-brand-navy mb-1">{dict.fieldConversionType}</label>
                <select
                  id="conversionType"
                  name="conversionType"
                  defaultValue={offer.rawConversionType}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
                >
                  <option value="outbound">outbound</option>
                  <option value="inbound">inbound</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div>
                <label htmlFor="priceBrutto" className="block text-sm font-medium text-brand-navy mb-1">{dict.fieldPrice}</label>
                <input
                  id="priceBrutto"
                  name="priceBrutto"
                  type="text"
                  placeholder="np. 149.99"
                  defaultValue={offer.priceBrutto || ""}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
                />
              </div>

              <div className="pt-7">
                <label className="flex items-center gap-2 text-sm font-medium text-brand-navy cursor-pointer">
                  <input
                    type="checkbox"
                    name="priceOnRequest"
                    defaultChecked={offer.priceOnRequest}
                    className="rounded border-input text-brand-teal focus:ring-brand-teal"
                  />
                  {dict.fieldPriceOnRequest}
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="outboundUrl" className="block text-sm font-medium text-brand-navy mb-1">{dict.fieldOutboundUrl}</label>
              <input
                id="outboundUrl"
                name="outboundUrl"
                type="text"
                defaultValue={offer.outboundUrl || ""}
                placeholder="https://"
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
              />
            </div>
            
            <div className="pt-2">
              <label className="flex items-center gap-2 text-sm font-medium text-brand-navy cursor-pointer">
                <input
                  type="checkbox"
                  name="isFeatured"
                  defaultChecked={offer.isFeatured}
                  className="rounded border-input text-brand-teal focus:ring-brand-teal"
                />
                {dict.fieldIsFeatured}
              </label>
            </div>
          </section>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-brand-light-gray/50 rounded-industrial border border-border-industrial p-6 sticky top-6">
            <h3 className="font-medium text-brand-navy flex items-center gap-2 mb-4">
              <Info className="h-4 w-4 text-brand-teal" />
              {dict.contextTitle}
            </h3>
            
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider mb-1">{dict.contextStatus}</p>
                <p className="font-medium text-brand-navy">{offer.publicationStatus}</p>
              </div>
              
              <div>
                <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider mb-1">{dict.contextIsActive}</p>
                <p className="font-medium text-brand-navy">{offer.isActive ? dict.booleanYes : dict.booleanNo}</p>
              </div>

              <div>
                <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider mb-1">{dict.contextPartner}</p>
                <p className="font-medium text-brand-navy">{offer.partnerName}</p>
              </div>

              <div>
                <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider mb-1">{dict.contextCategory}</p>
                <p className="font-medium text-brand-navy">{offer.categoryName}</p>
              </div>
              
              <div>
                <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider mb-1">{dict.contextContract}</p>
                <p className="font-mono bg-white px-1.5 py-0.5 rounded text-xs text-brand-navy border border-border-industrial inline-block">
                  {offer.contractModel || "-"}
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border-industrial flex flex-col gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-industrial bg-brand-navy text-white hover:bg-brand-navy/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? dict.actionSaving : dict.actionSave}
              </button>
              
              <Link
                href={backUrl}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-industrial bg-white border border-border-industrial text-brand-navy hover:bg-brand-light-gray transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
              >
                {dict.actionCancel}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
