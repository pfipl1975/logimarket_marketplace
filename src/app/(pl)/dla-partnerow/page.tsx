import { PartnerRecruitmentPage } from "@/app/_shared/PartnerRecruitmentPage";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPartnerRecruitmentMetadata } from "@/lib/partner-recruitment";

export async function generateMetadata() {
  return getPartnerRecruitmentMetadata("pl", (await getDictionary("pl")).partnerRecruitment);
}

export default function Page() {
  return <PartnerRecruitmentPage locale="pl" />;
}
