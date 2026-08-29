-- 0005_marketplace_order_56b2a.sql
-- LM-MARKETPLACE-SCHEMA-56B2-A: marketplace order physical foundation
-- All DDL is replay-safe (idempotent). No data backfill. No UPDATE on existing rows.

-- 1. NEW TABLES (IF NOT EXISTS - always replay-safe)

CREATE TABLE IF NOT EXISTS "buyer_legal_context_snapshots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"business_name" varchar(255) NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"tax_identifier_type" varchar(50),
	"tax_identifier_value" varchar(100),
	"registry_identifier_type" varchar(50),
	"registry_identifier_value" varchar(100),
	"business_verification_status" varchar(50) DEFAULT 'unknown' NOT NULL,
	"business_verification_method" varchar(100),
	"business_verification_source" varchar(100),
	"business_verified_at" timestamp with time zone,
	"professional_purpose_evidence" varchar(1000),
	"category_b_status" varchar(50) DEFAULT 'unknown' NOT NULL,
	"legal_context_review_state" varchar(50) DEFAULT 'no_review_needed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "marketplace_orders" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_hash" varchar(64) NOT NULL,
	"buyer_legal_context_snapshot_id" bigint NOT NULL,
	"status" varchar(50) DEFAULT 'intent_created' NOT NULL,
	"e2_buyer_intent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"e3_receipt_acknowledged_at" timestamp with time zone,
	"customer_po_number" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "marketplace_order_seller_disclosures" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"marketplace_order_id" bigint NOT NULL,
	"partner_id" bigint NOT NULL,
	"seller_legal_name" varchar(255) NOT NULL,
	"registered_address" varchar(1000) NOT NULL,
	"jurisdiction_country" varchar(2) NOT NULL,
	"firm_contact_email" varchar(100) NOT NULL,
	"seller_role" varchar(100) NOT NULL,
	"goods_invoice_issuer" varchar(100) NOT NULL,
	"delivery_responsible_party" varchar(100) NOT NULL,
	"complaint_responsible_party" varchar(100) NOT NULL,
	"return_responsible_party" varchar(100) NOT NULL,
	"logimarket_platform_role" varchar(100) NOT NULL,
	"tax_identifier_type" varchar(50),
	"tax_identifier_value" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "seller_orders" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"marketplace_order_id" bigint NOT NULL,
	"partner_id" bigint NOT NULL,
	"status" varchar(50) DEFAULT 'submitted' NOT NULL,
	"e6_routed_to_seller_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "seller_order_seller_snapshots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"seller_order_id" bigint NOT NULL,
	"seller_legal_name" varchar(255) NOT NULL,
	"seller_display_name" varchar(255) NOT NULL,
	"jurisdiction_country" varchar(2) NOT NULL,
	"registered_address" varchar(1000) NOT NULL,
	"firm_contact_email" varchar(100) NOT NULL,
	"tax_identifier_type" varchar(50),
	"tax_identifier_value" varchar(100),
	"registry_identifier_type" varchar(50),
	"registry_identifier_value" varchar(100),
	"contract_model" varchar(100) NOT NULL,
	"seller_of_record_responsibility" varchar(100) NOT NULL,
	"goods_invoice_responsibility" varchar(100) NOT NULL,
	"delivery_responsibility" varchar(100) NOT NULL,
	"complaint_responsibility" varchar(100) NOT NULL,
	"return_responsibility" varchar(100) NOT NULL,
	"refund_financial_liability" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "seller_order_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"seller_order_id" bigint NOT NULL,
	"offer_id" bigint NOT NULL,
	"offer_title" varchar(500) NOT NULL,
	"manufacturer" varchar(255),
	"model" varchar(255),
	"technical_data_ref" varchar(255),
	"content_language" varchar(10),
	"quantity" integer NOT NULL,
	"unit_price" numeric NOT NULL,
	"currency" varchar(3) NOT NULL,
	"tax_context" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "seller_acceptance_decisions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"seller_order_id" bigint NOT NULL,
	"decision_status" varchar(50) DEFAULT 'pending_seller_review' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"accepted_at" timestamp with time zone
);
--> statement-breakpoint

-- 2. UNIQUE CONSTRAINTS (guarded)

