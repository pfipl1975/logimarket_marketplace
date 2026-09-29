import "server-only";

import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { marketplaceOrderBuyerInvoiceSnapshots, marketplaceOrders } from "@/lib/schema";
import type { BuyerInvoiceSnapshotInput } from "@/lib/checkout/buyer-order-intent";

export type OwnedBuyerInvoiceResult =
  | { status: "unauthenticated" | "not_found"; invoice: null }
  | { status: "authenticated"; invoice: BuyerInvoiceSnapshotInput | null };

/** Historical orders may have no invoice snapshot; ownership is proven before projection. */
export async function loadOwnedBuyerInvoiceSnapshot(orderId: number): Promise<OwnedBuyerInvoiceResult> {
  const auth = await getCurrentUser();
  if (auth.status === "unauthenticated") return { status: "unauthenticated", invoice: null };
  if (auth.status === "unavailable") throw new Error("Auth Infrastructure Unavailable");
  if (!Number.isSafeInteger(orderId) || orderId <= 0) return { status: "not_found", invoice: null };

  const rows = await db.select({
    orderId: marketplaceOrders.id,
    legalName: marketplaceOrderBuyerInvoiceSnapshots.legalName,
    taxIdentifierType: marketplaceOrderBuyerInvoiceSnapshots.taxIdentifierType,
    taxIdentifierValue: marketplaceOrderBuyerInvoiceSnapshots.taxIdentifierValue,
    street: marketplaceOrderBuyerInvoiceSnapshots.street,
    buildingNumber: marketplaceOrderBuyerInvoiceSnapshots.buildingNumber,
    unitNumber: marketplaceOrderBuyerInvoiceSnapshots.unitNumber,
    postalCode: marketplaceOrderBuyerInvoiceSnapshots.postalCode,
    city: marketplaceOrderBuyerInvoiceSnapshots.city,
    countryCode: marketplaceOrderBuyerInvoiceSnapshots.countryCode,
  }).from(marketplaceOrders)
    .leftJoin(marketplaceOrderBuyerInvoiceSnapshots, eq(marketplaceOrderBuyerInvoiceSnapshots.marketplaceOrderId, marketplaceOrders.id))
    .where(and(eq(marketplaceOrders.id, orderId), eq(marketplaceOrders.buyerAuthUserId, auth.user.id)))
    .limit(1);
  if (rows.length === 0) return { status: "not_found", invoice: null };
  const row = rows[0];
  if (row.legalName === null) return { status: "authenticated", invoice: null };
  if (row.taxIdentifierType !== "tax_id" || row.countryCode !== "PL" ||
      row.taxIdentifierValue === null || row.street === null || row.buildingNumber === null ||
      row.postalCode === null || row.city === null) {
    throw new Error("Buyer invoice snapshot is inconsistent");
  }
  return {
    status: "authenticated",
    invoice: {
      legalName: row.legalName,
      taxIdentifierType: "tax_id",
      taxIdentifierValue: row.taxIdentifierValue,
      street: row.street,
      buildingNumber: row.buildingNumber,
      unitNumber: row.unitNumber,
      postalCode: row.postalCode,
      city: row.city,
      countryCode: "PL",
    },
  };
}
