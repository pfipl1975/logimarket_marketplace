-- 0003_prod_legacy_offer_reconciliation.sql
-- LM-DB-PROD-RECONCILIATION-02D: reconcile legacy production offers data, align check constraints, FKs and indexes

-- 1. FAIL-CLOSED PRECHECKS: assert only recognized offer tuples and publication statuses exist
DO $$
DECLARE
  unsupported_tuple_count int;
  unsupported_status_count int;
BEGIN
  -- A. Precheck publication_status
  SELECT count(*) INTO unsupported_status_count
  FROM public.offers
  WHERE publication_status NOT IN (
    'draft',
    'published',
    'hidden',
    'archived',
    'deleted'
  );

  IF unsupported_status_count > 0 THEN
    RAISE EXCEPTION '0003 precheck failed: unsupported publication_status exists';
  END IF;

  -- B. Precheck (offer_model, conversion_type) tuples
  SELECT count(*) INTO unsupported_tuple_count
  FROM public.offers
  WHERE (offer_model, conversion_type) NOT IN (
    ('rfq', 'inbound'),
    ('rfq', 'outbound'),
    ('marketplace', 'inbound'),
    ('marketplace', 'outbound'),
    ('rfq', 'rfq'),
    ('ecommerce', 'outbound')
  );

  IF unsupported_tuple_count > 0 THEN
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
DO $$
DECLARE
  def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO def
  FROM pg_constraint
  WHERE conname = 'offers_publication_status_check'
    AND conrelid = 'public.offers'::regclass;

  IF def IS NULL THEN
    ALTER TABLE public.offers
      ADD CONSTRAINT offers_publication_status_check
      CHECK (((publication_status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'hidden'::character varying, 'archived'::character varying, 'deleted'::character varying])::text[])));
  ELSIF def ILIKE '%draft%' AND def ILIKE '%published%' AND def ILIKE '%hidden%' AND def ILIKE '%archived%' AND def ILIKE '%deleted%' THEN
    NULL; -- Already final
  ELSE
    ALTER TABLE public.offers DROP CONSTRAINT offers_publication_status_check;
    ALTER TABLE public.offers
      ADD CONSTRAINT offers_publication_status_check
      CHECK (((publication_status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'hidden'::character varying, 'archived'::character varying, 'deleted'::character varying])::text[])));
  END IF;
END $$;
--> statement-breakpoint

-- 7. CONDITIONAL FOREIGN KEY CONVERGENCE
-- A. categories_parent_id_fkey -> ON DELETE RESTRICT
DO $$
DECLARE
  def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO def
  FROM pg_constraint
  WHERE conname = 'categories_parent_id_fkey'
    AND conrelid = 'public.categories'::regclass;

  IF def IS NULL THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_parent_id_fkey
      FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON UPDATE NO ACTION ON DELETE RESTRICT;
  ELSIF def ILIKE '%ON DELETE RESTRICT%' THEN
    NULL; -- Already final
  ELSIF def NOT ILIKE '%ON DELETE%' OR def ILIKE '%ON DELETE NO ACTION%' THEN
    ALTER TABLE public.categories DROP CONSTRAINT categories_parent_id_fkey;
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_parent_id_fkey
      FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON UPDATE NO ACTION ON DELETE RESTRICT;
  ELSE
    RAISE EXCEPTION 'categories_parent_id_fkey has unexpected definition: %', def;
  END IF;
END $$;
--> statement-breakpoint

-- B. offers_category_id_fkey -> ON DELETE RESTRICT
DO $$
DECLARE
  def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO def
  FROM pg_constraint
  WHERE conname = 'offers_category_id_fkey'
    AND conrelid = 'public.offers'::regclass;

  IF def IS NULL THEN
    ALTER TABLE public.offers
      ADD CONSTRAINT offers_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE NO ACTION ON DELETE RESTRICT;
  ELSIF def ILIKE '%ON DELETE RESTRICT%' THEN
    NULL; -- Already final
  ELSIF def NOT ILIKE '%ON DELETE%' OR def ILIKE '%ON DELETE NO ACTION%' THEN
    ALTER TABLE public.offers DROP CONSTRAINT offers_category_id_fkey;
    ALTER TABLE public.offers
      ADD CONSTRAINT offers_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE NO ACTION ON DELETE RESTRICT;
  ELSE
    RAISE EXCEPTION 'offers_category_id_fkey has unexpected definition: %', def;
  END IF;
