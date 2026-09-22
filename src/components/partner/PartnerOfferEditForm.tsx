"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { updatePartnerOfferDraft } from "@/app/actions";
import { usePartnerOfferBusy } from "./PartnerOfferBusyContext";
import type { PartnerOfferEditDto } from "@/lib/partner-offers/edit-read-model";
import { PARTNER_FACING_OFFER_TYPES } from "@/lib/offers/offer-type-mapping";
import {
  getInitialPriceMode,
  buildPricePayload,
  type PriceMode,
  PRICE_INPUT_PATTERN,
} from "@/lib/partner-offers/price-mode";

export function PartnerOfferEditForm({
  offer,
  partnerId,
  dict,
  basePath,
  locale,
}: {
  offer: PartnerOfferEditDto;
  partnerId: number;
  dict: Record<string, string>;
  basePath: string;
  locale: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { busyDomain, setBusyDomain } = usePartnerOfferBusy();
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [priceMode, setPriceMode] = useState<PriceMode>(() => getInitialPriceMode(offer.priceOnRequest));
  const [priceValue, setPriceValue] = useState<string>(() => offer.priceBrutto ?? "");

  const backHref = `${basePath}/${offer.offerId}`;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorCode(null);
    const formData = new FormData(e.currentTarget);

    const { priceBrutto, priceOnRequest } = buildPricePayload(priceMode, priceValue);

    const payload = {
      partnerId,
      offerId: offer.offerId,
      expectedUpdatedAt: offer.expectedUpdatedAt,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      partnerOfferType: formData.get("partnerOfferType") as string,
      priceBrutto,
      priceOnRequest,
      outboundUrl: formData.get("outboundUrl") as string,
      locale,
    };

    setBusyDomain("core");
    startTransition(async () => {
      try {
      const result = await updatePartnerOfferDraft(payload);
      if (result.ok) {
        router.push(backHref);
      } else {
        setErrorCode(result.code);
        }
      } finally {
        setBusyDomain(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-brand-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {dict.offerEditBackToOffer || "Wróć do oferty"}
        </Link>
      </div>

      <header className="border border-border-industrial bg-white p-5 shadow-soft sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-xl font-bold text-brand-navy sm:text-2xl">
              {dict.offerEditDraftTitle || "Edytuj szkic oferty"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {dict.offerEditDraftSubtitle || "Zapisanie zmian nie publikuje oferty. Publikacją zarządza LogiMarket."}
            </p>
          </div>
          <div className="shrink-0">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-800">
              {dict.offersStatusDraft || "Szkic"}
            </span>
          </div>
        </div>
      </header>

      {errorCode && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="shrink-0">
              <AlertCircle className="size-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                {errorCode === "OFFER_CONFLICT" && (dict.offerEditErrorConflict || "Oferta została zmieniona w międzyczasie. Odśwież stronę, aby zobaczyć aktualne dane.")}
                {errorCode === "OFFER_NOT_EDITABLE_STATUS" && (dict.offerEditErrorNotEditable || "Oferta nie jest już edytowalnym szkicem.")}
                {errorCode === "OFFER_TARGET_INVALID" && (dict.offerEditErrorInvalid || "Nieprawidłowe dane (np. niepoprawna cena lub link).")}
                {errorCode !== "OFFER_CONFLICT" && errorCode !== "OFFER_NOT_EDITABLE_STATUS" && errorCode !== "OFFER_TARGET_INVALID" && (dict.offerEditErrorSystem || "Wystąpił błąd podczas zapisywania. Spróbuj ponownie.")}
              </h3>
              {errorCode === "OFFER_CONFLICT" && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center justify-center bg-white px-3 py-1.5 text-sm font-semibold text-red-800 border border-red-300 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                  >
                    {dict.offerEditRefresh || "Odśwież dane"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="bg-white border border-border-industrial shadow-soft p-5 sm:p-8 space-y-6">
          <h2 className="text-lg font-bold text-brand-navy border-b border-border-industrial pb-2">
            {dict.offerEditSectionBasic || "Podstawowe informacje"}
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-brand-navy">
                {dict.offerEditTitleLabel || "Tytuł oferty"} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                maxLength={255}
                defaultValue={offer.title}
                className="mt-1 block w-full border-border-industrial focus:border-brand-teal focus:ring-brand-teal sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-brand-navy">
                {dict.offerEditDescriptionLabel || "Opis"}
              </label>
              <textarea
                id="description"
                name="description"
                rows={6}
                defaultValue={offer.description || ""}
                className="mt-1 block w-full border-border-industrial focus:border-brand-teal focus:ring-brand-teal sm:text-sm"
              />
            </div>
          </div>
        </section>

        <section className="bg-white border border-border-industrial shadow-soft p-5 sm:p-8 space-y-6">
          <h2 className="text-lg font-bold text-brand-navy border-b border-border-industrial pb-2">
            {dict.offerEditSectionModel || "Model oferty"} <span className="text-red-500">*</span>
          </h2>
          <div className="space-y-4">
            {PARTNER_FACING_OFFER_TYPES.map((type) => (
              <div key={type} className="flex items-center">
                <input
                  id={`type-${type}`}
                  name="partnerOfferType"
                  type="radio"
                  value={type}
                  defaultChecked={offer.partnerOfferType === type}
                  className="size-4 border-border-industrial text-brand-teal focus:ring-brand-teal"
                />
                <label htmlFor={`type-${type}`} className="ml-3 block text-sm font-medium text-brand-navy">
                  {type === "rfq" && (dict.offersModelRfq || "Zapytanie ofertowe (RFQ)")}
                  {type === "marketplace" && (dict.offersModelEcommerce || "Marketplace")}
                  {type === "external_partner" && (dict.offersModelOutbound || "Oferta zewnętrzna Partnera")}
                </label>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-border-industrial shadow-soft p-5 sm:p-8 space-y-6">
          <h2 className="text-lg font-bold text-brand-navy border-b border-border-industrial pb-2">
            {dict.offerEditSectionPrice || "Cena"}
          </h2>
          <fieldset className="space-y-4" disabled={isPending || (busyDomain !== null && busyDomain !== "core")}>
            <legend className="block text-sm font-semibold text-brand-navy mb-3">
              {dict.offerEditPriceModeLabel || "Sposób prezentacji ceny"}
            </legend>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  id="priceMode-fixed"
                  name="priceMode"
                  type="radio"
                  value="fixed"
                  checked={priceMode === "fixed"}
                  onChange={() => setPriceMode("fixed")}
                  className="size-4 border-border-industrial text-brand-teal focus:ring-brand-teal"
                />
                <label htmlFor="priceMode-fixed" className="ml-3 block text-sm font-medium text-brand-navy">
                  {dict.offerEditPriceModeFixed || "Cena konkretna"}
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="priceMode-request"
                  name="priceMode"
                  type="radio"
                  value="request"
                  checked={priceMode === "request"}
                  onChange={() => setPriceMode("request")}
                  className="size-4 border-border-industrial text-brand-teal focus:ring-brand-teal"
                />
                <label htmlFor="priceMode-request" className="ml-3 block text-sm font-medium text-brand-navy">
                  {dict.offerEditPriceModeRequest || "Cena na zapytanie"}
                </label>
              </div>
            </div>
          </fieldset>

          {priceMode === "fixed" ? (
            <div className="space-y-2 pt-2 border-t border-border-industrial">
              <label htmlFor="priceBrutto" className="block text-sm font-semibold text-brand-navy">
                {dict.offerEditPriceLabel || "Cena brutto"}
              </label>
              <input
                type="text"
                id="priceBrutto"
                name="priceBrutto"
                pattern={PRICE_INPUT_PATTERN}
                placeholder="np. 1250.00"
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
                className="mt-1 block w-full sm:max-w-xs border-border-industrial focus:border-brand-teal focus:ring-brand-teal sm:text-sm"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {dict.offerEditPriceFixedHelp || "Ta kwota będzie wyświetlana w ofercie zamiast „Cena na zapytanie”."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {dict.offerEditPriceHint || "Wpisz kropkę jako separator dziesiętny."}
              </p>
            </div>
          ) : (
            <div className="pt-2 border-t border-border-industrial">
              <p className="text-sm text-muted-foreground">
                {dict.offerEditPriceRequestHelp || "Kwota nie będzie wyświetlana. Oferta będzie prezentowana jako „Cena na zapytanie”."}
              </p>
            </div>
          )}
        </section>

        <section className="bg-white border border-border-industrial shadow-soft p-5 sm:p-8 space-y-6">
          <h2 className="text-lg font-bold text-brand-navy border-b border-border-industrial pb-2">
            {dict.offerEditSectionOutbound || "Link zewnętrzny (dla ofert zewnętrznych)"}
          </h2>
          <div>
            <label htmlFor="outboundUrl" className="block text-sm font-semibold text-brand-navy">
              {dict.offerEditOutboundLabel || "Adres URL docelowy"}
            </label>
            <input
              type="url"
              id="outboundUrl"
              name="outboundUrl"
              defaultValue={offer.outboundUrl || ""}
              className="mt-1 block w-full border-border-industrial focus:border-brand-teal focus:ring-brand-teal sm:text-sm"
            />
          </div>
        </section>

        <section className="bg-slate-50 border border-border-industrial p-5 sm:p-8">
          <h3 className="text-sm font-semibold text-brand-navy mb-4">
            {dict.offerEditSectionContext || "Parametry tylko do odczytu"}
          </h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">{dict.offersColumnCategory || "Kategoria"}</dt>
              <dd className="font-medium text-brand-navy">{offer.categoryName}</dd>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground mt-4">
                {dict.offerEditContextHint || "Kategoria, atrybuty techniczne oraz zdjęcia oferty nie są edytowane w tym widoku."}
              </p>
            </div>
          </dl>
        </section>

        <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-end pt-4 border-t border-border-industrial">
          <Link
            href={backHref}
            className="inline-flex w-full sm:w-auto items-center justify-center bg-white px-6 py-3 text-sm font-semibold text-brand-navy border border-border-industrial hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
          >
            {dict.offerEditCancel || "Anuluj / Wróć do oferty"}
          </Link>
          <button
            type="submit"
            disabled={isPending || (busyDomain !== null && busyDomain !== "core") || errorCode === "OFFER_NOT_EDITABLE_STATUS"}
            className="inline-flex w-full sm:w-auto items-center justify-center bg-brand-teal px-6 py-3 text-sm font-semibold text-white hover:bg-brand-navy disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
          >
            <Save className="mr-2 size-4" aria-hidden="true" />
            {dict.offerEditSubmit || "Zapisz zmiany"}
          </button>
        </div>
      </form>
    </div>
  );
}
