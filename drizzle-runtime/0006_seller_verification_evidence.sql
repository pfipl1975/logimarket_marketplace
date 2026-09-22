-- 0006_seller_verification_evidence.sql
-- LM-PARTNER-VERIFICATION-EVIDENCE-A1: immutable seller verification history
-- Additive after runtime 0005. No data rewrite, DELETE, UPDATE, or CASCADE.

CREATE TABLE IF NOT EXISTS "seller_verification_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"subject_type" varchar(50) NOT NULL,
	"legal_identity_partner_id" bigint,
	"tax_identifier_id" bigint,
	"registry_identifier_id" bigint,
	"event_type" varchar(50) NOT NULL,
	"actor_type" varchar(50) NOT NULL,
	"actor_user_id" varchar(255),
	"source_type" varchar(50) NOT NULL,
	"source_name" varchar(100),
	"source_reference" text,
	"reason_code" varchar(100),
	"subject_snapshot" jsonb NOT NULL,
	"previous_verification_status" varchar(30),
	"previous_verified_at" timestamp with time zone,
	"previous_verification_source" varchar(100),
	"previous_verification_reference" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subject_matrix_check" CHECK (
		(subject_type = 'legal_identity' AND legal_identity_partner_id IS NOT NULL AND tax_identifier_id IS NULL AND registry_identifier_id IS NULL)
		OR (subject_type = 'tax_identifier' AND legal_identity_partner_id IS NULL AND tax_identifier_id IS NOT NULL AND registry_identifier_id IS NULL)
		OR (subject_type = 'registry_identifier' AND legal_identity_partner_id IS NULL AND tax_identifier_id IS NULL AND registry_identifier_id IS NOT NULL)
	),
	CONSTRAINT "event_type_check" CHECK (event_type IN ('verified', 'rejected', 'invalidated')),
	CONSTRAINT "actor_type_check" CHECK (actor_type IN ('admin', 'system', 'external_adapter')),
	CONSTRAINT "actor_matrix_check" CHECK (
		(actor_type = 'admin' AND actor_user_id IS NOT NULL)
		OR (actor_type = 'system' AND actor_user_id IS NULL)
		OR (actor_type = 'external_adapter' AND actor_user_id IS NULL)
	),
	CONSTRAINT "source_type_check" CHECK (source_type IN ('admin_manual', 'public_registry_manual', 'partner_document', 'external_adapter', 'system_rule'))
);
--> statement-breakpoint

ALTER TABLE "seller_legal_identities" ADD COLUMN IF NOT EXISTS "current_verification_event_id" bigint;
--> statement-breakpoint
ALTER TABLE "seller_tax_identifiers" ADD COLUMN IF NOT EXISTS "current_verification_event_id" bigint;
--> statement-breakpoint
ALTER TABLE "seller_tax_identifiers" ADD COLUMN IF NOT EXISTS "retired_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "seller_registry_identifiers" ADD COLUMN IF NOT EXISTS "verification_status" varchar(30);
--> statement-breakpoint
ALTER TABLE "seller_registry_identifiers" ALTER COLUMN "verification_status" SET DEFAULT 'unverified';
--> statement-breakpoint
ALTER TABLE "seller_registry_identifiers" ADD COLUMN IF NOT EXISTS "verified_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "seller_registry_identifiers" ADD COLUMN IF NOT EXISTS "verification_source" varchar(100);
--> statement-breakpoint
ALTER TABLE "seller_registry_identifiers" ADD COLUMN IF NOT EXISTS "verification_reference" text;
--> statement-breakpoint
ALTER TABLE "seller_registry_identifiers" ADD COLUMN IF NOT EXISTS "current_verification_event_id" bigint;
--> statement-breakpoint
ALTER TABLE "seller_registry_identifiers" ADD COLUMN IF NOT EXISTS "retired_at" timestamp with time zone;
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "seller_verification_events" ADD CONSTRAINT "seller_verification_events_legal_identity_fkey" FOREIGN KEY ("legal_identity_partner_id") REFERENCES "public"."seller_legal_identities"("partner_id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "seller_verification_events" ADD CONSTRAINT "seller_verification_events_tax_identifier_fkey" FOREIGN KEY ("tax_identifier_id") REFERENCES "public"."seller_tax_identifiers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "seller_verification_events" ADD CONSTRAINT "seller_verification_events_registry_identifier_fkey" FOREIGN KEY ("registry_identifier_id") REFERENCES "public"."seller_registry_identifiers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "seller_legal_identities" ADD CONSTRAINT "seller_legal_identities_current_verification_event_id_seller_verification_events_id_fk" FOREIGN KEY ("current_verification_event_id") REFERENCES "public"."seller_verification_events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "seller_tax_identifiers" ADD CONSTRAINT "seller_tax_identifiers_current_verification_event_id_seller_verification_events_id_fk" FOREIGN KEY ("current_verification_event_id") REFERENCES "public"."seller_verification_events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "seller_registry_identifiers" ADD CONSTRAINT "seller_registry_identifiers_current_verification_event_id_seller_verification_events_id_fk" FOREIGN KEY ("current_verification_event_id") REFERENCES "public"."seller_verification_events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_verification_events_legal_subject" ON "seller_verification_events" USING btree ("legal_identity_partner_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_verification_events_tax_subject" ON "seller_verification_events" USING btree ("tax_identifier_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_verification_events_registry_subject" ON "seller_verification_events" USING btree ("registry_identifier_id");
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "seller_legal_identities" ADD CONSTRAINT "chk_legacy_legal_status" CHECK (verification_status IN ('unverified', 'verified', 'rejected')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "seller_tax_identifiers" ADD CONSTRAINT "chk_legacy_tax_status" CHECK (verification_status IN ('unverified', 'verified', 'rejected')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "seller_registry_identifiers" ADD CONSTRAINT "chk_legacy_registry_status" CHECK (verification_status IS NULL OR verification_status IN ('unverified', 'verified', 'rejected')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.prevent_verification_events_mutation()
RETURNS TRIGGER AS $$
BEGIN
	RAISE EXCEPTION 'seller_verification_events is strictly append-only: % not allowed', TG_OP USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_trigger
		WHERE tgname = 'trg_seller_verification_events_append_only'
			AND tgrelid = 'public.seller_verification_events'::regclass
			AND NOT tgisinternal
	) THEN
		CREATE TRIGGER trg_seller_verification_events_append_only
		BEFORE UPDATE OR DELETE ON public.seller_verification_events
		FOR EACH ROW EXECUTE FUNCTION public.prevent_verification_events_mutation();
	END IF;
END $$;
--> statement-breakpoint

ALTER TABLE "seller_verification_events" ENABLE ROW LEVEL SECURITY;
