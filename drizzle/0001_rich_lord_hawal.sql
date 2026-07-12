CREATE TABLE "attribute_definitions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"stable_key" text NOT NULL,
	"data_type" varchar(30) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_ad_stable_key" UNIQUE("stable_key"),
	CONSTRAINT "chk_ad_data_type" CHECK ("attribute_definitions"."data_type" IN ('text','number','boolean','date','year','enum','multi_enum'))
);
--> statement-breakpoint
CREATE TABLE "controlled_option_values" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"attribute_id" bigint NOT NULL,
	"stable_key" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_cov_attr_option" UNIQUE("attribute_id","stable_key")
);
--> statement-breakpoint
CREATE TABLE "migration_batches" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"status" varchar(30) DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"source_description" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_mb_status" CHECK ("migration_batches"."status" IN ('running','completed','rollback_in_progress','rolled_back','rollback_conflict','failed'))
);
--> statement-breakpoint
CREATE TABLE "migration_oaov_targets" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"batch_id" bigint NOT NULL,
	"source_entry_id" bigint NOT NULL,
	"target_row_id_current" bigint,
	"target_row_id_original" bigint NOT NULL,
	"target_offer_id" bigint NOT NULL,
	"target_attribute_id" bigint NOT NULL,
	"target_option_id" bigint NOT NULL,
	"target_hash_at_creation" text NOT NULL,
	"canonical_payload_version" varchar(20) NOT NULL,
	"rollback_status" varchar(30) DEFAULT 'pending' NOT NULL,
	"rollback_reason" text,
	"target_deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_mott_target_original" UNIQUE("target_row_id_original"),
	CONSTRAINT "uq_mott_target_current" UNIQUE("target_row_id_current"),
	CONSTRAINT "chk_mott_rollback_status" CHECK ("migration_oaov_targets"."rollback_status" IN ('pending','cleaned_up','rollback_conflict')),
	CONSTRAINT "chk_mott_hash_format" CHECK ("migration_oaov_targets"."target_hash_at_creation" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "chk_mott_row_ids" CHECK ("migration_oaov_targets"."target_row_id_current" IS NULL OR "migration_oaov_targets"."target_row_id_current" = "migration_oaov_targets"."target_row_id_original"),
	CONSTRAINT "chk_mott_canonical_version" CHECK ("canonical_payload_version" IN ('lm-source-v1')),
	CONSTRAINT "chk_mott_lifecycle" CHECK (
      (
        "migration_oaov_targets"."rollback_status" = 'pending'
        AND "migration_oaov_targets"."target_row_id_current" IS NOT NULL
        AND "migration_oaov_targets"."target_deleted_at" IS NULL
        AND "migration_oaov_targets"."rollback_reason" IS NULL
      )
      OR
      (
        "migration_oaov_targets"."rollback_status" = 'cleaned_up'
        AND "migration_oaov_targets"."target_row_id_current" IS NULL
        AND "migration_oaov_targets"."target_deleted_at" IS NOT NULL
        AND "migration_oaov_targets"."rollback_reason" = 'deleted_by_batch_rollback'
      )
      OR
      (
        "migration_oaov_targets"."rollback_status" = 'rollback_conflict'
        AND "migration_oaov_targets"."rollback_reason" IS NOT NULL
        AND "migration_oaov_targets"."target_deleted_at" IS NULL
      )
    )
);
--> statement-breakpoint
CREATE TABLE "migration_oav_targets" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"batch_id" bigint NOT NULL,
	"source_entry_id" bigint NOT NULL,
	"target_row_id_current" bigint,
	"target_row_id_original" bigint NOT NULL,
	"target_offer_id" bigint NOT NULL,
	"target_attribute_id" bigint NOT NULL,
	"target_option_id" bigint,
	"target_hash_at_creation" text NOT NULL,
	"canonical_payload_version" varchar(20) NOT NULL,
	"rollback_status" varchar(30) DEFAULT 'pending' NOT NULL,
	"rollback_reason" text,
	"target_deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_mot_target_original" UNIQUE("target_row_id_original"),
	CONSTRAINT "uq_mot_target_current" UNIQUE("target_row_id_current"),
	CONSTRAINT "chk_mot_rollback_status" CHECK ("migration_oav_targets"."rollback_status" IN ('pending','cleaned_up','rollback_conflict')),
	CONSTRAINT "chk_mot_hash_format" CHECK ("migration_oav_targets"."target_hash_at_creation" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "chk_mot_row_ids" CHECK ("migration_oav_targets"."target_row_id_current" IS NULL OR "migration_oav_targets"."target_row_id_current" = "migration_oav_targets"."target_row_id_original"),
	CONSTRAINT "chk_mot_canonical_version" CHECK ("canonical_payload_version" IN ('lm-source-v1')),
	CONSTRAINT "chk_mot_lifecycle" CHECK (
      (
        "migration_oav_targets"."rollback_status" = 'pending'
        AND "migration_oav_targets"."target_row_id_current" IS NOT NULL
        AND "migration_oav_targets"."target_deleted_at" IS NULL
        AND "migration_oav_targets"."rollback_reason" IS NULL
      )
      OR
      (
        "migration_oav_targets"."rollback_status" = 'cleaned_up'
        AND "migration_oav_targets"."target_row_id_current" IS NULL
        AND "migration_oav_targets"."target_deleted_at" IS NOT NULL
        AND "migration_oav_targets"."rollback_reason" = 'deleted_by_batch_rollback'
      )
      OR
      (
        "migration_oav_targets"."rollback_status" = 'rollback_conflict'
        AND "migration_oav_targets"."rollback_reason" IS NOT NULL
        AND "migration_oav_targets"."target_deleted_at" IS NULL
      )
    )
);
--> statement-breakpoint
CREATE TABLE "migration_source_entries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"batch_id" bigint NOT NULL,
	"source_offer_id" bigint NOT NULL,
	"source_key" text NOT NULL,
	"raw_value" jsonb NOT NULL,
	"source_hash" text NOT NULL,
	"source_payload_version" varchar(20) NOT NULL,
	"processing_status" varchar(30) DEFAULT 'pending' NOT NULL,
	"classification_status" varchar(30),
	"classification_reason" text,
	"expected_target_count" integer NOT NULL,
	"frequency" integer DEFAULT 1 NOT NULL,
	"approved_reason" text,
	"scope_owner" text,
	"decision_timestamp" timestamp with time zone,
	"fallback_status" text,
	"processing_error_code" varchar(64),
	"processing_error_message" text,
	"processing_failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_mse_source_identity" UNIQUE("batch_id","source_offer_id","source_key"),
	CONSTRAINT "uq_mse_id_batch" UNIQUE("id","batch_id"),
	CONSTRAINT "chk_mse_proc_status" CHECK ("migration_source_entries"."processing_status" IN ('pending','processing','processed','failed')),
	CONSTRAINT "chk_mse_class_status" CHECK ("migration_source_entries"."classification_status" IN ('migrated','intentionally_skipped','manual_review_required','out_of_scope')),
	CONSTRAINT "chk_mse_technical_error_state_matrix" CHECK (
      (
        "migration_source_entries"."processing_status" IN ('pending', 'processing')
        AND "migration_source_entries"."classification_status" IS NULL
        AND "migration_source_entries"."classification_reason" IS NULL
        AND "migration_source_entries"."processing_error_code" IS NULL
        AND "migration_source_entries"."processing_error_message" IS NULL
        AND "migration_source_entries"."processing_failed_at" IS NULL
      )
      OR
      (
        "migration_source_entries"."processing_status" = 'processed'
        AND "migration_source_entries"."classification_status" IS NOT NULL
        AND "migration_source_entries"."classification_reason" IS NOT NULL
        AND "migration_source_entries"."processing_error_code" IS NULL
        AND "migration_source_entries"."processing_error_message" IS NULL
        AND "migration_source_entries"."processing_failed_at" IS NULL
      )
      OR
      (
        "migration_source_entries"."processing_status" = 'failed'
        AND "migration_source_entries"."classification_status" IS NULL
        AND "migration_source_entries"."classification_reason" IS NULL
        AND "migration_source_entries"."processing_error_code" IS NOT NULL
        AND "migration_source_entries"."processing_error_message" IS NOT NULL
        AND "migration_source_entries"."processing_failed_at" IS NOT NULL
      )
    ),
	CONSTRAINT "chk_mse_expected_nonnegative" CHECK ("migration_source_entries"."expected_target_count" >= 0),
	CONSTRAINT "chk_mse_expected_by_classification" CHECK (
      (
        "migration_source_entries"."classification_status" = 'migrated'
        AND "migration_source_entries"."expected_target_count" >= 1
      )
      OR
      (
        "migration_source_entries"."classification_status" IN ('intentionally_skipped', 'manual_review_required', 'out_of_scope')
        AND "migration_source_entries"."expected_target_count" = 0
      )
      OR
      "migration_source_entries"."classification_status" IS NULL
    ),
	CONSTRAINT "chk_mse_out_of_scope_governance" CHECK (
      "migration_source_entries"."classification_status" <> 'out_of_scope'
      OR (
        "migration_source_entries"."approved_reason" IS NOT NULL
        AND "migration_source_entries"."scope_owner" IS NOT NULL
        AND "migration_source_entries"."decision_timestamp" IS NOT NULL
        AND "migration_source_entries"."fallback_status" IS NOT NULL
        AND "migration_source_entries"."frequency" > 0
      )
    ),
	CONSTRAINT "chk_mse_source_payload_version" CHECK ("migration_source_entries"."source_payload_version" IN ('lm-source-v1'))
);
--> statement-breakpoint
CREATE TABLE "offer_attribute_option_values" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"offer_id" bigint NOT NULL,
	"attribute_id" bigint NOT NULL,
	"option_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_oaov_offer_attribute_option" UNIQUE("offer_id","attribute_id","option_id"),
	CONSTRAINT "uq_oaov_composite" UNIQUE("id","offer_id","attribute_id","option_id")
);
--> statement-breakpoint
CREATE TABLE "offer_attribute_values" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"offer_id" bigint NOT NULL,
	"attribute_id" bigint NOT NULL,
	"value_text" text,
	"value_number" numeric,
	"value_boolean" boolean,
	"value_date" timestamp with time zone,
	"value_year" integer,
	"option_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_oav_offer_attribute" UNIQUE("offer_id","attribute_id"),
	CONSTRAINT "uq_oav_composite" UNIQUE("id","offer_id","attribute_id"),
	CONSTRAINT "chk_oav_value_exclusivity" CHECK (
      num_nonnulls(
        value_text,
        value_number,
        value_boolean,
        value_date,
        value_year,
        option_id
      ) = 1
    )
);
--> statement-breakpoint
ALTER TABLE "controlled_option_values" ADD CONSTRAINT "fk_cov_attribute" FOREIGN KEY ("attribute_id") REFERENCES "public"."attribute_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_oaov_targets" ADD CONSTRAINT "fk_mott_oaov_target_current" FOREIGN KEY ("target_row_id_current") REFERENCES "public"."offer_attribute_option_values"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_oaov_targets" ADD CONSTRAINT "fk_mott_source_entry" FOREIGN KEY ("source_entry_id","batch_id") REFERENCES "public"."migration_source_entries"("id","batch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_oaov_targets" ADD CONSTRAINT "fk_mott_batch" FOREIGN KEY ("batch_id") REFERENCES "public"."migration_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_oav_targets" ADD CONSTRAINT "fk_mot_oav_target_current" FOREIGN KEY ("target_row_id_current") REFERENCES "public"."offer_attribute_values"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_oav_targets" ADD CONSTRAINT "fk_mot_option" FOREIGN KEY ("target_option_id") REFERENCES "public"."controlled_option_values"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_oav_targets" ADD CONSTRAINT "fk_mot_source_entry" FOREIGN KEY ("source_entry_id","batch_id") REFERENCES "public"."migration_source_entries"("id","batch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_oav_targets" ADD CONSTRAINT "fk_mot_batch" FOREIGN KEY ("batch_id") REFERENCES "public"."migration_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_source_entries" ADD CONSTRAINT "fk_mse_batch" FOREIGN KEY ("batch_id") REFERENCES "public"."migration_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_attribute_option_values" ADD CONSTRAINT "fk_oaov_offer" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_attribute_option_values" ADD CONSTRAINT "fk_oaov_attribute" FOREIGN KEY ("attribute_id") REFERENCES "public"."attribute_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_attribute_option_values" ADD CONSTRAINT "fk_oaov_option" FOREIGN KEY ("option_id") REFERENCES "public"."controlled_option_values"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_attribute_values" ADD CONSTRAINT "fk_oav_offer" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_attribute_values" ADD CONSTRAINT "fk_oav_attribute" FOREIGN KEY ("attribute_id") REFERENCES "public"."attribute_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_attribute_values" ADD CONSTRAINT "fk_oav_option" FOREIGN KEY ("option_id") REFERENCES "public"."controlled_option_values"("id") ON DELETE no action ON UPDATE no action;

