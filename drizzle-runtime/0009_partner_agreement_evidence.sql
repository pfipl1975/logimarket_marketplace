-- 0009_partner_agreement_evidence.sql
-- LM-LEGAL-ACCEPTANCE-02: Partner Agreement Versioning & Immutable Execution Evidence Foundation

CREATE TABLE IF NOT EXISTS "agreement_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"agreement_type" varchar(50) NOT NULL,
	"version" varchar(50) NOT NULL,
	"canonical_template_hash_sha256" varchar(64) NOT NULL,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"effective_from" timestamp with time zone,
	"effective_to" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_agreement_versions_type" CHECK (agreement_type IN ('partner_agreement_b2b', 'PARTNER_AGREEMENT_B2B')),
	CONSTRAINT "chk_agreement_versions_status" CHECK (status IN ('draft', 'active', 'superseded', 'archived')),
	CONSTRAINT "chk_agreement_versions_hash_format" CHECK (canonical_template_hash_sha256 ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "chk_agreement_versions_active_lifecycle" CHECK (((status)::text <> 'active'::text) OR (effective_from IS NOT NULL AND published_at IS NOT NULL)),
	CONSTRAINT "chk_agreement_versions_effective_dates" CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from),
	CONSTRAINT "uq_agreement_versions_type_version" UNIQUE ("agreement_type", "version"),
	CONSTRAINT "uq_agreement_versions_hash" UNIQUE ("canonical_template_hash_sha256")
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "idx_agreement_versions_single_active" ON "agreement_versions" USING btree ("agreement_type") WHERE ((status)::text = 'active'::text);
--> statement-breakpoint

ALTER TABLE "agreement_versions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "partner_agreement_execution_evidence" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"partner_id" bigint NOT NULL,
	"agreement_version_id" integer NOT NULL,
	"status" varchar(30) DEFAULT 'ACCEPTED' NOT NULL,
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
	CONSTRAINT "chk_partner_agreement_evidence_status" CHECK (status IN ('accepted', 'ACCEPTED')),
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

DO $$ BEGIN
	ALTER TABLE "partner_agreement_execution_evidence" ADD CONSTRAINT "partner_agreement_execution_evidence_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "partner_agreement_execution_evidence" ADD CONSTRAINT "partner_agreement_execution_evidence_agreement_version_id_fkey" FOREIGN KEY ("agreement_version_id") REFERENCES "public"."agreement_versions"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_partner_agreement_evidence_partner_id" ON "partner_agreement_execution_evidence" USING btree ("partner_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_partner_agreement_evidence_version_id" ON "partner_agreement_execution_evidence" USING btree ("agreement_version_id");
--> statement-breakpoint

ALTER TABLE "partner_agreement_execution_evidence" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "partner_agreement_evidence_invalidations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"execution_evidence_id" bigint NOT NULL,
	"reason" text NOT NULL,
	"invalidated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"invalidated_by_admin_user_id" varchar(255) NOT NULL,
	CONSTRAINT "uq_partner_agreement_evidence_invalidations_evidence" UNIQUE ("execution_evidence_id"),
	CONSTRAINT "chk_partner_agreement_invalidation_reason" CHECK (length(btrim(reason)) > 0),
	CONSTRAINT "chk_partner_agreement_invalidation_by" CHECK (length(btrim((invalidated_by_admin_user_id)::text)) > 0)
);
--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "partner_agreement_evidence_invalidations" ADD CONSTRAINT "partner_agreement_evidence_invalidations_execution_evidence_id_fkey" FOREIGN KEY ("execution_evidence_id") REFERENCES "public"."partner_agreement_execution_evidence"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_partner_agreement_invalidations_evidence_id" ON "partner_agreement_evidence_invalidations" USING btree ("execution_evidence_id");
--> statement-breakpoint

ALTER TABLE "partner_agreement_evidence_invalidations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE FUNCTION public.prevent_partner_agreement_execution_evidence_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
	RAISE EXCEPTION 'partner_agreement_execution_evidence is strictly append-only: % not allowed', TG_OP USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_trigger
		WHERE tgname = 'trg_partner_agreement_execution_evidence_append_only'
			AND tgrelid = 'public.partner_agreement_execution_evidence'::regclass
			AND NOT tgisinternal
	) THEN
		CREATE TRIGGER trg_partner_agreement_execution_evidence_append_only
		BEFORE UPDATE OR DELETE ON public.partner_agreement_execution_evidence
		FOR EACH ROW EXECUTE FUNCTION public.prevent_partner_agreement_execution_evidence_mutation();
	END IF;
END $$;
--> statement-breakpoint

CREATE FUNCTION public.prevent_partner_agreement_evidence_invalidations_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
	RAISE EXCEPTION 'partner_agreement_evidence_invalidations is strictly append-only: % not allowed', TG_OP USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_trigger
		WHERE tgname = 'trg_partner_agreement_evidence_invalidations_append_only'
			AND tgrelid = 'public.partner_agreement_evidence_invalidations'::regclass
			AND NOT tgisinternal
	) THEN
		CREATE TRIGGER trg_partner_agreement_evidence_invalidations_append_only
		BEFORE UPDATE OR DELETE ON public.partner_agreement_evidence_invalidations
		FOR EACH ROW EXECUTE FUNCTION public.prevent_partner_agreement_evidence_invalidations_mutation();
	END IF;
END $$;
--> statement-breakpoint

CREATE FUNCTION public.check_partner_agreement_active_external_tx()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM public.partner_agreement_execution_evidence e
		WHERE e.external_platform = NEW.external_platform
			AND e.external_transaction_id = NEW.external_transaction_id
			AND NOT EXISTS (
				SELECT 1
				FROM public.partner_agreement_evidence_invalidations inv
				WHERE inv.execution_evidence_id = e.id
			)
	) THEN
		RAISE EXCEPTION 'Active execution evidence registration already exists for external transaction % on platform %',
			NEW.external_transaction_id, NEW.external_platform USING ERRCODE = '23505';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint

DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_trigger
		WHERE tgname = 'trg_partner_agreement_check_active_tx'
			AND tgrelid = 'public.partner_agreement_execution_evidence'::regclass
			AND NOT tgisinternal
	) THEN
		CREATE TRIGGER trg_partner_agreement_check_active_tx
		BEFORE INSERT ON public.partner_agreement_execution_evidence
		FOR EACH ROW EXECUTE FUNCTION public.check_partner_agreement_active_external_tx();
	END IF;
END $$;
