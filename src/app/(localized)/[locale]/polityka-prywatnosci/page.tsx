import { notFound, redirect } from "next/navigation";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { PrivacyPolicyPage } from "@/app/_shared/PrivacyPolicyPage";
import { generatePrivacyPolicyMetadata } from "@/lib/seo/metadata";
import type { Locale } from "@/lib/i18n/config";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return generatePrivacyPolicyMetadata(locale as Locale);
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  if (locale === defaultLocale) {
    redirect("/polityka-prywatnosci");
  }

  return <PrivacyPolicyPage locale={locale as Locale} />;
}
