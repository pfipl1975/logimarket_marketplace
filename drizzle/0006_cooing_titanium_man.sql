CREATE TABLE "agreement_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"agreement_type" varchar(50) NOT NULL,
	"version" varchar(50) NOT NULL,
	"canonical_template_hash_sha256" varchar(64) NOT NULL,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"effective_from" timestamp with time zone,
	"effective_to" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_agreement_versions_type_version" UNIQUE("agreement_type","version"),
	CONSTRAINT "uq_agreement_versions_hash" UNIQUE("canonical_template_hash_sha256"),
	CONSTRAINT "chk_agreement_versions_type" CHECK (agreement_type = 'partner_agreement_b2b'),
	CONSTRAINT "chk_agreement_versions_status" CHECK (status IN ('draft', 'active', 'superseded', 'archived')),
	CONSTRAINT "chk_agreement_versions_hash_format" CHECK (canonical_template_hash_sha256 ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "chk_agreement_versions_active_lifecycle" CHECK (((status)::text <> 'active'::text) OR (effective_from IS NOT NULL AND published_at IS NOT NULL)),
	CONSTRAINT "chk_agreement_versions_effective_dates" CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from)
);
--> statement-breakpoint
CREATE TABLE "marketplace_order_buyer_contact_snapshots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"marketplace_order_id" bigint NOT NULL,
	"contact_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(100),
	"message" varchar(5000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_order_buyer_contact_snapshots_marketplace_order_id_unique" UNIQUE("marketplace_order_id")
);
--> statement-breakpoint
CREATE TABLE "notification_outbox_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"seller_order_id" bigint NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_notification_outbox_event" UNIQUE("seller_order_id","event_type"),
	CONSTRAINT "chk_outbox_event_type" CHECK (event_type IN ('seller_order.routed_to_seller', 'seller_order.accepted_for_buyer', 'seller_order.rejected_for_buyer', 'seller_order.expired_for_seller', 'seller_order.expired_for_buyer'))
);
--> statement-breakpoint
CREATE TABLE "offer_media" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"offer_id" bigint NOT NULL,
	"storage_bucket" varchar(100) NOT NULL,
	"object_path" text NOT NULL,
	"source_type" varchar(30) NOT NULL,
	"source_url" text,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"checksum_sha256" varchar(64) NOT NULL,
	"width" integer,
	"height" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"alt_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "offer_media_object_path_unique" UNIQUE("object_path"),
	CONSTRAINT "offer_media_source_type_check" CHECK (((source_type)::text = ANY ((ARRAY['upload'::character varying, 'remote_import'::character varying])::text[]))),
	CONSTRAINT "offer_media_size_bytes_check" CHECK (size_bytes > 0),
	CONSTRAINT "offer_media_sort_order_check" CHECK (sort_order >= 0),
	CONSTRAINT "offer_media_checksum_format_check" CHECK (checksum_sha256 ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "partner_agreement_evidence_invalidations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"execution_evidence_id" bigint NOT NULL,
	"reason" text NOT NULL,
	"invalidated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"invalidated_by_admin_user_id" varchar(255) NOT NULL,
	CONSTRAINT "uq_partner_agreement_evidence_invalidations_evidence" UNIQUE("execution_evidence_id"),
	CONSTRAINT "chk_partner_agreement_invalidation_reason" CHECK (length(btrim(reason)) > 0),
	CONSTRAINT "chk_partner_agreement_invalidation_by" CHECK (length(btrim((invalidated_by_admin_user_id)::text)) > 0)
);
--> statement-breakpoint
CREATE TABLE "partner_agreement_execution_evidence" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"partner_id" bigint NOT NULL,
	"agreement_version_id" integer NOT NULL,
	"status" varchar(30) DEFAULT 'accepted' NOT NULL,
	"execution_method" varchar(50) DEFAULT 'platform_documentary_electronic' NOT NULL,
	"signed_at" timestamp with time zone NOT NULL,
	"signatory_name" varchar(255) NOT NULL,
	"signatory_role" varchar(255) NOT NULL,
	"signatory_email" varchar(255) NOT NULL,
	"external_platform" varchar(100) NOT NULL,
	"external_transaction_id" varchar(255) NOT NULL,
	"signed_pdf_sha256" varchar(64) NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_by_admin_user_id" varchar(255) NOT NULL,
	CONSTRAINT "chk_partner_agreement_evidence_status" CHECK (status = 'accepted'),
	CONSTRAINT "chk_partner_agreement_evidence_method" CHECK (execution_method IN ('platform_documentary_electronic', 'qualified_electronic_signature', 'advanced_electronic_signature')),
	CONSTRAINT "chk_partner_agreement_evidence_hash_format" CHECK (signed_pdf_sha256 ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "chk_partner_agreement_evidence_signatory_name" CHECK (length(btrim((signatory_name)::text)) > 0),
	CONSTRAINT "chk_partner_agreement_evidence_signatory_role" CHECK (length(btrim((signatory_role)::text)) > 0),
	CONSTRAINT "chk_partner_agreement_evidence_signatory_email" CHECK (length(btrim((signatory_email)::text)) > 0),
	CONSTRAINT "chk_partner_agreement_evidence_external_platform" CHECK (length(btrim((external_platform)::text)) > 0),
	CONSTRAINT "chk_partner_agreement_evidence_external_tx" CHECK (length(btrim((external_transaction_id)::text)) > 0),
	CONSTRAINT "chk_partner_agreement_evidence_recorded_by" CHECK (length(btrim((recorded_by_admin_user_id)::text)) > 0)
);
--> statement-breakpoint
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
	CONSTRAINT "chk_partner_membership_status" CHECK (((membership_status)::text = ANY ((ARRAY['active'::character varying, 'revoked'::character varying])::text[]))),
	CONSTRAINT "chk_partner_membership_consistency" CHECK ((((membership_status)::text = 'active' AND revoked_at IS NULL) OR ((membership_status)::text = 'revoked' AND revoked_at IS NOT NULL)))
);
--> statement-breakpoint
ALTER TABLE "seller_acceptance_decisions" DROP CONSTRAINT "chk_seller_acc_dec_consistency";--> statement-breakpoint
ALTER TABLE "seller_orders" DROP CONSTRAINT "chk_seller_orders_status";--> statement-breakpoint
ALTER TABLE "marketplace_orders" ADD COLUMN "buyer_auth_user_id" uuid;--> statement-breakpoint
ALTER TABLE "seller_acceptance_decisions" ADD COLUMN "decided_by_auth_user_id" uuid;--> statement-breakpoint
ALTER TABLE "seller_acceptance_decisions" ADD COLUMN "decision_source" varchar(50);--> statement-breakpoint
ALTER TABLE "seller_acceptance_decisions" ADD COLUMN "expires_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "seller_tax_identifiers" ADD COLUMN "canonical_identity_class" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "seller_tax_identifiers" ADD COLUMN "canonical_identifier_value" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace_order_buyer_contact_snapshots" ADD CONSTRAINT "marketplace_order_buyer_contact_snapshots_marketplace_order_id_marketplace_orders_id_fk" FOREIGN KEY ("marketplace_order_id") REFERENCES "public"."marketplace_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_outbox_events" ADD CONSTRAINT "notification_outbox_events_seller_order_id_seller_orders_id_fk" FOREIGN KEY ("seller_order_id") REFERENCES "public"."seller_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_media" ADD CONSTRAINT "offer_media_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_agreement_evidence_invalidations" ADD CONSTRAINT "partner_agreement_evidence_invalidations_execution_evidence_id_partner_agreement_execution_evidence_id_fk" FOREIGN KEY ("execution_evidence_id") REFERENCES "public"."partner_agreement_execution_evidence"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_agreement_execution_evidence" ADD CONSTRAINT "partner_agreement_execution_evidence_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_agreement_execution_evidence" ADD CONSTRAINT "partner_agreement_execution_evidence_agreement_version_id_agreement_versions_id_fk" FOREIGN KEY ("agreement_version_id") REFERENCES "public"."agreement_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_user_memberships" ADD CONSTRAINT "partner_user_memberships_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_offer_media_offer_id" ON "offer_media" USING btree ("offer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_offer_media_primary" ON "offer_media" USING btree ("offer_id") WHERE is_primary = true;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_offer_media_checksum" ON "offer_media" USING btree ("offer_id","checksum_sha256");--> statement-breakpoint
CREATE INDEX "idx_partner_agreement_invalidations_evidence_id" ON "partner_agreement_evidence_invalidations" USING btree ("execution_evidence_id");--> statement-breakpoint
CREATE INDEX "idx_partner_agreement_evidence_partner_id" ON "partner_agreement_execution_evidence" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "idx_partner_agreement_evidence_version_id" ON "partner_agreement_execution_evidence" USING btree ("agreement_version_id");--> statement-breakpoint
CREATE INDEX "idx_marketplace_orders_buyer_auth" ON "marketplace_orders" USING btree ("buyer_auth_user_id");--> statement-breakpoint
CREATE INDEX "idx_seller_acceptance_decisions_pending_expires_at" ON "seller_acceptance_decisions" USING btree ("expires_at") WHERE decision_status = 'pending_seller_review';--> statement-breakpoint
CREATE INDEX "idx_seller_tax_canonical_active" ON "seller_tax_identifiers" USING btree ("canonical_identity_class","canonical_identifier_value") WHERE retired_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_verification_events_legal_subject" ON "seller_verification_events" USING btree ("legal_identity_partner_id");--> statement-breakpoint
CREATE INDEX "idx_verification_events_tax_subject" ON "seller_verification_events" USING btree ("tax_identifier_id");--> statement-breakpoint
CREATE INDEX "idx_verification_events_registry_subject" ON "seller_verification_events" USING btree ("registry_identifier_id");--> statement-breakpoint
ALTER TABLE "seller_acceptance_decisions" ADD CONSTRAINT "chk_seller_acc_dec_source" CHECK ((decision_source IS NULL OR (decision_source)::text = 'partner_portal'));--> statement-breakpoint
ALTER TABLE "seller_acceptance_decisions" ADD CONSTRAINT "chk_seller_acc_dec_consistency" CHECK ((((decision_status)::text = 'pending_seller_review' AND expires_at IS NOT NULL AND decided_by_auth_user_id IS NULL AND decision_source IS NULL AND resolved_at IS NULL AND accepted_at IS NULL) OR ((decision_status)::text = 'seller_accepted' AND expires_at IS NOT NULL AND decided_by_auth_user_id IS NOT NULL AND (decision_source)::text = 'partner_portal' AND resolved_at IS NOT NULL AND accepted_at IS NOT NULL) OR ((decision_status)::text = 'seller_rejected' AND expires_at IS NOT NULL AND decided_by_auth_user_id IS NOT NULL AND (decision_source)::text = 'partner_portal' AND resolved_at IS NOT NULL AND accepted_at IS NULL) OR ((decision_status)::text = 'expired' AND expires_at IS NOT NULL AND decided_by_auth_user_id IS NULL AND decision_source IS NULL AND resolved_at IS NOT NULL AND accepted_at IS NULL)));--> statement-breakpoint
ALTER TABLE "seller_orders" ADD CONSTRAINT "chk_seller_orders_status" CHECK (((status)::text = ANY ((ARRAY['submitted'::character varying, 'seller_accepted'::character varying, 'fulfillment_in_progress'::character varying, 'fulfilled'::character varying, 'seller_rejected'::character varying, 'cancelled'::character varying, 'expired'::character varying])::text[])));