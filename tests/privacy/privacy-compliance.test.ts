import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { getPrivacyPolicyPath, getPrivacyPolicyLocaleLinks } from "@/lib/i18n/paths";
import { locales } from "@/lib/i18n/config";

test("Privacy Compliance - i18n paths helper", async (t) => {
  await t.test("getPrivacyPolicyPath resolves correctly for all locales", () => {
    assert.strictEqual(getPrivacyPolicyPath("pl"), "/polityka-prywatnosci");
    assert.strictEqual(getPrivacyPolicyPath("en"), "/en/polityka-prywatnosci");
    assert.strictEqual(getPrivacyPolicyPath("de"), "/de/polityka-prywatnosci");
    assert.strictEqual(getPrivacyPolicyPath("fr"), "/fr/polityka-prywatnosci");
    assert.strictEqual(getPrivacyPolicyPath("uk"), "/uk/polityka-prywatnosci");
    assert.strictEqual(getPrivacyPolicyPath("es"), "/es/polityka-prywatnosci");
    assert.strictEqual(getPrivacyPolicyPath("zh"), "/zh/polityka-prywatnosci");
  });

  await t.test("getPrivacyPolicyLocaleLinks provides alternate links for all 7 locales", () => {
    const links = getPrivacyPolicyLocaleLinks();
    for (const loc of locales) {
      assert.ok(links[loc]);
      assert.strictEqual(links[loc], getPrivacyPolicyPath(loc));
    }
  });
});

