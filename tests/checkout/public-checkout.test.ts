import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { accountLinkWithNext } from "../../src/lib/auth/account-paths";
import { accountLandingPath } from "../../src/lib/buyer-account/paths";
import { checkoutPath } from "../../src/lib/checkout/paths";
import { runPublicCheckout, type PublicCheckoutDependencies } from "../../src/lib/checkout/public-checkout-core";
import type { BuyerOrderIntentContext } from "../../src/lib/checkout/buyer-order-intent";

const context = {
  authUserId: "server-auth-user",
  buyerOrganizationId: 12,
  contact: { contactName: "Server Contact", email: "server@example.invalid", phone: "+48000000000" },
} as BuyerOrderIntentContext;

function deps(overrides: Partial<PublicCheckoutDependencies> = {}): PublicCheckoutDependencies {
  return {
    currentUser: async () => ({ status: "authenticated", user: { id: "server-auth-user" } }),
    sessionHash: async () => "server-cookie-hash",
    resolveBuyer: async () => ({ ok: true, context }),
    execute: async () => ({ ok: true, marketplaceOrderId: 42 }),
    ...overrides,
  };
}

test("checkout routes and safe login continuation cover every locale", () => {
  for (const locale of ["pl", "en", "de", "fr", "uk", "es", "zh"] as const) {
    const path = checkoutPath(locale);
    assert.equal(path, locale === "pl" ? "/zamowienie" : `/${locale}/checkout`);
    assert.equal(accountLinkWithNext(locale, "login", path), `${locale === "pl" ? "" : `/${locale}`}/login?next=${encodeURIComponent(path)}`);
    assert.equal(accountLandingPath(path, locale), path);
    for (const unsafe of ["https://evil.example", "//evil.example", "/%2f%2fevil.example", "/login"]) {
      assert.notEqual(accountLandingPath(unsafe, locale), unsafe);
    }
  }
});

test("public E2 requires server authentication before cart or Buyer resolution", async () => {
  let touched = false;
  const result = await runPublicCheckout("x".repeat(2001), deps({
    currentUser: async () => ({ status: "unauthenticated" }),
    sessionHash: async () => { touched = true; return "hash"; },
  }));
  assert.deepEqual(result, { code: "AUTH_REQUIRED" });
  assert.equal(touched, false);
});

test("empty cart and Buyer readiness failures stop before E2", async () => {
  assert.deepEqual(await runPublicCheckout(null, deps({ sessionHash: async () => null })), { code: "CHECKOUT_CART_EMPTY" });
  for (const code of ["BUYER_PROFILE_REQUIRED", "ORGANIZATION_SELECTION_REQUIRED", "BUYER_NOT_READY", "BUYER_ACCOUNT_UNAVAILABLE"] as const) {
    const result = await runPublicCheckout(null, deps({ resolveBuyer: async () => ({ ok: false, code }) }));
    assert.deepEqual(result, { code });
  }
});

test("client input cannot override server Buyer identity; only bounded notes enter the context", async () => {
  let received: BuyerOrderIntentContext | null = null;
  const execution = deps({
    resolveBuyer: async () => ({ ok: true, context: { ...context, authUserId: "untrusted-resolver-value" } }),
    execute: async (hash, resolved) => {
      assert.equal(hash, "server-cookie-hash");
      received = resolved;
      return { ok: true, marketplaceOrderId: 42 };
    },
  });
  assert.deepEqual(await runPublicCheckout("  Deliver Monday  ", execution), { code: "CHECKOUT_ORDER_CREATED", orderId: 42 });
  assert.equal(received!.authUserId, "server-auth-user");
  assert.equal(received!.contact.contactName, "Server Contact");
  assert.equal(received!.contact.email, "server@example.invalid");
  assert.equal(received!.contact.message, "Deliver Monday");
  assert.deepEqual(await runPublicCheckout("x".repeat(2001), execution), { code: "CHECKOUT_VALIDATION_ERROR" });
});

test("cart and seller revalidation failures remain stable", async () => {
  for (const reason of ["CHECKOUT_CART_CHANGED", "CHECKOUT_SELLER_NOT_READY", "CHECKOUT_BUYER_NOT_READY", "SYSTEM_ERROR"] as const) {
    assert.deepEqual(await runPublicCheckout(null, deps({ execute: async () => ({ ok: false, reason }) })), { code: reason });
  }
});

test("public cart no longer invokes legacy checkout and onboarding re-sanitizes continuation", async () => {
  const root = process.cwd();
  const [drawer, actions, onboarding] = await Promise.all([
    readFile(path.join(root, "src/components/CartDrawer.tsx"), "utf8"),
    readFile(path.join(root, "src/app/actions.ts"), "utf8"),
    readFile(path.join(root, "src/app/buyer-account-actions.ts"), "utf8"),
  ]);
  assert.match(drawer, /checkoutPath\(locale\)/);
  assert.doesNotMatch(drawer, /CheckoutModal|submitCheckout/);
  assert.doesNotMatch(actions, /executeCheckout\(|export async function submitCheckout/);
  assert.match(onboarding, /accountLandingPath\(form\.get\("next"\)/);
});
