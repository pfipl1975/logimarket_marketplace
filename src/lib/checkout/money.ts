import {
  MAX_CHECKOUT_QUANTITY,
  MIN_CHECKOUT_QUANTITY,
  PLN_MINOR_UNITS,
  PRICE_SNAPSHOT_MAX_LENGTH,
} from "./constants";

// ---------------------------------------------------------------------------
// Quantity validation
// ---------------------------------------------------------------------------

/**
 * Validates a cart line quantity.
 *
 * RULES (owner-approved, sprint §7):
 *   - Must be a safe integer (no fractions, no Infinity, no NaN)
 *   - 1 ≤ quantity ≤ 999
 *   - Never truncated or clamped silently
 *
 * Returns true only when valid.
 */
export function isValidCheckoutQuantity(value: unknown): value is number {
  if (typeof value !== "number") return false;
  if (!Number.isSafeInteger(value)) return false;
  return value >= MIN_CHECKOUT_QUANTITY && value <= MAX_CHECKOUT_QUANTITY;
}

// ---------------------------------------------------------------------------
// Money helpers — EXACT BigInt arithmetic, no floating point
// ---------------------------------------------------------------------------

/**
 * Parses a PostgreSQL NUMERIC-originated decimal string into exact minor units (grosze for PLN).
 *
 *   "149.99" → BigInt(14999)
 *   "1.00"   → BigInt(100)
 *   "0.01"   → BigInt(1)
 *
 * Rejects:
 *   null / undefined / non-string / empty string
 *   strings that are not valid two-decimal decimal numbers
 *   zero or negative values
 *
 * IMPORTANT: Uses BigInt throughout. No Number(), no parseFloat(), no floating arithmetic.
 *
 * The input is expected to come from PostgreSQL ROUND(price_brutto, 2) cast to text —
 * so it is always in the form "NN.NN" or "N" or "N.N". We normalise to exactly 2 decimals.
 */
export function parseDecimalToMinorUnits(raw: string | null | undefined): bigint {
  if (raw == null || typeof raw !== "string" || raw.trim() === "") {
    throw new Error(`INVALID_PRICE: expected non-empty string, got ${JSON.stringify(raw)}`);
  }

  const trimmed = raw.trim();

  // Must match a valid decimal: optional sign is rejected (negative not allowed),
  // digits optionally followed by a decimal point and 1 or 2 digits.
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error(`INVALID_PRICE: not a valid decimal string: ${JSON.stringify(trimmed)}`);
  }

  const dotIndex = trimmed.indexOf(".");
  let integerPart: string;
  let fractionalPart: string;

  if (dotIndex === -1) {
    // No decimal point — treat as whole number
    integerPart = trimmed;
    fractionalPart = "00";
  } else {
    integerPart = trimmed.slice(0, dotIndex);
    const frac = trimmed.slice(dotIndex + 1);
    // Pad to 2 digits if only 1 decimal digit given
    fractionalPart = frac.length === 1 ? frac + "0" : frac;
  }

  // Both parts consist only of digits (validated by regex above)
  const minorUnits = BigInt(integerPart) * PLN_MINOR_UNITS + BigInt(fractionalPart);

  if (minorUnits <= BigInt(0)) {
    throw new Error(`INVALID_PRICE: price must be strictly positive, got ${JSON.stringify(trimmed)}`);
  }

  return minorUnits;
}

/**
 * Converts exact minor units (grosze) back to a normalised two-decimal string.
 *
 *   BigInt(14999) → "149.99"
 *   BigInt(100)   → "1.00"
 *   BigInt(1)     → "0.01"
 *
 * No floating point at any step.
 */
export function minorUnitsToDecimalString(minor: bigint): string {
  if (minor < BigInt(0)) {
    throw new Error(`INVALID_MINOR_UNITS: must be non-negative, got ${minor}`);
  }
  const intPart = minor / PLN_MINOR_UNITS;
  const fracPart = minor % PLN_MINOR_UNITS;
  const fracStr = fracPart.toString().padStart(2, "0");
  return `${intPart}.${fracStr}`;
}

/**
 * Compute exact line total from minor unit price and validated integer quantity.
 *
 *   BigInt(14999) × 3 → BigInt(44997)
 */
export function computeLineMinorUnits(unitMinor: bigint, quantity: number): bigint {
  return unitMinor * BigInt(quantity);
}

/**
 * Sum all line totals to get the order total in minor units.
 */
export function sumLineMinorUnits(lineTotals: bigint[]): bigint {
  return lineTotals.reduce((acc, v) => acc + v, BigInt(0));
}

/**
 * Validate that a price snapshot string fits within the varchar(50) DB column.
 */
export function isPriceSnapshotLengthValid(s: string): boolean {
  return s.length <= PRICE_SNAPSHOT_MAX_LENGTH;
}
