import { notFound, redirect } from "next/navigation";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { OfferPage } from "@/app/_shared/OfferPage";

type PageProps = {
  params: Promise<{
    locale: string;
    id: string;
  }>;
};

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
