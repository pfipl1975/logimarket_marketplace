import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const actionsSource = readFileSync(
  new URL("../../src/app/actions.ts", import.meta.url),
  "utf8"
);
const publicCheckoutActionSource = readFileSync(
  new URL("../../src/app/checkout-actions.ts", import.meta.url),
  "utf8"
);
const publicCheckoutCoreSource = readFileSync(
  new URL("../../src/lib/checkout/public-checkout-core.ts", import.meta.url),
  "utf8"
);

const checkoutCoreSource = readFileSync(
  new URL("../../src/lib/checkout/checkout-core.ts", import.meta.url),
  "utf8"
);

test("Checkout Action Contract", async (t) => {
  await t.test("public E2 action delegates to server auth, cart, Buyer resolver and canonical transaction", () => {
    assert.match(publicCheckoutActionSource, /export async function submitMarketplaceCheckout\s*\(/);
    assert.match(publicCheckoutActionSource, /currentUser:\s*getCurrentUser\b/);
    assert.match(publicCheckoutActionSource, /sessionHash:\s*getExistingSessionHash\b/);
    assert.match(publicCheckoutActionSource, /resolveBuyer:\s*resolveBuyerOrderIntentContext\b/);
    assert.match(publicCheckoutActionSource, /executeMarketplaceCheckout\s*\(\s*db\s*,\s*sessionHash\s*,\s*context\s*\)/);
    assert.doesNotMatch(publicCheckoutActionSource, /\bgetOrCreateSessionHash\b|\bexecuteCheckout\s*\(/);
  });

  await t.test("browser payload supplies only transaction notes and navigation locale", () => {
    const fields = [...publicCheckoutActionSource.matchAll(/form\.get\(\s*["']([^"']+)["']\s*\)/g)].map(match => match[1]).sort();
    assert.deepEqual(fields, ["locale", "message"]);
    assert.match(publicCheckoutActionSource, /runPublicCheckout\s*\(\s*form\.get\(\s*"message"\s*\)/);
    assert.match(publicCheckoutCoreSource, /deps\.currentUser\s*\(\s*\)/);
    assert.match(publicCheckoutCoreSource, /deps\.resolveBuyer\s*\(\s*current\.user\.id\s*\)/);
    assert.match(publicCheckoutCoreSource, /authUserId:\s*current\.user\.id/);
    assert.match(publicCheckoutCoreSource, /contact:\s*\{\s*\.\.\.buyer\.context\.contact\s*,\s*message:\s*parsed\.data/);
  });

  await t.test("legacy orders action cannot be reached through the public checkout action", () => {
    assert.doesNotMatch(actionsSource, /export async function submitCheckout\s*\(|\bexecuteCheckout\s*\(/);
    assert.doesNotMatch(publicCheckoutActionSource, /\bsubmitCheckout\s*\(|\bexecuteCheckout\s*\(/);
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
    assert.match(checkoutCoreSource, /SELECT[\s\S]*FROM[\s\S]*\$\{offers\}/);
    assert.match(checkoutCoreSource, /WHERE\s*id\s*=\s*ANY/i);
  });

  await t.test("Inserts into orders and order_items inside transaction", () => {
    assert.match(checkoutCoreSource, /tx\s*\.\s*insert\(\s*orders\s*\)/);
    assert.match(checkoutCoreSource, /tx\s*\.\s*insert\(\s*orderItems\s*\)/);
  });

  await t.test("Deletes cart items inside transaction", () => {
    assert.match(checkoutCoreSource, /DELETE\s+FROM[\s\S]*\$\{cartItems\}/);
  });

  await t.test("Logging Hygiene: no commercial values in failure logs", () => {
    // Assert we do not log cartRow.id, offerId, quantity, etc. on failure.
    assert.doesNotMatch(checkoutCoreSource, /validation failed.*cartRow\.id/);
    assert.doesNotMatch(checkoutCoreSource, /console\.error\(.*offerId.*\)/);
    assert.doesNotMatch(checkoutCoreSource, /console\.error\(.*price.*\)/);
  });
});

test("AddToCart Action Contract", async (t) => {
  await t.test("addToCart uses canonical database rounding for price normalization", () => {
    assert.match(actionsSource, /ROUND\(\$\{offers\.priceBrutto\},\s*2\)::text/);
  });

  await t.test("addToCart validates rounded string with exact minor unit parser", () => {
    assert.match(actionsSource, /parseDecimalToMinorUnits\(\s*o\.normalizedPrice\s*\)/);
    assert.doesNotMatch(actionsSource, /Number\(o\.priceBrutto\)/);
    assert.doesNotMatch(actionsSource, /parseFloat\(/);
    assert.doesNotMatch(actionsSource, /Math\.round\(/);
  });
});
