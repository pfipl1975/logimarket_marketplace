-- LM-B2B-BUYER-ONBOARDING-01: Buyer profile master data and active canonical identity uniqueness.
-- Requires exact POST_0019 state and a read-only duplicate audit before production rollout.

DROP INDEX IF EXISTS public.idx_buyer_tax_identifiers_active_canonical;
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_buyer_tax_identifiers_active_canonical"
  ON public.buyer_tax_identifiers USING btree ("canonical_identity_class", "canonical_identifier_value")
  WHERE retired_at IS NULL;
--> statement-breakpoint

CREATE TABLE public.buyer_organization_addresses (
  "id" bigserial PRIMARY KEY NOT NULL,
  "buyer_organization_id" bigint NOT NULL,
  "address_type" varchar(20) NOT NULL,
  "street" varchar(255) NOT NULL,
  "building_number" varchar(30) NOT NULL,
  "unit_number" varchar(30),
  "postal_code" varchar(6) NOT NULL,
  "city" varchar(100) NOT NULL,
  "country_code" varchar(2) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone,
  "retired_at" timestamp with time zone,
  CONSTRAINT "buyer_organization_addresses_organization_fk" FOREIGN KEY ("buyer_organization_id") REFERENCES public.buyer_organizations("id") ON DELETE restrict,
  CONSTRAINT "chk_buyer_address_type" CHECK (address_type = 'registered'),
  CONSTRAINT "chk_buyer_address_country" CHECK (country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT "chk_buyer_address_required" CHECK (length(btrim(street)) > 0 AND length(btrim(building_number)) > 0 AND length(btrim(city)) > 0),
  CONSTRAINT "chk_buyer_address_postal_code" CHECK (postal_code ~ '^[0-9]{2}-[0-9]{3}$')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_buyer_address_active_registered"
  ON public.buyer_organization_addresses USING btree ("buyer_organization_id", "address_type")
  WHERE retired_at IS NULL;
--> statement-breakpoint

CREATE TABLE public.buyer_user_profiles (
  "auth_user_id" uuid PRIMARY KEY NOT NULL,
  "first_name" varchar(100) NOT NULL,
  "last_name" varchar(100) NOT NULL,
  "contact_email" varchar(320) NOT NULL,
  "phone" varchar(32) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone,
  CONSTRAINT "chk_buyer_user_profile_required" CHECK (length(btrim(first_name)) > 0 AND length(btrim(last_name)) > 0 AND length(btrim(contact_email)) > 0 AND length(btrim(phone)) > 0)
);
--> statement-breakpoint

ALTER TABLE public.buyer_organization_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_user_profiles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.buyer_organization_addresses, public.buyer_user_profiles FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.buyer_organization_addresses, public.buyer_user_profiles FROM authenticated;
  END IF;
END $$;
