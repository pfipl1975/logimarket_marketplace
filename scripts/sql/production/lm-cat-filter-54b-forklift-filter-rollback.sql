-- LM-CAT-FILTER-54B rollback.
-- Deletes ONLY the records created by 54B:
--   4 offer_attribute_values for offer 1, 4 category_attribute_assignments for category 21
--   (including the load_capacity assignment to category 21, which belongs to 54B),
--   14 controlled option translations, 2 controlled options,
--   21 attribute definition translations, 3 attribute definitions (lifting_height, drive_type, mast_type).
-- The shared attribute definition load_capacity (owned by LM-CAT-FILTER-50AB) is NEVER deleted.
-- Idempotent: a second run is a NOOP (0 deletions, clean state -> NOTICE, no error).
-- Any intermediate state or value drift blocks the rollback with an error.
BEGIN;
SET LOCAL TIME ZONE 'UTC';
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

-- 1. PRE-ASSERTIONS, STATE CLASSIFICATION & DRIFT GUARDS
DO $$
DECLARE
  scoped_attribute_keys text[] := ARRAY['load_capacity', 'lifting_height', 'drive_type', 'mast_type'];
  new_attribute_keys text[] := ARRAY['lifting_height', 'drive_type', 'mast_type'];
  target_tables text[] := ARRAY[
    'attribute_definitions', 'controlled_option_values', 'offer_attribute_values',
    'offer_attribute_option_values', 'attribute_definition_translations',
    'category_attribute_assignments', 'controlled_option_value_translations'
  ];
  v_category_id bigint;
  v_oav_count integer;
  v_caa_count integer;
  v_ad_count integer;
