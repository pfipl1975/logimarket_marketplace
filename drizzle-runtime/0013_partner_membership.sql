CREATE TABLE "partner_user_memberships" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"partner_id" bigint NOT NULL,
	"membership_status" varchar(20) NOT NULL,
	"can_accept_orders" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "uq_partner_user_membership" UNIQUE("auth_user_id","partner_id"),
	CONSTRAINT "chk_partner_membership_status" CHECK (membership_status IN ('active','revoked')),
	CONSTRAINT "chk_partner_membership_consistency" CHECK (
        (membership_status = 'active' AND revoked_at IS NULL) OR
        (membership_status = 'revoked' AND revoked_at IS NOT NULL)
    ),
    CONSTRAINT "partner_user_memberships_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
--> statement-breakpoint
ALTER TABLE "partner_user_memberships" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "seller_acceptance_decisions" ADD COLUMN "decided_by_auth_user_id" uuid;
--> statement-breakpoint
ALTER TABLE "seller_acceptance_decisions" ADD COLUMN "decision_source" varchar(50);
--> statement-breakpoint
ALTER TABLE "seller_acceptance_decisions" DROP CONSTRAINT "chk_seller_acc_dec_consistency";
--> statement-breakpoint
ALTER TABLE "seller_acceptance_decisions" ADD CONSTRAINT "chk_seller_acc_dec_consistency" CHECK (
    (decision_status = 'pending_seller_review' AND decided_by_auth_user_id IS NULL AND decision_source IS NULL AND resolved_at IS NULL AND accepted_at IS NULL) OR
    (decision_status = 'seller_accepted' AND decided_by_auth_user_id IS NOT NULL AND decision_source = 'partner_portal' AND resolved_at IS NOT NULL AND accepted_at IS NOT NULL) OR
    (decision_status = 'seller_rejected' AND decided_by_auth_user_id IS NOT NULL AND decision_source = 'partner_portal' AND resolved_at IS NOT NULL AND accepted_at IS NULL) OR
    (decision_status = 'expired' AND resolved_at IS NOT NULL AND accepted_at IS NULL)
);
--> statement-breakpoint
ALTER TABLE "seller_acceptance_decisions" ADD CONSTRAINT "chk_seller_acc_dec_source" CHECK (
    decision_source IS NULL OR decision_source = 'partner_portal'
);
