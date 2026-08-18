import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminOfferDetail } from "@/app/actions";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { ArrowLeft, Box, Info, Settings, FileText, List, HardDrive, Eye } from "lucide-react";

interface AdminOfferDetailPageProps {
  id: string;
  locale: Locale;
}

function renderFieldValue(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined || val === "") return "—";
  return String(val);
}

function formatDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(val: string | null, locale: Locale): string {
  if (val === null) return "—";
  const num = Number(val);
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat(locale, { style: "currency", currency: "PLN" }).format(num);
}

export async function AdminOfferDetailPage({ id, locale }: AdminOfferDetailPageProps) {
  const dictionary = await getDictionary(locale);
  const dict = dictionary.adminOfferDetail;

  const result = await getAdminOfferDetail(id, locale);

  if (!result.ok) {
    if (result.code === "INVALID_ID" || result.code === "NOT_FOUND") {
      notFound();
    }
    return (
      <div className="rounded-industrial border border-border-industrial bg-white p-12 text-center shadow-soft">
        <h2 className="text-xl font-semibold text-brand-navy mb-2">{dict.errorTitle}</h2>
        <p className="text-muted-foreground">{dict.errorDescription}</p>
      </div>
    );
  }

  const offer = result.data;
  const backUrl = locale === "pl" ? "/admin/oferty" : `/${locale}/admin/offers`;
  const partnerUrl = locale === "pl"
    ? `/admin/partnerzy/${offer.partnerId}`
    : `/${locale}/admin/partners/${offer.partnerId}`;
  const previewUrl = locale === "pl"
    ? `/oferta/${offer.id}`
    : `/${locale}/oferta/${offer.id}`;

  const getStatusLabel = (status: string): string => {
    const map: Record<string, string> = {
      draft: dict.statusDraft,
      published: dict.statusPublished,
      hidden: dict.statusHidden,
      archived: dict.statusArchived,
      deleted: dict.statusDeleted,
    };
    return map[status] ?? status;
  };

  const getModelLabel = (model: string): string => {
    const map: Record<string, string> = {
      rfq: dict.modelRfq,
      ecommerce: dict.modelEcommerce,
      outbound: dict.modelOutbound,
      unknown: dict.modelUnknown,
    };
    return map[model] ?? model;
  };

  return (
    <div className="max-w-5xl mx-auto pb-16">
      {/* HEADER */}
      <div className="mb-8">
        <Link
          href={backUrl}
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-brand-teal transition-colors mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {dict.backToOffers}
        </Link>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-brand-navy">#{offer.id}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                  offer.canonicalModel === "unknown"
                    ? "bg-red-100 text-red-800"
                    : "bg-brand-navy/10 text-brand-navy"
                }`}
              >
                {getModelLabel(offer.canonicalModel)}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-secondary text-secondary-foreground">
                {getStatusLabel(offer.publicationStatus)}
              </span>
            </div>
            <h2 className="text-xl text-brand-navy break-words">{offer.title}</h2>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* SECTION 1 — Offer identity */}
        <section className="bg-white rounded-industrial border border-border-industrial shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-border-industrial bg-brand-light-gray/30 flex items-center gap-2">
            <Info className="h-5 w-5 text-brand-teal" />
            <h2 className="font-medium text-brand-navy">{dict.sectionIdentity}</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.fieldPartner}</p>
              <Link
                href={partnerUrl}
                className="text-sm font-medium text-brand-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
              >
                {offer.partnerName}
              </Link>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.fieldCategory}</p>
              <p className="text-sm font-medium text-brand-navy">
                {offer.categoryName}{" "}
                <span className="text-muted-foreground font-normal">({offer.categorySlug})</span>
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.fieldCreatedAt}</p>
              <p className="text-sm text-brand-navy">{formatDate(offer.createdAt, locale)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.fieldUpdatedAt}</p>
              <p className="text-sm text-brand-navy">{formatDate(offer.updatedAt, locale)}</p>
            </div>
          </div>
        </section>

        {/* SECTION 2 — Business model */}
        <section className="bg-white rounded-industrial border border-border-industrial shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-border-industrial bg-brand-light-gray/30 flex items-center gap-2">
            <Box className="h-5 w-5 text-brand-teal" />
            <h2 className="font-medium text-brand-navy">{dict.sectionBusinessModel}</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.fieldRawOfferModel}</p>
              <p className="text-sm font-mono bg-muted text-brand-navy px-2 py-1 rounded inline-block">{offer.rawOfferModel}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.fieldRawConversionType}</p>
              <p className="text-sm font-mono bg-muted text-brand-navy px-2 py-1 rounded inline-block">{offer.rawConversionType}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.fieldCanonicalModel}</p>
              <p className="text-sm font-mono bg-brand-navy/5 text-brand-navy px-2 py-1 rounded inline-block">{offer.canonicalModel}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.fieldContractModel}</p>
              <p className="text-sm font-mono bg-muted text-brand-navy px-2 py-1 rounded inline-block">{renderFieldValue(offer.contractModel)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.fieldIsActive}</p>
              <p className="text-sm font-medium text-brand-navy">{offer.isActive ? dict.booleanYes : dict.booleanNo}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.fieldIsFeatured}</p>
              <p className="text-sm font-medium text-brand-navy">{offer.isFeatured ? dict.booleanYes : dict.booleanNo}</p>
            </div>
          </div>
        </section>

        {/* SECTION 3 — Pricing / conversion */}
        <section className="bg-white rounded-industrial border border-border-industrial shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-border-industrial bg-brand-light-gray/30 flex items-center gap-2">
            <Settings className="h-5 w-5 text-brand-teal" />
            <h2 className="font-medium text-brand-navy">{dict.sectionPricing}</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.fieldPriceBrutto}</p>
              {offer.priceBrutto !== null ? (
                <>
                  <p className="text-sm font-mono font-medium text-brand-navy" title={dict.fieldPriceBruttoRaw}>
                    {offer.priceBrutto}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatPrice(offer.priceBrutto, locale)}
                  </p>
                </>
              ) : (
                <p className="text-sm font-mono font-medium text-brand-navy">—</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.fieldPriceOnRequest}</p>
              <p className="text-sm font-medium text-brand-navy">{offer.priceOnRequest ? dict.booleanYes : dict.booleanNo}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.fieldOutboundUrl}</p>
              <div className="text-sm text-brand-navy bg-muted px-3 py-2 rounded-md font-mono break-all whitespace-pre-wrap">
                {renderFieldValue(offer.outboundUrl)}
              </div>
            </div>
            <div className="md:col-span-2 pt-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.fieldPublicPreview}</p>
              {offer.publicPreviewAllowed ? (
                <Link
                  href={previewUrl}
                  target="_blank"
                  className="inline-flex items-center text-sm font-medium text-brand-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                >
                  <Eye className="mr-1 h-4 w-4" />
                  {dict.previewAvailable}
                </Link>
              ) : (
                <span className="inline-flex items-center text-sm text-muted-foreground">
                  <Eye className="mr-1 h-4 w-4 opacity-50" />
                  {dict.previewUnavailable}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 4 — Publication lifecycle */}
        <section className="bg-white rounded-industrial border border-border-industrial shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-border-industrial bg-brand-light-gray/30 flex items-center gap-2">
            <List className="h-5 w-5 text-brand-teal" />
            <h2 className="font-medium text-brand-navy">{dict.sectionLifecycle}</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.fieldPublicationStatus}</p>
              <p className="text-sm font-medium text-brand-navy">{getStatusLabel(offer.publicationStatus)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.fieldPublishedAt}</p>
              <p className="text-sm text-brand-navy">{formatDate(offer.publishedAt, locale)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.fieldArchivedAt}</p>
              <p className="text-sm text-brand-navy">{formatDate(offer.archivedAt, locale)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.fieldDeletedAt}</p>
              <p className="text-sm text-brand-navy">{formatDate(offer.deletedAt, locale)}</p>
            </div>
          </div>
        </section>

        {/* SECTION 5 — Content */}
        <section className="bg-white rounded-industrial border border-border-industrial shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-border-industrial bg-brand-light-gray/30 flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-teal" />
            <h2 className="font-medium text-brand-navy">{dict.sectionContent}</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.fieldImageUrl}</p>
              {offer.imageUrl ? (
                <div className="mt-1 text-sm text-brand-navy bg-muted px-3 py-2 rounded-md font-mono break-all">
                  {offer.imageUrl}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{dict.fieldDescription}</p>
              <div className="mt-1 text-sm text-brand-navy whitespace-pre-wrap bg-brand-light-gray/20 p-4 rounded-md border border-border-industrial/50 min-h-[3rem]">
                {offer.description ? (
                  offer.description
                ) : (
                  <span className="text-muted-foreground italic">—</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6 — Relational attributes */}
        <section className="bg-white rounded-industrial border border-border-industrial shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-border-industrial bg-brand-light-gray/30 flex items-center gap-2">
            <List className="h-5 w-5 text-brand-teal" />
            <h2 className="font-medium text-brand-navy">{dict.sectionRelationalAttributes}</h2>
          </div>
          {offer.relationalAttributes.length === 0 ? (
            <div className="p-6">
              <p className="text-sm text-muted-foreground italic">{dict.noAttributes}</p>
            </div>
          ) : (
            <div className="divide-y divide-border-industrial/50">
              {offer.relationalAttributes.map((attr) => (
                <div
                  key={attr.attributeId}
                  className="p-4 sm:px-6 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-6 hover:bg-brand-light-gray/20 transition-colors items-start"
                >
                  <div className="sm:col-span-1">
                    <p className="text-sm font-medium text-brand-navy">
                      {attr.name}
                      {attr.unitCode && (
                        <span className="text-muted-foreground font-normal ml-1">[{attr.unitCode}]</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{attr.stableKey}</p>
                  </div>
                  <div className="sm:col-span-2">
                    {!attr.isAssignedToCategory && (
                      <div className="mb-1 inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded font-medium">
                        {dict.unassignedAttribute}
                      </div>
                    )}
                    {attr.values.length === 0 ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {attr.values.map((v, i) => (
                          <span
                            key={i}
                            className="inline-flex bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 7 — Legacy technicalAttributes */}
        <section className="bg-white rounded-industrial border border-border-industrial shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-border-industrial bg-brand-light-gray/30 flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-brand-teal" />
            <h2 className="font-medium text-brand-navy">{dict.sectionLegacyAttributes}</h2>
          </div>
          <div className="p-6">
            {Object.keys(offer.technicalAttributes).length === 0 ? (
              <p className="text-sm text-muted-foreground italic">{dict.noLegacyAttributes}</p>
            ) : (
              <pre className="text-sm text-brand-navy bg-muted px-4 py-3 rounded-md font-mono overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(offer.technicalAttributes, null, 2)}
              </pre>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
