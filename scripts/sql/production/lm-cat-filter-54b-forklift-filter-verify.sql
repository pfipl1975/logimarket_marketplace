-- LM-CAT-FILTER-54B verify. Read-only post-deployment verification.
-- Runs the full final-state assertions of the apply script.
-- Expected result: PASS. Any assertion failure aborts with an LM54B error and rolls back.
BEGIN TRANSACTION READ ONLY;
SET LOCAL TIME ZONE 'UTC';
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

DO $$
DECLARE
  new_attribute_keys text[] := ARRAY['lifting_height', 'drive_type', 'mast_type'];
  all_attribute_keys text[] := ARRAY['load_capacity', 'lifting_height', 'drive_type', 'mast_type'];
  v_category_id bigint;
  actual_adt_count integer;
  actual_cov_count integer;
  actual_covt_count integer;
  non_null_desc_count integer;
BEGIN
  -- Resolve category 21 by slug with id guard
  IF (SELECT count(*) FROM public.categories WHERE slug = 'wozki-widlowe-elektryczne') <> 1 THEN
    RAISE EXCEPTION 'LM54B verify: category wozki-widlowe-elektryczne must exist and be unique' USING ERRCODE = 'check_violation';
  END IF;

  SELECT id INTO v_category_id FROM public.categories WHERE slug = 'wozki-widlowe-elektryczne';
  IF v_category_id <> 21 THEN
    RAISE EXCEPTION 'LM54B verify: category wozki-widlowe-elektryczne must have id 21, got %', v_category_id USING ERRCODE = 'check_violation';
  END IF;

  -- Verify all 4 attribute definitions exist with exact data types and active flags
  IF EXISTS (
    SELECT 1 FROM (
      VALUES
        ('load_capacity', 'number', true),
        ('lifting_height', 'number', true),
        ('drive_type', 'enum', true),
        ('mast_type', 'enum', true)
    ) m(stable_key, data_type, is_active)
    FULL OUTER JOIN (
      SELECT stable_key, data_type, is_active
      FROM public.attribute_definitions
      WHERE stable_key = ANY(ARRAY['load_capacity', 'lifting_height', 'drive_type', 'mast_type'])
    ) ad ON ad.stable_key = m.stable_key
    WHERE m.stable_key IS NULL
       OR ad.stable_key IS NULL
       OR ad.data_type IS DISTINCT FROM m.data_type
       OR ad.is_active IS DISTINCT FROM m.is_active
  ) THEN
    RAISE EXCEPTION 'LM54B verify: attribute definitions mismatch (expected load_capacity/lifting_height number, drive_type/mast_type enum, all active)' USING ERRCODE = 'check_violation';
  END IF;

  -- Count translations for the 3 new attributes (3 * 7 = 21)
  SELECT count(*) INTO actual_adt_count
  FROM public.attribute_definition_translations adt
  JOIN public.attribute_definitions ad ON ad.id = adt.attribute_definition_id
  WHERE ad.stable_key = ANY(new_attribute_keys);
  IF actual_adt_count <> 21 THEN
    RAISE EXCEPTION 'LM54B verify: expected 21 attribute translations, got %', actual_adt_count USING ERRCODE = 'check_violation';
  END IF;

  -- Verify no empty labels and no fallback names equal to stable_keys for translations
  IF EXISTS (
    SELECT 1 FROM public.attribute_definition_translations adt
    JOIN public.attribute_definitions ad ON ad.id = adt.attribute_definition_id
    WHERE ad.stable_key = ANY(new_attribute_keys)
      AND (adt.name IS NULL OR adt.name = '' OR adt.name = ad.stable_key OR adt.short_label IS NULL OR adt.short_label = '')
  ) THEN
    RAISE EXCEPTION 'LM54B verify: translation validation failed (missing name/short_label or equals stable_key)' USING ERRCODE = 'check_violation';
  END IF;

  -- Count options (1 for drive_type + 1 for mast_type = 2)
  SELECT count(*) INTO actual_cov_count
  FROM public.controlled_option_values cov
  JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
  WHERE ad.stable_key = ANY(ARRAY['drive_type', 'mast_type']);
  IF actual_cov_count <> 2 THEN
    RAISE EXCEPTION 'LM54B verify: expected 2 controlled options, got %', actual_cov_count USING ERRCODE = 'check_violation';
  END IF;

  -- Count option translations (2 options * 7 locales = 14)
  SELECT count(*) INTO actual_covt_count
  FROM public.controlled_option_value_translations covt
  JOIN public.controlled_option_values cov ON cov.id = covt.controlled_option_value_id
  JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
  WHERE ad.stable_key = ANY(ARRAY['drive_type', 'mast_type']);
  IF actual_covt_count <> 14 THEN
    RAISE EXCEPTION 'LM54B verify: expected 14 option translations, got %', actual_covt_count USING ERRCODE = 'check_violation';
  END IF;

  -- Verify no empty labels for option translations
  IF EXISTS (
    SELECT 1 FROM public.controlled_option_value_translations covt
    JOIN public.controlled_option_values cov ON cov.id = covt.controlled_option_value_id
    JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
    WHERE ad.stable_key = ANY(ARRAY['drive_type', 'mast_type'])
      AND (covt.label IS NULL OR covt.label = '' OR covt.label = cov.stable_key)
  ) THEN
    RAISE EXCEPTION 'LM54B verify: option translation validation failed (missing label or equals stable_key)' USING ERRCODE = 'check_violation';
  END IF;

  -- Verify description is NULL for all 54B translations
  SELECT count(*) INTO non_null_desc_count
  FROM (
    SELECT description FROM public.attribute_definition_translations adt
    JOIN public.attribute_definitions ad ON ad.id = adt.attribute_definition_id
    WHERE ad.stable_key = ANY(new_attribute_keys) AND adt.description IS NOT NULL
    UNION ALL
    SELECT description FROM public.controlled_option_value_translations covt
    JOIN public.controlled_option_values cov ON cov.id = covt.controlled_option_value_id
    JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
    WHERE ad.stable_key = ANY(ARRAY['drive_type', 'mast_type']) AND covt.description IS NOT NULL
  ) q;
  IF non_null_desc_count > 0 THEN
    RAISE EXCEPTION 'LM54B verify: description must be NULL for all 54B translations' USING ERRCODE = 'check_violation';
  END IF;

  -- Verify exact 4 assignments for category 21 (set-based drift check)
  IF EXISTS (
    SELECT 1 FROM (
      VALUES
        ('load_capacity', 10, true, true, true, true, 'kg'),
        ('lifting_height', 20, true, true, true, true, 'mm'),
        ('drive_type', 30, true, true, true, true, NULL::varchar),
        ('mast_type', 40, true, true, true, true, NULL::varchar)
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
    RAISE EXCEPTION 'LM54B verify: category attribute assignments mismatch for category 21' USING ERRCODE = 'check_violation';
  END IF;

  -- Set-based verification of exact target OAV values for offer 1 (exactly 4 rows, one slot each).
  -- The FULL OUTER JOIN also guarantees offer 1 has no OAV rows outside these 4 attributes.
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
    RAISE EXCEPTION 'LM54B verify: OAV target rows mismatch or slots violation' USING ERRCODE = 'check_violation';
  END IF;

  -- Explicit guard: offer 1 must not have OAV rows outside the 4 scoped attributes
  IF EXISTS (
    SELECT 1 FROM public.offer_attribute_values oav
    JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id
    WHERE oav.offer_id = 1 AND ad.stable_key <> ALL(all_attribute_keys)
  ) THEN
    RAISE EXCEPTION 'LM54B verify: offer 1 has OAV rows outside the 4 scoped attributes' USING ERRCODE = 'check_violation';
  END IF;

  -- Verify no OAOV rows for offer 1
  IF EXISTS (
    SELECT 1 FROM public.offer_attribute_option_values
    WHERE offer_id = 1
  ) THEN
    RAISE EXCEPTION 'LM54B verify: unexpected OAOV rows found' USING ERRCODE = 'check_violation';
  END IF;

  -- Verify offers were not mutated
  IF (SELECT category_id FROM public.offers WHERE id = 1) <> 21 THEN
    RAISE EXCEPTION 'LM54B verify: offer 1 category_id is not 21' USING ERRCODE = 'check_violation';
  END IF;
  IF (SELECT category_id FROM public.offers WHERE id = 8) <> 25 THEN
    RAISE EXCEPTION 'LM54B verify: offer 8 category_id is not 25' USING ERRCODE = 'check_violation';
  END IF;
END $$;

SELECT 'PASS' AS verify_status;
ROLLBACK;
