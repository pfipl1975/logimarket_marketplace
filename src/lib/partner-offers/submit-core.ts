import { eq, and, isNull, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import { resolveCanonicalOfferModel } from "@/lib/offers/model";
import { parseDecimalToMinorUnits } from "@/lib/checkout/money";
import { parseOutboundDestination } from "@/lib/outbound/outbound-core";

export type SubmitEligibilityReason =
  | "TITLE_INVALID"
  | "MODEL_UNKNOWN"
  | "ECOMMERCE_PRICE_INVALID"
  | "OUTBOUND_URL_INVALID";

export function evaluateOfferSubmitEligibility(input: {
  title: string | null;
  offerModel: string;
  conversionType: string;
  priceOnRequest: boolean;
  normalizedPrice: string | null;
  outboundUrl: string | null;
}): { eligible: true } | { eligible: false; reason: SubmitEligibilityReason } {
  if (!input.title || input.title.trim().length === 0) return { eligible: false, reason: "TITLE_INVALID" };

  const canonicalModel = resolveCanonicalOfferModel(input.offerModel, input.conversionType);
  if (canonicalModel === "unknown") return { eligible: false, reason: "MODEL_UNKNOWN" };

  if (canonicalModel === "ecommerce") {
    if (input.priceOnRequest || !input.normalizedPrice) {
      return { eligible: false, reason: "ECOMMERCE_PRICE_INVALID" };
    }
    try {
      const minor = parseDecimalToMinorUnits(input.normalizedPrice);
      if (minor <= 0) {
        return { eligible: false, reason: "ECOMMERCE_PRICE_INVALID" };
      }
    } catch {
      return { eligible: false, reason: "ECOMMERCE_PRICE_INVALID" };
    }
  }

  if (canonicalModel === "outbound") {
    if (!input.outboundUrl) return { eligible: false, reason: "OUTBOUND_URL_INVALID" };
    const url = parseOutboundDestination(input.outboundUrl);
    if (!url) {
      return { eligible: false, reason: "OUTBOUND_URL_INVALID" };
    }
  }

  return { eligible: true };
}

export type PartnerOfferSubmitResult =
  | { ok: true; code: "OFFER_SUBMITTED" }
  | { ok: false; code: "OFFER_NOT_FOUND" | "OFFER_NOT_EDITABLE_STATUS" | "OFFER_SUBMIT_NOT_ELIGIBLE" | "SYSTEM_ERROR"; reason?: string };

export async function executePartnerOfferSubmit(
  db: NodePgDatabase<typeof schema>,
  partnerId: number,
  offerId: number
): Promise<PartnerOfferSubmitResult> {
  if (!Number.isSafeInteger(partnerId) || partnerId <= 0) return { ok: false, code: "OFFER_NOT_FOUND" };
  if (!Number.isSafeInteger(offerId) || offerId <= 0) return { ok: false, code: "OFFER_NOT_FOUND" };

  try {
    return await db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(schema.offers)
        .where(
          and(
            eq(schema.offers.id, offerId),
            eq(schema.offers.partnerId, partnerId),
            isNull(schema.offers.deletedAt)
          )
        )
        .for("update")
        .limit(1);

      if (rows.length === 0) {
        return { ok: false, code: "OFFER_NOT_FOUND" };
      }

      const offer = rows[0];

      if (offer.publicationStatus !== "draft") {
        return { ok: false, code: "OFFER_NOT_EDITABLE_STATUS" };
      }

      const eligibility = evaluateOfferSubmitEligibility({
        title: offer.title,
        offerModel: offer.offerModel,
        conversionType: offer.conversionType,
        priceOnRequest: offer.priceOnRequest,
        normalizedPrice: offer.priceBrutto ? offer.priceBrutto.toString() : null,
        outboundUrl: offer.outboundUrl,
      });

      if (!eligibility.eligible) {
        return { ok: false, code: "OFFER_SUBMIT_NOT_ELIGIBLE", reason: eligibility.reason };
      }

      const updateResult = await tx
        .update(schema.offers)
        .set({
          publicationStatus: "pending_review",
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(schema.offers.id, offer.id))
        .returning({ id: schema.offers.id });

      if (updateResult.length === 0) {
        throw new Error("Concurrent state mutation during update");
      }

      return { ok: true, code: "OFFER_SUBMITTED" };
    });
  } catch (err) {
    console.error("[partner-offer-submit] stage=execution errorName=", err instanceof Error ? err.name : "UnknownError");
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}

