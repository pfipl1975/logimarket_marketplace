import { AdminApplicationsPage } from "@/app/_shared/AdminApplicationsPage";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false,follow:false,nocache:true}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
 return <AdminApplicationsPage locale="pl" searchParams={await searchParams}/>;
}
