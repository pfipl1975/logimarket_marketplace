import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const actionsSource = readFileSync(
  new URL("../../src/app/actions.ts", import.meta.url),
  "utf8"
);

const checkoutCoreSource = readFileSync(
  new URL("../../src/lib/checkout/checkout-core.ts", import.meta.url),
  "utf8"
);

test("Checkout Action Contract", async (t) => {
  await t.test("submitCheckout accepts only contact fields", () => {
    // Look for the submitCheckout definition
    const submitRegex = /export async function submitCheckout\(([^)]*)\)/;
    const match = actionsSource.match(submitRegex);
    assert.ok(match, "submitCheckout must exist");
    
    // It should just take rawInput: unknown
    assert.match(match[1], /rawInput:\s*unknown/);
  });

  await t.test("submitCheckout uses CheckoutContactSchema for validation", () => {
    assert.match(actionsSource, /CheckoutContactSchema\.safeParse/);
    assert.match(actionsSource, /code:\s*"CHECKOUT_VALIDATION_ERROR"/);
  });

  await t.test("submitCheckout does not take items, totalAmount, unitPrice, quantity from client", () => {
    // Ensure no type definition inline that accepts items
    assert.doesNotMatch(actionsSource, /items:\s*\{\s*offerId/);
    assert.doesNotMatch(actionsSource, /totalAmount/);
  });
});

test("Checkout Core Transaction Contract", async (t) => {
  await t.test("Uses db.transaction", () => {
    assert.match(checkoutCoreSource, /db\.transaction\(/);
  });

  await t.test("Locks cart rows using FOR UPDATE", () => {
    assert.match(checkoutCoreSource, /SELECT\s+id,\s*offer_id,\s*quantity\s+FROM/i);
    assert.match(checkoutCoreSource, /FOR\s+UPDATE/i);
  });

  await t.test("Reconstructs offers based on locked cart rows", () => {
    assert.match(checkoutCoreSource, /SELECT.*FROM.*\$\{offers\}/s);
    assert.match(checkoutCoreSource, /WHERE\s*id\s*=\s*ANY/i);
  });

  await t.test("Inserts into orders and order_items inside transaction", () => {
    assert.match(checkoutCoreSource, /tx\s*\.\s*insert\(\s*orders\s*\)/);
    assert.match(checkoutCoreSource, /tx\s*\.\s*insert\(\s*orderItems\s*\)/);
  });

  await t.test("Deletes cart items inside transaction", () => {
    assert.match(checkoutCoreSource, /DELETE\s+FROM.*\$\{cartItems\}/s);
  });
});
