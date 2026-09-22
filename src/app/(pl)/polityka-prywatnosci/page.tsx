import { defaultLocale } from "@/lib/i18n/config";
import { PrivacyPolicyPage } from "@/app/_shared/PrivacyPolicyPage";
import { generatePrivacyPolicyMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return generatePrivacyPolicyMetadata(defaultLocale);
}

export default async function Page() {
  return <PrivacyPolicyPage locale={defaultLocale} />;
}
