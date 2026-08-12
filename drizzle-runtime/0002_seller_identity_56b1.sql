-- 0002_seller_identity_56b1.sql
-- LM-MARKETPLACE-SCHEMA-56B1: seller identity foundation and contract classification
-- All DDL is replay-safe (idempotent). No data backfill. No UPDATE on existing rows.

-- 1. NEW TABLES (IF NOT EXISTS — always replay-safe)
CREATE TABLE IF NOT EXISTS "seller_legal_identities" (
	"partner_id" bigint PRIMARY KEY NOT NULL,
	"legal_name" varchar(255) NOT NULL,
	"jurisdiction_country" varchar(2) NOT NULL,
	"verification_status" varchar(30) DEFAULT 'unverified' NOT NULL,
	"verified_at" timestamp with time zone,
	"verification_source" varchar(100),
	"verification_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seller_tax_identifiers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"partner_id" bigint NOT NULL,
	"identifier_type" varchar(50) NOT NULL,
	"identifier_value" varchar(100) NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"verification_status" varchar(30) DEFAULT 'unverified' NOT NULL,
	"verified_at" timestamp with time zone,
	"verification_source" varchar(100),
	"verification_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seller_registry_identifiers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"partner_id" bigint NOT NULL,
	"registry_type" varchar(50) NOT NULL,
	"registry_value" varchar(100) NOT NULL,
	"jurisdiction_country" varchar(2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "seller_eligibility" (
	"partner_id" bigint PRIMARY KEY NOT NULL,
	"eligibility_status" varchar(30) DEFAULT 'pending' NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint

-- 2. offers.contract_model — ADD COLUMN IF NOT EXISTS (replay-safe)
ALTER TABLE "offers" ADD COLUMN IF NOT EXISTS "contract_model" varchar(30);
--> statement-breakpoint

-- 3. CHECK: offers_contract_model_check (guarded)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'offers_contract_model_check'
      AND conrelid = 'public.offers'::regclass
  ) THEN
    ALTER TABLE public.offers
      ADD CONSTRAINT offers_contract_model_check
      CHECK (((contract_model)::text = ANY ((ARRAY['partner_marketplace'::character varying, 'external_redirect'::character varying, 'logimarket_reseller'::character varying])::text[])));
  END IF;
END
$$;
--> statement-breakpoint

-- 4. CHECK: seller_eligibility_status_check (guarded)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'seller_eligibility_status_check'
      AND conrelid = 'public.seller_eligibility'::regclass
  ) THEN
    ALTER TABLE public.seller_eligibility
      ADD CONSTRAINT seller_eligibility_status_check
      CHECK (((eligibility_status)::text = ANY ((ARRAY['pending'::character varying, 'eligible'::character varying, 'ineligible'::character varying, 'suspended'::character varying])::text[])));
  END IF;
END
$$;
--> statement-breakpoint

-- 5. UNIQUE: uq_seller_tax_identifier_identity (guarded)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_seller_tax_identifier_identity'
      AND conrelid = 'public.seller_tax_identifiers'::regclass
  ) THEN
    ALTER TABLE public.seller_tax_identifiers
      ADD CONSTRAINT uq_seller_tax_identifier_identity
      UNIQUE (partner_id, identifier_type, country_code, identifier_value);
  END IF;
END
$$;
--> statement-breakpoint

-- 6. UNIQUE: uq_seller_registry_identifier_identity (guarded)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_seller_registry_identifier_identity'
      AND conrelid = 'public.seller_registry_identifiers'::regclass
  ) THEN
    ALTER TABLE public.seller_registry_identifiers
      ADD CONSTRAINT uq_seller_registry_identifier_identity
      UNIQUE (partner_id, registry_type, jurisdiction_country, registry_value);
  END IF;
END
$$;
--> statement-breakpoint

-- 7. FOREIGN KEYS (duplicate_object guard — pre-existing pattern)
DO $$ BEGIN
 ALTER TABLE "seller_legal_identities" ADD CONSTRAINT "seller_legal_identities_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "seller_tax_identifiers" ADD CONSTRAINT "seller_tax_identifiers_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."seller_legal_identities"("partner_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "seller_registry_identifiers" ADD CONSTRAINT "seller_registry_identifiers_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."seller_legal_identities"("partner_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "seller_eligibility" ADD CONSTRAINT "seller_eligibility_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- 8. RLS ENABLE (replay-safe — enabling on an already-enabled table is a no-op)
ALTER TABLE "seller_legal_identities" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "seller_tax_identifiers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "seller_registry_identifiers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "seller_eligibility" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- 9. REVOKE (replay-safe — revoking privileges not held is a no-op)
REVOKE ALL ON TABLE "seller_legal_identities" FROM "anon", "authenticated";
--> statement-breakpoint
REVOKE ALL ON TABLE "seller_tax_identifiers" FROM "anon", "authenticated";
--> statement-breakpoint
REVOKE ALL ON TABLE "seller_registry_identifiers" FROM "anon", "authenticated";
--> statement-breakpoint
REVOKE ALL ON TABLE "seller_eligibility" FROM "anon", "authenticated";
--> statement-breakpoint
REVOKE ALL ON SEQUENCE "seller_tax_identifiers_id_seq" FROM "anon", "authenticated";
--> statement-breakpoint
REVOKE ALL ON SEQUENCE "seller_registry_identifiers_id_seq" FROM "anon", "authenticated";
