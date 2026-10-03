import type { Metadata } from "next";
import type { Dictionary, Locale } from "@/lib/i18n/types";
import { getPartnerRecruitmentLocaleLinks, getPartnerRecruitmentPath } from "@/lib/i18n/paths";
import { absoluteUrl } from "@/lib/seo/urls";

export const PARTNER_RECRUITMENT_BENEFITS = [
  { title: "benefitOffers", description: "benefitOffersDescription" },
  { title: "benefitRfq", description: "benefitRfqDescription" },
  { title: "benefitOrders", description: "benefitOrdersDescription" },
] as const;

export const PARTNER_RECRUITMENT_STEPS = ["stepContact", "stepAccount", "stepOffers", "stepOperations"] as const;
export const PARTNER_RECRUITMENT_AUDIENCES = ["audienceEquipment", "audienceManufacturers", "audienceOperators", "audienceSolutions"] as const;
export type PartnerRecruitmentLabels = Dictionary["partnerRecruitment"];

export function getPartnerRecruitmentContactHref(labels: PartnerRecruitmentLabels): string {
  return `mailto:${labels.contactEmail}?subject=${encodeURIComponent(labels.contactSubject)}`;
}

export function getPartnerRecruitmentMetadata(locale: Locale, labels: PartnerRecruitmentLabels): Metadata {
  const languages = Object.fromEntries(Object.entries(getPartnerRecruitmentLocaleLinks()).map(([language, path]) => [language, absoluteUrl(path)]));
  return {
    title: labels.metaTitle,
    description: labels.metaDescription,
    robots: { index: true, follow: true },
    alternates: {
      canonical: absoluteUrl(getPartnerRecruitmentPath(locale)),
      languages: { ...languages, "x-default": absoluteUrl(getPartnerRecruitmentPath("pl")) },
    },
  };
}
