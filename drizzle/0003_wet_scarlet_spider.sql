CREATE TABLE "migration_rollback_attempts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"batch_id" bigint NOT NULL,
	"attempt_number" integer NOT NULL,
	"status" varchar(30) NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"sqlstate" varchar(5),
	"constraint_name" text,
	"message" text,
	"detail" text,
	"hint" text,
	"targets_deleted_count" integer DEFAULT 0 NOT NULL,
	"targets_skipped_count" integer DEFAULT 0 NOT NULL,
	"targets_conflict_count" integer DEFAULT 0 NOT NULL,
	"initiated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_mra_batch_attempt" UNIQUE("batch_id","attempt_number"),
	CONSTRAINT "chk_mra_attempt_number" CHECK ("migration_rollback_attempts"."attempt_number" > 0),
	CONSTRAINT "chk_mra_deleted_nonnegative" CHECK ("migration_rollback_attempts"."targets_deleted_count" >= 0),
	CONSTRAINT "chk_mra_skipped_nonnegative" CHECK ("migration_rollback_attempts"."targets_skipped_count" >= 0),
	CONSTRAINT "chk_mra_conflict_nonnegative" CHECK ("migration_rollback_attempts"."targets_conflict_count" >= 0),
	CONSTRAINT "chk_mra_status_check" CHECK ("migration_rollback_attempts"."status" IN ('running', 'succeeded', 'failed', 'conflict')),
	CONSTRAINT "chk_mra_sqlstate" CHECK ("migration_rollback_attempts"."sqlstate" IS NULL OR char_length("migration_rollback_attempts"."sqlstate") = 5),
	CONSTRAINT "chk_mra_lifecycle" CHECK (
      (
        "migration_rollback_attempts"."status" = 'running'
        AND "migration_rollback_attempts"."finished_at" IS NULL
        AND "migration_rollback_attempts"."sqlstate" IS NULL
        AND "migration_rollback_attempts"."constraint_name" IS NULL
        AND "migration_rollback_attempts"."message" IS NULL
        AND "migration_rollback_attempts"."detail" IS NULL
        AND "migration_rollback_attempts"."hint" IS NULL
        AND "migration_rollback_attempts"."targets_deleted_count" = 0
        AND "migration_rollback_attempts"."targets_skipped_count" = 0
        AND "migration_rollback_attempts"."targets_conflict_count" = 0
      )
      OR
      (
        "migration_rollback_attempts"."status" = 'succeeded'
        AND "migration_rollback_attempts"."finished_at" IS NOT NULL
        AND "migration_rollback_attempts"."sqlstate" IS NULL
        AND "migration_rollback_attempts"."constraint_name" IS NULL
        AND "migration_rollback_attempts"."message" IS NULL
        AND "migration_rollback_attempts"."detail" IS NULL
        AND "migration_rollback_attempts"."hint" IS NULL
        AND "migration_rollback_attempts"."targets_deleted_count" > 0
        AND "migration_rollback_attempts"."targets_conflict_count" = 0
      )
      OR
      (
        "migration_rollback_attempts"."status" = 'failed'
        AND "migration_rollback_attempts"."finished_at" IS NOT NULL
        AND "migration_rollback_attempts"."sqlstate" IS NOT NULL
        AND char_length("migration_rollback_attempts"."sqlstate") = 5
        AND "migration_rollback_attempts"."message" IS NOT NULL
      )
      OR
      (
        "migration_rollback_attempts"."status" = 'conflict'
        AND "migration_rollback_attempts"."finished_at" IS NOT NULL
        AND "migration_rollback_attempts"."targets_conflict_count" > 0
        AND "migration_rollback_attempts"."sqlstate" IS NULL
        AND "migration_rollback_attempts"."constraint_name" IS NULL
        AND "migration_rollback_attempts"."message" IS NULL
        AND "migration_rollback_attempts"."detail" IS NULL
        AND "migration_rollback_attempts"."hint" IS NULL
      )
    )
);
--> statement-breakpoint
ALTER TABLE "migration_source_entries" DROP CONSTRAINT "chk_mse_source_payload_version";--> statement-breakpoint
ALTER TABLE "migration_source_entries" ADD CONSTRAINT "chk_mse_source_payload_version" CHECK ("migration_source_entries"."source_payload_version" IN ('lm-source-v1', 'lm-source-v2'));--> statement-breakpoint

ALTER TABLE "migration_oav_targets" DROP CONSTRAINT "chk_mot_canonical_version";--> statement-breakpoint
ALTER TABLE "migration_oaov_targets" DROP CONSTRAINT "chk_mott_canonical_version";--> statement-breakpoint

ALTER TABLE "migration_oaov_targets" ADD COLUMN "target_provenance" varchar(30);--> statement-breakpoint
ALTER TABLE "migration_oav_targets" ADD COLUMN "target_provenance" varchar(30);--> statement-breakpoint

UPDATE "migration_oaov_targets" SET "target_provenance" = 'unknown_legacy' WHERE "target_provenance" IS NULL;--> statement-breakpoint
UPDATE "migration_oav_targets" SET "target_provenance" = 'unknown_legacy' WHERE "target_provenance" IS NULL;--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "migration_oaov_targets" WHERE "target_provenance" IS NULL) THEN
    RAISE EXCEPTION 'migration_oaov_targets has NULL provenance';
  END IF;
  IF EXISTS (SELECT 1 FROM "migration_oav_targets" WHERE "target_provenance" IS NULL) THEN
    RAISE EXCEPTION 'migration_oav_targets has NULL provenance';
  END IF;
