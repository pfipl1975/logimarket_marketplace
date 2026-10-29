-- LM-PARTNER-APPLICATION-01. Intake/review only. No Partner/Seller/membership writes.
CREATE TABLE public.partner_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_name varchar(255) NOT NULL,
 country_code varchar(2) NOT NULL, contact_email varchar(100) NOT NULL,
 business_type varchar(24) NOT NULL, tax_identifier varchar(100),
 source varchar(16) NOT NULL DEFAULT 'public', submitted_auth_user_id uuid,
 status varchar(32) NOT NULL DEFAULT 'submitted', version integer NOT NULL DEFAULT 1,
 submission_key_hash varchar(64) NOT NULL UNIQUE, request_digest varchar(64) NOT NULL,
 privacy_notice_version varchar(80) NOT NULL, locale varchar(2) NOT NULL,
 retention_policy_status varchar(32) NOT NULL DEFAULT 'LEGAL_REVIEW_REQUIRED', retention_due_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT partner_application_input_check CHECK (
  length(btrim(company_name)) BETWEEN 1 AND 255 AND country_code ~ '^[A-Z]{2}$'
  AND contact_email = lower(btrim(contact_email)) AND contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  AND business_type IN ('manufacturer','distributor','service_provider','other')
  AND source = 'public' AND version > 0
  AND submission_key_hash ~ '^[a-f0-9]{64}$' AND request_digest ~ '^[a-f0-9]{64}$'
  AND locale IN ('pl','en','de','fr','uk','es','zh')
  AND privacy_notice_version = 'LOCAL_FIXTURE_ONLY'
  AND retention_policy_status = 'LEGAL_REVIEW_REQUIRED' AND retention_due_at IS NULL),
 CONSTRAINT partner_application_status_check CHECK (status IN ('submitted','under_review','needs_information','rejected','accepted_for_onboarding'))
);
CREATE INDEX idx_partner_applications_queue ON public.partner_applications(status, created_at);
CREATE INDEX idx_partner_applications_contact ON public.partner_applications(contact_email);
CREATE INDEX idx_partner_applications_tax ON public.partner_applications(country_code, tax_identifier);
CREATE INDEX idx_partner_applications_retention ON public.partner_applications(retention_due_at);
CREATE TABLE public.partner_application_events (
 application_id uuid NOT NULL REFERENCES public.partner_applications(id) ON DELETE RESTRICT,
 version integer NOT NULL, from_status varchar(32), to_status varchar(32) NOT NULL,
 actor_id uuid, reason varchar(100) NOT NULL, note varchar(1000) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(application_id, version),
 CONSTRAINT partner_application_event_check CHECK (version > 0 AND length(btrim(reason)) > 0 AND
 ((version = 1 AND from_status IS NULL AND to_status = 'submitted') OR (version > 1 AND actor_id IS NOT NULL AND from_status IS NOT NULL)))
);
CREATE TABLE public.partner_application_limits (
 bucket varchar(80) PRIMARY KEY, attempts integer NOT NULL CHECK(attempts > 0), expires_at timestamptz NOT NULL
);
--> statement-breakpoint
-- Invoker-only triggers. Actor, reason and note are set transaction-locally by the Admin service.
CREATE FUNCTION public.guard_partner_application() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE actor uuid; reason text; note text;
BEGIN
 IF TG_OP = 'INSERT' THEN
  IF NEW.status <> 'submitted' OR NEW.version <> 1 THEN RAISE EXCEPTION 'APPLICATION_INVALID_INITIAL_STATE'; END IF;
  NEW.created_at := clock_timestamp(); NEW.updated_at := NEW.created_at;
  RETURN NEW;
 END IF;
 IF TG_OP <> 'UPDATE' THEN RAISE EXCEPTION 'APPLICATION_DELETE_REQUIRES_RETENTION_REVIEW'; END IF;
 IF (to_jsonb(NEW) - ARRAY['status','version','updated_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','version','updated_at']) THEN
  RAISE EXCEPTION 'APPLICATION_DECLARATIONS_IMMUTABLE';
 END IF;
 IF NEW.version <> OLD.version + 1 OR NOT (
  (OLD.status = 'submitted' AND NEW.status = 'under_review') OR
  (OLD.status = 'under_review' AND NEW.status IN ('needs_information','rejected','accepted_for_onboarding')) OR
  (OLD.status = 'needs_information' AND NEW.status IN ('under_review','rejected'))
 ) THEN RAISE EXCEPTION 'APPLICATION_INVALID_TRANSITION'; END IF;
 actor := nullif(current_setting('lm.application_actor', true),'')::uuid;
 reason := current_setting('lm.application_reason', true); note := current_setting('lm.application_note', true);
 IF actor IS NULL OR reason IS NULL OR length(btrim(reason)) NOT BETWEEN 1 AND 100 OR note IS NULL OR length(note) > 1000 THEN
  RAISE EXCEPTION 'APPLICATION_DECISION_REQUIRED';
 END IF;
 NEW.updated_at := clock_timestamp(); RETURN NEW;
END $$;
CREATE FUNCTION public.record_partner_application_event() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
BEGIN
 IF TG_OP = 'INSERT' THEN
  INSERT INTO public.partner_application_events(application_id, version, from_status, to_status, actor_id, reason, note, created_at)
  VALUES(NEW.id,1,NULL,'submitted',NEW.submitted_auth_user_id,'submitted','',NEW.created_at);
 ELSE
  INSERT INTO public.partner_application_events(application_id, version, from_status, to_status, actor_id, reason, note, created_at)
  VALUES(NEW.id,NEW.version,OLD.status,NEW.status,nullif(current_setting('lm.application_actor',true),'')::uuid,
   current_setting('lm.application_reason',true),current_setting('lm.application_note',true),NEW.updated_at);
 END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION public.protect_partner_application_history() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
BEGIN
 IF TG_OP = 'INSERT' AND pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'APPLICATION_HISTORY_APPEND_ONLY';
END $$;
CREATE TRIGGER partner_application_guard BEFORE INSERT OR UPDATE OR DELETE ON public.partner_applications FOR EACH ROW EXECUTE FUNCTION public.guard_partner_application();
CREATE TRIGGER partner_application_history AFTER INSERT OR UPDATE ON public.partner_applications FOR EACH ROW EXECUTE FUNCTION public.record_partner_application_event();
CREATE TRIGGER partner_application_no_truncate BEFORE TRUNCATE ON public.partner_applications FOR EACH STATEMENT EXECUTE FUNCTION public.protect_partner_application_history();
CREATE TRIGGER partner_application_events_guard BEFORE INSERT OR UPDATE OR DELETE ON public.partner_application_events FOR EACH ROW EXECUTE FUNCTION public.protect_partner_application_history();
CREATE TRIGGER partner_application_events_no_truncate BEFORE TRUNCATE ON public.partner_application_events FOR EACH STATEMENT EXECUTE FUNCTION public.protect_partner_application_history();
--> statement-breakpoint
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_application_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_application_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.partner_applications,public.partner_application_events,public.partner_application_limits FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_partner_application(),public.record_partner_application_event(),public.protect_partner_application_history() FROM PUBLIC;
DO $$ DECLARE role_name text; BEGIN
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
   EXECUTE format('REVOKE ALL ON public.partner_applications,public.partner_application_events,public.partner_application_limits FROM %I',role_name);
   EXECUTE format('REVOKE ALL ON FUNCTION public.guard_partner_application(),public.record_partner_application_event(),public.protect_partner_application_history() FROM %I',role_name);
  END IF;
 END LOOP;
END $$;