BEGIN
  IF to_regclass('public.categories') IS NULL OR to_regclass('public.offers') IS NULL THEN
    RAISE EXCEPTION 'LM54B rollback: legacy categories or offers is missing' USING ERRCODE = 'check_violation';
  END IF;

  IF (SELECT count(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND relname = ANY(target_tables)) <> 7 THEN
    RAISE EXCEPTION 'LM54B rollback: all seven target runtime tables must exist' USING ERRCODE = 'check_violation';
  END IF;

  -- Resolve category 21 by slug with id guard
  IF (SELECT count(*) FROM public.categories WHERE slug = 'wozki-widlowe-elektryczne') <> 1 THEN
    RAISE EXCEPTION 'LM54B rollback: category wozki-widlowe-elektryczne must exist and be unique' USING ERRCODE = 'check_violation';
  END IF;

  SELECT id INTO v_category_id FROM public.categories WHERE slug = 'wozki-widlowe-elektryczne';
  IF v_category_id <> 21 THEN
    RAISE EXCEPTION 'LM54B rollback: category wozki-widlowe-elektryczne must have id 21, got %', v_category_id USING ERRCODE = 'check_violation';
  END IF;

  -- Shared definition load_capacity must exist and must survive the rollback
  IF NOT EXISTS (
    SELECT 1 FROM public.attribute_definitions
    WHERE stable_key = 'load_capacity' AND data_type = 'number' AND is_active = true
  ) THEN
    RAISE EXCEPTION 'LM54B rollback: shared attribute definition load_capacity (number, active) is missing - drift detected' USING ERRCODE = 'check_violation';
  END IF;

  -- Classify state: FULL (exactly the 54B artifacts present) or CLEAN (none of them present)
  SELECT count(*) INTO v_oav_count
  FROM public.offer_attribute_values oav
  JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id
  WHERE oav.offer_id = 1 AND ad.stable_key = ANY(scoped_attribute_keys);

  SELECT count(*) INTO v_caa_count
  FROM public.category_attribute_assignments caa
  JOIN public.attribute_definitions ad ON ad.id = caa.attribute_definition_id
  WHERE caa.category_id = v_category_id AND ad.stable_key = ANY(scoped_attribute_keys);

  SELECT count(*) INTO v_ad_count
  FROM public.attribute_definitions
  WHERE stable_key = ANY(new_attribute_keys);

  IF v_oav_count = 0 AND v_caa_count = 0 AND v_ad_count = 0 THEN
    -- CLEAN state: verify there is truly nothing left in the 54B scope
    IF EXISTS (SELECT 1 FROM public.offer_attribute_values WHERE offer_id = 1)
       OR EXISTS (SELECT 1 FROM public.category_attribute_assignments WHERE category_id = v_category_id) THEN
      RAISE EXCEPTION 'LM54B rollback: unexpected rows outside the 54B scope (offer 1 OAV or category 21 assignments), rollback blocked' USING ERRCODE = 'check_violation';
    END IF;
    RAISE NOTICE 'LM54B rollback: NOOP - 54B artifacts already absent, nothing to delete';
    RETURN;
  END IF;

  IF v_oav_count <> 4 OR v_caa_count <> 4 OR v_ad_count <> 3 THEN
    RAISE EXCEPTION 'LM54B rollback: intermediate state detected (oav=%, caa=%, ad=%), expected 4/4/3 or 0/0/0, rollback blocked', v_oav_count, v_caa_count, v_ad_count USING ERRCODE = 'check_violation';
  END IF;

  -- FULL state: exact drift checks before any delete

  -- 3 new definitions must match exactly (stable_key, data_type, is_active)
  IF EXISTS (
    SELECT 1 FROM (
      VALUES
        ('lifting_height', 'number', true),
        ('drive_type', 'enum', true),
        ('mast_type', 'enum', true)
    ) m(stable_key, data_type, is_active)
    FULL OUTER JOIN (
      SELECT stable_key, data_type, is_active
      FROM public.attribute_definitions
      WHERE stable_key = ANY(new_attribute_keys)
    ) ad ON ad.stable_key = m.stable_key
    WHERE m.stable_key IS NULL
       OR ad.stable_key IS NULL
       OR ad.data_type IS DISTINCT FROM m.data_type
       OR ad.is_active IS DISTINCT FROM m.is_active
  ) THEN
    RAISE EXCEPTION 'LM54B rollback: attribute definitions drift detected, rollback blocked' USING ERRCODE = 'check_violation';
  END IF;

  -- Exactly 21 translations for the 3 new attributes with valid locales
  IF (SELECT count(*) FROM public.attribute_definition_translations adt
      JOIN public.attribute_definitions ad ON ad.id = adt.attribute_definition_id
      WHERE ad.stable_key = ANY(new_attribute_keys)) <> 21
     OR EXISTS (
       SELECT 1 FROM public.attribute_definition_translations adt
       JOIN public.attribute_definitions ad ON ad.id = adt.attribute_definition_id
       WHERE ad.stable_key = ANY(new_attribute_keys) AND adt.locale NOT IN ('pl','en','de','fr','uk','es','zh')
     ) THEN
    RAISE EXCEPTION 'LM54B rollback: attribute definition translations drift detected, rollback blocked' USING ERRCODE = 'check_violation';
  END IF;

  -- Exactly 2 options under the correct attributes
  IF EXISTS (
    SELECT 1 FROM (
      VALUES
        ('drive_type', 'electric', true),
        ('mast_type', 'triplex', true)
    ) m(attr_key, stable_key, is_active)
    FULL OUTER JOIN (
      SELECT ad.stable_key AS attr_key, cov.stable_key, cov.is_active
      FROM public.controlled_option_values cov
      JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
      WHERE ad.stable_key = ANY(new_attribute_keys)
    ) cov_act ON cov_act.attr_key = m.attr_key AND cov_act.stable_key = m.stable_key
    WHERE m.stable_key IS NULL
       OR cov_act.stable_key IS NULL
       OR cov_act.is_active IS DISTINCT FROM m.is_active
  ) THEN
    RAISE EXCEPTION 'LM54B rollback: controlled option values drift detected, rollback blocked' USING ERRCODE = 'check_violation';
  END IF;

  -- Exactly 14 option translations with valid locales
  IF (SELECT count(*) FROM public.controlled_option_value_translations covt
      JOIN public.controlled_option_values cov ON cov.id = covt.controlled_option_value_id
      JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
      WHERE ad.stable_key = ANY(new_attribute_keys)) <> 14
     OR EXISTS (
       SELECT 1 FROM public.controlled_option_value_translations covt
       JOIN public.controlled_option_values cov ON cov.id = covt.controlled_option_value_id
       JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
       WHERE ad.stable_key = ANY(new_attribute_keys) AND covt.locale NOT IN ('pl','en','de','fr','uk','es','zh')
     ) THEN
    RAISE EXCEPTION 'LM54B rollback: controlled option value translations drift detected, rollback blocked' USING ERRCODE = 'check_violation';
  END IF;

  -- Exact 4 assignments for category 21
  IF EXISTS (
    SELECT 1 FROM (
      VALUES
        ('load_capacity', 10, true, true, false, true, 'kg'),
        ('lifting_height', 20, true, true, false, true, 'mm'),
        ('drive_type', 30, true, true, false, true, NULL::varchar),
        ('mast_type', 40, true, true, false, true, NULL::varchar)
    ) m(stable_key, sort_order, is_filterable, is_comparable, is_required, is_visible, unit_code)
    FULL OUTER JOIN (
      SELECT ad.stable_key, caa.sort_order, caa.is_filterable, caa.is_comparable, caa.is_required, caa.is_visible, caa.unit_code
      FROM public.category_attribute_assignments caa
      JOIN public.attribute_definitions ad ON ad.id = caa.attribute_definition_id
      WHERE caa.category_id = v_category_id
    ) caa_act ON caa_act.stable_key = m.stable_key
    WHERE m.stable_key IS NULL
       OR caa_act.stable_key IS NULL
       OR caa_act.sort_order IS DISTINCT FROM m.sort_order
       OR caa_act.is_filterable IS DISTINCT FROM m.is_filterable
       OR caa_act.is_comparable IS DISTINCT FROM m.is_comparable
       OR caa_act.is_required IS DISTINCT FROM m.is_required
       OR caa_act.is_visible IS DISTINCT FROM m.is_visible
       OR caa_act.unit_code IS DISTINCT FROM m.unit_code
  ) THEN
    RAISE EXCEPTION 'LM54B rollback: category attribute assignments drift detected, rollback blocked' USING ERRCODE = 'check_violation';
  END IF;

  -- Exact 4 OAV rows for offer 1 (values and typed slots must match the backfill targets)
  IF EXISTS (
    SELECT 1 FROM (
      VALUES
        ('load_capacity', 1500::numeric, NULL::text),
        ('lifting_height', 4500::numeric, NULL::text),
        ('drive_type', NULL::numeric, 'electric'),
        ('mast_type', NULL::numeric, 'triplex')
    ) m(attribute_key, value_number, option_key)
    FULL OUTER JOIN (
      SELECT ad.stable_key AS attribute_key, oav.value_number, cov.stable_key AS option_key,
             oav.value_text, oav.value_boolean, oav.value_date, oav.value_year, oav.option_id
      FROM public.offer_attribute_values oav
      JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id
      LEFT JOIN public.controlled_option_values cov ON cov.id = oav.option_id
      WHERE oav.offer_id = 1
    ) oav_act ON oav_act.attribute_key = m.attribute_key
    WHERE m.attribute_key IS NULL
       OR oav_act.attribute_key IS NULL
       OR (m.attribute_key IN ('load_capacity', 'lifting_height') AND oav_act.value_number IS DISTINCT FROM m.value_number)
       OR (m.attribute_key IN ('drive_type', 'mast_type') AND oav_act.option_key IS DISTINCT FROM m.option_key)
       OR oav_act.value_text IS NOT NULL
       OR oav_act.value_boolean IS NOT NULL
       OR oav_act.value_date IS NOT NULL
       OR oav_act.value_year IS NOT NULL
       OR (m.attribute_key IN ('load_capacity', 'lifting_height') AND oav_act.option_id IS NOT NULL)
       OR (m.attribute_key IN ('drive_type', 'mast_type') AND oav_act.option_id IS NULL)
       OR num_nonnulls(oav_act.value_text, oav_act.value_number, oav_act.value_boolean, oav_act.value_date, oav_act.value_year, oav_act.option_id) <> 1
  ) THEN
    RAISE EXCEPTION 'LM54B rollback: target OAV rows mismatch or drift detected, rollback blocked' USING ERRCODE = 'check_violation';
  END IF;

  -- Verify no OAOV rows for offer 1
  IF EXISTS (
    SELECT 1 FROM public.offer_attribute_option_values
    WHERE offer_id = 1
  ) THEN
    RAISE EXCEPTION 'LM54B rollback: unexpected OAOV rows found for offer 1, rollback blocked' USING ERRCODE = 'check_violation';
  END IF;
END $$;

-- 2. DELETE IN SEQUENCE (each delete must remove exactly N rows in the FULL state or 0 in the CLEAN state)
DO $$
DECLARE
  deleted_count integer;
BEGIN
  -- 2.1. offer_attribute_values (4 rows for offer 1)
  DELETE FROM public.offer_attribute_values oav
  USING public.attribute_definitions ad
  WHERE oav.attribute_id = ad.id
    AND oav.offer_id = 1
    AND ad.stable_key = ANY(ARRAY['load_capacity', 'lifting_height', 'drive_type', 'mast_type']);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count NOT IN (0, 4) THEN
    RAISE EXCEPTION 'LM54B rollback: expected 4 or 0 OAV rows deleted, got %', deleted_count USING ERRCODE = 'check_violation';
  END IF;

  -- 2.2. category_attribute_assignments (4 rows for category 21, including the 54B-owned load_capacity assignment)
  DELETE FROM public.category_attribute_assignments caa
  USING public.attribute_definitions ad, public.categories cat
  WHERE caa.attribute_definition_id = ad.id
    AND caa.category_id = cat.id
    AND ad.stable_key = ANY(ARRAY['load_capacity', 'lifting_height', 'drive_type', 'mast_type'])
    AND cat.slug = 'wozki-widlowe-elektryczne';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count NOT IN (0, 4) THEN
    RAISE EXCEPTION 'LM54B rollback: expected 4 or 0 assignment rows deleted, got %', deleted_count USING ERRCODE = 'check_violation';
  END IF;

  -- 2.3. controlled_option_value_translations (14 rows)
  DELETE FROM public.controlled_option_value_translations covt
  USING public.controlled_option_values cov, public.attribute_definitions ad
  WHERE covt.controlled_option_value_id = cov.id
    AND cov.attribute_id = ad.id
    AND ((ad.stable_key = 'drive_type' AND cov.stable_key = 'electric')
      OR (ad.stable_key = 'mast_type' AND cov.stable_key = 'triplex'));

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count NOT IN (0, 14) THEN
    RAISE EXCEPTION 'LM54B rollback: expected 14 or 0 option translation rows deleted, got %', deleted_count USING ERRCODE = 'check_violation';
  END IF;

  -- 2.4. controlled_option_values (2 rows)
  DELETE FROM public.controlled_option_values cov
  USING public.attribute_definitions ad
  WHERE cov.attribute_id = ad.id
    AND ((ad.stable_key = 'drive_type' AND cov.stable_key = 'electric')
      OR (ad.stable_key = 'mast_type' AND cov.stable_key = 'triplex'));

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count NOT IN (0, 2) THEN
    RAISE EXCEPTION 'LM54B rollback: expected 2 or 0 option rows deleted, got %', deleted_count USING ERRCODE = 'check_violation';
  END IF;

  -- 2.5. attribute_definition_translations (21 rows for the 3 new attributes only)
  DELETE FROM public.attribute_definition_translations adt
  USING public.attribute_definitions ad
  WHERE adt.attribute_definition_id = ad.id
    AND ad.stable_key = ANY(ARRAY['lifting_height', 'drive_type', 'mast_type']);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count NOT IN (0, 21) THEN
    RAISE EXCEPTION 'LM54B rollback: expected 21 or 0 attribute translation rows deleted, got %', deleted_count USING ERRCODE = 'check_violation';
  END IF;

  -- 2.6. attribute_definitions (3 rows; load_capacity is shared with 50AB and is NEVER deleted)
  DELETE FROM public.attribute_definitions
  WHERE stable_key = ANY(ARRAY['lifting_height', 'drive_type', 'mast_type']);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count NOT IN (0, 3) THEN
    RAISE EXCEPTION 'LM54B rollback: expected 3 or 0 attribute definition rows deleted, got %', deleted_count USING ERRCODE = 'check_violation';
  END IF;
END $$;

-- 3. POST-ASSERTIONS
DO $$
DECLARE
  new_attribute_keys text[] := ARRAY['lifting_height', 'drive_type', 'mast_type'];
  v_category_id bigint;
BEGIN
  SELECT id INTO v_category_id FROM public.categories WHERE slug = 'wozki-widlowe-elektryczne';

  IF EXISTS (SELECT 1 FROM public.attribute_definitions WHERE stable_key = ANY(new_attribute_keys)) THEN
    RAISE EXCEPTION 'LM54B rollback post-check: some 54B attribute definitions still remain' USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.category_attribute_assignments
    WHERE category_id = v_category_id
  ) THEN
    RAISE EXCEPTION 'LM54B rollback post-check: some assignments for category 21 still remain' USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (SELECT 1 FROM public.offer_attribute_values WHERE offer_id = 1) THEN
    RAISE EXCEPTION 'LM54B rollback post-check: some offer 1 attribute values still remain' USING ERRCODE = 'check_violation';
  END IF;

  -- The shared load_capacity definition must survive untouched
  IF NOT EXISTS (
    SELECT 1 FROM public.attribute_definitions
    WHERE stable_key = 'load_capacity' AND data_type = 'number' AND is_active = true
  ) THEN
    RAISE EXCEPTION 'LM54B rollback post-check: shared load_capacity definition was mutated or deleted' USING ERRCODE = 'check_violation';
  END IF;
END $$;

COMMIT;
