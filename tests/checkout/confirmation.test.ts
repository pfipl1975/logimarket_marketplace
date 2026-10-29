import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes } from "node:crypto";
import { canonicalLines, confirmationLine, issueCheckoutConfirmation, matchesCheckoutConfirmation, verifyCheckoutConfirmation } from "../../src/lib/checkout/confirmation";
import { formatCheckoutMinorUnits } from "../../src/lib/checkout/money";

const secret = randomBytes(32).toString("hex");
const context = { authUserId: "synthetic-buyer", buyerOrganizationId: 1, sessionHash: "synthetic-private-session" };
const lines = [
  confirmationLine({ id: 2, offerId: 12, partnerId: 8, quantity: 3, price: "0.07" }),
  confirmationLine({ id: 1, offerId: 11, partnerId: 7, quantity: 2, price: "100.00" }),
];
const now = 1800000000000;
const token = issueCheckoutConfirmation(lines, context, secret, now);
test("R03 exact snapshot: canonical order, all sellers, quantities, unit prices and totals", () => {
  const accepted = verifyCheckoutConfirmation(token, context, secret, now)!;
  assert.equal(accepted.total, "20021");
  assert.equal(accepted.currency, "PLN");
  assert.deepEqual(accepted.lines.map(line => line.id), [1, 2]);
  assert.equal(matchesCheckoutConfirmation(accepted, [...lines].reverse()), true);
  const payload = Buffer.from(token.split(".")[0], "base64url").toString();
  assert.equal(payload.includes(context.authUserId), false);
  assert.equal(payload.includes(context.sessionHash), false);
  assert.equal(payload.includes(secret), false);
});
test("R03 rejects increases, decreases, unchanged total with shifted unit prices, quantities, composition and sellers", () => {
  const accepted = verifyCheckoutConfirmation(token, context, secret, now)!;
  for (const price of ["135.79", "80.00"]) {
    assert.equal(matchesCheckoutConfirmation(accepted, [lines[0], confirmationLine({ id: 1, offerId: 11, partnerId: 7, quantity: 2, price })]), false);
  }
  const sameTotal = [confirmationLine({ id: 1, offerId: 11, partnerId: 7, quantity: 2, price: "99.97" }),
    confirmationLine({ id: 2, offerId: 12, partnerId: 8, quantity: 3, price: "0.09" })];
  assert.equal(sameTotal.reduce((sum, line) => sum + BigInt(line.sum), BigInt(0)), BigInt(20021));
  assert.equal(matchesCheckoutConfirmation(accepted, sameTotal), false);
  for (const changed of [{ ...lines[1], partnerId: 9 }, { ...lines[1], offerId: 99 },
    { ...lines[1], id: 100 }, { ...lines[1], quantity: 1, sum: "10000" }]) {
    assert.equal(matchesCheckoutConfirmation(accepted, [lines[0], changed]), false);
  }
  assert.equal(matchesCheckoutConfirmation(accepted, [lines[0]]), false);
});
test("R03 rejects missing/malformed/foreign signatures and client-tampered payloads", () => {
  for (const value of [null, undefined, "", "x.y", token + ".extra", "x".repeat(131073), token.slice(0, -1) + (token.endsWith("A") ? "Q" : "A")]) {
    assert.equal(verifyCheckoutConfirmation(value, context, secret, now), null);
  }
  assert.equal(verifyCheckoutConfirmation(token, context, randomBytes(32).toString("hex"), now), null);
  const [payload, signature] = token.split(".");
  const changed = JSON.parse(Buffer.from(payload, "base64url").toString());
  changed.total = "1";
  assert.equal(verifyCheckoutConfirmation(Buffer.from(JSON.stringify(changed)).toString("base64url") + "." + signature, context, secret, now), null);
  changed.v = 2;
  assert.equal(verifyCheckoutConfirmation(Buffer.from(JSON.stringify(changed)).toString("base64url") + "." + signature, context, secret, now), null);
});
test("R03 binds buyer, organization and session; enforces expiry and issuance time", () => {
  for (const other of [{ ...context, authUserId: "other" }, { ...context, buyerOrganizationId: 2 }, { ...context, sessionHash: "other" }]) {
    assert.equal(verifyCheckoutConfirmation(token, other, secret, now), null);
  }
  assert.equal(verifyCheckoutConfirmation(token, context, secret, now - 1), null);
  assert.equal(verifyCheckoutConfirmation(token, context, secret, now + 15 * 60 * 1000), null);
});
test("R03 missing/invalid dedicated key fails closed without falling back to other secrets", () => {
  const saved = process.env.CHECKOUT_CONFIRMATION_SECRET;
  try {
    delete process.env.CHECKOUT_CONFIRMATION_SECRET;
    assert.throws(() => issueCheckoutConfirmation(lines, context));
    assert.throws(() => verifyCheckoutConfirmation(token, context));
    for (const value of ["short", "0".repeat(64), "ff".repeat(32), "z".repeat(64)]) {
      assert.throws(() => issueCheckoutConfirmation(lines, context, value));
    }
  } finally {
    if (saved === undefined) delete process.env.CHECKOUT_CONFIRMATION_SECRET;
    else process.env.CHECKOUT_CONFIRMATION_SECRET = saved;
  }
});
test("R03 validation rejects invalid prices, quantities, duplicate cart IDs and inconsistent sums", () => {
  for (const price of ["0", "-1", "NaN", "1.234", null]) assert.throws(() => confirmationLine({ id: 1, offerId: 1, partnerId: 1, quantity: 1, price }));
  for (const quantity of [0, -1, 1.1, 1000, Infinity]) assert.throws(() => confirmationLine({ id: 1, offerId: 1, partnerId: 1, quantity, price: "1" }));
  assert.throws(() => canonicalLines([lines[0], lines[0]]));
  assert.throws(() => canonicalLines([{ ...lines[0], sum: "100" }]));
});
test("R03 exact display retains grosze beyond Number precision in every locale", () => {
  const huge = BigInt("99999999999999999999999999999901");
  for (const locale of ["pl", "en", "de", "fr", "uk", "es", "zh"]) {
    const formatted = formatCheckoutMinorUnits(huge, locale);
    assert.match(formatted, /[.,]01/);
    assert.equal(formatted.replace(/[^0-9]/g, ""), huge.toString());
  }
});