test("Privacy Compliance - 7 Locales Dictionary Schema Parity & Art. 13 Keys", () => {
  const messagesDir = path.join(process.cwd(), "src/messages");

  function getKeys(obj: Record<string, unknown>, prefix = ""): string[] {
    let keys: string[] = [];
    for (const k of Object.keys(obj)) {
      const fullKey = prefix ? prefix + "." + k : k;
      const val = obj[k];
      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        keys = keys.concat(getKeys(val as Record<string, unknown>, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    return keys;
  }

  const plContent = JSON.parse(fs.readFileSync(path.join(messagesDir, "pl.json"), "utf8"));
  const plKeys = getKeys(plContent).sort();

  for (const loc of locales) {
    const content = JSON.parse(fs.readFileSync(path.join(messagesDir, loc + ".json"), "utf8"));
    const locKeys = getKeys(content).sort();

    const missing = plKeys.filter((k) => !locKeys.includes(k));
    const extra = locKeys.filter((k) => !plKeys.includes(k));

    assert.deepStrictEqual(missing, [], "Locale " + loc + " is missing keys");
    assert.deepStrictEqual(extra, [], "Locale " + loc + " has extra keys");

    // Ensure rfq.consent is deleted
    assert.strictEqual(content.rfq.consent, undefined, "Locale " + loc + " must not contain rfq.consent");

    // Ensure required privacy keys exist
    assert.ok(content.rfq.art13Notice, "Locale " + loc + " missing rfq.art13Notice");
    assert.ok(content.rfq.privacyPolicyLink, "Locale " + loc + " missing rfq.privacyPolicyLink");
    assert.ok(content.checkout.legalNote, "Locale " + loc + " missing checkout.legalNote");
    assert.ok(content.checkout.privacyPolicyLink, "Locale " + loc + " missing checkout.privacyPolicyLink");
    assert.ok(content.form.messagePrivacyHint, "Locale " + loc + " missing form.messagePrivacyHint");
    assert.ok(content.footer.privacyPolicy, "Locale " + loc + " missing footer.privacyPolicy");
    assert.ok(content.privacy, "Locale " + loc + " missing privacy object");
    assert.ok(content.privacy.tableOfContents, "Locale " + loc + " missing privacy.tableOfContents");
    assert.ok(content.privacy.sections, "Locale " + loc + " missing privacy.sections");
    assert.strictEqual(Object.keys(content.privacy.sections).length, 16, "Locale " + loc + " must have exactly 16 privacy sections");
  }
});

test("Privacy Compliance - Session Hash Security Hardening Static Audit", () => {
  const sessionHashFile = path.join(process.cwd(), "src/lib/session/session-hash.ts");
  const code = fs.readFileSync(sessionHashFile, "utf8");

  assert.ok(code.includes("export async function getExistingSessionHash"), "Must export getExistingSessionHash");
  assert.ok(code.includes("export async function getOrCreateSessionHash"), "Must export getOrCreateSessionHash");
  assert.ok(!code.includes("getSessionHash"), "Must not export or contain deprecated getSessionHash");
  assert.ok(!code.includes("maxAge"), "Must not specify maxAge for session cookie");
  assert.ok(!code.includes("expires"), "Must not specify expires for session cookie");
  assert.ok(code.includes("secure: true"), "Must specify secure: true");
  assert.ok(code.includes('sameSite: "lax"'), "Must specify sameSite: lax");
  assert.ok(code.includes("httpOnly: true"), "Must specify httpOnly: true");
});

test("Privacy Compliance - Outbound Route Must NOT Create Cart Cookie", () => {
  const outboundRouteFile = path.join(process.cwd(), "src/app/go/[id]/route.ts");
  const code = fs.readFileSync(outboundRouteFile, "utf8");

  assert.ok(!code.includes("getOrCreateSessionHash"), "Outbound route must NOT call getOrCreateSessionHash");
  assert.ok(!code.includes("getSessionHash"), "Outbound route must NOT call deprecated getSessionHash");
  assert.ok(code.includes("getExistingSessionHash"), "Outbound route must only use getExistingSessionHash");
});

test("Privacy Compliance - Lazy Session Hash Action Usage Static Audit", () => {
  const actionsFile = path.join(process.cwd(), "src/app/actions.ts");
  const code = fs.readFileSync(actionsFile, "utf8");

  function extractFunctionBody(fnName: string): string {
    const fnStart = code.indexOf(`export async function ${fnName}`);
    assert.ok(fnStart !== -1, `Function ${fnName} must exist in src/app/actions.ts`);
    const openBrace = code.indexOf("{", fnStart);
    assert.ok(openBrace !== -1, `Opening brace for ${fnName} not found`);

    // Find matching closing brace
    let depth = 1;
    let index = openBrace + 1;
    while (depth > 0 && index < code.length) {
      if (code[index] === "{") depth++;
      else if (code[index] === "}") depth--;
      index++;
    }
    return code.substring(openBrace, index);
  }

  const getCartCountBody = extractFunctionBody("getCartCount");
  assert.ok(getCartCountBody.includes("getExistingSessionHash()"), "getCartCount must use getExistingSessionHash");
  assert.ok(!getCartCountBody.includes("getOrCreateSessionHash"), "getCartCount must NOT use getOrCreateSessionHash");

  const getCartItemsBody = extractFunctionBody("getCartItems");
  assert.ok(getCartItemsBody.includes("getExistingSessionHash()"), "getCartItems must use getExistingSessionHash");
  assert.ok(!getCartItemsBody.includes("getOrCreateSessionHash"), "getCartItems must NOT use getOrCreateSessionHash");

  const addToCartBody = extractFunctionBody("addToCart");
  assert.ok(addToCartBody.includes("getOrCreateSessionHash()"), "addToCart must use getOrCreateSessionHash");

  const removeFromCartBody = extractFunctionBody("removeFromCart");
  assert.ok(removeFromCartBody.includes("getExistingSessionHash()"), "removeFromCart must use getExistingSessionHash");
  assert.ok(!removeFromCartBody.includes("getOrCreateSessionHash"), "removeFromCart must NOT use getOrCreateSessionHash");

  const updateCartQuantityBody = extractFunctionBody("updateCartQuantity");
  assert.ok(updateCartQuantityBody.includes("getExistingSessionHash()"), "updateCartQuantity must use getExistingSessionHash");
  assert.ok(!updateCartQuantityBody.includes("getOrCreateSessionHash"), "updateCartQuantity must NOT use getOrCreateSessionHash");

  const clearCartBody = extractFunctionBody("clearCart");
  assert.ok(clearCartBody.includes("getExistingSessionHash()"), "clearCart must use getExistingSessionHash");
  assert.ok(!clearCartBody.includes("getOrCreateSessionHash"), "clearCart must NOT use getOrCreateSessionHash");

  const submitCheckoutBody = extractFunctionBody("submitCheckout");
  assert.ok(submitCheckoutBody.includes("getExistingSessionHash()"), "submitCheckout must use getExistingSessionHash");
  assert.ok(!submitCheckoutBody.includes("getOrCreateSessionHash"), "submitCheckout must NOT use getOrCreateSessionHash");
});
