import type { CanonicalOfferModelResolution } from "@/lib/offers/model";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import { querySellerReadiness } from "@/lib/admin/seller-readiness-query";
import type { SellerReadinessResult } from "@/lib/partners/seller-readiness-core";

export type PurchaseAvailability =
  | "available"
  | "temporarily_unavailable"
  | "not_applicable";

export type PurchaseAvailabilityOffer = {
  offerModel: CanonicalOfferModelResolution;
  partnerId: number;
  purchaseAvailability: PurchaseAvailability;
};

export type QuerySellerReadinessFn = (
  db: NodePgDatabase<typeof schema>,
  partnerId: number
) => Promise<SellerReadinessResult>;

export async function assignPurchaseAvailability<T extends PurchaseAvailabilityOffer>(
  db: NodePgDatabase<typeof schema>,
  offers: T[],
  _queryFn: QuerySellerReadinessFn = querySellerReadiness
): Promise<T[]> {
  const ecommercePartnerIds = new Set<number>();
  for (const o of offers) {
    if (o.offerModel === "ecommerce") {
      ecommercePartnerIds.add(o.partnerId);
    }
  }

  if (ecommercePartnerIds.size === 0) {
    return offers.map(o => ({ ...o, purchaseAvailability: "not_applicable" } as unknown as T));
  }

  const partnerReadiness = new Map<number, boolean>();
  await Promise.all(
    Array.from(ecommercePartnerIds).map(async (pId) => {
      try {
        const result = await _queryFn(db, pId);
        partnerReadiness.set(pId, result.status === "ready");
      } catch (e) {
        console.error("[assignPurchaseAvailability] error fetching readiness for partner", pId, e);
        partnerReadiness.set(pId, false);
      }
    })
  );

  return offers.map((o) => {
    if (o.offerModel === "ecommerce") {
      return {
        ...o,
        purchaseAvailability: partnerReadiness.get(o.partnerId) ? "available" : "temporarily_unavailable"
      } as unknown as T;
    }
    return {
      ...o,
      purchaseAvailability: "not_applicable"
    } as unknown as T;
  });
}

export async function checkPurchaseEligibilityGuard(
  db: NodePgDatabase<typeof schema>,
  partnerId: number,
  _queryFn: QuerySellerReadinessFn = querySellerReadiness
): Promise<boolean> {
  try {
    const result = await _queryFn(db, partnerId);
    return result.status === "ready";
  } catch (e) {
    console.error("[checkPurchaseEligibilityGuard] error fetching readiness for partner", partnerId, e);
    return false; // fail closed
  }
}