END $$;
--> statement-breakpoint

ALTER TABLE "migration_oaov_targets" ALTER COLUMN "target_provenance" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "migration_oav_targets" ALTER COLUMN "target_provenance" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "migration_rollback_attempts" ADD CONSTRAINT "fk_mra_batch" FOREIGN KEY ("batch_id") REFERENCES "public"."migration_batches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_oaov_targets" ADD CONSTRAINT "chk_mott_provenance" CHECK ("migration_oaov_targets"."target_provenance" IN ('created_by_batch', 'unknown_legacy'));--> statement-breakpoint
ALTER TABLE "migration_oaov_targets" ADD CONSTRAINT "chk_mott_canonical_version" CHECK ("migration_oaov_targets"."canonical_payload_version" IN ('lm-source-v1', 'lm-source-v2'));--> statement-breakpoint
ALTER TABLE "migration_oav_targets" ADD CONSTRAINT "chk_mot_provenance" CHECK ("migration_oav_targets"."target_provenance" IN ('created_by_batch', 'unknown_legacy'));--> statement-breakpoint
ALTER TABLE "migration_oav_targets" ADD CONSTRAINT "chk_mot_canonical_version" CHECK ("migration_oav_targets"."canonical_payload_version" IN ('lm-source-v1', 'lm-source-v2'));--> statement-breakpoint

CREATE OR REPLACE FUNCTION migration_private.enforce_rollback_attempt_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    IF OLD.status IN ('succeeded', 'failed', 'conflict') THEN
      RAISE EXCEPTION 'Cannot delete terminal rollback attempt row (id = %, status = %)', OLD.id, OLD.status;
    END IF;
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF OLD.status IN ('succeeded', 'failed', 'conflict') THEN
      RAISE EXCEPTION 'Cannot update terminal rollback attempt row (id = %, status = %)', OLD.id, OLD.status;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog;--> statement-breakpoint

CREATE TRIGGER trg_mra_immutability
BEFORE UPDATE OR DELETE ON public.migration_rollback_attempts
FOR EACH ROW EXECUTE FUNCTION migration_private.enforce_rollback_attempt_immutability();--> statement-breakpoint

