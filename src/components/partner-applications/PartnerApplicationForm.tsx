"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { submitPartnerApplication } from "@/app/actions";
import { BUSINESS_TYPES, type ApplicationResult } from "@/lib/partner-applications/contract";
import type { Dictionary, Locale } from "@/lib/i18n/types";

type Labels = Dictionary["partnerApplications"];
const inputClass = "min-h-11 w-full rounded-industrial border border-border-industrial bg-white px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal";
export function PartnerApplicationForm({locale,labels,privacyHref}:{locale:Locale;labels:Labels;privacyHref:string}) {
  const [state,action,pending] = useActionState(submitPartnerApplication,{code:"idle"} as ApplicationResult | {code:"idle"});
  const [key,setKey] = useState("");
  const [values,setValues] = useState({companyName:"",countryCode:"",contactEmail:"",businessType:"manufacturer",taxIdentifier:""});
  const feedback = useRef<HTMLParagraphElement>(null);

  useEffect(()=>{if(state.code !== "idle") feedback.current?.focus();},[state]);
  if (state.code === "received") return <p ref={feedback} role="status" tabIndex={-1} className="border-l-4 border-brand-teal bg-white p-6">{labels.received}</p>;
  return <form action={action} onFocusCapture={()=>{if(!key) setKey(crypto.randomUUID());}} className="mt-6 grid gap-5" aria-busy={pending}>
    <p id="application-process" className="text-muted-foreground">{labels.description}</p>
    <p id="application-privacy" className="border-l-4 border-brand-teal bg-brand-light-gray p-4 text-sm">{labels.notice} <a href={privacyHref} className="underline focus-visible:ring-2 focus-visible:ring-brand-teal">{labels.privacy}</a><br/>{labels.version}: LOCAL_FIXTURE_ONLY</p>
    <input type="hidden" name="submissionKey" value={key}/><input type="hidden" name="locale" value={locale}/><input type="hidden" name="privacyNoticeVersion" value="LOCAL_FIXTURE_ONLY"/>
    <div className="hidden" aria-hidden="true"><label htmlFor="application-website">Website</label><input id="application-website" name="website" tabIndex={-1} autoComplete="off" defaultValue=""/></div>
    {(["companyName","countryCode","contactEmail","taxIdentifier"] as const).map(name=><div key={name} className="min-w-0">
      <label htmlFor={`application-${name}`} className="mb-2 block font-medium text-brand-navy">{labels[name]}</label>
      <input id={`application-${name}`} name={name} className={inputClass} type={name === "contactEmail" ? "email" : "text"}
        value={values[name]} onChange={e=>setValues({...values,[name]:name === "countryCode" ? e.target.value.toUpperCase() : e.target.value})}
        required={name !== "taxIdentifier"} maxLength={name === "companyName" ? 255 : name === "countryCode" ? 2 : 100}
        autoComplete={name === "companyName" ? "organization" : name === "contactEmail" ? "email" : name === "countryCode" ? "country" : "off"}
        pattern={name === "countryCode" ? "[A-Z]{2}" : undefined} aria-invalid={state.code === "invalid" && state.fields?.includes(name) ? true : undefined}
        aria-describedby={state.code === "invalid" ? "application-feedback" : undefined}/>
    </div>)}
    <div><label htmlFor="application-businessType" className="mb-2 block font-medium text-brand-navy">{labels.businessType}</label>
      <select id="application-businessType" name="businessType" className={inputClass} value={values.businessType} onChange={e=>setValues({...values,businessType:e.target.value})}>{BUSINESS_TYPES.map(type=><option key={type} value={type}>{labels[type]}</option>)}</select></div>
    <p id="application-feedback" ref={feedback} role="status" tabIndex={-1} className="text-brand-navy">{state.code !== "idle" && labels[state.code]}</p>
    {state.code === "conflict" && <button type="button" className={inputClass} onClick={()=>setKey(crypto.randomUUID())}>{labels.submit}</button>}
    <button type="submit" disabled={pending || !key} aria-describedby="application-process application-privacy" className="min-h-11 rounded-industrial bg-brand-teal px-5 py-3 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy focus-visible:ring-offset-2 disabled:opacity-60">{pending ? labels.pending : labels.submit}</button>
  </form>;
}