DO $$ BEGIN
  ALTER TABLE "marketplace_orders" ADD CONSTRAINT "uq_marketplace_orders_snapshot" UNIQUE ("buyer_legal_context_snapshot_id");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "marketplace_order_seller_disclosures" ADD CONSTRAINT "uq_mkt_order_disclosure_order_partner" UNIQUE ("marketplace_order_id", "partner_id");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "seller_orders" ADD CONSTRAINT "uq_seller_orders_mkt_partner" UNIQUE ("marketplace_order_id", "partner_id");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "seller_order_seller_snapshots" ADD CONSTRAINT "uq_seller_order_seller_snapshots_seller_order" UNIQUE ("seller_order_id");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "seller_acceptance_decisions" ADD CONSTRAINT "uq_seller_acceptance_decisions_seller_order" UNIQUE ("seller_order_id");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- 3. CHECK CONSTRAINTS (guarded)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_buyer_identifiers_present'
      AND conrelid = 'public.buyer_legal_context_snapshots'::regclass
  ) THEN
    ALTER TABLE public.buyer_legal_context_snapshots
      ADD CONSTRAINT chk_buyer_identifiers_present
      CHECK ((tax_identifier_type IS NOT NULL AND tax_identifier_value IS NOT NULL) OR (registry_identifier_type IS NOT NULL AND registry_identifier_value IS NOT NULL));
  END IF;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_buyer_tax_pair'
      AND conrelid = 'public.buyer_legal_context_snapshots'::regclass
  ) THEN
    ALTER TABLE public.buyer_legal_context_snapshots
      ADD CONSTRAINT chk_buyer_tax_pair
      CHECK ((tax_identifier_type IS NULL AND tax_identifier_value IS NULL) OR (tax_identifier_type IS NOT NULL AND tax_identifier_value IS NOT NULL));
  END IF;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_buyer_registry_pair'
      AND conrelid = 'public.buyer_legal_context_snapshots'::regclass
  ) THEN
    ALTER TABLE public.buyer_legal_context_snapshots
      ADD CONSTRAINT chk_buyer_registry_pair
      CHECK ((registry_identifier_type IS NULL AND registry_identifier_value IS NULL) OR (registry_identifier_type IS NOT NULL AND registry_identifier_value IS NOT NULL));
  END IF;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_buyer_business_verification_status'
      AND conrelid = 'public.buyer_legal_context_snapshots'::regclass
  ) THEN
    ALTER TABLE public.buyer_legal_context_snapshots
      ADD CONSTRAINT chk_buyer_business_verification_status
      CHECK (((business_verification_status)::text = ANY ((ARRAY['unknown'::character varying, 'unverified'::character varying, 'verified'::character varying, 'failed'::character varying])::text[])));
  END IF;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_buyer_verification_consistency'
      AND conrelid = 'public.buyer_legal_context_snapshots'::regclass
  ) THEN
    ALTER TABLE public.buyer_legal_context_snapshots
      ADD CONSTRAINT chk_buyer_verification_consistency
      CHECK (((business_verification_status)::text = 'verified' AND business_verification_method IS NOT NULL AND business_verification_source IS NOT NULL AND business_verified_at IS NOT NULL) OR ((business_verification_status)::text != 'verified'));
  END IF;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_buyer_category_b_status'
      AND conrelid = 'public.buyer_legal_context_snapshots'::regclass
  ) THEN
    ALTER TABLE public.buyer_legal_context_snapshots
      ADD CONSTRAINT chk_buyer_category_b_status
      CHECK (((category_b_status)::text = ANY ((ARRAY['unknown'::character varying, 'not_applicable'::character varying, 'applicable'::character varying, 'under_review'::character varying])::text[])));
  END IF;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_buyer_legal_review_state'
      AND conrelid = 'public.buyer_legal_context_snapshots'::regclass
  ) THEN
    ALTER TABLE public.buyer_legal_context_snapshots
      ADD CONSTRAINT chk_buyer_legal_review_state
      CHECK (((legal_context_review_state)::text = ANY ((ARRAY['no_review_needed'::character varying, 'pending_review'::character varying, 'approved_by_review'::character varying, 'rejected_by_review'::character varying])::text[])));
  END IF;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_marketplace_orders_status'
      AND conrelid = 'public.marketplace_orders'::regclass
  ) THEN
    ALTER TABLE public.marketplace_orders
      ADD CONSTRAINT chk_marketplace_orders_status
      CHECK (((status)::text = ANY ((ARRAY['intent_created'::character varying, 'checkout_submitted'::character varying, 'pending_seller_review'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])));
  END IF;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_disclosure_tax_pair'
      AND conrelid = 'public.marketplace_order_seller_disclosures'::regclass
  ) THEN
    ALTER TABLE public.marketplace_order_seller_disclosures
      ADD CONSTRAINT chk_disclosure_tax_pair
      CHECK ((tax_identifier_type IS NULL AND tax_identifier_value IS NULL) OR (tax_identifier_type IS NOT NULL AND tax_identifier_value IS NOT NULL));
  END IF;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_seller_orders_status'
      AND conrelid = 'public.seller_orders'::regclass
  ) THEN
    ALTER TABLE public.seller_orders
      ADD CONSTRAINT chk_seller_orders_status
      CHECK (((status)::text = ANY ((ARRAY['submitted'::character varying, 'seller_accepted'::character varying, 'fulfillment_in_progress'::character varying, 'fulfilled'::character varying, 'seller_rejected'::character varying, 'cancelled'::character varying])::text[])));
  END IF;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_snapshot_tax_pair'
      AND conrelid = 'public.seller_order_seller_snapshots'::regclass
  ) THEN
    ALTER TABLE public.seller_order_seller_snapshots
      ADD CONSTRAINT chk_snapshot_tax_pair
      CHECK ((tax_identifier_type IS NULL AND tax_identifier_value IS NULL) OR (tax_identifier_type IS NOT NULL AND tax_identifier_value IS NOT NULL));
  END IF;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_snapshot_registry_pair'
      AND conrelid = 'public.seller_order_seller_snapshots'::regclass
  ) THEN
    ALTER TABLE public.seller_order_seller_snapshots
      ADD CONSTRAINT chk_snapshot_registry_pair
      CHECK ((registry_identifier_type IS NULL AND registry_identifier_value IS NULL) OR (registry_identifier_type IS NOT NULL AND registry_identifier_value IS NOT NULL));
  END IF;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_snapshot_contract_model'
      AND conrelid = 'public.seller_order_seller_snapshots'::regclass
  ) THEN
    ALTER TABLE public.seller_order_seller_snapshots
      ADD CONSTRAINT chk_snapshot_contract_model
      CHECK (((contract_model)::text = ANY ((ARRAY['partner_marketplace'::character varying, 'external_redirect'::character varying, 'logimarket_reseller'::character varying])::text[])));
  END IF;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_seller_order_items_qty'
      AND conrelid = 'public.seller_order_items'::regclass
  ) THEN
    ALTER TABLE public.seller_order_items
      ADD CONSTRAINT chk_seller_order_items_qty
      CHECK (quantity > 0);
  END IF;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_seller_order_items_currency_shape'
      AND conrelid = 'public.seller_order_items'::regclass
  ) THEN
    ALTER TABLE public.seller_order_items
      ADD CONSTRAINT chk_seller_order_items_currency_shape
      CHECK (currency ~ '^[A-Z]{3}$');
  END IF;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_seller_acc_dec_status'
      AND conrelid = 'public.seller_acceptance_decisions'::regclass
  ) THEN
    ALTER TABLE public.seller_acceptance_decisions
      ADD CONSTRAINT chk_seller_acc_dec_status
      CHECK (((decision_status)::text = ANY ((ARRAY['pending_seller_review'::character varying, 'seller_accepted'::character varying, 'seller_rejected'::character varying, 'expired'::character varying])::text[])));
  END IF;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_seller_acc_dec_consistency'
      AND conrelid = 'public.seller_acceptance_decisions'::regclass
  ) THEN
    ALTER TABLE public.seller_acceptance_decisions
      ADD CONSTRAINT chk_seller_acc_dec_consistency
      CHECK (
        ((decision_status)::text = 'pending_seller_review' AND resolved_at IS NULL AND accepted_at IS NULL)
        OR ((decision_status)::text = 'seller_accepted' AND resolved_at IS NOT NULL AND accepted_at IS NOT NULL)
        OR ((decision_status)::text = 'seller_rejected' AND resolved_at IS NOT NULL AND accepted_at IS NULL)
        OR ((decision_status)::text = 'expired' AND resolved_at IS NOT NULL AND accepted_at IS NULL)
      );
  END IF;
