import { notFound, redirect } from "next/navigation";
import { PartnerRecruitmentPage } from "@/app/_shared/PartnerRecruitmentPage";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getPartnerRecruitmentMetadata } from "@/lib/partner-recruitment";
import { getPartnerRecruitmentPath } from "@/lib/i18n/paths";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return getPartnerRecruitmentMetadata(locale, (await getDictionary(locale)).partnerRecruitment);
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  if (locale === defaultLocale) redirect(getPartnerRecruitmentPath(defaultLocale));
  return <PartnerRecruitmentPage locale={locale} />;
}
