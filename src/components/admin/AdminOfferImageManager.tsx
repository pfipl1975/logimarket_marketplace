"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  getAdminOfferMedia, prepareAdminOfferMediaUpload, finalizeAdminOfferMediaUpload,
  cancelAdminOfferMediaUpload, importAdminOfferMedia, setAdminOfferPrimaryMedia,
  moveAdminOfferMedia, deleteAdminOfferMedia,
} from "@/app/actions";
import type { Dictionary } from "@/lib/i18n/types";

type MediaResult = Awaited<ReturnType<typeof getAdminOfferMedia>>;
type Result = { ok: boolean; code?: string };
interface Props {
  offerId: number;
  title: string;
  initial: MediaResult;
  dict: Dictionary["adminOfferEdit"]["media"];
  onBusyChange(busy: boolean): void;
  saving: boolean;
}
const button = "min-h-11 rounded-md border border-border-industrial px-3 py-2 text-sm font-medium text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal disabled:cursor-not-allowed disabled:opacity-50";
const input = "min-h-11 w-full min-w-0 rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal";

export function AdminOfferImageManager({ offerId, title, initial, dict, onBusyChange, saving }: Props) {
  const [media, setMedia] = useState(initial.ok ? initial.media : []);
  const [available, setAvailable] = useState(initial.ok);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const urlInput = useRef<HTMLInputElement>(null);
  const errorCopy = (code?: string) => dict.errors[code as keyof typeof dict.errors] ?? dict.errors.GENERIC;

  async function run(work: () => Promise<Result>) {
    if (busy.current || saving) return;
    busy.current = true; setPending(true); onBusyChange(true); setMessage(null);
    try {
      const result = await work();
      setFailed(!result.ok); setMessage(result.ok ? dict.saved : errorCopy(result.code));
      // Refresh only this gallery: preserve unsaved offer fields and conflict token.
      const current = await getAdminOfferMedia(offerId);
      setAvailable(current.ok);
      if (current.ok) setMedia(current.media);
    } catch { setFailed(true); setMessage(dict.errors.GENERIC); }
    finally { busy.current = false; setPending(false); onBusyChange(false); setConfirmId(null); }
  }

  async function upload(): Promise<Result> {
    const file = fileInput.current?.files?.[0];
    if (!file) return { ok: false, code: "FILE_EMPTY" };
    if (file.size > 10 * 1024 * 1024) return { ok: false, code: "FILE_TOO_LARGE" };
    const prepared = await prepareAdminOfferMediaUpload(offerId, file.size, file.type);
    if (!prepared.ok) return prepared;
    let finalized = false;
    let result: Result;
    try {
      const response = await fetch(prepared.signedUrl, {
        method: "PUT", body: file, credentials: "omit", redirect: "error",
        headers: { "Content-Type": file.type }, signal: AbortSignal.timeout(120_000),
      });
      if (!response.ok) throw new Error();
      result = await finalizeAdminOfferMediaUpload(offerId, prepared.receipt);
      finalized = result.ok || result.code !== "STAGING_INVALID";
      if (result.ok && fileInput.current) fileInput.current.value = "";
    } catch { result = { ok: false, code: "STORAGE_ERROR" }; }
    if (!finalized) {
      const cleanup = await cancelAdminOfferMediaUpload(offerId, prepared.receipt);
      if (!cleanup.ok) return cleanup;
    }
    return result;
  }

  return (
    <section aria-labelledby="offer-media-heading" className="min-w-0 space-y-5 rounded-industrial border border-border-industrial bg-white p-5 shadow-soft sm:p-6">
      <div>
        <h2 id="offer-media-heading" className="text-lg font-semibold text-brand-navy">{dict.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{dict.help}</p>
      </div>
      <fieldset disabled={pending || saving} className="min-w-0 space-y-5" aria-busy={pending}>
        <legend className="sr-only">{dict.title}</legend>
        <div className="space-y-2">
          <label htmlFor="offer-media-file" className="block text-sm font-medium text-brand-navy">{dict.file}</label>
          <input ref={fileInput} id="offer-media-file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className={`${input} file:mr-3 file:rounded file:border-0 file:bg-brand-light-gray file:px-3 file:py-1`} />
          <button type="button" className={`${button} bg-brand-teal text-white`} onClick={() => void run(upload)}>{dict.upload}</button>
        </div>
        <div className="space-y-2">
          <label htmlFor="offer-media-remote" className="block text-sm font-medium text-brand-navy">{dict.remote}</label>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <input ref={urlInput} id="offer-media-remote" type="text" inputMode="url" maxLength={2048} placeholder="https://" className={input} aria-describedby="offer-media-remote-help" onKeyDown={(event) => {
              if (event.key === "Enter") { event.preventDefault(); void run(() => importAdminOfferMedia(offerId, urlInput.current?.value.trim() ?? "")); }
            }} />
            <button type="button" className={`${button} shrink-0`} onClick={() => void run(async () => {
              const result = await importAdminOfferMedia(offerId, urlInput.current?.value.trim() ?? "");
              if (result.ok && urlInput.current) urlInput.current.value = "";
              return result;
            })}>{dict.import}</button>
          </div>
          <p id="offer-media-remote-help" className="text-sm text-muted-foreground">{dict.remoteHelp}</p>
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
              <button type="button" className={button} disabled={item.isPrimary} aria-label={`${dict.setPrimary}: ${dict.image} ${index + 1}`} onClick={() => void run(() => setAdminOfferPrimaryMedia(offerId, item.id))}>{dict.setPrimary}</button>
              <button type="button" className={button} disabled={index === 0} aria-label={`${dict.previous}: ${dict.image} ${index + 1}`} onClick={() => void run(() => moveAdminOfferMedia(offerId, item.id, "previous"))}>{dict.previous}</button>
              <button type="button" className={button} disabled={index === media.length - 1} aria-label={`${dict.next}: ${dict.image} ${index + 1}`} onClick={() => void run(() => moveAdminOfferMedia(offerId, item.id, "next"))}>{dict.next}</button>
              <button type="button" className={`${button} text-red-700`} aria-label={`${dict.remove}: ${dict.image} ${index + 1}`} onClick={() => setConfirmId(item.id)}>{dict.remove}</button>
            </div>
            {confirmId === item.id && <div className="mt-3 space-y-2 rounded bg-red-50 p-3" role="group" aria-label={dict.confirm}>
              <p className="text-sm text-red-800">{dict.confirm}</p>
              <div className="flex flex-wrap gap-2"><button type="button" className={`${button} text-red-700`} onClick={() => void run(() => deleteAdminOfferMedia(offerId, item.id))}>{dict.remove}</button><button type="button" className={button} onClick={() => setConfirmId(null)}>{dict.cancel}</button></div>
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
