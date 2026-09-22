import { notFound, redirect } from "next/navigation";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { OfferPage } from "@/app/_shared/OfferPage";
import { generateOfferMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";

type PageProps = {
  params: Promise<{
    locale: string;
    id: string;
  }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) {
    return {};
  }
  return generateOfferMetadata(locale as Locale, id);
}

export default async function LocalizedOfferPage({ params }: PageProps) {
  const { locale: rawLocale, id } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  if (rawLocale === defaultLocale) {
    redirect(`/oferta/${id}`);
  }

  return <OfferPage locale={rawLocale} offerId={id} />;
}
