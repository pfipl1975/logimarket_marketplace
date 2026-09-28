import { defaultLocale } from "@/lib/i18n/config";
import { PrivacyPolicyPage } from "@/app/_shared/PrivacyPolicyPage";
import { generatePrivacyPolicyMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicLegalDocumentPage } from "@/app/_shared/PublicLegalDocumentPage";
import { getPublicLegalCenter } from "@/lib/legal/public-legal-center";
import { getMatchingPublicLegalDelivery, getPublicLegalDeliveryByCode } from "@/lib/legal/public-legal-documents";
import { selectPrivacyPolicyPresentation } from "@/lib/legal/privacy-policy-transition";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await generatePrivacyPolicyMetadata(defaultLocale);
  return selectPrivacyPolicyPresentation(new Date()) === "canonical"
    ? { ...metadata, title: "Polityka Prywatności LogiMarket.eu Marketplace — wersja 1.0" }
    : metadata;
}

export default async function Page() {
  const now = new Date();
  if (selectPrivacyPolicyPresentation(now) === "legacy") {
    return <PrivacyPolicyPage locale={defaultLocale} showCanonicalNotice />;
  }
  const center = await getPublicLegalCenter(undefined, now);
  const document = center.currentDocuments.find((item) => item.code === "PRIVACY_POLICY");
  const delivery = getPublicLegalDeliveryByCode("PRIVACY_POLICY");
  if (!document || !delivery || getMatchingPublicLegalDelivery(document) !== delivery) notFound();
  return <PublicLegalDocumentPage document={document} delivery={delivery} status="current" />;
}
