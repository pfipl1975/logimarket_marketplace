/**
 * Exact integer arithmetic for a confirmed B2B net-to-gross quotation.
 * A caller must establish VAT treatment from the actual transaction context.
 * Do not infer VAT rate from currency, country, Partner or product category.
 * This module is NOT connected to checkout or the legacy offers.price_brutto.
 */
export type ConfirmedVatBasis =
  | { kind: "confirmed_rate"; rateBasisPoints: number }
  | { kind: "undetermined" }
  | { kind: "special_treatment"; treatment: "exempt" | "reverse_charge" | "outside_scope" };

export type NetVatResult =
  | { status: "calculated"; netMinor: bigint; vatMinor: bigint; grossMinor: bigint; rateBasisPoints: number }
  | { status: "requires_tax_review"; reason: "RATE_UNDETERMINED" | "SPECIAL_TREATMENT" };

const RATE_DENOMINATOR = BigInt(10_000);
const HALF_DENOMINATOR = BigInt(5_000);

/** Rounds VAT on a positive net line amount to the nearest minor unit, half up. */
export function calculateNetVat(netMinor: bigint, basis: ConfirmedVatBasis): NetVatResult {
  if (typeof netMinor !== "bigint" || netMinor <= BigInt(0)) {
    throw new RangeError("NET_MINOR_MUST_BE_POSITIVE_BIGINT");
  }

  if (basis.kind === "undetermined") {
    return { status: "requires_tax_review", reason: "RATE_UNDETERMINED" };
  }
  if (basis.kind === "special_treatment") {
    return { status: "requires_tax_review", reason: "SPECIAL_TREATMENT" };
  }

  const rate = basis.rateBasisPoints;
  if (!Number.isSafeInteger(rate) || rate < 0 || rate > 10_000) {
    throw new RangeError("INVALID_VAT_RATE_BASIS_POINTS");
  }

  const vatMinor = (netMinor * BigInt(rate) + HALF_DENOMINATOR) / RATE_DENOMINATOR;
  return { status: "calculated", netMinor, vatMinor, grossMinor: netMinor + vatMinor, rateBasisPoints: rate };
}
