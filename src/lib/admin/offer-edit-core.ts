import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import { offers } from "@/lib/schema";
import { resolveCanonicalOfferModel } from "@/lib/offers/model";
import { resolveTechnicalModelToAdminOfferType, deriveOfferStorageForCreate } from "@/lib/admin/offer-type";
import { parseDecimalToMinorUnits, minorUnitsToDecimalString } from "@/lib/checkout/money";
import { parseOutboundDestination } from "@/lib/outbound/outbound-core";

export type EditTargetInvalidReason = "MODEL_UNKNOWN" | "ECOMMERCE_PRICE_INVALID" | "OUTBOUND_URL_INVALID" | "TITLE_INVALID" | "PRICE_INVALID";

export type AdminOfferEditResult =
  | { ok: true; code: "OFFER_UPDATED"; changed: true }
  | { ok: true; code: "OFFER_UNCHANGED"; changed: false }
  | { ok: false; code: "OFFER_INVALID_INPUT" | "OFFER_NOT_FOUND" | "OFFER_CONFLICT" | "OFFER_NOT_EDITABLE_STATUS" | "SYSTEM_ERROR" }
  | { ok: false; code: "OFFER_TARGET_INVALID"; reason: EditTargetInvalidReason };

export interface AdminOfferEditInput {
  offerId: number;
  expectedUpdatedAt: string | null;
  title: string;
  description: string | null;
  imageUrl: string | null;
  priceBrutto: string | null;
  priceOnRequest: boolean;
  adminOfferType: import("@/lib/admin/offer-type").AdminOfferType;
  outboundUrl: string | null;
  isFeatured: boolean;
}

export function parseAdminOfferEditInput(rawInput: unknown): { ok: true; data: AdminOfferEditInput } | { ok: false; code: "OFFER_INVALID_INPUT" } | { ok: false; code: "OFFER_TARGET_INVALID"; reason: EditTargetInvalidReason } {
  if (!rawInput || typeof rawInput !== "object" || Array.isArray(rawInput)) {
    return { ok: false, code: "OFFER_INVALID_INPUT" };
  }

  const {
    offerId,
    expectedUpdatedAt,
    title,
    description,
    imageUrl,
    priceBrutto,
    priceOnRequest,
    adminOfferType,
    outboundUrl,
    isFeatured,
  } = rawInput as Record<string, unknown>;

  // offerId
  if (typeof offerId !== "string" || !/^[1-9]\d*$/.test(offerId)) {
    return { ok: false, code: "OFFER_INVALID_INPUT" };
  }
  const idNum = Number(offerId);
  if (!Number.isSafeInteger(idNum) || String(idNum) !== offerId) {
    return { ok: false, code: "OFFER_INVALID_INPUT" };
  }

  // expectedUpdatedAt
  let normalizedExpectedUpdatedAt: string | null = null;
  if (expectedUpdatedAt !== null) {
    if (typeof expectedUpdatedAt !== "string") {
      return { ok: false, code: "OFFER_INVALID_INPUT" };
    }
    const d = new Date(expectedUpdatedAt);
    if (Number.isNaN(d.getTime()) || d.toISOString() !== expectedUpdatedAt) {
      return { ok: false, code: "OFFER_INVALID_INPUT" };
    }
    normalizedExpectedUpdatedAt = expectedUpdatedAt;
  }

  // title
  if (typeof title !== "string") {
    return { ok: false, code: "OFFER_INVALID_INPUT" };
  }
  const normalizedTitle = title.trim();
  if (normalizedTitle.length === 0 || normalizedTitle.length > 255) {
    return { ok: false, code: "OFFER_TARGET_INVALID", reason: "TITLE_INVALID" };
  }

  // description
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

  // imageUrl
  let normalizedImageUrl: string | null = null;
  if (imageUrl !== null && imageUrl !== undefined) {
    if (typeof imageUrl !== "string") {
      return { ok: false, code: "OFFER_INVALID_INPUT" };
    }
    const trimmed = imageUrl.trim();
    if (trimmed.length > 0) {
      if (trimmed.length > 512) return { ok: false, code: "OFFER_INVALID_INPUT" };
      normalizedImageUrl = trimmed;
    }
  }

  // priceBrutto
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

  // priceOnRequest
  if (typeof priceOnRequest !== "boolean") {
    return { ok: false, code: "OFFER_INVALID_INPUT" };
  }

  // adminOfferType
    if (adminOfferType !== "rfq" && adminOfferType !== "marketplace" && adminOfferType !== "external_partner") {
      return { ok: false, code: "OFFER_INVALID_INPUT" };
    }

    // outboundUrl
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

  // isFeatured
  if (typeof isFeatured !== "boolean") {
    return { ok: false, code: "OFFER_INVALID_INPUT" };
  }

  return {
    ok: true,
    data: {
      offerId: idNum,
      expectedUpdatedAt: normalizedExpectedUpdatedAt,
      title: normalizedTitle,
      description: normalizedDescription,
      imageUrl: normalizedImageUrl,
      priceBrutto: normalizedPriceBrutto,
      priceOnRequest,
      adminOfferType: adminOfferType as import("@/lib/admin/offer-type").AdminOfferType,
      outboundUrl: normalizedOutboundUrl,
      isFeatured,
    },
  };
}

