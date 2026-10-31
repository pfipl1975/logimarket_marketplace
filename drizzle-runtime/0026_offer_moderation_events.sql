-- LM-PARTNER-MODERATION-03 / candidate DDL, QA only until formally integrated.
CREATE TABLE public.offer_moderation_events (
  id bigserial PRIMARY KEY,
  offer_id bigint NOT NULL REFERENCES public.offers(id) ON DELETE RESTRICT,
  partner_id bigint NOT NULL REFERENCES public.partners(id) ON DELETE RESTRICT,
  admin_actor_id uuid NOT NULL,
  decision varchar(32) NOT NULL,
  from_status varchar(20) NOT NULL,
  to_status varchar(20) NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT offer_moderation_events_transition_check CHECK (
    (decision = 'approved' AND from_status IN ('draft','pending_review') AND to_status = 'published' AND reason IS NULL)
    OR
    (decision = 'returned_for_correction' AND from_status = 'pending_review' AND to_status = 'draft'
      AND reason IS NOT NULL AND length(btrim(reason)) BETWEEN 1 AND 1000)
  )
);
CREATE INDEX idx_offer_moderation_events_offer ON public.offer_moderation_events (offer_id, id DESC);
CREATE INDEX idx_offer_moderation_events_partner ON public.offer_moderation_events (partner_id, offer_id, id DESC);
CREATE FUNCTION public.reject_offer_moderation_event_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
BEGIN
  RAISE EXCEPTION 'OFFER_MODERATION_HISTORY_APPEND_ONLY';
END $$;
CREATE TRIGGER offer_moderation_events_no_modify
  BEFORE UPDATE OR DELETE ON public.offer_moderation_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_offer_moderation_event_mutation();
CREATE TRIGGER offer_moderation_events_no_truncate
  BEFORE TRUNCATE ON public.offer_moderation_events
  FOR EACH STATEMENT EXECUTE FUNCTION public.reject_offer_moderation_event_mutation();
ALTER TABLE public.offer_moderation_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.offer_moderation_events FROM PUBLIC;
REVOKE ALL ON SEQUENCE public.offer_moderation_events_id_seq FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_offer_moderation_event_mutation() FROM PUBLIC;
DO $$ DECLARE r text; BEGIN
  FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON public.offer_moderation_events FROM %I', r);
      EXECUTE format('REVOKE ALL ON SEQUENCE public.offer_moderation_events_id_seq FROM %I', r);
      EXECUTE format('REVOKE ALL ON FUNCTION public.reject_offer_moderation_event_mutation() FROM %I', r);
    END IF;
  END LOOP;
END $$;
