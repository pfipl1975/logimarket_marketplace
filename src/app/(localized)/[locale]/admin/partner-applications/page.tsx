import { AdminApplicationsPage, applicationLocale } from "@/app/_shared/AdminApplicationsPage";
import { notFound } from "next/navigation";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false,nocache:true}};
export default async function Page({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}) {
 const locale=applicationLocale((await params).locale); if(!locale) notFound();
 return <AdminApplicationsPage locale={locale} searchParams={await searchParams}/>;
}
