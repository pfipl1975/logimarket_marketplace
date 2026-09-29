-- Immutable Buyer invoice details captured when a new canonical E2 intent is created.
-- Historical marketplace orders are deliberately not backfilled.
CREATE TABLE public.marketplace_order_buyer_invoice_snapshots (
  "id" bigserial PRIMARY KEY NOT NULL,
  "marketplace_order_id" bigint NOT NULL,
  "legal_name" varchar(255) NOT NULL,
  "tax_identifier_type" varchar(50) NOT NULL,
  "tax_identifier_value" varchar(100) NOT NULL,
  "street" varchar(255) NOT NULL,
  "building_number" varchar(30) NOT NULL,
  "unit_number" varchar(30),
  "postal_code" varchar(20) NOT NULL,
  "city" varchar(100) NOT NULL,
  "country_code" varchar(2) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "marketplace_order_buyer_invoice_snapshots_order_fk" FOREIGN KEY ("marketplace_order_id") REFERENCES public.marketplace_orders("id") ON DELETE restrict,
  CONSTRAINT "uq_marketplace_order_buyer_invoice_snapshot" UNIQUE ("marketplace_order_id"),
  CONSTRAINT "chk_buyer_invoice_required" CHECK (
    length(btrim(legal_name)) > 0 AND
    length(btrim(tax_identifier_type)) > 0 AND
    length(btrim(tax_identifier_value)) > 0 AND
    length(btrim(street)) > 0 AND
    length(btrim(building_number)) > 0 AND
    length(btrim(postal_code)) > 0 AND
    length(btrim(city)) > 0
  ),
  CONSTRAINT "chk_buyer_invoice_country" CHECK (country_code ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
ALTER TABLE public.marketplace_order_buyer_invoice_snapshots ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.marketplace_order_buyer_invoice_snapshots FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.marketplace_order_buyer_invoice_snapshots FROM authenticated;
  END IF;
END $$;
