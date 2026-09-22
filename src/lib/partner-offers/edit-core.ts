import "server-only";
import { eq, and, sql, ne } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import { parseDecimalToMinorUnits, minorUnitsToDecimalString } from "@/lib/checkout/money";
import { parseOutboundDestination } from "@/lib/outbound/outbound-core";
import {
  type PartnerFacingOfferType,
  isPartnerFacingOfferType,
  resolveEditTargetStorageCore,
  resolveTechnicalModelToPartnerOfferTypeCore,
} from "@/lib/offers/offer-type-mapping";

export interface PartnerOfferEditInput {
  partnerId: number;
  offerId: number;
  expectedUpdatedAt: string | null; // ISO 8601
  title: string;
  description: string | null;
  partnerOfferType: string;
  priceBrutto: string | null;
  priceOnRequest: boolean;
  outboundUrl: string | null;
}

export type PartnerOfferEditResult =
  | { ok: true; code: "OFFER_UPDATED" | "OFFER_UNCHANGED"; changed: boolean }
  | { ok: false; code: "OFFER_NOT_FOUND" | "OFFER_NOT_EDITABLE_STATUS" | "OFFER_CONFLICT" | "SYSTEM_ERROR" | "OFFER_INVALID_INPUT" }
  | { ok: false; code: "OFFER_TARGET_INVALID"; reason: "TITLE_INVALID" | "PRICE_INVALID" | "OUTBOUND_URL_INVALID" };

export function parsePartnerOfferEditInput(raw: unknown): { ok: true; data: PartnerOfferEditInput } | { ok: false; code: PartnerOfferEditResult["code"]; reason?: string } {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, code: "OFFER_INVALID_INPUT" };
  }

  const { partnerId, offerId, expectedUpdatedAt, title, description, partnerOfferType, priceBrutto, priceOnRequest, outboundUrl } = raw as Record<string, unknown>;

  if (
    typeof partnerId !== "number" ||
    typeof offerId !== "number" ||
    (expectedUpdatedAt !== null && typeof expectedUpdatedAt !== "string")
  ) {
    return { ok: false, code: "OFFER_INVALID_INPUT" };
  }

  if (!Number.isSafeInteger(partnerId) || partnerId <= 0) {
    return { ok: false, code: "OFFER_INVALID_INPUT" };
  }
  if (!Number.isSafeInteger(offerId) || offerId <= 0) {
    return { ok: false, code: "OFFER_INVALID_INPUT" };
  }

  if (expectedUpdatedAt !== null) {
    const d = new Date(expectedUpdatedAt);
    if (Number.isNaN(d.getTime()) || d.toISOString() !== expectedUpdatedAt) {
      return { ok: false, code: "OFFER_INVALID_INPUT" };
    }
  }

  if (typeof title !== "string") {
    return { ok: false, code: "OFFER_INVALID_INPUT" };
  }
  const normalizedTitle = title.trim();
  if (normalizedTitle.length === 0 || normalizedTitle.length > 255) {
    return { ok: false, code: "OFFER_TARGET_INVALID", reason: "TITLE_INVALID" };
  }

  let normalizedDescription: string | null = null;
  if (description !== null && description !== undefined) {
    if (typeof description !== "string") {
      return { ok: false, code: "OFFER_INVALID_INPUT" };
    }
    const trimmed = description.trim();
    if (trimmed.length > 0) {
      normalizedDescription = trimmed;
    }
  }

  if (!isPartnerFacingOfferType(partnerOfferType)) {
    return { ok: false, code: "OFFER_INVALID_INPUT" };
  }

  let normalizedPriceBrutto: string | null = null;
  if (priceBrutto !== null && priceBrutto !== undefined) {
    if (typeof priceBrutto !== "string") {
      return { ok: false, code: "OFFER_INVALID_INPUT" };
    }
    const trimmed = priceBrutto.trim();
    if (trimmed.length > 0) {
      try {
        const minorUnits = parseDecimalToMinorUnits(trimmed);
        normalizedPriceBrutto = minorUnitsToDecimalString(minorUnits);
      } catch {
        return { ok: false, code: "OFFER_TARGET_INVALID", reason: "PRICE_INVALID" };
      }
    }
  }

  if (typeof priceOnRequest !== "boolean") {
    return { ok: false, code: "OFFER_INVALID_INPUT" };
  }

  let normalizedOutboundUrl: string | null = null;
  if (outboundUrl !== null && outboundUrl !== undefined) {
    if (typeof outboundUrl !== "string") {
      return { ok: false, code: "OFFER_INVALID_INPUT" };
    }
    const trimmed = outboundUrl.trim();
    if (trimmed.length > 0) {
      const dest = parseOutboundDestination(trimmed);
      if (dest === null || dest.length > 512) {
        return { ok: false, code: "OFFER_TARGET_INVALID", reason: "OUTBOUND_URL_INVALID" };
      }
      normalizedOutboundUrl = dest;
    }
  }

  return {
    ok: true,
    data: {
      partnerId,
      offerId,
      expectedUpdatedAt,
      title: normalizedTitle,
      description: normalizedDescription,
      partnerOfferType,
      priceBrutto: normalizedPriceBrutto,
      priceOnRequest,
      outboundUrl: normalizedOutboundUrl,
    }
  };
}

