-- 0001_rfq_workflow_hardening.sql
-- Additive runtime migration for LM-RFQ-WORKFLOW-DB-01B

-- 1. PRECHECK: INVALID STATUS
DO $$
DECLARE
  invalid_count int;
BEGIN
  SELECT count(*) INTO invalid_count
  FROM public.rfq_leads
  WHERE status NOT IN ('new', 'in_progress', 'responded', 'closed');

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'RFQ migration blocked: invalid status rows exist';
  END IF;
END
$$;

-- 2. PRECHECK: ORPHAN OFFERS
DO $$
DECLARE
  orphan_count int;
BEGIN
  SELECT count(*) INTO orphan_count
  FROM public.rfq_leads r
  LEFT JOIN public.offers o ON r.offer_id = o.id
  WHERE o.id IS NULL;

  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'RFQ migration blocked: offer orphan rows exist';
  END IF;
END
$$;

-- 3. PRECHECK: ORPHAN PARTNERS
DO $$
DECLARE
  orphan_count int;
BEGIN
  SELECT count(*) INTO orphan_count
  FROM public.rfq_leads r
  LEFT JOIN public.partners p ON r.partner_id = p.id
  WHERE p.id IS NULL;

  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'RFQ migration blocked: partner orphan rows exist';
  END IF;
END
$$;

-- 4. ADD STATUS CHECK CONSTRAINT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'rfq_leads_status_check'
      AND conrelid = 'public.rfq_leads'::regclass
  ) THEN
    ALTER TABLE public.rfq_leads
      ADD CONSTRAINT rfq_leads_status_check
      CHECK (((status)::text = ANY ((ARRAY['new'::character varying, 'in_progress'::character varying, 'responded'::character varying, 'closed'::character varying])::text[])));
  END IF;
END
$$;

-- 5. ADD OFFER_ID FOREIGN KEY
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'rfq_leads_offer_id_fkey'
      AND conrelid = 'public.rfq_leads'::regclass
  ) THEN
    ALTER TABLE public.rfq_leads
      ADD CONSTRAINT rfq_leads_offer_id_fkey
      FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON UPDATE NO ACTION ON DELETE NO ACTION;
  END IF;
END
$$;

-- 6. ADD PARTNER_ID FOREIGN KEY
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'rfq_leads_partner_id_fkey'
      AND conrelid = 'public.rfq_leads'::regclass
  ) THEN
    ALTER TABLE public.rfq_leads
      ADD CONSTRAINT rfq_leads_partner_id_fkey
      FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON UPDATE NO ACTION ON DELETE NO ACTION;
  END IF;
END
$$;

-- 7. ADD INDEXES
CREATE INDEX IF NOT EXISTS idx_rfq_leads_offer ON public.rfq_leads USING btree (offer_id);
CREATE INDEX IF NOT EXISTS idx_rfq_leads_partner ON public.rfq_leads USING btree (partner_id);
