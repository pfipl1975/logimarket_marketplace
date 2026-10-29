import "server-only";

import { db } from "@/lib/db";
import { getCartItems, type CartItemWithOffer } from "@/app/actions";
import { getSellerDisclosure } from "@/lib/legal/seller-disclosure-read-model";
import { querySellerReadiness } from "@/lib/admin/seller-readiness-query";
import type { SellerDisclosureDto } from "@/lib/legal/seller-disclosure";
import { confirmationLine, issueCheckoutConfirmation, type ConfirmationContext } from "./confirmation";
import { computeLineMinorUnits, isValidCheckoutQuantity, parseDecimalToMinorUnits } from "./money";

export type CheckoutReviewSeller = {
  partnerId: number;
  disclosure: SellerDisclosureDto | null;
  ready: boolean;
  items: CartItemWithOffer[];
};

export type CheckoutReview = {
  sellers: CheckoutReviewSeller[];
  total: bigint;
  cartChanged: boolean;
  sellerNotReady: boolean;
  confirmation: string | null;
};

/** The display and signed consent share these exact cart rows. The transaction revalidates under locks. */
export async function loadCheckoutReview(context?: ConfirmationContext): Promise<CheckoutReview> {
  const items = await getCartItems();
  const groups = new Map<number, CartItemWithOffer[]>();
  let cartChanged = false;
  let total = BigInt(0);
  for (const item of items) {
    let price: bigint;
    try { price = parseDecimalToMinorUnits(item.priceBrutto); }
    catch { cartChanged = true; continue; }
    if (item.partnerId === null || item.offerModel !== "ecommerce" || !item.isActive ||
        item.publicationStatus !== "published" || item.priceOnRequest ||
        !isValidCheckoutQuantity(item.quantity)) {
      cartChanged = true;
      continue;
    }
    total += computeLineMinorUnits(price, item.quantity);
    const group = groups.get(item.partnerId) ?? [];
    group.push(item);
    groups.set(item.partnerId, group);
  }
  const sellers = await Promise.all(Array.from(groups, async ([partnerId, groupedItems]) => {
    const [disclosure, readiness] = await Promise.all([
      getSellerDisclosure(partnerId),
      querySellerReadiness(db, partnerId),
    ]);
    return {
      partnerId,
      disclosure,
      ready: readiness.status === "ready" && disclosure?.completeness.complete === true,
      items: groupedItems,
    };
  }));
  const confirmation = context && !cartChanged && items.length > 0 ? issueCheckoutConfirmation(items.map(item =>
    confirmationLine({ ...item, partnerId: item.partnerId!, price: item.priceBrutto })), context) : null;
  return { sellers, total, cartChanged, confirmation, sellerNotReady: sellers.some(seller => !seller.ready) };
}