export function validateOfferEditBusinessRules(
  targetOfferModel: "rfq" | "marketplace",
  targetConversionType: "inbound" | "outbound",
  input: Omit<AdminOfferEditInput, "adminOfferType">,
  currentPublicationStatus: string
): { valid: true } | { valid: false; reason: EditTargetInvalidReason } {
  const canonicalModel = resolveCanonicalOfferModel(targetOfferModel, targetConversionType);
  if (canonicalModel === "unknown") {
    return { valid: false, reason: "MODEL_UNKNOWN" };
  }

  if (currentPublicationStatus === "published") {
    if (canonicalModel === "ecommerce") {
      if (input.priceOnRequest || !input.priceBrutto) {
        return { valid: false, reason: "ECOMMERCE_PRICE_INVALID" };
      }
    }
    if (canonicalModel === "outbound") {
      if (!input.outboundUrl) {
        return { valid: false, reason: "OUTBOUND_URL_INVALID" };
      }
    }
  }

  return { valid: true };
}

export function isAdminOfferEditableStatus(status: unknown): boolean {
  return status === "draft" || status === "published" || status === "archived";
}

export async function executeAdminOfferEdit(
  db: NodePgDatabase<typeof schema>,
  input: AdminOfferEditInput
): Promise<AdminOfferEditResult> {
  try {
    return await db.transaction(async (tx) => {
      const offerRows = await tx
        .select({
          id: offers.id,
          publicationStatus: offers.publicationStatus,
          updatedAt: offers.updatedAt,
          title: offers.title,
          description: offers.description,
          imageUrl: offers.imageUrl,
          priceBrutto: sql<string | null>`${offers.priceBrutto}::text`,
          priceOnRequest: offers.priceOnRequest,
          offerModel: offers.offerModel,
          conversionType: offers.conversionType,
          outboundUrl: offers.outboundUrl,
          isFeatured: offers.isFeatured,
        })
        .from(offers)
        .where(eq(offers.id, input.offerId))
        .for("update");

      if (offerRows.length === 0) {
        return { ok: false, code: "OFFER_NOT_FOUND" };
      }

      const current = offerRows[0];

      if (!isAdminOfferEditableStatus(current.publicationStatus)) {
        return { ok: false, code: "OFFER_NOT_EDITABLE_STATUS" };
      }

      const expectedMs = input.expectedUpdatedAt ? new Date(input.expectedUpdatedAt).getTime() : null;
      const currentMs = current.updatedAt ? current.updatedAt.getTime() : null;

      if (expectedMs !== currentMs) {
        return { ok: false, code: "OFFER_CONFLICT" };
      }

      const currentAdminType = resolveTechnicalModelToAdminOfferType(current.offerModel, current.conversionType);
        
        let targetOfferModel = current.offerModel as "rfq" | "marketplace";
        let targetConversionType = current.conversionType as "inbound" | "outbound";
        
        if (currentAdminType !== input.adminOfferType) {
          const derived = deriveOfferStorageForCreate(input.adminOfferType);
          targetOfferModel = derived.offerModel;
          targetConversionType = derived.conversionType;
        }

        const rulesCheck = validateOfferEditBusinessRules(targetOfferModel, targetConversionType, input, current.publicationStatus as string);
      if (!rulesCheck.valid) {
        return { ok: false, code: "OFFER_TARGET_INVALID", reason: rulesCheck.reason };
      }

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
        current.imageUrl === input.imageUrl &&
        currentNormalizedPrice === input.priceBrutto &&
        current.priceOnRequest === input.priceOnRequest &&
        current.offerModel === targetOfferModel &&
          current.conversionType === targetConversionType &&
        current.outboundUrl === input.outboundUrl &&
        current.isFeatured === input.isFeatured
      ) {
        return { ok: true, code: "OFFER_UNCHANGED", changed: false };
      }

      await tx
        .update(offers)
        .set({
          title: input.title,
          description: input.description,
          imageUrl: input.imageUrl,
          priceBrutto: input.priceBrutto,
          priceOnRequest: input.priceOnRequest,
          offerModel: targetOfferModel,
          conversionType: targetConversionType,
          outboundUrl: input.outboundUrl,
          isFeatured: input.isFeatured,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(offers.id, input.offerId));

      return { ok: true, code: "OFFER_UPDATED", changed: true };
    });
  } catch (err) {
    const errorName = err instanceof Error ? err.name : "UnknownError";
    console.error("[offer-edit] stage=execution errorName=", errorName);
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}
