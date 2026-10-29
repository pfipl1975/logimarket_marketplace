import { eq, sql } from "drizzle-orm";
import { cartItems, offers } from "../../../src/lib/schema";
import { executeMarketplaceCheckout as finalize } from "../../../src/lib/checkout/marketplace-checkout-core";
import { confirmationLine, issueCheckoutConfirmation } from "../../../src/lib/checkout/confirmation";
import { evaluateBuyerOrderIntentReadiness } from "../../../src/lib/checkout/buyer-order-intent";

/** Existing integration cases get a fresh synthetic consent before invoking the real transaction.
 * R03 stale/race tests call finalize directly with the previously issued token. */
export async function confirmationForDatabase(
  db: Parameters<typeof finalize>[0], sessionHash: string, context: Parameters<typeof finalize>[2],
) {
  const rows = await db.select({ id: cartItems.id, offerId: cartItems.offerId, quantity: cartItems.quantity,
    partnerId: offers.partnerId, price: sql<string>`ROUND(${offers.priceBrutto}, 2)::text` })
    .from(cartItems).innerJoin(offers, eq(offers.id, cartItems.offerId)).where(eq(cartItems.sessionHash, sessionHash));
  return issueCheckoutConfirmation(rows.map(confirmationLine), { sessionHash, authUserId: context.authUserId,
    buyerOrganizationId: context.buyerOrganizationId });
}
export async function executeMarketplaceCheckout(...args: Parameters<typeof finalize>) {
  const [db, sessionHash, context] = args;
  if (!evaluateBuyerOrderIntentReadiness(context)) return finalize(...args);
  let token: string | undefined;
  try { token = await confirmationForDatabase(db, sessionHash, context); } catch { token = undefined; }
  return finalize(db, sessionHash, context, token);
}
