import "server-only";

import { db } from "@/lib/db";
import { getCartItems, type CartItemWithOffer } from "@/app/actions";
import { getSellerDisclosure } from "@/lib/legal/seller-disclosure-read-model";
import { querySellerReadiness } from "@/lib/admin/seller-readiness-query";
import type { SellerDisclosureDto } from "@/lib/legal/seller-disclosure";

export type CheckoutReviewSeller = {
  partnerId: number;
  disclosure: SellerDisclosureDto | null;
  ready: boolean;
  items: CartItemWithOffer[];
};

export type CheckoutReview = {
  sellers: CheckoutReviewSeller[];
  total: number;
  cartChanged: boolean;
  sellerNotReady: boolean;
};

/** Display data is advisory. executeMarketplaceCheckout revalidates every line and seller in its transaction. */
export async function loadCheckoutReview(): Promise<CheckoutReview> {
  const items = await getCartItems();
  const groups = new Map<number, CartItemWithOffer[]>();
  let cartChanged = false;
  let total = 0;
  for (const item of items) {
    const price = item.priceBrutto === null ? NaN : Number(item.priceBrutto);
    if (item.partnerId === null || item.offerModel !== "ecommerce" || !item.isActive ||
        item.publicationStatus !== "published" || item.priceOnRequest ||
        !Number.isSafeInteger(item.quantity) || item.quantity < 1 ||
        !Number.isFinite(price) || price <= 0) {
      cartChanged = true;
      continue;
    }
    total += price * item.quantity;
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
  return { sellers, total, cartChanged, sellerNotReady: sellers.some(seller => !seller.ready) };
}
