import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicLegalDocumentPage } from "@/app/_shared/PublicLegalDocumentPage";
import { getPublicLegalCenter } from "@/lib/legal/public-legal-center";
import { getMatchingPublicLegalDelivery, getPublicLegalDeliveryBySlug } from "@/lib/legal/public-legal-documents";
import { absoluteUrl } from "@/lib/seo/urls";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const delivery = getPublicLegalDeliveryBySlug((await params).slug);
  if (!delivery) notFound();
  return {
    title: `${delivery.title} | Dokumenty prawne LogiMarket`,
    description: `Wersja 1.0 dokumentu ${delivery.title}. Sprawdź datę obowiązywania, SHA-256 i pobierz PDF z logimarket.eu.`,
    alternates: { canonical: absoluteUrl(`/dokumenty-prawne/${delivery.slug}`) },
  };
}

export default async function Page({ params }: Props) {
  const delivery = getPublicLegalDeliveryBySlug((await params).slug);
  if (!delivery) notFound();
  const center = await getPublicLegalCenter();
  const current = center.currentDocuments.find((document) => document.code === delivery.code);
  const upcoming = center.upcomingDocuments.find((document) => document.code === delivery.code);
  const document = current ?? upcoming;
  if (!document || getMatchingPublicLegalDelivery(document) !== delivery) notFound();
  return <PublicLegalDocumentPage document={document} delivery={delivery} status={current ? "current" : "upcoming"} />;
}
