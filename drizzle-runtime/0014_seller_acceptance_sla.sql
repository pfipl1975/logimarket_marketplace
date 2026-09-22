ALTER TABLE "seller_acceptance_decisions" ADD COLUMN "expires_at" timestamp with time zone;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "seller_acceptance_decisions" decision
    JOIN "seller_orders" seller_order ON seller_order."id" = decision."seller_order_id"
    WHERE seller_order."e6_routed_to_seller_at" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot backfill seller acceptance deadline without E6 timestamp';
  END IF;
END;
$$;
--> statement-breakpoint
UPDATE "seller_acceptance_decisions" decision
SET "expires_at" = seller_order."e6_routed_to_seller_at" + interval '24 hours'
FROM "seller_orders" seller_order
WHERE seller_order."id" = decision."seller_order_id";
--> statement-breakpoint
ALTER TABLE "seller_acceptance_decisions" ALTER COLUMN "expires_at" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "seller_orders" DROP CONSTRAINT "chk_seller_orders_status";
--> statement-breakpoint
ALTER TABLE "seller_orders" ADD CONSTRAINT "chk_seller_orders_status" CHECK (
  status IN ('submitted', 'seller_accepted', 'fulfillment_in_progress', 'fulfilled', 'seller_rejected', 'cancelled', 'expired')
);
--> statement-breakpoint
ALTER TABLE "seller_acceptance_decisions" DROP CONSTRAINT "chk_seller_acc_dec_consistency";
--> statement-breakpoint
ALTER TABLE "seller_acceptance_decisions" ADD CONSTRAINT "chk_seller_acc_dec_consistency" CHECK (
  (decision_status = 'pending_seller_review' AND expires_at IS NOT NULL AND decided_by_auth_user_id IS NULL AND decision_source IS NULL AND resolved_at IS NULL AND accepted_at IS NULL) OR
  (decision_status = 'seller_accepted' AND expires_at IS NOT NULL AND decided_by_auth_user_id IS NOT NULL AND decision_source = 'partner_portal' AND resolved_at IS NOT NULL AND accepted_at IS NOT NULL) OR
  (decision_status = 'seller_rejected' AND expires_at IS NOT NULL AND decided_by_auth_user_id IS NOT NULL AND decision_source = 'partner_portal' AND resolved_at IS NOT NULL AND accepted_at IS NULL) OR
  (decision_status = 'expired' AND expires_at IS NOT NULL AND decided_by_auth_user_id IS NULL AND decision_source IS NULL AND resolved_at IS NOT NULL AND accepted_at IS NULL)
);
--> statement-breakpoint
CREATE INDEX "idx_seller_acceptance_decisions_pending_expires_at"
ON "seller_acceptance_decisions" USING btree ("expires_at")
WHERE "decision_status" = 'pending_seller_review';