END
$$;
--> statement-breakpoint

-- 4. FOREIGN KEYS (duplicate_object guard - pre-existing pattern)

DO $$ BEGIN
  ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_buyer_legal_context_snapshot_id_fkey" FOREIGN KEY ("buyer_legal_context_snapshot_id") REFERENCES "public"."buyer_legal_context_snapshots"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "marketplace_order_seller_disclosures" ADD CONSTRAINT "marketplace_order_seller_disclosures_marketplace_order_id_fkey" FOREIGN KEY ("marketplace_order_id") REFERENCES "public"."marketplace_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "marketplace_order_seller_disclosures" ADD CONSTRAINT "marketplace_order_seller_disclosures_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "seller_orders" ADD CONSTRAINT "seller_orders_marketplace_order_id_fkey" FOREIGN KEY ("marketplace_order_id") REFERENCES "public"."marketplace_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "seller_orders" ADD CONSTRAINT "seller_orders_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "seller_order_seller_snapshots" ADD CONSTRAINT "seller_order_seller_snapshots_seller_order_id_fkey" FOREIGN KEY ("seller_order_id") REFERENCES "public"."seller_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "seller_order_items" ADD CONSTRAINT "seller_order_items_seller_order_id_fkey" FOREIGN KEY ("seller_order_id") REFERENCES "public"."seller_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "seller_order_items" ADD CONSTRAINT "seller_order_items_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "seller_acceptance_decisions" ADD CONSTRAINT "seller_acceptance_decisions_seller_order_id_fkey" FOREIGN KEY ("seller_order_id") REFERENCES "public"."seller_orders"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- 5. INDEXES (IF NOT EXISTS - replay-safe)

CREATE INDEX IF NOT EXISTS idx_marketplace_orders_session ON public.marketplace_orders USING btree (session_hash);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_seller_orders_partner ON public.seller_orders USING btree (partner_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_seller_order_items_seller_order ON public.seller_order_items USING btree (seller_order_id);
