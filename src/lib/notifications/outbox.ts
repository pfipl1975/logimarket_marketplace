import { db } from "@/lib/db";
import { notificationOutboxEvents } from "@/lib/schema";

export type OutboxEventType =
  | "seller_order.routed_to_seller"
  | "seller_order.accepted_for_buyer"
  | "seller_order.rejected_for_buyer"
  | "seller_order.expired_for_seller"
  | "seller_order.expired_for_buyer";

export type OutboxTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function enqueueNotificationIntent(
  tx: OutboxTransaction,
  sellerOrderId: number,
  eventType: OutboxEventType
): Promise<{ ok: true } | { ok: false; code: string }> {
  try {
    await tx.insert(notificationOutboxEvents).values({
      sellerOrderId,
      eventType,
    }).onConflictDoNothing({ target: [notificationOutboxEvents.sellerOrderId, notificationOutboxEvents.eventType] });
    return { ok: true };
  } catch (error) {
    return { ok: false, code: "SYSTEM_ERROR" };
  }
}
