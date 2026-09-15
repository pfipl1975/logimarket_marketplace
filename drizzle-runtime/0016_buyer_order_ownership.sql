ALTER TABLE "marketplace_orders" ADD COLUMN IF NOT EXISTS "buyer_auth_user_id" uuid;
CREATE INDEX IF NOT EXISTS "idx_marketplace_orders_buyer_auth" ON "marketplace_orders"("buyer_auth_user_id") WHERE "buyer_auth_user_id" IS NOT NULL;