-- Custom additions for LM-CAT-FILTER-44-CLOSE
--> statement-breakpoint
ALTER TABLE public.migration_oav_targets
  ALTER CONSTRAINT fk_mot_oav_target_current
  DEFERRABLE INITIALLY IMMEDIATE;
--> statement-breakpoint
ALTER TABLE public.migration_oaov_targets
  ALTER CONSTRAINT fk_mott_oaov_target_current
  DEFERRABLE INITIALLY IMMEDIATE;
--> statement-breakpoint

DO $$
BEGIN
  -- Assert prerequisite roles exist
  IF NOT EXISTS (
    SELECT FROM pg_roles WHERE rolname = 'lm_migration_owner' AND rolcanlogin = false
  ) THEN
    RAISE EXCEPTION 'Prerequisite role lm_migration_owner is missing or has LOGIN privilege'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_roles WHERE rolname = 'lm_migration_executor'
  ) THEN
    RAISE EXCEPTION 'Prerequisite role lm_migration_executor is missing'
      USING ERRCODE = 'check_violation';
  END IF;
END $$;
--> statement-breakpoint

CREATE SCHEMA IF NOT EXISTS migration_private;
--> statement-breakpoint

DO $$
DECLARE
  v_schema text;
BEGIN
  SELECT n.nspname INTO v_schema
  FROM pg_extension e
  JOIN pg_namespace n ON e.extnamespace = n.oid
  WHERE e.extname = 'pgcrypto'
    AND n.nspname NOT LIKE 'pg_temp%';

  IF v_schema IS NULL THEN
    RAISE EXCEPTION 'pgcrypto extension is missing or located in pg_temp namespace'
      USING ERRCODE = 'check_violation';
  END IF;

  EXECUTE format('
    CREATE OR REPLACE FUNCTION migration_private.sha256_hex(payload text)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog
    AS $func$
    BEGIN
      RETURN pg_catalog.encode(%I.digest(payload, ''sha256''), ''hex'');
    END;
    $func$;
  ', v_schema);
END $$;
--> statement-breakpoint

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
    SELECT id INTO v_target_id
    FROM public.offer_attribute_values
    WHERE offer_id = p_offer_id AND attribute_id = p_attribute_id;
  END IF;

  INSERT INTO public.migration_oav_targets (
    batch_id, source_entry_id, target_row_id_current, target_row_id_original,
    target_offer_id, target_attribute_id, target_option_id, target_hash_at_creation,
    canonical_payload_version, rollback_status
  ) VALUES (
    p_batch_id, p_source_entry_id, v_target_id, v_target_id,
    p_offer_id, p_attribute_id, p_option_id, p_source_hash,
    p_canonical_version, 'pending'
  )
  RETURNING id INTO v_manifest_id;

  RETURN v_target_id;
END;
$$;
--> statement-breakpoint

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
      SELECT id INTO v_target_id
      FROM public.offer_attribute_option_values
      WHERE offer_id = p_offer_id AND attribute_id = p_attribute_id AND option_id = v_option_id;
    END IF;

    INSERT INTO public.migration_oaov_targets (
      batch_id, source_entry_id, target_row_id_current, target_row_id_original,
      target_offer_id, target_attribute_id, target_option_id, target_hash_at_creation,
      canonical_payload_version, rollback_status
    ) VALUES (
      p_batch_id, p_source_entry_id, v_target_id, v_target_id,
      p_offer_id, p_attribute_id, v_option_id, p_source_hash,
      p_canonical_version, 'pending'
    );

    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  RETURN v_inserted_count;
END;
$$;
--> statement-breakpoint

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
  v_verified_manifest_count integer;
BEGIN
  SELECT status INTO v_batch_status FROM public.migration_batches WHERE id = p_batch_id FOR UPDATE;
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
      v_canonical_hash := migration_private.sha256_hex(concat('v1:text:', v_val_text));
    ELSIF v_attr_type = 'number' THEN
      v_val_num := (v_entry_record.raw_value ->> 'value')::numeric;
      IF v_val_num IS NULL THEN RAISE EXCEPTION 'Numeric value cannot be null' USING ERRCODE = 'check_violation'; END IF;
      v_canonical_hash := migration_private.sha256_hex(concat('v1:number:', (v_val_num)::text));
    ELSIF v_attr_type = 'boolean' THEN
      v_val_bool := (v_entry_record.raw_value ->> 'value')::boolean;
      IF v_val_bool IS NULL THEN RAISE EXCEPTION 'Boolean value cannot be null' USING ERRCODE = 'check_violation'; END IF;
      v_canonical_hash := migration_private.sha256_hex(concat('v1:boolean:', (v_val_bool)::text));
    ELSIF v_attr_type = 'date' THEN
      v_val_date := (v_entry_record.raw_value ->> 'value')::timestamp with time zone;
      IF v_val_date IS NULL THEN RAISE EXCEPTION 'Date value cannot be null' USING ERRCODE = 'check_violation'; END IF;
      v_canonical_hash := migration_private.sha256_hex(concat('v1:date:', (v_val_date)::text));
    ELSIF v_attr_type = 'year' THEN
      v_val_year := (v_entry_record.raw_value ->> 'value')::integer;
      IF v_val_year IS NULL THEN RAISE EXCEPTION 'Year value cannot be null' USING ERRCODE = 'check_violation'; END IF;
      v_canonical_hash := migration_private.sha256_hex(concat('v1:year:', (v_val_year)::text));
    ELSIF v_attr_type = 'enum' THEN
      v_opt_id := p_approved_option_id;
      IF v_opt_id IS NULL THEN
        RAISE EXCEPTION 'Enum requires exactly one option id' USING ERRCODE = 'check_violation';
      END IF;
      IF p_approved_option_ids IS NOT NULL AND cardinality(p_approved_option_ids) <> 1 THEN
        RAISE EXCEPTION 'Enum requires exactly one option id' USING ERRCODE = 'check_violation';
      END IF;
      v_canonical_hash := migration_private.sha256_hex(concat('v1:enum:', (v_opt_id)::text));
    END IF;

  ELSIF v_attr_type = 'multi_enum' THEN
    v_is_oaov := true;
    IF p_approved_option_ids IS NULL OR cardinality(p_approved_option_ids) = 0 THEN
      RAISE EXCEPTION 'Multi enum option ids array cannot be null or empty' USING ERRCODE = 'check_violation';
    END IF;
    IF v_expected_count <> cardinality(p_approved_option_ids) THEN
      RAISE EXCEPTION 'Multi enum expected_target_count must match options array cardinality' USING ERRCODE = 'check_violation';
    END IF;

    DECLARE
      v_o_id bigint;
      v_p_id bigint := -1;
      v_opts_text_arr text[] := ARRAY[]::text[];
    BEGIN
      FOREACH v_o_id IN ARRAY p_approved_option_ids
      LOOP
        IF v_o_id IS NULL THEN RAISE EXCEPTION 'Option ids array contains nulls' USING ERRCODE = 'check_violation'; END IF;
        IF v_o_id <= v_p_id THEN
          IF v_o_id = v_p_id THEN
            RAISE EXCEPTION 'Option ids array contains duplicate elements' USING ERRCODE = 'check_violation';
          ELSE
            RAISE EXCEPTION 'Option ids array is not sorted deterministically' USING ERRCODE = 'check_violation';
          END IF;
        END IF;
        v_p_id := v_o_id;
        v_opts_text_arr := array_append(v_opts_text_arr, (v_o_id)::text);
      END LOOP;

      v_canonical_hash := migration_private.sha256_hex(concat('v1:multi_enum:', array_to_string(v_opts_text_arr, ',')));
    END;
  ELSE
    RAISE EXCEPTION 'Unsupported data type %', v_attr_type USING ERRCODE = 'check_violation';
  END IF;

  IF v_entry_record.source_hash IS DISTINCT FROM v_canonical_hash THEN
    RAISE EXCEPTION 'Source hash mismatch' USING ERRCODE = 'check_violation';
  END IF;

  IF v_is_oav THEN
    PERFORM 1 FROM public.offer_attribute_values
    WHERE offer_id = v_entry_record.source_offer_id AND attribute_id = v_attr_id;

    IF FOUND THEN
      SELECT count(*) INTO v_verified_manifest_count
      FROM public.migration_oav_targets
      WHERE target_offer_id = v_entry_record.source_offer_id AND target_attribute_id = v_attr_id AND rollback_status = 'pending';

      IF v_verified_manifest_count > 0 THEN
        UPDATE public.migration_source_entries SET
          processing_status = 'processed',
          classification_status = 'manual_review_required',
          classification_reason = 'concurrent_or_existing_target_detected',
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

    v_target_count := 1;

  ELSIF v_is_oaov THEN
    SELECT count(*) INTO v_verified_manifest_count
    FROM public.offer_attribute_option_values
    WHERE offer_id = v_entry_record.source_offer_id AND attribute_id = v_attr_id;

    IF v_verified_manifest_count > 0 THEN
      SELECT count(*) INTO v_verified_manifest_count
      FROM public.migration_oaov_targets
      WHERE target_offer_id = v_entry_record.source_offer_id AND target_attribute_id = v_attr_id AND rollback_status = 'pending';

      IF v_verified_manifest_count > 0 THEN
        UPDATE public.migration_source_entries SET
          processing_status = 'processed',
          classification_status = 'manual_review_required',
          classification_reason = 'concurrent_or_existing_target_detected',
          expected_target_count = 0
        WHERE id = p_source_entry_id;

        RETURN 'manual_review_required';
      END IF;
    END IF;

    v_target_count := migration_private.insert_and_validate_oaov(
      p_batch_id, p_source_entry_id, v_entry_record.source_offer_id, v_attr_id,
      p_approved_option_ids, v_canonical_hash, v_entry_record.source_payload_version
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
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION migration_private.mark_source_processing_failed(
  p_batch_id bigint,
  p_source_entry_id bigint,
  p_error_code text,
  p_error_message text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_batch_status varchar(30);
  v_entry_record record;
  v_input_error_code text;
  v_input_error_message text;
  v_existing_error_code text;
  v_existing_error_message text;
BEGIN
  v_input_error_code := COALESCE(trim(p_error_code), '');
  v_input_error_message := COALESCE(trim(p_error_message), '');

  IF v_input_error_code = '' OR v_input_error_message = '' THEN
    RAISE EXCEPTION 'Error code and message cannot be empty' USING ERRCODE = 'check_violation';
  END IF;

  SELECT status INTO v_batch_status FROM public.migration_batches WHERE id = p_batch_id FOR UPDATE;
  IF v_batch_status IS DISTINCT FROM 'running' AND v_batch_status IS DISTINCT FROM 'failed' THEN
    RAISE EXCEPTION 'Batch % is not in runnable state', p_batch_id USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_entry_record FROM public.migration_source_entries 
  WHERE id = p_source_entry_id AND batch_id = p_batch_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source entry % not found in batch %', p_source_entry_id, p_batch_id USING ERRCODE = 'check_violation';
  END IF;

  IF v_entry_record.processing_status = 'processed' THEN
    RAISE EXCEPTION 'Cannot mark processed source % as failed', p_source_entry_id USING ERRCODE = 'check_violation';
  END IF;

  IF v_entry_record.processing_status = 'failed' THEN
    v_existing_error_code := COALESCE(v_entry_record.processing_error_code, '');
    v_existing_error_message := COALESCE(v_entry_record.processing_error_message, '');

    IF v_existing_error_code = v_input_error_code AND v_existing_error_message = v_input_error_message THEN
      RETURN 'failed';
    ELSE
      RAISE EXCEPTION 'Source % is already failed with different error metadata', p_source_entry_id USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  UPDATE public.migration_source_entries SET
    processing_status = 'failed',
    processing_error_code = v_input_error_code,
    processing_error_message = v_input_error_message,
    processing_failed_at = now()
  WHERE id = p_source_entry_id;

  RETURN 'failed';
END;
$$;
--> statement-breakpoint

ALTER SCHEMA migration_private OWNER TO lm_migration_owner;
--> statement-breakpoint
ALTER TABLE public.attribute_definitions OWNER TO lm_migration_owner;
--> statement-breakpoint
ALTER TABLE public.controlled_option_values OWNER TO lm_migration_owner;
--> statement-breakpoint
ALTER TABLE public.migration_batches OWNER TO lm_migration_owner;
--> statement-breakpoint
ALTER TABLE public.migration_source_entries OWNER TO lm_migration_owner;
--> statement-breakpoint
ALTER TABLE public.migration_oav_targets OWNER TO lm_migration_owner;
--> statement-breakpoint
ALTER TABLE public.migration_oaov_targets OWNER TO lm_migration_owner;
--> statement-breakpoint
ALTER TABLE public.offer_attribute_values OWNER TO lm_migration_owner;
--> statement-breakpoint
ALTER TABLE public.offer_attribute_option_values OWNER TO lm_migration_owner;
--> statement-breakpoint
ALTER FUNCTION migration_private.sha256_hex(text) OWNER TO lm_migration_owner;
--> statement-breakpoint
ALTER FUNCTION migration_private.insert_and_validate_oav(bigint, bigint, bigint, bigint, text, numeric, boolean, timestamp with time zone, integer, bigint, text, varchar) OWNER TO lm_migration_owner;
--> statement-breakpoint
ALTER FUNCTION migration_private.insert_and_validate_oaov(bigint, bigint, bigint, bigint, bigint[], text, varchar) OWNER TO lm_migration_owner;
--> statement-breakpoint
ALTER FUNCTION migration_private.process_source_entry(bigint, bigint, bigint, bigint[]) OWNER TO lm_migration_owner;
--> statement-breakpoint
ALTER FUNCTION migration_private.mark_source_processing_failed(bigint, bigint, text, text) OWNER TO lm_migration_owner;
--> statement-breakpoint

REVOKE ALL ON SCHEMA migration_private FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA migration_private FROM PUBLIC;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO lm_migration_owner;
--> statement-breakpoint
GRANT SELECT, UPDATE ON public.offers TO lm_migration_owner;
--> statement-breakpoint
GRANT SELECT ON public.partners TO lm_migration_owner;
--> statement-breakpoint
GRANT SELECT ON public.categories TO lm_migration_owner;
--> statement-breakpoint

GRANT USAGE ON SCHEMA migration_private TO lm_migration_executor;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION migration_private.process_source_entry(bigint, bigint, bigint, bigint[]) TO lm_migration_executor;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION migration_private.mark_source_processing_failed(bigint, bigint, text, text) TO lm_migration_executor;
--> statement-breakpoint

REVOKE ALL ON public.migration_batches FROM lm_migration_executor;
--> statement-breakpoint
REVOKE ALL ON public.migration_source_entries FROM lm_migration_executor;
--> statement-breakpoint
REVOKE ALL ON public.migration_oav_targets FROM lm_migration_executor;
--> statement-breakpoint
REVOKE ALL ON public.migration_oaov_targets FROM lm_migration_executor;
--> statement-breakpoint
REVOKE ALL ON public.offer_attribute_values FROM lm_migration_executor;
--> statement-breakpoint
REVOKE ALL ON public.offer_attribute_option_values FROM lm_migration_executor;