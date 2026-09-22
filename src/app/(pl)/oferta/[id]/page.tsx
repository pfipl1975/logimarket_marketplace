import { defaultLocale } from "@/lib/i18n/config";
import { OfferPage } from "@/app/_shared/OfferPage";
import { generateOfferMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  return generateOfferMetadata(defaultLocale, id);
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return (
    <OfferPage
      locale={defaultLocale}
      offerId={id}
    />
  );
}