CREATE OR REPLACE FUNCTION migration_private.insert_and_validate_oav(
  p_batch_id bigint,
  p_source_entry_id bigint,
  p_offer_id bigint,
  p_attribute_id bigint,
  p_value_text text,
  p_value_number numeric,
  p_value_boolean boolean,
  p_value_date timestamp with time zone,
  p_value_year integer,
  p_option_id bigint,
  p_source_hash text,
  p_canonical_version varchar(20)
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_target_id bigint;
  v_manifest_id bigint;
BEGIN
  PERFORM 1 FROM public.offers WHERE id = p_offer_id FOR SHARE;

  IF p_option_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.controlled_option_values
      WHERE id = p_option_id
        AND attribute_id = p_attribute_id
        AND is_active = true
      FOR SHARE
    ) THEN
      RAISE EXCEPTION 'Controlled option validation mismatch' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  INSERT INTO public.offer_attribute_values (
    offer_id, attribute_id, value_text, value_number, value_boolean, value_date, value_year, option_id
  ) VALUES (
    p_offer_id, p_attribute_id, p_value_text, p_value_number, p_value_boolean, p_value_date, p_value_year, p_option_id
  )
  ON CONFLICT ON CONSTRAINT uq_oav_offer_attribute DO NOTHING
  RETURNING id INTO v_target_id;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Concurrent target insert detected during forward migration' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.migration_oav_targets (
    batch_id, source_entry_id, target_row_id_current, target_row_id_original,
    target_offer_id, target_attribute_id, target_option_id, target_hash_at_creation,
    canonical_payload_version, rollback_status, target_provenance
  ) VALUES (
    p_batch_id, p_source_entry_id, v_target_id, v_target_id,
    p_offer_id, p_attribute_id, p_option_id, p_source_hash,
    p_canonical_version, 'pending', 'created_by_batch'
  )
  RETURNING id INTO v_manifest_id;

  RETURN v_target_id;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION migration_private.insert_and_validate_oaov(
  p_batch_id bigint,
  p_source_entry_id bigint,
  p_offer_id bigint,
  p_attribute_id bigint,
  p_option_ids bigint[],
  p_source_hash text,
  p_canonical_version varchar(20)
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_option_id bigint;
  v_target_id bigint;
  v_inserted_count integer := 0;
  v_prev_id bigint := -1;
BEGIN
  PERFORM 1 FROM public.offers WHERE id = p_offer_id FOR SHARE;

  IF p_option_ids IS NULL OR cardinality(p_option_ids) = 0 THEN
    RAISE EXCEPTION 'Option ids array cannot be null or empty' USING ERRCODE = 'check_violation';
  END IF;

  FOREACH v_option_id IN ARRAY p_option_ids
  LOOP
    IF v_option_id IS NULL THEN
      RAISE EXCEPTION 'Option ids array cannot contain nulls' USING ERRCODE = 'check_violation';
    END IF;
    IF v_option_id <= v_prev_id THEN
      IF v_option_id = v_prev_id THEN
        RAISE EXCEPTION 'Option ids array contains duplicate elements' USING ERRCODE = 'check_violation';
      ELSE
        RAISE EXCEPTION 'Option ids array is not sorted deterministically' USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    v_prev_id := v_option_id;

    IF NOT EXISTS (
      SELECT 1 FROM public.controlled_option_values
      WHERE id = v_option_id
        AND attribute_id = p_attribute_id
        AND is_active = true
      FOR SHARE
    ) THEN
      RAISE EXCEPTION 'Controlled option validation mismatch' USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;

  FOREACH v_option_id IN ARRAY p_option_ids
  LOOP
    INSERT INTO public.offer_attribute_option_values (
      offer_id, attribute_id, option_id
    ) VALUES (
      p_offer_id, p_attribute_id, v_option_id
    )
    ON CONFLICT ON CONSTRAINT uq_oaov_offer_attribute_option DO NOTHING
    RETURNING id INTO v_target_id;

    IF v_target_id IS NULL THEN
      RAISE EXCEPTION 'Concurrent target option insert detected during forward migration' USING ERRCODE = '23505';
    END IF;

    INSERT INTO public.migration_oaov_targets (
      batch_id, source_entry_id, target_row_id_current, target_row_id_original,
      target_offer_id, target_attribute_id, target_option_id, target_hash_at_creation,
      canonical_payload_version, rollback_status, target_provenance
    ) VALUES (
      p_batch_id, p_source_entry_id, v_target_id, v_target_id,
      p_offer_id, p_attribute_id, v_option_id, p_source_hash,
      p_canonical_version, 'pending', 'created_by_batch'
    );

    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  RETURN v_inserted_count;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION migration_private.process_source_entry(
  p_batch_id bigint,
  p_source_entry_id bigint,
  p_approved_option_id bigint,
  p_approved_option_ids bigint[]
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_batch_status varchar(30);
  v_entry_record record;
  v_attr_id bigint;
  v_attr_key text;
  v_attr_type varchar(30);
  v_canonical_hash text;
  v_expected_count integer;
  v_target_count integer := 0;
  v_is_oav boolean := false;
  v_is_oaov boolean := false;
  v_val_text text := NULL;
  v_val_num numeric := NULL;
  v_val_bool boolean := NULL;
  v_val_date timestamp with time zone := NULL;
  v_val_year integer := NULL;
  v_opt_id bigint := NULL;
  v_raw_date_str text := NULL;
  v_existing_oav_rec record;
  v_existing_option_ids bigint[];
  v_sorted_approved_option_ids bigint[];
  v_verified_manifest_count integer;
BEGIN
  SELECT status INTO v_batch_status FROM public.migration_batches WHERE id = p_batch_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch % not found', p_batch_id USING ERRCODE = 'undefined_column';
  END IF;
  IF v_batch_status IS DISTINCT FROM 'running' THEN
    RAISE EXCEPTION 'Batch % is not in runnable state', p_batch_id USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_entry_record FROM public.migration_source_entries 
  WHERE id = p_source_entry_id AND batch_id = p_batch_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source entry % not found in batch %', p_source_entry_id, p_batch_id USING ERRCODE = 'undefined_column';
  END IF;

  IF v_entry_record.processing_status IS DISTINCT FROM 'pending' THEN
    IF v_entry_record.processing_status = 'processed' THEN
      RETURN v_entry_record.classification_status;
    ELSE
      RAISE EXCEPTION 'Source entry % is not in pending status', p_source_entry_id USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  PERFORM id FROM public.offers WHERE id = v_entry_record.source_offer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer % not found', v_entry_record.source_offer_id USING ERRCODE = 'undefined_column';
  END IF;

  IF v_entry_record.source_payload_version = 'lm-source-v1' THEN
    UPDATE public.migration_source_entries SET
      processing_status = 'processed',
      classification_status = 'manual_review_required',
      classification_reason = 'legacy_v1_new_write_forbidden',
      expected_target_count = 0
    WHERE id = p_source_entry_id;
    RETURN 'manual_review_required';
  END IF;

  IF v_entry_record.source_payload_version IS DISTINCT FROM 'lm-source-v2' THEN
    RAISE EXCEPTION 'Unsupported source payload version: %', v_entry_record.source_payload_version USING ERRCODE = 'check_violation';
  END IF;

  SELECT id, stable_key, data_type INTO v_attr_id, v_attr_key, v_attr_type
  FROM public.attribute_definitions
  WHERE stable_key = v_entry_record.source_key AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attribute definition % not found or inactive', v_entry_record.source_key USING ERRCODE = '42703';
  END IF;

  v_expected_count := v_entry_record.expected_target_count;

  IF v_attr_type IN ('text', 'number', 'boolean', 'date', 'year', 'enum') THEN
    v_is_oav := true;
    IF v_expected_count <> 1 THEN
      RAISE EXCEPTION 'Single value attributes require expected_target_count = 1' USING ERRCODE = 'check_violation';
    END IF;

    IF v_attr_type = 'text' THEN
      v_val_text := v_entry_record.raw_value ->> 'value';
      IF v_val_text IS NULL THEN RAISE EXCEPTION 'Text value cannot be null' USING ERRCODE = 'check_violation'; END IF;
      v_canonical_hash := migration_private.sha256_hex(concat('v2:text:', v_val_text));
    ELSIF v_attr_type = 'number' THEN
      v_val_num := (v_entry_record.raw_value ->> 'value')::numeric;
      IF v_val_num IS NULL THEN RAISE EXCEPTION 'Numeric value cannot be null' USING ERRCODE = 'check_violation'; END IF;
      v_canonical_hash := migration_private.sha256_hex(concat('v2:number:', (v_val_num)::text));
    ELSIF v_attr_type = 'boolean' THEN
      v_val_bool := (v_entry_record.raw_value ->> 'value')::boolean;
      IF v_val_bool IS NULL THEN RAISE EXCEPTION 'Boolean value cannot be null' USING ERRCODE = 'check_violation'; END IF;
      v_canonical_hash := migration_private.sha256_hex(concat('v2:boolean:', (v_val_bool)::text));
    ELSIF v_attr_type = 'date' THEN
      v_raw_date_str := v_entry_record.raw_value ->> 'value';
      IF v_raw_date_str IS NULL THEN RAISE EXCEPTION 'Date value cannot be null' USING ERRCODE = 'check_violation'; END IF;
      
      IF NOT (v_raw_date_str ~* 'Z' OR v_raw_date_str ~* '[\+\-]\d{2}(:\d{2})?$') THEN
        RAISE EXCEPTION 'Offset-free timestamp rejected' USING ERRCODE = 'check_violation';
      END IF;
      
      v_val_date := v_raw_date_str::timestamp with time zone;
      v_canonical_hash := migration_private.sha256_hex(concat('v2:date:', to_char(v_val_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')));
    ELSIF v_attr_type = 'year' THEN
      v_val_year := (v_entry_record.raw_value ->> 'value')::integer;
      IF v_val_year IS NULL THEN RAISE EXCEPTION 'Year value cannot be null' USING ERRCODE = 'check_violation'; END IF;
      v_canonical_hash := migration_private.sha256_hex(concat('v2:year:', (v_val_year)::text));
    ELSIF v_attr_type = 'enum' THEN
      v_opt_id := p_approved_option_id;
      IF v_opt_id IS NULL THEN
        RAISE EXCEPTION 'Enum requires exactly one option id' USING ERRCODE = 'check_violation';
      END IF;
      IF p_approved_option_ids IS NOT NULL AND cardinality(p_approved_option_ids) <> 1 THEN
        RAISE EXCEPTION 'Enum requires exactly one option id' USING ERRCODE = 'check_violation';
      END IF;
      v_canonical_hash := migration_private.sha256_hex(concat('v2:enum:', (v_opt_id)::text));
    END IF;

  ELSIF v_attr_type = 'multi_enum' THEN
    v_is_oaov := true;
    IF p_approved_option_ids IS NULL THEN
      RAISE EXCEPTION 'Multi enum option ids array cannot be null' USING ERRCODE = 'check_violation';
    END IF;
    IF EXISTS (SELECT 1 FROM unnest(p_approved_option_ids) x WHERE x IS NULL) THEN
      RAISE EXCEPTION 'Option ids array contains nulls' USING ERRCODE = 'check_violation';
    END IF;
    IF (SELECT count(x) FROM unnest(p_approved_option_ids) x) <> (SELECT count(DISTINCT x) FROM unnest(p_approved_option_ids) x) THEN
      RAISE EXCEPTION 'Option ids array contains duplicates' USING ERRCODE = 'check_violation';
    END IF;
    IF v_expected_count <> cardinality(p_approved_option_ids) THEN
      RAISE EXCEPTION 'Multi enum expected_target_count must match options array cardinality' USING ERRCODE = 'check_violation';
    END IF;

    SELECT ARRAY(SELECT x FROM unnest(p_approved_option_ids) x ORDER BY x ASC) INTO v_sorted_approved_option_ids;

    DECLARE
      v_opt_count integer;
    BEGIN
      SELECT count(*) INTO v_opt_count
      FROM public.controlled_option_values
      WHERE id = ANY(v_sorted_approved_option_ids)
        AND attribute_id = v_attr_id
        AND is_active = true;
        
      IF v_opt_count <> cardinality(v_sorted_approved_option_ids) THEN
        RAISE EXCEPTION 'Some option IDs are inactive or mismatch attribute definitions' USING ERRCODE = 'check_violation';
      END IF;
    END;

    v_canonical_hash := migration_private.sha256_hex(concat('v2:multi_enum:', array_to_string(v_sorted_approved_option_ids, ',')));
  ELSE
    RAISE EXCEPTION 'Unsupported data type %', v_attr_type USING ERRCODE = 'check_violation';
  END IF;

  IF v_entry_record.source_hash IS DISTINCT FROM v_canonical_hash THEN
    RAISE EXCEPTION 'Source hash mismatch' USING ERRCODE = 'check_violation';
  END IF;

  IF v_is_oav THEN
    SELECT id, value_text, value_number, value_boolean, value_date, value_year, option_id
    INTO v_existing_oav_rec
    FROM public.offer_attribute_values
    WHERE offer_id = v_entry_record.source_offer_id AND attribute_id = v_attr_id;

    IF FOUND THEN
      IF (v_attr_type = 'text' AND v_existing_oav_rec.value_text = v_val_text)
         OR (v_attr_type = 'number' AND v_existing_oav_rec.value_number = v_val_num)
         OR (v_attr_type = 'boolean' AND v_existing_oav_rec.value_boolean = v_val_bool)
         OR (v_attr_type = 'date' AND v_existing_oav_rec.value_date = v_val_date)
         OR (v_attr_type = 'year' AND v_existing_oav_rec.value_year = v_val_year)
         OR (v_attr_type = 'enum' AND v_existing_oav_rec.option_id = v_opt_id)
      THEN
        UPDATE public.migration_source_entries SET
          processing_status = 'processed',
          classification_status = 'intentionally_skipped',
          classification_reason = 'existing_target_exact_match',
          expected_target_count = 0
        WHERE id = p_source_entry_id;
        RETURN 'intentionally_skipped';
      ELSE
        UPDATE public.migration_source_entries SET
          processing_status = 'processed',
          classification_status = 'manual_review_required',
          classification_reason = 'existing_target_value_mismatch',
          expected_target_count = 0
        WHERE id = p_source_entry_id;
        RETURN 'manual_review_required';
      END IF;
    END IF;

    PERFORM migration_private.insert_and_validate_oav(
      p_batch_id, p_source_entry_id, v_entry_record.source_offer_id, v_attr_id,
      v_val_text, v_val_num, v_val_bool, v_val_date, v_val_year, v_opt_id,
      v_canonical_hash, v_entry_record.source_payload_version
    );

  ELSIF v_is_oaov THEN
    SELECT ARRAY_AGG(option_id ORDER BY option_id ASC) INTO v_existing_option_ids
    FROM public.offer_attribute_option_values
    WHERE offer_id = v_entry_record.source_offer_id AND attribute_id = v_attr_id;

    IF v_existing_option_ids IS NULL THEN
      v_existing_option_ids := ARRAY[]::bigint[];
    END IF;

    IF cardinality(v_existing_option_ids) > 0 THEN
      IF v_existing_option_ids = v_sorted_approved_option_ids THEN
        UPDATE public.migration_source_entries SET
          processing_status = 'processed',
          classification_status = 'intentionally_skipped',
          classification_reason = 'existing_target_exact_match',
          expected_target_count = 0
        WHERE id = p_source_entry_id;
        RETURN 'intentionally_skipped';
      ELSE
        UPDATE public.migration_source_entries SET
          processing_status = 'processed',
          classification_status = 'manual_review_required',
          classification_reason = 'existing_target_value_mismatch',
          expected_target_count = 0
        WHERE id = p_source_entry_id;
        RETURN 'manual_review_required';
      END IF;
    END IF;

    v_target_count := migration_private.insert_and_validate_oaov(
      p_batch_id, p_source_entry_id, v_entry_record.source_offer_id, v_attr_id,
      v_sorted_approved_option_ids, v_canonical_hash, v_entry_record.source_payload_version
    );
  END IF;

  IF v_is_oav THEN
    SELECT count(*) INTO v_verified_manifest_count
    FROM public.migration_oav_targets
    WHERE source_entry_id = p_source_entry_id AND batch_id = p_batch_id AND rollback_status = 'pending';

    IF v_verified_manifest_count <> v_expected_count THEN
      RAISE EXCEPTION 'OAV manifest count mismatch: expected %, got %', v_expected_count, v_verified_manifest_count USING ERRCODE = 'check_violation';
    END IF;
  ELSIF v_is_oaov THEN
    SELECT count(*) INTO v_verified_manifest_count
    FROM public.migration_oaov_targets
    WHERE source_entry_id = p_source_entry_id AND batch_id = p_batch_id AND rollback_status = 'pending';

    IF v_verified_manifest_count <> v_expected_count THEN
      RAISE EXCEPTION 'OAOV manifest count mismatch: expected %, got %', v_expected_count, v_verified_manifest_count USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  UPDATE public.migration_source_entries SET
    processing_status = 'processed',
    classification_status = 'migrated',
    classification_reason = 'successfully_processed'
  WHERE id = p_source_entry_id;

  RETURN 'migrated';
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION migration_private.rollback_batch(
  p_batch_id bigint
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_batch_status varchar(30);
  v_attempt_id bigint;
  v_attempt_num integer;
  v_actor text;
  v_attempt_timestamp timestamp with time zone;
  v_deleted_count integer := 0;
  v_skipped_count integer := 0;
  v_conflict_count integer := 0;
  v_sqlstate varchar(5);
  v_message text;
  v_constraint text;
  v_detail text;
  v_hint text;
  v_mot_rec record;
  v_mott_group record;
  v_dtype varchar(30);
  v_curr_hash text;
  v_update_cnt integer;
  v_delete_cnt integer;
  v_existing_option_ids bigint[];
  v_manifest_option_ids bigint[];
  v_manifest_count integer;
  v_group_offer_id bigint;
  v_group_attr_id bigint;
  v_manifest_hash text;
  v_version varchar(20);
BEGIN
  v_actor := SESSION_USER::text;
  v_attempt_timestamp := clock_timestamp();

  SELECT status INTO v_batch_status 
  FROM public.migration_batches 
  WHERE id = p_batch_id 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch % not found', p_batch_id USING ERRCODE = 'undefined_column';
  END IF;
  
  IF v_batch_status IS DISTINCT FROM 'completed' AND v_batch_status IS DISTINCT FROM 'rollback_conflict' AND v_batch_status IS DISTINCT FROM 'failed' THEN
    RAISE EXCEPTION 'Batch % is not in a rollbackable state (status: %)', p_batch_id, v_batch_status USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.migration_batches 
  SET status = 'rollback_in_progress' 
  WHERE id = p_batch_id;

  SELECT COALESCE(max(attempt_number), 0) + 1 INTO v_attempt_num
  FROM public.migration_rollback_attempts
  WHERE batch_id = p_batch_id;

  INSERT INTO public.migration_rollback_attempts (
    batch_id, attempt_number, status, started_at, initiated_by
  ) VALUES (
    p_batch_id, v_attempt_num, 'running', v_attempt_timestamp, v_actor
  )
  RETURNING id INTO v_attempt_id;

  BEGIN
    PERFORM id FROM public.offers
    WHERE id IN (
      SELECT DISTINCT target_offer_id FROM public.migration_oav_targets WHERE batch_id = p_batch_id
      UNION
      SELECT DISTINCT target_offer_id FROM public.migration_oaov_targets WHERE batch_id = p_batch_id
    )
    ORDER BY id ASC
    FOR UPDATE;

    PERFORM id FROM public.migration_oav_targets 
    WHERE batch_id = p_batch_id 
    ORDER BY id ASC 
    FOR UPDATE;

    PERFORM id FROM public.offer_attribute_values 
    WHERE id IN (
      SELECT target_row_id_current 
      FROM public.migration_oav_targets 
      WHERE batch_id = p_batch_id AND target_row_id_current IS NOT NULL
    ) 
    ORDER BY id ASC 
    FOR UPDATE;

    PERFORM id FROM public.migration_oaov_targets 
    WHERE batch_id = p_batch_id 
    ORDER BY id ASC 
    FOR UPDATE;

    PERFORM id FROM public.offer_attribute_option_values 
    WHERE id IN (
      SELECT target_row_id_current 
      FROM public.migration_oaov_targets 
      WHERE batch_id = p_batch_id AND target_row_id_current IS NOT NULL
    ) 
    ORDER BY id ASC 
    FOR UPDATE;

    FOR v_mot_rec IN 
      SELECT mot.*, oav.offer_id, oav.attribute_id, oav.option_id, oav.value_text, oav.value_number, oav.value_boolean, oav.value_date, oav.value_year
      FROM public.migration_oav_targets mot
      LEFT JOIN public.offer_attribute_values oav ON oav.id = mot.target_row_id_current
      WHERE mot.batch_id = p_batch_id
      ORDER BY mot.id ASC
    LOOP
      IF v_mot_rec.rollback_status = 'cleaned_up' THEN
        v_skipped_count := v_skipped_count + 1;
        CONTINUE;
      END IF;

      IF v_mot_rec.rollback_status IS DISTINCT FROM 'pending' THEN
        v_conflict_count := v_conflict_count + 1;
        RAISE EXCEPTION 'Manifest % is not pending (status: %)', v_mot_rec.id, v_mot_rec.rollback_status USING ERRCODE = 'check_violation';
      END IF;

      IF v_mot_rec.target_row_id_current IS NULL OR v_mot_rec.target_row_id_current IS DISTINCT FROM v_mot_rec.target_row_id_original THEN
        v_conflict_count := v_conflict_count + 1;
        RAISE EXCEPTION 'Target row ID mismatch for manifest %', v_mot_rec.id USING ERRCODE = 'check_violation';
      END IF;

      IF v_mot_rec.target_provenance IS DISTINCT FROM 'created_by_batch' THEN
        v_conflict_count := v_conflict_count + 1;
        RAISE EXCEPTION 'Manifest % has provenance %, delete forbidden', v_mot_rec.id, v_mot_rec.target_provenance USING ERRCODE = 'check_violation';
      END IF;

      IF v_mot_rec.canonical_payload_version = 'lm-source-v1' THEN
        v_conflict_count := v_conflict_count + 1;
        RAISE EXCEPTION 'Automatic rollback of legacy v1 manifest % is forbidden', v_mot_rec.id USING ERRCODE = 'check_violation';
      END IF;

      IF v_mot_rec.offer_id IS NULL THEN
        v_conflict_count := v_conflict_count + 1;
        RAISE EXCEPTION 'Physical target for manifest % does not exist', v_mot_rec.id USING ERRCODE = 'check_violation';
      END IF;

      IF v_mot_rec.offer_id IS DISTINCT FROM v_mot_rec.target_offer_id OR v_mot_rec.attribute_id IS DISTINCT FROM v_mot_rec.target_attribute_id THEN
        v_conflict_count := v_conflict_count + 1;
        RAISE EXCEPTION 'Physical target metadata mismatch for manifest %', v_mot_rec.id USING ERRCODE = 'check_violation';
      END IF;

      SELECT data_type INTO v_dtype FROM public.attribute_definitions WHERE id = v_mot_rec.target_attribute_id;
      IF v_dtype = 'text' THEN
        v_curr_hash := migration_private.sha256_hex(concat('v2:text:', v_mot_rec.value_text));
      ELSIF v_dtype = 'number' THEN
        v_curr_hash := migration_private.sha256_hex(concat('v2:number:', (v_mot_rec.value_number)::text));
      ELSIF v_dtype = 'boolean' THEN
        v_curr_hash := migration_private.sha256_hex(concat('v2:boolean:', (v_mot_rec.value_boolean)::text));
      ELSIF v_dtype = 'date' THEN
        v_curr_hash := migration_private.sha256_hex(concat('v2:date:', to_char(v_mot_rec.value_date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')));
      ELSIF v_dtype = 'year' THEN
        v_curr_hash := migration_private.sha256_hex(concat('v2:year:', (v_mot_rec.value_year)::text));
      ELSIF v_dtype = 'enum' THEN
        v_curr_hash := migration_private.sha256_hex(concat('v2:enum:', (v_mot_rec.option_id)::text));
      ELSE
        v_conflict_count := v_conflict_count + 1;
        RAISE EXCEPTION 'Unsupported attribute type % for manifest %', v_dtype, v_mot_rec.id USING ERRCODE = 'check_violation';
      END IF;

      IF v_curr_hash IS DISTINCT FROM v_mot_rec.target_hash_at_creation THEN
        v_conflict_count := v_conflict_count + 1;
        RAISE EXCEPTION 'Hash mismatch for manifest %: expected %, got %', v_mot_rec.id, v_mot_rec.target_hash_at_creation, v_curr_hash USING ERRCODE = 'check_violation';
      END IF;

      UPDATE public.migration_oav_targets SET
        target_row_id_current = NULL,
        rollback_status = 'cleaned_up',
        rollback_reason = 'deleted_by_batch_rollback',
        target_deleted_at = v_attempt_timestamp
      WHERE id = v_mot_rec.id;
      
      GET DIAGNOSTICS v_update_cnt = ROW_COUNT;
      IF v_update_cnt <> 1 THEN
        RAISE EXCEPTION 'Manifest update failed for id %', v_mot_rec.id USING ERRCODE = 'check_violation';
      END IF;

      DELETE FROM public.offer_attribute_values WHERE id = v_mot_rec.target_row_id_current;
      
      GET DIAGNOSTICS v_delete_cnt = ROW_COUNT;
      IF v_delete_cnt <> 1 THEN
        RAISE EXCEPTION 'Physical delete failed for target id %', v_mot_rec.target_row_id_current USING ERRCODE = 'check_violation';
      END IF;

      v_deleted_count := v_deleted_count + 1;
    END LOOP;

    FOR v_mott_group IN
      SELECT DISTINCT source_entry_id 
      FROM public.migration_oaov_targets 
      WHERE batch_id = p_batch_id
    LOOP
      PERFORM id FROM public.migration_oaov_targets 
      WHERE batch_id = p_batch_id AND source_entry_id = v_mott_group.source_entry_id 
      ORDER BY id ASC 
      FOR UPDATE;

      SELECT COUNT(*) INTO v_manifest_count
      FROM public.migration_oaov_targets
      WHERE batch_id = p_batch_id AND source_entry_id = v_mott_group.source_entry_id;

      SELECT target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version
      INTO v_group_offer_id, v_group_attr_id, v_manifest_hash, v_version
      FROM public.migration_oaov_targets
      WHERE batch_id = p_batch_id AND source_entry_id = v_mott_group.source_entry_id
      LIMIT 1;

      IF EXISTS (
        SELECT 1 FROM public.migration_oaov_targets
        WHERE batch_id = p_batch_id AND source_entry_id = v_mott_group.source_entry_id
          AND rollback_status = 'cleaned_up'
      ) THEN
        IF EXISTS (
          SELECT 1 FROM public.migration_oaov_targets
          WHERE batch_id = p_batch_id AND source_entry_id = v_mott_group.source_entry_id
            AND rollback_status = 'pending'
        ) THEN
          v_conflict_count := v_conflict_count + 1;
          RAISE EXCEPTION 'Partial rollback state detected for group source_entry_id %', v_mott_group.source_entry_id USING ERRCODE = 'check_violation';
        END IF;
        
        v_skipped_count := v_skipped_count + v_manifest_count;
        CONTINUE;
      END IF;

      IF EXISTS (
        SELECT 1 FROM public.migration_oaov_targets
        WHERE batch_id = p_batch_id AND source_entry_id = v_mott_group.source_entry_id
          AND target_provenance IS DISTINCT FROM 'created_by_batch'
      ) THEN
        v_conflict_count := v_conflict_count + 1;
        RAISE EXCEPTION 'Group source_entry_id % contains non-batch provenance, delete forbidden', v_mott_group.source_entry_id USING ERRCODE = 'check_violation';
      END IF;

      IF v_version = 'lm-source-v1' THEN
        v_conflict_count := v_conflict_count + 1;
        RAISE EXCEPTION 'Automatic rollback of legacy v1 group source_entry_id % is forbidden', v_mott_group.source_entry_id USING ERRCODE = 'check_violation';
      END IF;

      PERFORM id FROM public.offer_attribute_option_values
      WHERE offer_id = v_group_offer_id AND attribute_id = v_group_attr_id
      ORDER BY id ASC
      FOR UPDATE;

      SELECT ARRAY_AGG(option_id ORDER BY option_id ASC) INTO v_existing_option_ids
      FROM public.offer_attribute_option_values
      WHERE offer_id = v_group_offer_id AND attribute_id = v_group_attr_id;

      SELECT ARRAY_AGG(target_option_id ORDER BY target_option_id ASC) INTO v_manifest_option_ids
      FROM public.migration_oaov_targets
      WHERE batch_id = p_batch_id AND source_entry_id = v_mott_group.source_entry_id;

      IF v_manifest_count <> cardinality(v_manifest_option_ids) THEN
        v_conflict_count := v_conflict_count + 1;
        RAISE EXCEPTION 'Manifest count % does not match option array size %', v_manifest_count, cardinality(v_manifest_option_ids) USING ERRCODE = 'check_violation';
      END IF;

      IF v_existing_option_ids IS NULL THEN
        v_existing_option_ids := ARRAY[]::bigint[];
      END IF;
      v_curr_hash := migration_private.sha256_hex(concat('v2:multi_enum:', array_to_string(v_existing_option_ids, ',')));

      IF v_curr_hash IS DISTINCT FROM v_manifest_hash THEN
        v_conflict_count := v_conflict_count + 1;
        RAISE EXCEPTION 'Hash mismatch for group source_entry_id %: expected %, got %', v_mott_group.source_entry_id, v_manifest_hash, v_curr_hash USING ERRCODE = 'check_violation';
      END IF;

      IF v_existing_option_ids IS DISTINCT FROM v_manifest_option_ids THEN
        v_conflict_count := v_conflict_count + 1;
        RAISE EXCEPTION 'Physical option set does not match manifest option set for source_entry_id %', v_mott_group.source_entry_id USING ERRCODE = 'check_violation';
      END IF;

      UPDATE public.migration_oaov_targets SET
        target_row_id_current = NULL,
        rollback_status = 'cleaned_up',
        rollback_reason = 'deleted_by_batch_rollback',
        target_deleted_at = v_attempt_timestamp
      WHERE batch_id = p_batch_id AND source_entry_id = v_mott_group.source_entry_id;

      GET DIAGNOSTICS v_update_cnt = ROW_COUNT;
      IF v_update_cnt <> v_manifest_count THEN
        RAISE EXCEPTION 'Group manifest update count mismatch: expected %, got %', v_manifest_count, v_update_cnt USING ERRCODE = 'check_violation';
      END IF;

      DELETE FROM public.offer_attribute_option_values
      WHERE offer_id = v_group_offer_id AND attribute_id = v_group_attr_id
        AND option_id = ANY(v_manifest_option_ids);

      GET DIAGNOSTICS v_delete_cnt = ROW_COUNT;
      IF v_delete_cnt <> v_manifest_count THEN
        RAISE EXCEPTION 'Group physical delete count mismatch: expected %, got %', v_manifest_count, v_delete_cnt USING ERRCODE = 'check_violation';
      END IF;

      v_deleted_count := v_deleted_count + v_manifest_count;
    END LOOP;

    UPDATE public.migration_rollback_attempts SET
      status = 'succeeded',
      finished_at = clock_timestamp(),
      targets_deleted_count = v_deleted_count,
      targets_skipped_count = v_skipped_count,
      targets_conflict_count = 0
    WHERE id = v_attempt_id;

    UPDATE public.migration_batches 
    SET status = 'rolled_back' 
    WHERE id = p_batch_id;

    RETURN 'succeeded';

  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS
        v_sqlstate = RETURNED_SQLSTATE,
        v_message = MESSAGE_TEXT,
        v_constraint = CONSTRAINT_NAME,
        v_detail = PG_EXCEPTION_DETAIL,
        v_hint = PG_EXCEPTION_HINT;

      IF v_sqlstate IN ('40001', '40P01', '57014') THEN
        RAISE;
      END IF;

      IF v_conflict_count > 0 OR v_sqlstate = 'check_violation' THEN
        UPDATE public.migration_rollback_attempts SET
          status = 'conflict',
          finished_at = clock_timestamp(),
          targets_conflict_count = COALESCE(NULLIF(v_conflict_count, 0), 1),
          targets_deleted_count = 0,
          targets_skipped_count = 0,
          sqlstate = NULL,
          constraint_name = NULL,
          message = NULL,
          detail = NULL,
          hint = NULL
        WHERE id = v_attempt_id;

        UPDATE public.migration_batches 
        SET status = 'rollback_conflict' 
        WHERE id = p_batch_id;

        RETURN 'conflict';
      ELSE
        UPDATE public.migration_rollback_attempts SET
          status = 'failed',
          finished_at = clock_timestamp(),
          targets_deleted_count = 0,
          targets_skipped_count = 0,
          targets_conflict_count = 0,
          sqlstate = v_sqlstate,
          constraint_name = v_constraint,
          message = v_message,
          detail = v_detail,
          hint = v_hint
        WHERE id = v_attempt_id;

        UPDATE public.migration_batches 
        SET status = 'failed' 
        WHERE id = p_batch_id;

        RETURN 'failed';
      END IF;
  END;
END;
$$;--> statement-breakpoint

ALTER TABLE public.migration_rollback_attempts OWNER TO lm_migration_owner;--> statement-breakpoint
REVOKE ALL ON public.migration_rollback_attempts FROM lm_migration_executor;--> statement-breakpoint

ALTER FUNCTION migration_private.enforce_rollback_attempt_immutability() OWNER TO lm_migration_owner;--> statement-breakpoint
REVOKE ALL ON FUNCTION migration_private.enforce_rollback_attempt_immutability() FROM PUBLIC;--> statement-breakpoint

ALTER FUNCTION migration_private.insert_and_validate_oav(bigint, bigint, bigint, bigint, text, numeric, boolean, timestamp with time zone, integer, bigint, text, varchar) OWNER TO lm_migration_owner;--> statement-breakpoint
REVOKE ALL ON FUNCTION migration_private.insert_and_validate_oav(bigint, bigint, bigint, bigint, text, numeric, boolean, timestamp with time zone, integer, bigint, text, varchar) FROM PUBLIC;--> statement-breakpoint

ALTER FUNCTION migration_private.insert_and_validate_oaov(bigint, bigint, bigint, bigint, bigint[], text, varchar) OWNER TO lm_migration_owner;--> statement-breakpoint
REVOKE ALL ON FUNCTION migration_private.insert_and_validate_oaov(bigint, bigint, bigint, bigint, bigint[], text, varchar) FROM PUBLIC;--> statement-breakpoint

ALTER FUNCTION migration_private.process_source_entry(bigint, bigint, bigint, bigint[]) OWNER TO lm_migration_owner;--> statement-breakpoint
REVOKE ALL ON FUNCTION migration_private.process_source_entry(bigint, bigint, bigint, bigint[]) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION migration_private.process_source_entry(bigint, bigint, bigint, bigint[]) TO lm_migration_executor;--> statement-breakpoint

ALTER FUNCTION migration_private.rollback_batch(bigint) OWNER TO lm_migration_owner;--> statement-breakpoint
REVOKE ALL ON FUNCTION migration_private.rollback_batch(bigint) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION migration_private.rollback_batch(bigint) TO lm_migration_executor;--> statement-breakpoint