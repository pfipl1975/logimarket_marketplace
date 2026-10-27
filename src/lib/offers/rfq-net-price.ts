import { minorUnitsToDecimalString, parseDecimalToMinorUnits } from "@/lib/checkout/money";
import type { CanonicalOfferModelResolution } from "@/lib/offers/model";

export type RfqNetPriceFields = {
  priceNetto: string | null;
  rfqNetPriceVisible: boolean;
};

/** Numeric(18,2): at most 16 digits before the decimal point. */
const MAX_MINOR_UNITS = BigInt("999999999999999999");

export function normalizeRfqNetPrice(value: unknown): string | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("RFQ_NET_PRICE_INVALID");
  const raw = value.trim();
  if (raw.length === 0) return null;
  const minor = parseDecimalToMinorUnits(raw);
  if (minor > MAX_MINOR_UNITS) throw new Error("RFQ_NET_PRICE_OUT_OF_RANGE");
  return minorUnitsToDecimalString(minor);
}

/**
 * Both fields must be supplied together when editing the RFQ net price.
 * No fields means "leave the existing net price untouched" (backwards compatibility).
 */
export function parseRfqNetPriceFields(
  price: unknown,
  visible: unknown,
): RfqNetPriceFields | null {
  if (price === undefined && visible === undefined) return null;
  if (typeof visible !== "boolean") throw new Error("RFQ_NET_VISIBILITY_INVALID");
  const priceNetto = normalizeRfqNetPrice(price);
  if (visible && priceNetto === null) throw new Error("RFQ_VISIBLE_PRICE_REQUIRED");
  return { priceNetto, rfqNetPriceVisible: visible };
}

/** Only canonical inbound RFQ can reveal a positive, explicitly opted-in net price. */
export function getPublicRfqNetPrice(offer: {
  offerModel: CanonicalOfferModelResolution;
  priceNetto?: string | null;
  rfqNetPriceVisible?: boolean;
}): string | null {
  if (offer.offerModel !== "rfq" || offer.rfqNetPriceVisible !== true) return null;
  try {
    return normalizeRfqNetPrice(offer.priceNetto);
  } catch {
    return null;
  }
}

/**
 * Sanitize server-side public CatalogOffer values before Server Actions and
 * React Server Components can serialize them for the browser.
 * Private admin/partner read models remain untouched.
 */
export function projectPublicOfferPrices(offer: {
  offerModel: CanonicalOfferModelResolution;
  publicationStatus: string;
  isActive: boolean;
  priceBrutto: string | null;
  priceNetto: string | null;
  rfqNetPriceVisible: boolean;
}): RfqNetPriceFields & { priceBrutto: string | null } {
  if (offer.offerModel !== "rfq") {
    return { priceBrutto: offer.priceBrutto, priceNetto: null, rfqNetPriceVisible: false };
  }
  const priceNetto =
    offer.publicationStatus === "published" && offer.isActive
      ? getPublicRfqNetPrice(offer)
      : null;
  return { priceBrutto: null, priceNetto, rfqNetPriceVisible: priceNetto !== null };
}

/** Exact BigInt formatting: no JS floating-point conversion. */
export function formatRfqNetPrice(value: string, locale: string): string {
  const minor = parseDecimalToMinorUnits(value);
  const formatter = new Intl.NumberFormat(locale);
  const decimal = new Intl.NumberFormat(locale, { minimumFractionDigits: 1 })
    .formatToParts(1.1).find((part) => part.type === "decimal")?.value ?? ",";
  return formatter.format(minor / BigInt(100)) + decimal +
    (minor % BigInt(100)).toString().padStart(2, "0") + " PLN";
}
