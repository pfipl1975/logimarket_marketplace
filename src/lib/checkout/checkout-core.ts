import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { cartItems, offers, orders, orderItems } from "@/lib/schema";
import type { CheckoutContactInput } from "./contact-schema";
import { validateCheckoutLine } from "./eligibility";
import type { CheckoutOfferRow, CheckoutCartRow } from "./eligibility";
import {
  computeLineMinorUnits,
  minorUnitsToDecimalString,
  sumLineMinorUnits,
  isPriceSnapshotLengthValid,
} from "./money";
import type { CheckoutActionResult } from "./checkout-types";

/**
 * Core transactional checkout execution.
 * Reconstructs the cart from DB, validates every line, calculates prices exactly,
 * creates the order, and empties the cart. All atomically.
 */
export async function executeCheckout(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: NodePgDatabase<any>,
  sessionHash: string,
  contactData: CheckoutContactInput
): Promise<CheckoutActionResult> {
  try {
    return await db.transaction(async (tx) => {
      // 1. Lock cart rows for this session
      const lockedCartRows = await tx.execute<{
        id: string | number;
        offer_id: string | number;
        quantity: number;
      }>(
        sql`
          SELECT id, offer_id, quantity 
          FROM ${cartItems} 
          WHERE session_hash = ${sessionHash} 
          FOR UPDATE
        `
      );

      if (lockedCartRows.rows.length === 0) {
        return { ok: false, code: "CHECKOUT_CART_EMPTY" };
      }

      const cartRows: CheckoutCartRow[] = lockedCartRows.rows.map((r) => ({
        id: Number(r.id),
        offerId: Number(r.offer_id),
        quantity: Number(r.quantity),
      }));

      const offerIds = cartRows.map((r) => r.offerId);

      // 2. Fetch all corresponding offers
      const fetchedOffers = await tx.execute<{
        id: string | number;
        title: string;
        is_active: boolean;
        publication_status: string;
        offer_model: string;
        conversion_type: string;
        price_on_request: boolean;
        normalized_price: string | null;
      }>(
        sql`
          SELECT 
            id, 
            title, 
            is_active, 
            publication_status, 
            offer_model, 
            conversion_type, 
            price_on_request, 
            ROUND(price_brutto, 2)::text AS normalized_price
          FROM ${offers}
          WHERE id = ANY(${offerIds})
        `
      );

      const offerMap = new Map<number, CheckoutOfferRow>();
      for (const row of fetchedOffers.rows) {
        offerMap.set(Number(row.id), {
          id: Number(row.id),
          title: row.title as string,
          isActive: row.is_active as boolean,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          publicationStatus: row.publication_status as any,
          offerModel: row.offer_model as string,
          conversionType: row.conversion_type as string,
          priceOnRequest: row.price_on_request as boolean,
          normalizedPrice: row.normalized_price as string | null,
        });
      }

      // 3. Validate every cart line and collect valid lines
      const validLines: Array<{
        offerId: number;
        title: string;
        quantity: number;
        unitPriceMinor: bigint;
        unitPriceStr: string;
        totalPriceMinor: bigint;
        totalPriceStr: string;
      }> = [];

      for (const cartRow of cartRows) {
        const lineResult = validateCheckoutLine(cartRow, offerMap);
        if (!lineResult.ok) {
          console.error(`[checkout] stage=eligibility result=cart_changed reason=${lineResult.reason}`);
          return { ok: false, code: "CHECKOUT_CART_CHANGED" };
        }

        const unitPriceStr = minorUnitsToDecimalString(lineResult.unitPriceMinor);
        const totalPriceMinor = computeLineMinorUnits(lineResult.unitPriceMinor, lineResult.quantity);
        const totalPriceStr = minorUnitsToDecimalString(totalPriceMinor);

        if (!isPriceSnapshotLengthValid(unitPriceStr) || !isPriceSnapshotLengthValid(totalPriceStr)) {
          console.error(`[checkout] stage=money errorName=SnapshotLengthExceeded`);
          return { ok: false, code: "SYSTEM_ERROR" };
        }

        validLines.push({
          offerId: lineResult.offerId,
          title: lineResult.title,
          quantity: lineResult.quantity,
          unitPriceMinor: lineResult.unitPriceMinor,
          unitPriceStr,
          totalPriceMinor,
          totalPriceStr,
        });
      }

      // 4. Compute authoritative total amount
      const lineTotalsMinor = validLines.map((l) => l.totalPriceMinor);
      const orderTotalMinor = sumLineMinorUnits(lineTotalsMinor);
      const orderTotalStr = minorUnitsToDecimalString(orderTotalMinor);

      if (!isPriceSnapshotLengthValid(orderTotalStr)) {
        console.error(`[checkout] stage=money errorName=SnapshotLengthExceeded`);
        return { ok: false, code: "SYSTEM_ERROR" };
      }

      // 5. Insert Order
      const insertOrderResult = await tx
        .insert(orders)
        .values({
          sessionHash,
          status: "new",
          companyName: contactData.companyName,
          contactName: contactData.contactName,
          email: contactData.email,
          phone: contactData.phone ?? null,
          message: contactData.message ?? null,
          totalAmount: orderTotalStr,
        })
        .returning({ id: orders.id });

      const orderId = Number(insertOrderResult[0].id);

      // 6. Insert Order Items
      const orderItemsToInsert = validLines.map((l) => ({
        orderId,
        offerId: l.offerId,
        title: l.title,
        quantity: l.quantity,
        unitPrice: l.unitPriceStr,
        totalPrice: l.totalPriceStr,
      }));

      await tx.insert(orderItems).values(orderItemsToInsert);

      // 7. Delete Cart Items for session
      await tx.execute(
        sql`
          DELETE FROM ${cartItems} 
          WHERE session_hash = ${sessionHash}
        `
      );

      return { ok: true, code: "CHECKOUT_ORDER_CREATED", orderId };
    });
  } catch (err: unknown) {
    console.error(`[checkout] stage=transaction errorName=${(err as Error)?.constructor?.name ?? "unknown"}`);
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}