END $$;
--> statement-breakpoint

-- C. offers_partner_id_fkey -> ON DELETE CASCADE
DO $$
DECLARE
  def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO def
  FROM pg_constraint
  WHERE conname = 'offers_partner_id_fkey'
    AND conrelid = 'public.offers'::regclass;

  IF def IS NULL THEN
    ALTER TABLE public.offers
      ADD CONSTRAINT offers_partner_id_fkey
      FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON UPDATE NO ACTION ON DELETE CASCADE;
  ELSIF def ILIKE '%ON DELETE CASCADE%' THEN
    NULL; -- Already final
  ELSIF def NOT ILIKE '%ON DELETE%' OR def ILIKE '%ON DELETE NO ACTION%' THEN
    ALTER TABLE public.offers DROP CONSTRAINT offers_partner_id_fkey;
    ALTER TABLE public.offers
      ADD CONSTRAINT offers_partner_id_fkey
      FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON UPDATE NO ACTION ON DELETE CASCADE;
  ELSE
    RAISE EXCEPTION 'offers_partner_id_fkey has unexpected definition: %', def;
  END IF;
END $$;
--> statement-breakpoint

-- D. clicks_offer_id_fkey -> ON DELETE CASCADE
DO $$
DECLARE
  def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO def
  FROM pg_constraint
  WHERE conname = 'clicks_offer_id_fkey'
    AND conrelid = 'public.clicks'::regclass;

  IF def IS NULL THEN
    ALTER TABLE public.clicks
      ADD CONSTRAINT clicks_offer_id_fkey
      FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON UPDATE NO ACTION ON DELETE CASCADE;
  ELSIF def ILIKE '%ON DELETE CASCADE%' THEN
    NULL; -- Already final
  ELSIF def NOT ILIKE '%ON DELETE%' OR def ILIKE '%ON DELETE NO ACTION%' THEN
    ALTER TABLE public.clicks DROP CONSTRAINT clicks_offer_id_fkey;
    ALTER TABLE public.clicks
      ADD CONSTRAINT clicks_offer_id_fkey
      FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON UPDATE NO ACTION ON DELETE CASCADE;
  ELSE
    RAISE EXCEPTION 'clicks_offer_id_fkey has unexpected definition: %', def;
  END IF;
END $$;
--> statement-breakpoint

-- E. clicks_partner_id_fkey -> ON DELETE CASCADE
DO $$
DECLARE
  def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO def
  FROM pg_constraint
  WHERE conname = 'clicks_partner_id_fkey'
    AND conrelid = 'public.clicks'::regclass;

  IF def IS NULL THEN
    ALTER TABLE public.clicks
      ADD CONSTRAINT clicks_partner_id_fkey
      FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON UPDATE NO ACTION ON DELETE CASCADE;
  ELSIF def ILIKE '%ON DELETE CASCADE%' THEN
    NULL; -- Already final
  ELSIF def NOT ILIKE '%ON DELETE%' OR def ILIKE '%ON DELETE NO ACTION%' THEN
    ALTER TABLE public.clicks DROP CONSTRAINT clicks_partner_id_fkey;
    ALTER TABLE public.clicks
      ADD CONSTRAINT clicks_partner_id_fkey
      FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON UPDATE NO ACTION ON DELETE CASCADE;
  ELSE
    RAISE EXCEPTION 'clicks_partner_id_fkey has unexpected definition: %', def;
  END IF;
END $$;
--> statement-breakpoint

-- 8. CONDITIONAL CLICKS TRACKING INDEX CONVERGENCE
DO $$
DECLARE
  idxdef text;
BEGIN
  SELECT indexdef INTO idxdef
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'clicks'
    AND indexname = 'idx_clicks_tracking';

  IF idxdef IS NULL THEN
    CREATE INDEX idx_clicks_tracking ON public.clicks USING btree (ip_hash, offer_id, clicked_at);
  ELSIF idxdef ILIKE '%(ip_hash, offer_id, clicked_at)%' THEN
    NULL; -- Already final
  ELSIF idxdef ILIKE '%(offer_id, partner_id, clicked_at)%' THEN
    DROP INDEX public.idx_clicks_tracking;
    CREATE INDEX idx_clicks_tracking ON public.clicks USING btree (ip_hash, offer_id, clicked_at);
  ELSE
    RAISE EXCEPTION 'idx_clicks_tracking has unexpected definition: %', idxdef;
  END IF;
END $$;
