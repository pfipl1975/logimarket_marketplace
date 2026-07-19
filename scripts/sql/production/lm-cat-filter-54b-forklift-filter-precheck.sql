-- LM-CAT-FILTER-54B precheck. Read-only production preflight.
-- Runs the same pre-assertions as the apply script (without mutating locks).
-- Expected result: PASS. Any assertion failure aborts with an LM54B error and rolls back.
BEGIN TRANSACTION READ ONLY;
SET LOCAL TIME ZONE 'UTC';
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

DO $$
DECLARE
  target_tables text[] := ARRAY[
    'attribute_definitions', 'controlled_option_values', 'offer_attribute_values',
    'offer_attribute_option_values', 'attribute_definition_translations',
    'category_attribute_assignments', 'controlled_option_value_translations'
  ];
  categories_id_attnum smallint;
  v_category_id bigint;
  v_check_id bigint;
  v_offer8_category_id bigint;
  conflicting_stable_key text;
BEGIN
  IF to_regclass('public.categories') IS NULL OR to_regclass('public.offers') IS NULL THEN
    RAISE EXCEPTION 'LM54B precheck: legacy categories or offers is missing' USING ERRCODE = 'check_violation';
  END IF;

  SELECT attnum INTO categories_id_attnum
  FROM pg_attribute
  WHERE attrelid = 'public.categories'::regclass AND attname = 'id' AND NOT attisdropped
    AND atttypid = 'int8'::regtype AND attnotnull;

  IF categories_id_attnum IS NULL
     OR (SELECT count(*) FROM pg_constraint WHERE conrelid = 'public.categories'::regclass AND contype = 'p') <> 1
     OR NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conrelid = 'public.categories'::regclass AND contype = 'p' AND conkey = ARRAY[categories_id_attnum]
     ) THEN
    RAISE EXCEPTION 'LM54B precheck: categories primary key must be exactly (id bigint not null)' USING ERRCODE = 'check_violation';
  END IF;

  IF (SELECT count(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND relname = ANY(target_tables)) <> 7 THEN
    RAISE EXCEPTION 'LM54B precheck: all seven target runtime tables must exist' USING ERRCODE = 'check_violation';
  END IF;

  -- Verify unique category existence for slug and guard the expected id = 21
  IF (SELECT count(*) FROM public.categories WHERE slug = 'wozki-widlowe-elektryczne') <> 1 THEN
    RAISE EXCEPTION 'LM54B precheck: category wozki-widlowe-elektryczne must exist and be unique' USING ERRCODE = 'check_violation';
  END IF;

  SELECT id INTO v_category_id FROM public.categories WHERE slug = 'wozki-widlowe-elektryczne';
  IF v_category_id <> 21 THEN
    RAISE EXCEPTION 'LM54B precheck: category wozki-widlowe-elektryczne must have id 21, got %', v_category_id USING ERRCODE = 'check_violation';
  END IF;

  -- Shared definition load_capacity must already exist (delivered by LM-CAT-FILTER-50AB)
  IF NOT EXISTS (
    SELECT 1 FROM public.attribute_definitions
    WHERE stable_key = 'load_capacity' AND data_type = 'number' AND is_active = true
  ) THEN
    RAISE EXCEPTION 'LM54B precheck: shared attribute definition load_capacity (number, active) is missing - apply LM-CAT-FILTER-50AB first' USING ERRCODE = 'check_violation';
  END IF;

  -- SEMANTIC CONFLICT GUARDS
  SELECT stable_key INTO conflicting_stable_key
  FROM public.attribute_definitions
  WHERE (stable_key = 'lifting_height' AND data_type <> 'number')
     OR (stable_key = 'drive_type' AND data_type <> 'enum')
     OR (stable_key = 'mast_type' AND data_type <> 'enum');

  IF conflicting_stable_key IS NOT NULL THEN
    RAISE EXCEPTION 'LM54B precheck: semantic conflict for attribute % - data_type mismatch', conflicting_stable_key USING ERRCODE = 'check_violation';
  END IF;

  SELECT a.stable_key INTO conflicting_stable_key
  FROM public.category_attribute_assignments caa
  JOIN public.attribute_definitions a ON a.id = caa.attribute_definition_id
  WHERE caa.category_id = v_category_id
    AND (
      (a.stable_key = 'load_capacity' AND caa.unit_code <> 'kg') OR
      (a.stable_key = 'lifting_height' AND caa.unit_code <> 'mm') OR
      (a.stable_key IN ('drive_type', 'mast_type') AND caa.unit_code IS NOT NULL)
    );

  IF conflicting_stable_key IS NOT NULL THEN
    RAISE EXCEPTION 'LM54B precheck: semantic conflict for assignment of % - unit_code mismatch', conflicting_stable_key USING ERRCODE = 'check_violation';
  END IF;

  SELECT co.stable_key INTO conflicting_stable_key
  FROM public.controlled_option_values co
  JOIN public.attribute_definitions ad ON ad.id = co.attribute_id
  WHERE (co.stable_key = 'electric' AND ad.stable_key <> 'drive_type')
     OR (co.stable_key = 'triplex' AND ad.stable_key <> 'mast_type');

  IF conflicting_stable_key IS NOT NULL THEN
    RAISE EXCEPTION 'LM54B precheck: controlled option % is used by a different attribute', conflicting_stable_key USING ERRCODE = 'check_violation';
  END IF;

  -- Verify offer 1 matches the exact production snapshot (no FOR SHARE in read-only mode)
  SELECT id INTO v_check_id
  FROM public.offers
  WHERE id = 1
    AND category_id = v_category_id
    AND title = 'Elektryczny wózek widłowy 1.5t LogiTrans ET-15'
    AND publication_status = 'published'
    AND offer_model = 'rfq'
    AND conversion_type = 'rfq'
    AND price_on_request = true
    AND is_active = true;

  IF v_check_id IS NULL THEN
    RAISE EXCEPTION 'LM54B precheck: source offer 1 pre-assertion failure or modified' USING ERRCODE = 'check_violation';
  END IF;

  -- Drift guard for source values in technical_attributes (all 4 keys must match)
  IF (SELECT technical_attributes ->> 'Udźwig (kg)' FROM public.offers WHERE id = 1) IS DISTINCT FROM '1500'
     OR (SELECT technical_attributes ->> 'Wysokość podnoszenia (mm)' FROM public.offers WHERE id = 1) IS DISTINCT FROM '4500'
     OR (SELECT technical_attributes ->> 'Napęd' FROM public.offers WHERE id = 1) IS DISTINCT FROM 'Elektryczny'
     OR (SELECT technical_attributes ->> 'Typ masztu' FROM public.offers WHERE id = 1) IS DISTINCT FROM 'Triplex' THEN
    RAISE EXCEPTION 'LM54B precheck: source offer 1 technical_attributes drift detected' USING ERRCODE = 'check_violation';
  END IF;

  -- Offer 8 must exist and stay in category 25 (elektryczne-wozki-paletowe)
  SELECT category_id INTO v_offer8_category_id FROM public.offers WHERE id = 8;
  IF v_offer8_category_id IS NULL OR v_offer8_category_id <> 25 THEN
    RAISE EXCEPTION 'LM54B precheck: offer 8 must exist with category_id 25, got %', COALESCE(v_offer8_category_id::text, '<missing>') USING ERRCODE = 'check_violation';
  END IF;

  -- Check existing values for offer 1 (must be absent or exactly match targets)
  IF EXISTS (
    SELECT 1
    FROM public.offer_attribute_values oav
    JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id
    LEFT JOIN public.controlled_option_values cov ON cov.id = oav.option_id
    LEFT JOIN (
      VALUES
        ('load_capacity', 1500::numeric, NULL::text),
        ('lifting_height', 4500::numeric, NULL::text),
        ('drive_type', NULL::numeric, 'electric'),
        ('mast_type', NULL::numeric, 'triplex')
    ) m(attribute_key, value_number, option_key)
      ON m.attribute_key = ad.stable_key
    WHERE oav.offer_id = 1
      AND (
        m.attribute_key IS NULL
        OR (m.attribute_key IN ('load_capacity', 'lifting_height') AND oav.value_number IS DISTINCT FROM m.value_number)
        OR oav.value_text IS NOT NULL
        OR oav.value_boolean IS NOT NULL
        OR oav.value_date IS NOT NULL
        OR oav.value_year IS NOT NULL
        OR (m.attribute_key IN ('drive_type', 'mast_type') AND cov.stable_key IS DISTINCT FROM m.option_key)
        OR (m.attribute_key IN ('load_capacity', 'lifting_height') AND oav.option_id IS NOT NULL)
        OR (m.attribute_key IN ('drive_type', 'mast_type') AND oav.option_id IS NULL)
      )
  ) THEN
    RAISE EXCEPTION 'LM54B precheck: conflict with existing offer attribute values or unexpected slots populated' USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.offer_attribute_option_values
    WHERE offer_id = 1
  ) THEN
    RAISE EXCEPTION 'LM54B precheck: unexpected rows in offer_attribute_option_values for offer 1' USING ERRCODE = 'check_violation';
  END IF;
END $$;

SELECT 'PASS' AS precheck_status;
ROLLBACK;
