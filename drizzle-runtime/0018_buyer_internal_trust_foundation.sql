-- 0018_buyer_internal_trust_foundation.sql
-- LM-BUYER-INTERNAL-TRUST-FOUNDATION-13C
-- Additive Buyer Organization trust foundation. No checkout wiring or legacy backfill.

CREATE TABLE IF NOT EXISTS public.buyer_organizations (
	"id" bigserial PRIMARY KEY NOT NULL,
	"legal_name" varchar(255) NOT NULL,
	"jurisdiction_country" varchar(2) NOT NULL,
	"verification_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"current_verification_event_id" bigint,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "chk_buyer_organizations_country" CHECK (jurisdiction_country ~ '^[A-Z]{2}$'),
	CONSTRAINT "chk_buyer_organizations_verification_status" CHECK (verification_status IN ('pending', 'verified', 'rejected', 'revoked')),
	CONSTRAINT "chk_buyer_organizations_verification_consistency" CHECK (
		(verification_status = 'verified' AND current_verification_event_id IS NOT NULL AND verified_at IS NOT NULL)
		OR (verification_status = 'pending' AND verified_at IS NULL)
		OR (verification_status IN ('rejected', 'revoked') AND current_verification_event_id IS NOT NULL AND verified_at IS NULL)
	)
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.buyer_organization_memberships (
	"id" bigserial PRIMARY KEY NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"buyer_organization_id" bigint NOT NULL,
	"membership_role" varchar(30) NOT NULL,
	"membership_status" varchar(20) DEFAULT 'active' NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "uq_buyer_organization_membership" UNIQUE("auth_user_id", "buyer_organization_id"),
	CONSTRAINT "chk_buyer_organization_membership_role" CHECK (membership_role IN ('organization_admin', 'authorized_buyer')),
	CONSTRAINT "chk_buyer_organization_membership_status" CHECK (membership_status IN ('active', 'inactive', 'revoked')),
	CONSTRAINT "chk_buyer_organization_membership_consistency" CHECK (
		(membership_status = 'active' AND ended_at IS NULL)
		OR (membership_status IN ('inactive', 'revoked') AND ended_at IS NOT NULL)
	),
	CONSTRAINT "buyer_organization_memberships_organization_fk" FOREIGN KEY ("buyer_organization_id") REFERENCES public.buyer_organizations("id") ON DELETE restrict
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.buyer_tax_identifiers (
	"id" bigserial PRIMARY KEY NOT NULL,
	"buyer_organization_id" bigint NOT NULL,
	"identifier_type" varchar(50) NOT NULL,
	"identifier_value" varchar(100) NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"canonical_identity_class" varchar(50) NOT NULL,
	"canonical_identifier_value" varchar(100) NOT NULL,
	"trusted_by_verification_event_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "uq_buyer_tax_identifier_owner" UNIQUE("id", "buyer_organization_id"),
	CONSTRAINT "uq_buyer_tax_identifier_identity" UNIQUE("buyer_organization_id", "identifier_type", "country_code", "identifier_value"),
	CONSTRAINT "chk_buyer_tax_identifier_type" CHECK (identifier_type IN ('tax_id', 'vat_id')),
	CONSTRAINT "chk_buyer_tax_identifier_country" CHECK (country_code ~ '^[A-Z]{2}$'),
	CONSTRAINT "chk_buyer_tax_identifier_value" CHECK (length(btrim(identifier_value)) > 0),
	CONSTRAINT "chk_buyer_tax_identifier_trust_retirement" CHECK (trusted_by_verification_event_id IS NULL OR retired_at IS NULL),
	CONSTRAINT "buyer_tax_identifiers_organization_fk" FOREIGN KEY ("buyer_organization_id") REFERENCES public.buyer_organizations("id") ON DELETE restrict
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.buyer_registry_identifiers (
	"id" bigserial PRIMARY KEY NOT NULL,
	"buyer_organization_id" bigint NOT NULL,
	"registry_type" varchar(50) NOT NULL,
	"registry_value" varchar(100) NOT NULL,
	"jurisdiction_country" varchar(2) NOT NULL,
	"trusted_by_verification_event_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "uq_buyer_registry_identifier_owner" UNIQUE("id", "buyer_organization_id"),
	CONSTRAINT "uq_buyer_registry_identifier_identity" UNIQUE("buyer_organization_id", "registry_type", "jurisdiction_country", "registry_value"),
	CONSTRAINT "chk_buyer_registry_identifier_type" CHECK (registry_type IN ('commercial_register', 'statistical_id')),
	CONSTRAINT "chk_buyer_registry_identifier_country" CHECK (jurisdiction_country ~ '^[A-Z]{2}$'),
	CONSTRAINT "chk_buyer_registry_identifier_value" CHECK (length(btrim(registry_value)) > 0),
	CONSTRAINT "chk_buyer_registry_identifier_trust_retirement" CHECK (trusted_by_verification_event_id IS NULL OR retired_at IS NULL),
	CONSTRAINT "buyer_registry_identifiers_organization_fk" FOREIGN KEY ("buyer_organization_id") REFERENCES public.buyer_organizations("id") ON DELETE restrict
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS public.buyer_organization_verification_events (
	"id" bigserial PRIMARY KEY NOT NULL,
	"buyer_organization_id" bigint NOT NULL,
	"event_type" varchar(30) NOT NULL,
	"outcome_status" varchar(20) NOT NULL,
	"actor_type" varchar(30) NOT NULL,
	"actor_user_id" uuid,
	"source_type" varchar(30) NOT NULL,
	"source_name" varchar(100),
	"source_reference" text,
	"verification_method" varchar(100) NOT NULL,
	"reason_code" varchar(100),
	"previous_verification_status" varchar(20) NOT NULL,
	"legal_name_snapshot" varchar(255) NOT NULL,
	"jurisdiction_country_snapshot" varchar(2) NOT NULL,
	"tax_identifier_id" bigint,
	"tax_identifier_type_snapshot" varchar(50),
	"tax_identifier_value_snapshot" varchar(100),
	"tax_country_code_snapshot" varchar(2),
	"registry_identifier_id" bigint,
	"registry_type_snapshot" varchar(50),
	"registry_value_snapshot" varchar(100),
	"registry_country_code_snapshot" varchar(2),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_buyer_verification_event_owner" UNIQUE("id", "buyer_organization_id"),
	CONSTRAINT "chk_buyer_verification_event_type" CHECK (event_type IN ('verified', 'rejected', 'revoked', 'invalidated')),
	CONSTRAINT "chk_buyer_verification_outcome_status" CHECK (outcome_status IN ('pending', 'verified', 'rejected', 'revoked')),
	CONSTRAINT "chk_buyer_verification_previous_status" CHECK (previous_verification_status IN ('pending', 'verified', 'rejected', 'revoked')),
	CONSTRAINT "chk_buyer_verification_event_outcome" CHECK (
		(event_type = 'verified' AND outcome_status = 'verified')
		OR (event_type = 'rejected' AND outcome_status = 'rejected')
		OR (event_type = 'revoked' AND outcome_status = 'revoked')
		OR (event_type = 'invalidated' AND outcome_status = 'pending')
	),
	CONSTRAINT "chk_buyer_verification_actor_type" CHECK (actor_type IN ('admin', 'buyer_user', 'system', 'external_adapter')),
	CONSTRAINT "chk_buyer_verification_source_type" CHECK (source_type IN ('admin_manual', 'buyer_change', 'system_rule', 'external_adapter')),
	CONSTRAINT "chk_buyer_verification_actor" CHECK (
		(actor_type IN ('admin', 'buyer_user') AND actor_user_id IS NOT NULL)
		OR (actor_type IN ('system', 'external_adapter') AND actor_user_id IS NULL)
	),
	CONSTRAINT "chk_buyer_verification_source_actor" CHECK (
		(source_type = 'admin_manual' AND actor_type = 'admin')
		OR (source_type = 'buyer_change' AND actor_type = 'buyer_user')
		OR (source_type = 'system_rule' AND actor_type = 'system')
		OR (source_type = 'external_adapter' AND actor_type = 'external_adapter')
	),
	CONSTRAINT "chk_buyer_verification_tax_snapshot" CHECK (
		(tax_identifier_id IS NULL AND tax_identifier_type_snapshot IS NULL AND tax_identifier_value_snapshot IS NULL AND tax_country_code_snapshot IS NULL)
		OR (tax_identifier_id IS NOT NULL AND tax_identifier_type_snapshot IS NOT NULL AND tax_identifier_value_snapshot IS NOT NULL AND tax_country_code_snapshot IS NOT NULL)
	),
	CONSTRAINT "chk_buyer_verification_registry_snapshot" CHECK (
		(registry_identifier_id IS NULL AND registry_type_snapshot IS NULL AND registry_value_snapshot IS NULL AND registry_country_code_snapshot IS NULL)
		OR (registry_identifier_id IS NOT NULL AND registry_type_snapshot IS NOT NULL AND registry_value_snapshot IS NOT NULL AND registry_country_code_snapshot IS NOT NULL)
	),
	CONSTRAINT "chk_buyer_verification_identifier_present" CHECK (tax_identifier_id IS NOT NULL OR registry_identifier_id IS NOT NULL),
	CONSTRAINT "chk_buyer_verification_evidence" CHECK (event_type <> 'verified' OR (length(btrim(source_name)) > 0 AND length(btrim(source_reference)) > 0)),
	CONSTRAINT "chk_buyer_verification_reason" CHECK (event_type = 'verified' OR length(btrim(reason_code)) > 0),
	CONSTRAINT "chk_buyer_verification_country" CHECK (jurisdiction_country_snapshot ~ '^[A-Z]{2}$'),
	CONSTRAINT "buyer_verification_events_organization_fk" FOREIGN KEY ("buyer_organization_id") REFERENCES public.buyer_organizations("id") ON DELETE restrict,
	CONSTRAINT "buyer_verification_events_tax_owner_fk" FOREIGN KEY ("tax_identifier_id", "buyer_organization_id") REFERENCES public.buyer_tax_identifiers("id", "buyer_organization_id") ON DELETE restrict,
	CONSTRAINT "buyer_verification_events_registry_owner_fk" FOREIGN KEY ("registry_identifier_id", "buyer_organization_id") REFERENCES public.buyer_registry_identifiers("id", "buyer_organization_id") ON DELETE restrict
);
--> statement-breakpoint

ALTER TABLE public.buyer_organizations
	ADD CONSTRAINT "buyer_org_current_verification_event_fk"
	FOREIGN KEY ("current_verification_event_id", "id")
	REFERENCES public.buyer_organization_verification_events("id", "buyer_organization_id")
	ON DELETE restrict;
--> statement-breakpoint

ALTER TABLE public.buyer_tax_identifiers
	ADD CONSTRAINT "buyer_tax_trusted_event_fk"
	FOREIGN KEY ("trusted_by_verification_event_id", "buyer_organization_id")
	REFERENCES public.buyer_organization_verification_events("id", "buyer_organization_id")
	ON DELETE restrict;
--> statement-breakpoint

ALTER TABLE public.buyer_registry_identifiers
	ADD CONSTRAINT "buyer_registry_trusted_event_fk"
	FOREIGN KEY ("trusted_by_verification_event_id", "buyer_organization_id")
	REFERENCES public.buyer_organization_verification_events("id", "buyer_organization_id")
	ON DELETE restrict;
--> statement-breakpoint

CREATE INDEX "idx_buyer_organizations_verification_status" ON public.buyer_organizations USING btree ("verification_status");
CREATE INDEX "idx_buyer_memberships_auth_status" ON public.buyer_organization_memberships USING btree ("auth_user_id", "membership_status");
CREATE INDEX "idx_buyer_memberships_org_status" ON public.buyer_organization_memberships USING btree ("buyer_organization_id", "membership_status");
CREATE INDEX "idx_buyer_tax_identifiers_active_org" ON public.buyer_tax_identifiers USING btree ("buyer_organization_id") WHERE retired_at IS NULL;
CREATE INDEX "idx_buyer_tax_identifiers_active_canonical" ON public.buyer_tax_identifiers USING btree ("canonical_identity_class", "canonical_identifier_value") WHERE retired_at IS NULL;
CREATE INDEX "idx_buyer_registry_identifiers_active_org" ON public.buyer_registry_identifiers USING btree ("buyer_organization_id") WHERE retired_at IS NULL;
CREATE INDEX "idx_buyer_registry_identifiers_active_value" ON public.buyer_registry_identifiers USING btree ("registry_type", "jurisdiction_country", "registry_value") WHERE retired_at IS NULL;
CREATE INDEX "idx_buyer_verification_events_org_time" ON public.buyer_organization_verification_events USING btree ("buyer_organization_id", "occurred_at");
CREATE INDEX "idx_buyer_verification_events_type_time" ON public.buyer_organization_verification_events USING btree ("event_type", "occurred_at");
CREATE INDEX "idx_buyer_verification_events_tax" ON public.buyer_organization_verification_events USING btree ("tax_identifier_id");
CREATE INDEX "idx_buyer_verification_events_registry" ON public.buyer_organization_verification_events USING btree ("registry_identifier_id");
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.prevent_buyer_organization_verification_events_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
	RAISE EXCEPTION 'buyer_organization_verification_events is strictly append-only: % not allowed', TG_OP USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint

CREATE TRIGGER trg_buyer_organization_verification_events_append_only
BEFORE UPDATE OR DELETE ON public.buyer_organization_verification_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_buyer_organization_verification_events_mutation();
--> statement-breakpoint

ALTER TABLE public.buyer_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_tax_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_registry_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_organization_verification_events ENABLE ROW LEVEL SECURITY;
