import { z } from "zod";
import { CHECKOUT_MESSAGE_MAX_LENGTH } from "./constants";
import type { BuyerOrderIntentContext, BuyerOrderIntentFailure } from "./buyer-order-intent";
import type { MarketplaceCheckoutResult } from "./marketplace-checkout-core";

export type PublicCheckoutCode =
  | "IDLE" | "AUTH_REQUIRED" | BuyerOrderIntentFailure | "CHECKOUT_VALIDATION_ERROR"
  | "CHECKOUT_CART_EMPTY" | "CHECKOUT_CART_CHANGED" | "CHECKOUT_BUYER_NOT_READY"
  | "CHECKOUT_SELLER_NOT_READY" | "CHECKOUT_ORDER_CREATED" | "SYSTEM_ERROR";

export type PublicCheckoutResult =
  | { code: "CHECKOUT_ORDER_CREATED"; orderId: number }
  | { code: Exclude<PublicCheckoutCode, "CHECKOUT_ORDER_CREATED"> };

const messageSchema = z.string().trim().max(CHECKOUT_MESSAGE_MAX_LENGTH).nullable().transform(value => value || null);

export type PublicCheckoutDependencies = {
  currentUser: () => Promise<{ status: "authenticated"; user: { id: string } } | { status: "unauthenticated" | "unavailable" }>;
  sessionHash: () => Promise<string | null>;
  resolveBuyer: (authUserId: string) => Promise<{ ok: true; context: BuyerOrderIntentContext } | { ok: false; code: BuyerOrderIntentFailure }>;
  execute: (sessionHash: string, context: BuyerOrderIntentContext) => Promise<MarketplaceCheckoutResult>;
};

/** Only the transaction-specific message crosses from the browser into the order context. */
export async function runPublicCheckout(messageInput: unknown, deps: PublicCheckoutDependencies): Promise<PublicCheckoutResult> {
  try {
    const current = await deps.currentUser();
    if (current.status !== "authenticated") {
      return { code: current.status === "unauthenticated" ? "AUTH_REQUIRED" : "SYSTEM_ERROR" };
    }
    const parsed = messageSchema.safeParse(messageInput);
    if (!parsed.success) return { code: "CHECKOUT_VALIDATION_ERROR" };
    const sessionHash = await deps.sessionHash();
    if (!sessionHash) return { code: "CHECKOUT_CART_EMPTY" };
    const buyer = await deps.resolveBuyer(current.user.id);
    if (!buyer.ok) return { code: buyer.code };
    const result = await deps.execute(sessionHash, {
      ...buyer.context,
      authUserId: current.user.id,
      contact: { ...buyer.context.contact, message: parsed.data },
    });
    return result.ok
      ? { code: "CHECKOUT_ORDER_CREATED", orderId: result.marketplaceOrderId }
      : { code: result.reason };
  } catch {
    return { code: "SYSTEM_ERROR" };
  }
}
