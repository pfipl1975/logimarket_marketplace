import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidCheckoutQuantity,
  parseDecimalToMinorUnits,
  minorUnitsToDecimalString,
  computeLineMinorUnits,
  sumLineMinorUnits,
} from "../../src/lib/checkout/money";

test("Money Arithmetic Contract", async (t) => {
  await t.test("parseDecimalToMinorUnits exactly parses string to minor units", () => {
    assert.equal(parseDecimalToMinorUnits("149.99"), BigInt(14999));
    assert.equal(parseDecimalToMinorUnits("1.00"), BigInt(100));
    assert.equal(parseDecimalToMinorUnits("0.01"), BigInt(1));
    assert.equal(parseDecimalToMinorUnits("0.10"), BigInt(10));
    assert.equal(parseDecimalToMinorUnits("0.1"), BigInt(10));
    assert.equal(parseDecimalToMinorUnits("100"), BigInt(10000));
    assert.equal(parseDecimalToMinorUnits("100.0"), BigInt(10000));
  });

  await t.test("parseDecimalToMinorUnits rejects invalid inputs", () => {
    assert.throws(() => parseDecimalToMinorUnits(null), /INVALID_PRICE/);
    assert.throws(() => parseDecimalToMinorUnits(undefined), /INVALID_PRICE/);
    assert.throws(() => parseDecimalToMinorUnits(""), /INVALID_PRICE/);
    assert.throws(() => parseDecimalToMinorUnits("  "), /INVALID_PRICE/);
    assert.throws(() => parseDecimalToMinorUnits("abc"), /INVALID_PRICE/);
    assert.throws(() => parseDecimalToMinorUnits("1.2.3"), /INVALID_PRICE/);
    assert.throws(() => parseDecimalToMinorUnits("1,23"), /INVALID_PRICE/);
    assert.throws(() => parseDecimalToMinorUnits("1.234"), /INVALID_PRICE/);
  });

  await t.test("parseDecimalToMinorUnits rejects zero and negative values", () => {
    assert.throws(() => parseDecimalToMinorUnits("0"), /INVALID_PRICE/);
    assert.throws(() => parseDecimalToMinorUnits("0.00"), /INVALID_PRICE/);
    assert.throws(() => parseDecimalToMinorUnits("-1.00"), /INVALID_PRICE/);
    assert.throws(() => parseDecimalToMinorUnits("-0.01"), /INVALID_PRICE/);
  });

  await t.test("minorUnitsToDecimalString formats exactly", () => {
    assert.equal(minorUnitsToDecimalString(BigInt(14999)), "149.99");
    assert.equal(minorUnitsToDecimalString(BigInt(100)), "1.00");
    assert.equal(minorUnitsToDecimalString(BigInt(1)), "0.01");
    assert.equal(minorUnitsToDecimalString(BigInt(0)), "0.00");
  });

  await t.test("minorUnitsToDecimalString rejects negatives", () => {
    assert.throws(() => minorUnitsToDecimalString(BigInt(-1)), /INVALID_MINOR_UNITS/);
  });

  await t.test("computeLineMinorUnits exact arithmetic", () => {
    assert.equal(computeLineMinorUnits(BigInt(14999), 3), BigInt(44997));
    assert.equal(minorUnitsToDecimalString(computeLineMinorUnits(BigInt(14999), 3)), "449.97");
    
    assert.equal(computeLineMinorUnits(BigInt(1), 100), BigInt(100));
    assert.equal(minorUnitsToDecimalString(computeLineMinorUnits(BigInt(1), 100)), "1.00");
  });

  await t.test("sumLineMinorUnits exactly sums array of BigInts", () => {
    assert.equal(sumLineMinorUnits([BigInt(1000), BigInt(2000), BigInt(500)]), BigInt(3500));
    assert.equal(sumLineMinorUnits([]), BigInt(0));
  });
});

test("Quantity Validation Contract", async (t) => {
  await t.test("Valid quantities", () => {
    assert.equal(isValidCheckoutQuantity(1), true);
    assert.equal(isValidCheckoutQuantity(10), true);
    assert.equal(isValidCheckoutQuantity(999), true);
  });

  await t.test("Invalid quantities", () => {
    assert.equal(isValidCheckoutQuantity(0), false);
    assert.equal(isValidCheckoutQuantity(-1), false);
    assert.equal(isValidCheckoutQuantity(1000), false);
    assert.equal(isValidCheckoutQuantity(1.5), false);
    assert.equal(isValidCheckoutQuantity(NaN), false);
    assert.equal(isValidCheckoutQuantity(Infinity), false);
    assert.equal(isValidCheckoutQuantity(-Infinity), false);
    assert.equal(isValidCheckoutQuantity(Number.MAX_SAFE_INTEGER + 1), false);
    assert.equal(isValidCheckoutQuantity(null), false);
    assert.equal(isValidCheckoutQuantity(undefined), false);
    assert.equal(isValidCheckoutQuantity("1"), false);
  });
});
