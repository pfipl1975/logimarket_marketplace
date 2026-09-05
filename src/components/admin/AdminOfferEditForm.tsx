"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";
import type { AdminOfferDetailResult } from "@/lib/admin/offer-detail-read-model-core";
import { updateAdminOffer } from "@/app/actions";
import { Check, AlertTriangle, Info } from "lucide-react";

import type { Dictionary } from "@/lib/i18n/types";
import type { AdminOfferType } from "@/lib/admin/offer-type";
import { AdminOfferTypeSelector } from "./AdminOfferTypeSelector";

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
  const [adminOfferType, setAdminOfferType] = useState<AdminOfferType | "">(
    offer.adminOfferType ?? "",
  );

  const backUrl = locale === "pl" ? `/admin/oferty/${offer.id}` : `/${locale}/admin/offers/${offer.id}`;

  const offerTypeLabel = adminOfferType
    ? {
        rfq: dict.offerTypeRfq,
        marketplace: dict.offerTypeMarketplace,
        external_partner: dict.offerTypeExternal,
      }[adminOfferType]
    : dict.createSelectOfferType;

  const publicationStatusLabel =
    {
      draft: dict.statusDraft,
      published: dict.statusPublished,
      archived: dict.statusArchived,
    }[offer.publicationStatus] ?? offer.publicationStatus;

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
      adminOfferType: fd.get("adminOfferType")?.toString() as import("@/lib/admin/offer-type").AdminOfferType,
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
        setError(dict.errors[result.reason as keyof typeof dict.errors]);
      } else {
        setError(dict.errors[result.code as keyof typeof dict.errors]);
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <div className="space-y-6">
          <section className="space-y-5 rounded-industrial border border-border-industrial bg-white p-5 shadow-soft sm:p-6">
            <div className="border-b border-border-industrial pb-3">
              <h2 className="text-lg font-semibold text-brand-navy">
                {dict.sectionBasic}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {dict.sectionBasicHelp}
              </p>
            </div>

            <div>
              <label htmlFor="title" className="mb-1 block text-sm font-medium text-brand-navy">
                {dict.fieldTitle}
              </label>
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
              <label htmlFor="description" className="mb-1 block text-sm font-medium text-brand-navy">
                {dict.fieldDescription}
              </label>
              <textarea
                id="description"
                name="description"
                defaultValue={offer.description || ""}
                rows={7}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
              />
            </div>
          </section>

          <section className="space-y-5 rounded-industrial border border-border-industrial bg-white p-5 shadow-soft sm:p-6">
            <div className="border-b border-border-industrial pb-3">
              <h2 className="text-lg font-semibold text-brand-navy">
                {dict.sectionBusiness}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {dict.sectionBusinessHelp}
              </p>
            </div>

            {!offer.adminOfferType && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {dict.errorInvalidCurrentOfferType}
              </div>
            )}

            <AdminOfferTypeSelector
              value={adminOfferType}
              onChange={setAdminOfferType}
              dict={dict}
            />

            <div
              className={`rounded-industrial border p-4 transition-colors ${
                adminOfferType === "marketplace"
                  ? "border-brand-teal/50 bg-teal-50/50"
                  : "border-border-industrial bg-brand-light-gray/20"
              }`}
            >
              <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="priceBrutto" className="mb-1 block text-sm font-medium text-brand-navy">
                    {dict.fieldPrice}
                  </label>
                  <input
                    id="priceBrutto"
                    name="priceBrutto"
                    type="text"
                    inputMode="decimal"
                    placeholder="149.99"
                    defaultValue={offer.priceBrutto || ""}
                    aria-describedby="priceBruttoHelp"
                    className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
                  />
                </div>

                <div className="md:pt-7">
                  <label htmlFor="priceOnRequest" className="flex cursor-pointer items-center gap-2 text-sm font-medium text-brand-navy">
                    <input
                      id="priceOnRequest"
                      type="checkbox"
                      name="priceOnRequest"
                      defaultChecked={offer.priceOnRequest}
                      className="rounded border-input text-brand-teal focus:ring-brand-teal"
                    />
                    {dict.fieldPriceOnRequest}
                  </label>
                </div>
              </div>
              <p id="priceBruttoHelp" className="mt-3 text-xs leading-5 text-muted-foreground">
                {adminOfferType === "marketplace"
                  ? dict.marketplacePriceHelp
                  : dict.optionalPriceHelp}
              </p>
            </div>

            <div
              className={`rounded-industrial border p-4 transition-colors ${
                adminOfferType === "external_partner"
                  ? "border-brand-teal/50 bg-teal-50/50"
                  : "border-border-industrial bg-brand-light-gray/20"
              }`}
            >
              <label htmlFor="outboundUrl" className="mb-1 block text-sm font-medium text-brand-navy">
                {dict.fieldOutboundUrl}
              </label>
              <input
                id="outboundUrl"
                name="outboundUrl"
                type="text"
                defaultValue={offer.outboundUrl || ""}
                placeholder="https://"
                aria-describedby="outboundUrlHelp"
                className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-teal"
              />
              <p id="outboundUrlHelp" className="mt-3 text-xs leading-5 text-muted-foreground">
                {adminOfferType === "external_partner"
                  ? dict.externalUrlHelp
                  : adminOfferType === "rfq"
                    ? dict.rfqOutboundHelp
                    : dict.optionalOutboundHelp}
              </p>
            </div>

            <label htmlFor="isFeatured" className="flex cursor-pointer items-center gap-2 text-sm font-medium text-brand-navy">
              <input
                id="isFeatured"
                type="checkbox"
                name="isFeatured"
                defaultChecked={offer.isFeatured}
                className="rounded border-input text-brand-teal focus:ring-brand-teal"
              />
              {dict.fieldIsFeatured}
            </label>
          </section>

          <section className="space-y-5 rounded-industrial border border-border-industrial bg-white p-5 shadow-soft sm:p-6">
            <div className="border-b border-border-industrial pb-3">
              <h2 className="text-lg font-semibold text-brand-navy">
                {dict.sectionImage}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {dict.sectionImageHelp}
              </p>
            </div>
            <div>
              <label htmlFor="imageUrl" className="mb-1 block text-sm font-medium text-brand-navy">
                {dict.fieldImageUrl}
              </label>
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
        </div>

        <aside>
          <div className="sticky top-6 rounded-industrial border border-border-industrial bg-brand-light-gray/50 p-5 sm:p-6">
            <h3 className="mb-5 flex items-center gap-2 font-semibold text-brand-navy">
              <Info className="h-4 w-4 text-brand-teal" />
              {dict.contextTitle}
            </h3>

            <dl className="space-y-4 text-sm">
              <div>
                <dt className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {dict.contextStatus}
                </dt>
                <dd className="font-medium text-brand-navy">{publicationStatusLabel}</dd>
              </div>
              <div>
                <dt className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {dict.contextPartner}
                </dt>
                <dd className="font-medium text-brand-navy">{offer.partnerName}</dd>
              </div>
              <div>
                <dt className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {dict.contextCategory}
                </dt>
                <dd className="font-medium text-brand-navy">{offer.categoryName}</dd>
              </div>
              <div>
                <dt className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {dict.contextOfferType}
                </dt>
                <dd className="font-medium text-brand-navy">{offerTypeLabel}</dd>
              </div>
              <div>
                <dt className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {dict.contextIsActive}
                </dt>
                <dd className="font-medium text-brand-navy">
                  {offer.isActive ? dict.booleanYes : dict.booleanNo}
                </dd>
              </div>
            </dl>

            <details className="mt-5 border-t border-border-industrial pt-4 text-xs text-muted-foreground">
              <summary className="cursor-pointer font-medium text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal">
                {dict.contextTechnicalDetails}
              </summary>
              <div className="mt-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider">
                  {dict.contextContract}
                </p>
                <p className="inline-block rounded border border-border-industrial bg-white px-1.5 py-0.5 font-mono text-brand-navy">
                  {offer.contractModel || "-"}
                </p>
              </div>
            </details>

            <div className="mt-8 flex flex-col gap-3 border-t border-border-industrial pt-6">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex w-full items-center justify-center rounded-industrial bg-brand-navy px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-navy/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? dict.actionSaving : dict.actionSave}
              </button>

              <Link
                href={backUrl}
                className="inline-flex w-full items-center justify-center rounded-industrial border border-border-industrial bg-white px-4 py-2.5 text-sm font-medium text-brand-navy transition-colors hover:bg-brand-light-gray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
              >
                {dict.actionCancel}
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}
