import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { offers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { resolveCanonicalOfferModel } from "@/lib/offers/model";
import { isConversionAllowedStatus } from "@/lib/offers/status";
import {
  parseOutboundOfferId,
  parseOutboundDestination,
} from "@/lib/outbound/outbound-core";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const offerId = parseOutboundOfferId(id);
  if (offerId === null) {
    return createFallbackRedirect(request);
  }

  let offerRows;
  try {
    offerRows = await db
      .select({
        id: offers.id,
        partnerId: offers.partnerId,
        outboundUrl: offers.outboundUrl,
        offerModel: offers.offerModel,
        conversionType: offers.conversionType,
        isActive: offers.isActive,
        publicationStatus: offers.publicationStatus,
      })
      .from(offers)
      .where(eq(offers.id, offerId))
      .limit(1);
  } catch (error) {
    console.error(`[outbound] stage=offer_lookup errorName=${error instanceof Error ? error.name : "Unknown"}`);
    return createFallbackRedirect(request);
  }

  if (offerRows.length === 0) {
    return createFallbackRedirect(request);
  }

  const offer = offerRows[0];

  if (
    !offer.isActive ||
    !isConversionAllowedStatus(offer.publicationStatus) ||
    resolveCanonicalOfferModel(offer.offerModel, offer.conversionType) !== "outbound"
  ) {
    return createFallbackRedirect(request);
  }

  if (!offer.outboundUrl) {
    return createFallbackRedirect(request);
  }

  const destinationUrl = parseOutboundDestination(offer.outboundUrl);
  if (!destinationUrl) {
    return createFallbackRedirect(request);
  }

  const response = NextResponse.redirect(destinationUrl, 302);
  response.headers.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  
  return response;
}

function createFallbackRedirect(request: NextRequest) {
  const fallbackUrl = new URL("/", request.url).toString();
  const response = NextResponse.redirect(fallbackUrl, 302);
  response.headers.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}
