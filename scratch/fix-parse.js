const fs = require('fs');
let code = fs.readFileSync('src/lib/admin/offer-edit-core.ts', 'utf8');

const regex = /export function parseAdminOfferEditInput[\s\S]*?\}\n\nexport function validateOfferEditBusinessRules/m;

const replacement = `export function parseAdminOfferEditInput(rawInput: unknown): { ok: true; data: AdminOfferEditInput } | { ok: false; code: "OFFER_INVALID_INPUT" } | { ok: false; code: "OFFER_TARGET_INVALID"; reason: EditTargetInvalidReason } {
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
  if (typeof offerId !== "string" || !/^[1-9]\\d*$/.test(offerId)) {
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

export function validateOfferEditBusinessRules`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/lib/admin/offer-edit-core.ts', code, 'utf8');
