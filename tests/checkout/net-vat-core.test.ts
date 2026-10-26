import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateNetVat } from "../../src/lib/pricing/net-vat-core";

describe("B2B net/VAT monetary contract", () => {
  it("calculates confirmed 23% VAT using exact grosz integers", () => {
    assert.deepEqual(calculateNetVat(BigInt(1_800_000), { kind: "confirmed_rate", rateBasisPoints: 2300 }), {
      status: "calculated", netMinor: BigInt(1_800_000), vatMinor: BigInt(414_000),
      grossMinor: BigInt(2_214_000), rateBasisPoints: 2300,
    });
  });
  it("handles 8% and confirmed 0% as distinct explicit rates", () => {
    const atEight = calculateNetVat(BigInt(100_00), { kind: "confirmed_rate", rateBasisPoints: 800 });
    const atZero = calculateNetVat(BigInt(100_00), { kind: "confirmed_rate", rateBasisPoints: 0 });
    assert.equal(atEight.status === "calculated" && atEight.grossMinor, BigInt(108_00));
    assert.equal(atZero.status === "calculated" && atZero.vatMinor, BigInt(0));
  });
  it("rounds exactly 0.5 minor unit up, but not smaller fractions", () => {
    const atHalf = calculateNetVat(BigInt(1), { kind: "confirmed_rate", rateBasisPoints: 5000 });
    const belowHalf = calculateNetVat(BigInt(1), { kind: "confirmed_rate", rateBasisPoints: 2300 });
    assert.equal(atHalf.status === "calculated" && atHalf.vatMinor, BigInt(1));
    assert.equal(belowHalf.status === "calculated" && belowHalf.vatMinor, BigInt(0));
  });
  it("preserves integer precision above Number.MAX_SAFE_INTEGER", () => {
    const net = BigInt("9007199254740993");
    const result = calculateNetVat(net, { kind: "confirmed_rate", rateBasisPoints: 2300 });
    assert.equal(result.status === "calculated" && result.netMinor, net);
    assert.equal(result.status === "calculated" && result.grossMinor, BigInt("11078855083331421"));
  });
  it("does not assume a tax rate or reinterpret special VAT treatment", () => {
    assert.deepEqual(calculateNetVat(BigInt(100), { kind: "undetermined" }), {
      status: "requires_tax_review", reason: "RATE_UNDETERMINED",
    });
    for (const treatment of ["exempt", "reverse_charge", "outside_scope"] as const) {
      assert.deepEqual(calculateNetVat(BigInt(100), { kind: "special_treatment", treatment }), {
        status: "requires_tax_review", reason: "SPECIAL_TREATMENT",
      });
    }
  });
  it("rejects invalid net values and malformed or unsupported rates", () => {
    assert.throws(() => calculateNetVat(BigInt(0), { kind: "confirmed_rate", rateBasisPoints: 2300 }), /NET_MINOR/);
    assert.throws(() => calculateNetVat(-BigInt(1), { kind: "confirmed_rate", rateBasisPoints: 2300 }), /NET_MINOR/);
    for (const rate of [-1, 10001, 23.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => calculateNetVat(BigInt(100), { kind: "confirmed_rate", rateBasisPoints: rate }), /INVALID_VAT_RATE/);
    }
  });
});
