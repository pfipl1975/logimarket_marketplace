import Link from "next/link";
import { prepareApplicationReviewAction } from "@/app/actions";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { requireAdminPageAccess } from "@/lib/auth/admin-page-access";
import { APPLICATION_STATUSES, adminPartnerHandoffPath, type ApplicationStatus } from "@/lib/partner-applications/contract";
import { getApplication, listApplications } from "@/lib/partner-applications/service";
import { ApplicationReviewForm } from "@/components/partner-applications/ApplicationReviewForm";

export async function AdminApplicationsPage({locale,searchParams}:{locale:Locale;searchParams:Record<string,string|string[]|undefined>}) {
 await requireAdminPageAccess(locale);
 const dictionary=await getDictionary(locale);
 const labels=dictionary.partnerApplications;
 const base=locale === "pl" ? "/admin/partner-applications" : `/${locale}/admin/partner-applications`;
 const id=typeof searchParams.id === "string" ? searchParams.id : undefined;
 const rawStatus=searchParams.status;
 const status=typeof rawStatus === "string" && APPLICATION_STATUSES.includes(rawStatus as ApplicationStatus) ? rawStatus as ApplicationStatus : undefined;
 const oldest=searchParams.order === "oldest";
 let detail; let items: Awaited<ReturnType<typeof listApplications>> = [];
 try { if(id) detail=await getApplication(id); else items=await listApplications(status,oldest); }
 catch { return <p role="status">{labels.unavailable}</p>; }
 if(id) {
  if(!detail) return <div><p>{labels.empty}</p><Link href={base} className="underline">{labels.back}</Link></div>;
  const {application:a,history,duplicates}=detail;
  const handoffHref=adminPartnerHandoffPath(locale,a.status as ApplicationStatus,a.id);
  const reviewAction = await prepareApplicationReviewAction(a.id,a.version);
  return <section className="min-w-0 space-y-6"><Link href={base} className="inline-flex min-h-11 items-center underline">{labels.back}</Link>
   <h1 className="break-words text-2xl font-semibold">{a.companyName}</h1><p className="border-l-4 border-brand-teal p-3 font-semibold">{labels.unverified}</p>
   {handoffHref && <Link href={handoffHref} className="inline-flex min-h-11 items-center border border-brand-navy bg-brand-navy px-5 py-2 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2">{dictionary.adminPartnerCreate.title}</Link>}
   <dl className="grid gap-3 break-words sm:grid-cols-2">
    {([[labels.countryCode,a.countryCode],[labels.contactEmail,a.contactEmail],[labels.businessType,labels[a.businessType as "manufacturer"]],[labels.taxIdentifier,a.taxIdentifier ?? "—"],[labels.version,String(a.version)],[labels.details,labels[a.status as ApplicationStatus]]] as const).map(([label,value])=><div key={label}><dt className="font-medium">{label}</dt><dd className="wrap-anywhere">{value}</dd></div>)}
   </dl>
   {duplicates.length>0 && <aside className="border p-4"><p>{labels.duplicates}</p><ul>{duplicates.map(d=><li key={d.id}><a href={`${base}?id=${d.id}`} className="inline-flex min-h-11 items-center underline">{d.id}</a></li>)}</ul></aside>}
   <ApplicationReviewForm reviewAction={reviewAction} key={a.version} id={a.id} version={a.version} status={a.status as ApplicationStatus} labels={labels}/>
   <h2 className="text-xl font-semibold">{labels.history}</h2><ol className="space-y-4">{history.map(e=><li key={e.version} className="border p-4">
    <p>{e.version}. {e.fromStatus ? labels[e.fromStatus as ApplicationStatus]+" → " : ""}{labels[e.toStatus as ApplicationStatus]}</p>
    <time dateTime={e.createdAt.toISOString()}>{e.createdAt.toISOString()}</time><p className="break-all">{e.actorId ?? labels.submitted}</p>
    <p className="wrap-anywhere">{e.reason === "submitted" ? labels.submitted : e.reason}</p><p className="whitespace-pre-wrap wrap-anywhere">{e.note}</p>
   </li>)}</ol>
  </section>;
 }
 return <section className="min-w-0 space-y-6"><h1 className="text-2xl font-semibold">{labels.title}</h1><p>{labels.unverified}</p>
  <form method="get" className="flex flex-wrap gap-3"><label className="grid gap-2">{labels.filter}<select name="status" defaultValue={status ?? ""} className="min-h-11 border p-2"><option value="">{labels.all}</option>{APPLICATION_STATUSES.map(s=><option key={s} value={s}>{labels[s]}</option>)}</select></label>
   <label className="grid gap-2">{labels.details}<select name="order" defaultValue={oldest ? "oldest" : "newest"} className="min-h-11 border p-2"><option value="newest">{labels.newest}</option><option value="oldest">{labels.oldest}</option></select></label>
   <button className="min-h-11 self-end bg-brand-teal px-4 text-white">{labels.filter}</button></form>
  {!items?.length ? <div className="border p-6"><p>{labels.empty}</p><Link href={base} className="inline-flex min-h-11 items-center underline">{labels.all}</Link></div> : <ul className="grid gap-3">{items.map(a=><li key={a.id} className="min-w-0 border bg-white p-4"><a href={`${base}?id=${a.id}`} className="inline-flex min-h-11 items-center break-words font-semibold underline">{a.companyName}</a><p>{labels[a.status as ApplicationStatus]}</p><time dateTime={a.createdAt.toISOString()}>{a.createdAt.toISOString()}</time></li>)}</ul>}
 </section>;
}
export function applicationLocale(value:string):Locale|null {return isLocale(value) && value !== "pl" ? value : null;}
