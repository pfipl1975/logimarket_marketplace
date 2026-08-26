-- Custom Runtime Migration: 0004_seller_registered_address
-- Adds structured registered office address columns to public.seller_legal_identities
-- Fail-closed / replay-safe / non-destructive

ALTER TABLE public.seller_legal_identities
  ADD COLUMN IF NOT EXISTS registered_address_line1 character varying(255),
  ADD COLUMN IF NOT EXISTS registered_address_line2 character varying(255),
  ADD COLUMN IF NOT EXISTS registered_postal_code character varying(32),
  ADD COLUMN IF NOT EXISTS registered_city character varying(120),
  ADD COLUMN IF NOT EXISTS registered_region character varying(120),
  ADD COLUMN IF NOT EXISTS registered_country_code character varying(2);
