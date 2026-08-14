-- 0003_prod_legacy_offer_reconciliation.sql
-- LM-DB-PROD-RECONCILIATION-02C: reconcile legacy production offers data, align check constraints and foreign keys

-- 1. FAIL-CLOSED PRECHECK: assert only recognized offer tuples exist
DO $$
DECLARE
  unsupported_count int;
BEGIN
  SELECT count(*) INTO unsupported_count
  FROM public.offers
  WHERE (offer_model, conversion_type) NOT IN (
    ('rfq', 'inbound'),
    ('rfq', 'outbound'),
    ('marketplace', 'inbound'),
    ('marketplace', 'outbound'),
    ('rfq', 'rfq'),
    ('ecommerce', 'outbound')
  );

  IF unsupported_count > 0 THEN
    RAISE EXCEPTION '0003 precheck failed: unsupported (offer_model, conversion_type) tuple exists';
  END IF;
END $$;
--> statement-breakpoint

-- 2. DROP LEGACY CHECK CONSTRAINTS (controlled transaction)
ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_conversion_type_check;
--> statement-breakpoint
ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_offer_model_check;
--> statement-breakpoint

-- 3. DETERMINISTIC DML DATA MAPPING
UPDATE public.offers
SET offer_model = 'marketplace',
    conversion_type = 'inbound'
WHERE offer_model = 'ecommerce'
  AND conversion_type = 'outbound';
--> statement-breakpoint

UPDATE public.offers
SET conversion_type = 'inbound'
WHERE offer_model = 'rfq'
  AND conversion_type = 'rfq';
--> statement-breakpoint

-- 4. APPLY FINAL CANONICAL CHECK CONSTRAINTS
ALTER TABLE public.offers
  ADD CONSTRAINT offers_offer_model_check
  CHECK (((offer_model)::text = ANY ((ARRAY['rfq'::character varying, 'marketplace'::character varying])::text[])));
--> statement-breakpoint

ALTER TABLE public.offers
  ADD CONSTRAINT offers_conversion_type_check
  CHECK (((conversion_type)::text = ANY ((ARRAY['inbound'::character varying, 'outbound'::character varying])::text[])));
--> statement-breakpoint

-- 5. FINAL DATA ASSERTION: zero invalid canonical tuples
DO $$
DECLARE
  invalid_count int;
BEGIN
  SELECT count(*) INTO invalid_count
  FROM public.offers
  WHERE (offer_model, conversion_type) NOT IN (
    ('rfq', 'inbound'),
    ('rfq', 'outbound'),
    ('marketplace', 'inbound'),
    ('marketplace', 'outbound')
  );

  IF invalid_count > 0 THEN
    RAISE EXCEPTION '0003 validation failed: invalid canonical offer tuples remain';
  END IF;
END $$;
--> statement-breakpoint

-- 6. CONVERGE PUBLICATION STATUS CHECK (5 allowed statuses)
ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_publication_status_check;
--> statement-breakpoint
ALTER TABLE public.offers
  ADD CONSTRAINT offers_publication_status_check
  CHECK (((publication_status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'hidden'::character varying, 'archived'::character varying, 'deleted'::character varying])::text[])));
--> statement-breakpoint

-- 7. CONVERGE FOREIGN KEY DEFINITIONS
-- categories.parent_id -> ON DELETE RESTRICT
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_parent_id_fkey;
--> statement-breakpoint
ALTER TABLE public.categories
  ADD CONSTRAINT categories_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON UPDATE NO ACTION ON DELETE RESTRICT;
--> statement-breakpoint

-- offers.category_id -> ON DELETE RESTRICT
ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_category_id_fkey;
--> statement-breakpoint
ALTER TABLE public.offers
  ADD CONSTRAINT offers_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE NO ACTION ON DELETE RESTRICT;
--> statement-breakpoint

-- offers.partner_id -> ON DELETE CASCADE
ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_partner_id_fkey;
--> statement-breakpoint
ALTER TABLE public.offers
  ADD CONSTRAINT offers_partner_id_fkey
  FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON UPDATE NO ACTION ON DELETE CASCADE;
--> statement-breakpoint

-- clicks.offer_id -> ON DELETE CASCADE
ALTER TABLE public.clicks DROP CONSTRAINT IF EXISTS clicks_offer_id_fkey;
--> statement-breakpoint
ALTER TABLE public.clicks
  ADD CONSTRAINT clicks_offer_id_fkey
  FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON UPDATE NO ACTION ON DELETE CASCADE;
--> statement-breakpoint

-- clicks.partner_id -> ON DELETE CASCADE
ALTER TABLE public.clicks DROP CONSTRAINT IF EXISTS clicks_partner_id_fkey;
--> statement-breakpoint
ALTER TABLE public.clicks
  ADD CONSTRAINT clicks_partner_id_fkey
  FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON UPDATE NO ACTION ON DELETE CASCADE;
--> statement-breakpoint

-- 8. CONVERGE CLICKS TRACKING INDEX TO PHYSICAL PROD DEFINITION
DROP INDEX IF EXISTS public.idx_clicks_tracking;
--> statement-breakpoint
CREATE INDEX idx_clicks_tracking ON public.clicks USING btree (ip_hash, offer_id, clicked_at);