export interface CurrentPartnerOfferState {
  publicationStatus: string;
  updatedAt: Date | null;
  offerModel: string;
  conversionType: string;
  title: string;
  description: string | null;
  priceBrutto: string | null;
  priceOnRequest: boolean;
  outboundUrl: string | null;
}

export function evaluatePartnerOfferEditCore(
  input: PartnerOfferEditInput,
  current: CurrentPartnerOfferState | null
): PartnerOfferEditResult | {
  ok: true;
  code: "EXECUTE_UPDATE";
  payload: {
    title: string;
    description: string | null;
    priceBrutto: string | null;
    priceOnRequest: boolean;
    offerModel: "rfq" | "marketplace";
    conversionType: "inbound" | "outbound";
    outboundUrl: string | null;
  };
} {
  if (!current) {
    return { ok: false, code: "OFFER_NOT_FOUND" };
  }

  if (current.publicationStatus !== "draft") {
    return { ok: false, code: "OFFER_NOT_EDITABLE_STATUS" };
  }

  const expectedMs = input.expectedUpdatedAt ? new Date(input.expectedUpdatedAt).getTime() : null;
  const currentMs = current.updatedAt ? current.updatedAt.getTime() : null;

  if (expectedMs !== currentMs) {
    return { ok: false, code: "OFFER_CONFLICT" };
  }

  const currentPartnerType = resolveTechnicalModelToPartnerOfferTypeCore(
    current.offerModel,
    current.conversionType
  );

  if (currentPartnerType === null) {
    return { ok: false, code: "OFFER_NOT_FOUND" };
  }

  const derived = resolveEditTargetStorageCore(
    current.offerModel,
    current.conversionType,
    input.partnerOfferType as PartnerFacingOfferType
  );
  const targetOfferModel = derived.offerModel;
  const targetConversionType = derived.conversionType;

  let currentNormalizedPrice: string | null = null;
  if (current.priceBrutto !== null) {
    try {
      currentNormalizedPrice = minorUnitsToDecimalString(parseDecimalToMinorUnits(current.priceBrutto));
    } catch {
      currentNormalizedPrice = current.priceBrutto;
    }
  }

  if (
    current.title === input.title &&
    current.description === input.description &&
    currentNormalizedPrice === input.priceBrutto &&
    current.priceOnRequest === input.priceOnRequest &&
    current.offerModel === targetOfferModel &&
    current.conversionType === targetConversionType &&
    current.outboundUrl === input.outboundUrl
  ) {
    return { ok: true, code: "OFFER_UNCHANGED", changed: false };
  }

  return {
    ok: true,
    code: "EXECUTE_UPDATE",
    payload: {
      title: input.title,
      description: input.description,
      priceBrutto: input.priceBrutto,
      priceOnRequest: input.priceOnRequest,
      offerModel: targetOfferModel,
      conversionType: targetConversionType,
      outboundUrl: input.outboundUrl,
    }
  };
}

export async function executePartnerOfferEdit(
  db: NodePgDatabase<typeof schema>,
  input: PartnerOfferEditInput
): Promise<PartnerOfferEditResult> {
  try {
    return await db.transaction(async (tx) => {
      const offerRows = await tx
        .select({
          id: schema.offers.id,
          partnerId: schema.offers.partnerId,
          publicationStatus: schema.offers.publicationStatus,
          updatedAt: schema.offers.updatedAt,
          title: schema.offers.title,
          description: schema.offers.description,
          priceBrutto: sql<string | null>`${schema.offers.priceBrutto}::text`,
          priceOnRequest: schema.offers.priceOnRequest,
          offerModel: schema.offers.offerModel,
          conversionType: schema.offers.conversionType,
          outboundUrl: schema.offers.outboundUrl,
        })
        .from(schema.offers)
        .where(
          and(
            eq(schema.offers.id, input.offerId),
            eq(schema.offers.partnerId, input.partnerId),
            ne(schema.offers.publicationStatus, "deleted")
          )
        )
        .for("update");

      const current = offerRows.length > 0 ? offerRows[0] : null;

      const evalResult = evaluatePartnerOfferEditCore(input, current);

      if (evalResult.code !== "EXECUTE_UPDATE") {
        return evalResult as PartnerOfferEditResult;
      }

      const updateResult = await tx
        .update(schema.offers)
        .set({
          ...evalResult.payload,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(
          and(
            eq(schema.offers.id, input.offerId),
            eq(schema.offers.partnerId, input.partnerId),
            eq(schema.offers.publicationStatus, "draft")
          )
        )
        .returning({ id: schema.offers.id });

      if (updateResult.length === 0) {
        throw new Error("Concurrent state mutation during update");
      }

      return { ok: true, code: "OFFER_UPDATED", changed: true };
    });
  } catch (err) {
    const errorName = err instanceof Error ? err.name : "UnknownError";
    console.error("[partner-offer-edit] stage=execution errorName=", errorName);
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}
