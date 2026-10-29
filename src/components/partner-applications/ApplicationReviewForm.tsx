"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ApplicationReviewState } from "@/lib/partner-applications/contract";
import { APPLICATION_TRANSITIONS, type ApplicationStatus } from "@/lib/partner-applications/contract";
import type { Dictionary } from "@/lib/i18n/types";
export function ApplicationReviewForm({id,version,status,labels,reviewAction}:{id:string;version:number;status:ApplicationStatus;labels:Dictionary["partnerApplications"];reviewAction:(previous:ApplicationReviewState,formData:FormData)=>Promise<ApplicationReviewState>}) {
 const [state,action,pending] = useActionState(reviewAction,{code:"idle"} as ApplicationReviewState);
 const [reason,setReason] = useState(""); const [note,setNote] = useState("");
 const feedback = useRef<HTMLParagraphElement>(null); const router=useRouter();
 useEffect(()=>{if(state.code !== "idle") feedback.current?.focus(); if(state.code === "updated") router.refresh();},[state,router]);
 const transitions=APPLICATION_TRANSITIONS[status];
 if(!transitions.length) return null;
 return <form action={action} className="grid max-w-2xl gap-4" aria-busy={pending}>
  <input type="hidden" name="applicationId" value={id}/><input type="hidden" name="expectedVersion" value={version}/>
  <label className="grid gap-2">{labels.update}<select name="status" required className="min-h-11 border p-2">{transitions.map(s=><option key={s} value={s}>{labels[s]}</option>)}</select></label>
  <label className="grid gap-2">{labels.reason}<input name="reason" required maxLength={100} value={reason} onChange={e=>setReason(e.target.value)} className="min-h-11 border p-2"/></label>
  <label className="grid gap-2">{labels.note}<textarea name="note" maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} className="min-h-24 border p-2"/></label>
  <p ref={feedback} tabIndex={-1} role="status">{state.code !== "idle" && labels[state.code]}</p>
  <button disabled={pending} className="min-h-11 bg-brand-teal p-3 font-semibold text-white focus-visible:ring-2 focus-visible:ring-brand-navy">{pending ? labels.pending : labels.update}</button>
 </form>;
}
