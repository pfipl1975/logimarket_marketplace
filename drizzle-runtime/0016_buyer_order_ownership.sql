ALTER TABLE "marketplace_orders" ADD COLUMN "buyer_auth_user_id" uuid;

CREATE INDEX "idx_marketplace_orders_buyer_auth" ON "marketplace_orders" USING btree ("buyer_auth_user_id");
