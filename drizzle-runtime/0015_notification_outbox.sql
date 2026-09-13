CREATE TABLE IF NOT EXISTS "notification_outbox_events" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "seller_order_id" bigint NOT NULL,
  "event_type" varchar(50) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "chk_outbox_event_type" CHECK ("event_type" IN (
    'seller_order.routed_to_seller',
    'seller_order.accepted_for_buyer',
    'seller_order.rejected_for_buyer',
    'seller_order.expired_for_seller',
    'seller_order.expired_for_buyer'
  )),
  CONSTRAINT "uq_notification_outbox_event" UNIQUE("seller_order_id", "event_type")
);

ALTER TABLE "notification_outbox_events" ENABLE ROW LEVEL SECURITY;

DO  BEGIN
  ALTER TABLE "notification_outbox_events" ADD CONSTRAINT "notification_outbox_events_seller_order_id_seller_orders_id_fk" FOREIGN KEY ("seller_order_id") REFERENCES "seller_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END ;
