"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  getPartnerOfferMedia, preparePartnerOfferMediaUpload, finalizePartnerOfferMediaUpload,
  cancelPartnerOfferMediaUpload, setPartnerOfferPrimaryMedia,
  movePartnerOfferMedia, deletePartnerOfferMedia,
} from "@/app/actions";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { usePartnerOfferBusy } from "./PartnerOfferBusyContext";
import type { Dictionary } from "@/lib/i18n/types";

type MediaResult = Awaited<ReturnType<typeof getPartnerOfferMedia>>;
type Result = { ok: boolean; code?: string };
interface Props {
  partnerId: number;
  offerId: number;
  locale: string;
  title: string;
  initial: MediaResult;
  dict: Dictionary["PartnerWorkspaceMedia"];
  onBusyChange?: (busy: boolean) => void;
  saving?: boolean;
}
const button = "min-h-11 rounded-md border border-border-industrial px-3 py-2 text-sm font-medium text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal disabled:cursor-not-allowed disabled:opacity-50";
const input = "min-h-11 w-full min-w-0 rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal";

export function PartnerOfferImageManager({ partnerId, offerId, locale, title, initial, dict, onBusyChange, saving }: Props) {
  const [media, setMedia] = useState(initial.ok ? initial.media : []);
  const [available, setAvailable] = useState(initial.ok);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const errorCopy = (code?: string) => dict.errors[code as keyof typeof dict.errors] ?? dict.errors.GENERIC;
  const { busyDomain, setBusyDomain } = usePartnerOfferBusy();

  async function run(work: () => Promise<Result>) {
    if (busy.current || saving) return;
    busy.current = true; setPending(true); onBusyChange?.(true); setBusyDomain("media"); setMessage(null);
    try {
      const result = await work();
      setFailed(!result.ok); setMessage(result.ok ? dict.saved : errorCopy(result.code));
      const current = await getPartnerOfferMedia(partnerId, offerId);
      setAvailable(current.ok);
      if (current.ok) setMedia(current.media);
    } catch { setFailed(true); setMessage(dict.errors.GENERIC); }
    finally { busy.current = false; setPending(false); onBusyChange?.(false); setBusyDomain(null); setConfirmId(null); }
  }

  async function upload(): Promise<Result> {
    const file = fileInput.current?.files?.[0];
    if (!file) return { ok: false, code: "FILE_EMPTY" };
    if (file.size > 10 * 1024 * 1024) return { ok: false, code: "FILE_TOO_LARGE" };
    const prepared = await preparePartnerOfferMediaUpload(partnerId, offerId, file.size, file.type);
    if (!prepared.ok) return prepared;
    let finalized = false;
    let result: Result;
    try {
      const config = getSupabasePublicConfig();
      if (!config || !prepared.path || !prepared.token) throw new Error();
      const client = createClient(config.url, config.publishableKey);
      const { error } = await client.storage.from("offer-media-staging").uploadToSignedUrl(
        prepared.path,
        prepared.token,
        file,
        { contentType: file.type }
      );
      if (error) throw new Error();
      result = await finalizePartnerOfferMediaUpload(partnerId, offerId, prepared.receipt, locale);
      finalized = result.ok || result.code !== "STAGING_INVALID";
      if (result.ok && fileInput.current) fileInput.current.value = "";
    } catch { result = { ok: false, code: "STORAGE_ERROR" }; }
    if (!finalized) {
      const cleanup = await cancelPartnerOfferMediaUpload(partnerId, offerId, prepared.receipt);
      if (!cleanup.ok) return cleanup;
    }
    return result;
  }

  return (
    <section aria-labelledby="partner-offer-media-heading" className="min-w-0 space-y-5 rounded-industrial border border-border-industrial bg-white p-5 shadow-soft sm:p-6">
      <div>
        <h2 id="partner-offer-media-heading" className="text-lg font-semibold text-brand-navy">{dict.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{dict.help}</p>
      </div>
      <fieldset disabled={pending || saving || (busyDomain !== null && busyDomain !== "media")} className="min-w-0 space-y-5" aria-busy={pending}>
        <legend className="sr-only">{dict.title}</legend>
        <div className="space-y-2">
          <label htmlFor="partner-offer-media-file" className="block text-sm font-medium text-brand-navy">{dict.file}</label>
          <input ref={fileInput} id="partner-offer-media-file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className={`${input} file:mr-3 file:rounded file:border-0 file:bg-brand-light-gray file:px-3 file:py-1`} />
          <button type="button" className={`${button} bg-brand-teal text-white`} onClick={() => void run(upload)}>{dict.upload}</button>
        </div>
        {!available ? <div role="alert" className="space-y-2 text-sm text-red-700"><p>{dict.errors.DB_ERROR}</p><button type="button" className={button} onClick={() => void run(async () => ({ ok: true }))}>{dict.refresh}</button></div> : media.length === 0 ? (
          <p className="rounded-md border border-dashed border-border-industrial bg-brand-light-gray/40 p-6 text-sm text-muted-foreground">{dict.empty}</p>
        ) : <ol className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {media.map((item, index) => <li key={item.id} className="min-w-0 rounded-md border border-border-industrial p-3">
            <Image src={item.url} alt={item.altText || `${title} — ${dict.image} ${index + 1}`} width={320} height={240} className="aspect-4/3 w-full rounded bg-brand-light-gray object-contain" unoptimized />
            <div className="my-3 flex min-h-6 flex-wrap items-center gap-2 text-sm">
              <span>{dict.image} {index + 1}</span>
              {item.isPrimary && <span className="rounded bg-brand-teal/10 px-2 py-1 font-medium text-brand-teal">{dict.primary}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={button} disabled={item.isPrimary} aria-label={`${dict.setPrimary}: ${dict.image} ${index + 1}`} onClick={() => void run(() => setPartnerOfferPrimaryMedia(partnerId, offerId, item.id, locale))}>{dict.setPrimary}</button>
              <button type="button" className={button} disabled={index === 0} aria-label={`${dict.previous}: ${dict.image} ${index + 1}`} onClick={() => void run(() => movePartnerOfferMedia(partnerId, offerId, item.id, "previous", locale))}>{dict.previous}</button>
              <button type="button" className={button} disabled={index === media.length - 1} aria-label={`${dict.next}: ${dict.image} ${index + 1}`} onClick={() => void run(() => movePartnerOfferMedia(partnerId, offerId, item.id, "next", locale))}>{dict.next}</button>
              <button type="button" className={`${button} text-red-700`} aria-label={`${dict.remove}: ${dict.image} ${index + 1}`} onClick={() => setConfirmId(item.id)}>{dict.remove}</button>
            </div>
            {confirmId === item.id && <div className="mt-3 space-y-2 rounded bg-red-50 p-3" role="group" aria-label={dict.confirm}>
              <p className="text-sm text-red-800">{dict.confirm}</p>
              <div className="flex flex-wrap gap-2"><button type="button" className={`${button} text-red-700`} onClick={() => void run(() => deletePartnerOfferMedia(partnerId, offerId, item.id, locale))}>{dict.remove}</button><button type="button" className={button} onClick={() => setConfirmId(null)}>{dict.cancel}</button></div>
            </div>}
          </li>)}
        </ol>}
      </fieldset>
      <div aria-live="polite" aria-atomic="true" className={`text-sm ${failed ? "text-red-700" : "text-brand-teal"}`}>
        {pending ? dict.pending : message}
      </div>
    </section>
  );
}
