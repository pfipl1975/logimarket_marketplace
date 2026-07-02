import { defaultLocale } from "@/lib/i18n/config";
import { OfferPage } from "@/app/_shared/OfferPage";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return (
    <OfferPage
      locale={defaultLocale}
      offerId={id}
    />
  );
}
