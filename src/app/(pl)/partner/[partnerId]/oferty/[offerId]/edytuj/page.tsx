import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getPartnerOfferEditReadModel } from "@/lib/partner-offers/edit-read-model";
import { PartnerOfferEditForm } from "@/components/partner/PartnerOfferEditForm";
import { PartnerOfferTechnicalAttributesForm } from "@/components/partner/PartnerOfferTechnicalAttributesForm";
import { db } from "@/lib/db";
import { parseStrictIdOrNotFound } from "@/lib/partner-orders/route-params";
import { getPartnerOfferAttributesEditReadModel } from "@/lib/partner-offers/attribute-edit-read-model";

import { getPartnerOfferMedia } from "@/app/actions";
import { PartnerOfferImageManager } from "@/components/partner/PartnerOfferImageManager";
import { PartnerOfferBusyProvider } from "@/components/partner/PartnerOfferBusyContext";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edytuj ofertę - LogiMarket Partner",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PartnerOfferEditPage({
  params,
}: {
  params: Promise<{
    partnerId: string;
    offerId: string;
    locale?: string;
  }>;
}) {
  const { partnerId, offerId, locale } = await params;
  const resolvedLocale: Locale = typeof locale === "string" && isLocale(locale) ? locale : "pl";
  const dictionary = await getDictionary(resolvedLocale);
  const dict = dictionary.PartnerWorkspace;
  const mediaDict = dictionary.PartnerWorkspaceMedia;

  const parsedPartnerId = parseStrictIdOrNotFound(partnerId);
  const parsedOfferId = parseStrictIdOrNotFound(offerId);

  const result = await getPartnerOfferEditReadModel(db, parsedPartnerId, String(parsedOfferId));

  if (!result.ok) {
    if (result.code === "NOT_EDITABLE") {
      const basePath = typeof locale === "string" && isLocale(locale)
        ? `/${resolvedLocale}/partner/${parsedPartnerId}/offers`
        : `/partner/${parsedPartnerId}/oferty`;
      return (
        <div className="space-y-6">
          <div className="rounded-md bg-red-50 p-4 border border-red-200">
            <h3 className="text-sm font-medium text-red-800">
              {dict.offerEditErrorNotEditable || "Oferta nie jest już edytowalnym szkicem."}
            </h3>
            <div className="mt-4">
              <Link href={`${basePath}/${parsedOfferId}`} className="text-sm font-semibold text-red-800 underline">
                {dict.offerEditBackToOffer || "Wróć do oferty"}
              </Link>
            </div>
          </div>
        </div>
      );
    }
    notFound();
  }

  const basePath = typeof locale === "string" && isLocale(locale)
    ? `/${resolvedLocale}/partner/${parsedPartnerId}/offers`
    : `/partner/${parsedPartnerId}/oferty`;

  const attributeResult = await getPartnerOfferAttributesEditReadModel(
    db,
    parsedPartnerId,
    String(parsedOfferId),
    resolvedLocale,
  );
  if (!attributeResult.ok) {
    notFound();
  }

  const initialMedia = await getPartnerOfferMedia(parsedPartnerId, parsedOfferId);

  return (
    <PartnerOfferBusyProvider>
      <div className="space-y-8 pb-24">
        <PartnerOfferEditForm
          offer={result.data}
          partnerId={parsedPartnerId}
          dict={dict}
          basePath={basePath}
          locale={resolvedLocale}
        />
        <PartnerOfferTechnicalAttributesForm
          model={attributeResult.data}
          partnerId={parsedPartnerId}
          locale={resolvedLocale}
          dict={dict}
        />
        <PartnerOfferImageManager
          partnerId={parsedPartnerId}
          offerId={parsedOfferId}
          locale={resolvedLocale}
          title={result.data.title}
          initial={initialMedia}
          dict={mediaDict}
        />
      </div>
    </PartnerOfferBusyProvider>
  );
}
