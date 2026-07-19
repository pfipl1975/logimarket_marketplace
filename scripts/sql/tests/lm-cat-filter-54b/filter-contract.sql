-- LM-CAT-FILTER-54B. Local filter + backfill contract check (run after apply).
DO $$
DECLARE
  scoped_attribute_keys text[] := ARRAY['load_capacity', 'lifting_height', 'drive_type', 'mast_type'];
  new_attribute_keys text[] := ARRAY['lifting_height', 'drive_type', 'mast_type'];
  v_category_id bigint;
  actual_adt_count integer;
  actual_cov_count integer;
  actual_covt_count integer;
  non_null_desc_count integer;
  invalid_locale_count integer;
BEGIN
  -- Resolve category 21 by slug with id guard
  SELECT id INTO v_category_id FROM public.categories WHERE slug = 'wozki-widlowe-elektryczne';
  IF v_category_id IS NULL OR v_category_id <> 21 THEN
    RAISE EXCEPTION 'LM54B contract: category wozki-widlowe-elektryczne must exist with id 21' USING ERRCODE = 'check_violation';
  END IF;

  -- 1. All 4 attribute definitions exist with exact data types and active flags
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
      WHERE stable_key = ANY(scoped_attribute_keys)
    ) ad ON ad.stable_key = m.stable_key
    WHERE m.stable_key IS NULL
       OR ad.stable_key IS NULL
       OR ad.data_type IS DISTINCT FROM m.data_type
       OR ad.is_active IS DISTINCT FROM m.is_active
  ) THEN
    RAISE EXCEPTION 'LM54B contract: attribute definitions mismatch' USING ERRCODE = 'check_violation';
  END IF;

  -- 2. Translations count for the 3 new attributes (3 * 7 = 21)
  SELECT count(*) INTO actual_adt_count
  FROM public.attribute_definition_translations adt
  JOIN public.attribute_definitions ad ON ad.id = adt.attribute_definition_id
  WHERE ad.stable_key = ANY(new_attribute_keys);
  IF actual_adt_count <> 21 THEN
    RAISE EXCEPTION 'LM54B contract: expected 21 attribute translations, got %', actual_adt_count USING ERRCODE = 'check_violation';
  END IF;

  -- 3. Controlled options: exactly (drive_type, electric) and (mast_type, triplex), active
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
    RAISE EXCEPTION 'LM54B contract: controlled options mismatch' USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO actual_cov_count
  FROM public.controlled_option_values cov
  JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
  WHERE ad.stable_key = ANY(new_attribute_keys);
  IF actual_cov_count <> 2 THEN
    RAISE EXCEPTION 'LM54B contract: expected 2 controlled options, got %', actual_cov_count USING ERRCODE = 'check_violation';
  END IF;

  -- 4. Option translations count (2 * 7 = 14)
  SELECT count(*) INTO actual_covt_count
  FROM public.controlled_option_value_translations covt
  JOIN public.controlled_option_values cov ON cov.id = covt.controlled_option_value_id
  JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
  WHERE ad.stable_key = ANY(new_attribute_keys);
  IF actual_covt_count <> 14 THEN
    RAISE EXCEPTION 'LM54B contract: expected 14 option translations, got %', actual_covt_count USING ERRCODE = 'check_violation';
  END IF;

  -- 5. Description must be NULL everywhere in the 54B scope
  SELECT count(*) INTO non_null_desc_count
  FROM (
    SELECT description FROM public.attribute_definition_translations adt
    JOIN public.attribute_definitions ad ON ad.id = adt.attribute_definition_id
    WHERE ad.stable_key = ANY(new_attribute_keys) AND adt.description IS NOT NULL
    UNION ALL
    SELECT description FROM public.controlled_option_value_translations covt
    JOIN public.controlled_option_values cov ON cov.id = covt.controlled_option_value_id
    JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
    WHERE ad.stable_key = ANY(new_attribute_keys) AND covt.description IS NOT NULL
  ) q;
  IF non_null_desc_count > 0 THEN
    RAISE EXCEPTION 'LM54B contract: description must be NULL for all 54B translations' USING ERRCODE = 'check_violation';
  END IF;

  -- 6. Exact 4 assignments for category 21 with exact flags/unit/sort
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
    RAISE EXCEPTION 'LM54B contract: category attribute assignments mismatch for category 21' USING ERRCODE = 'check_violation';
  END IF;

  -- 7. No empty name/short_label or fallback names equal to stable_key
  IF EXISTS (
    SELECT 1 FROM public.attribute_definition_translations adt
    JOIN public.attribute_definitions ad ON ad.id = adt.attribute_definition_id
    WHERE ad.stable_key = ANY(new_attribute_keys)
      AND (adt.name IS NULL OR adt.name = '' OR adt.name = ad.stable_key OR adt.short_label IS NULL OR adt.short_label = '')
  ) THEN
    RAISE EXCEPTION 'LM54B contract: empty/fallback translation names' USING ERRCODE = 'check_violation';
  END IF;

  -- 8. Option translation labels valid
  IF EXISTS (
    SELECT 1 FROM public.controlled_option_value_translations covt
    JOIN public.controlled_option_values cov ON cov.id = covt.controlled_option_value_id
    JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
    WHERE ad.stable_key = ANY(new_attribute_keys)
      AND (covt.label IS NULL OR covt.label = '' OR covt.label = cov.stable_key)
  ) THEN
    RAISE EXCEPTION 'LM54B contract: empty/fallback option translation labels' USING ERRCODE = 'check_violation';
  END IF;

  -- 9. Translation locales are exactly pl/en/de/fr/uk/es/zh (no extras, no duplicates)
  SELECT count(*) INTO invalid_locale_count
  FROM (
    SELECT locale FROM public.attribute_definition_translations adt
    JOIN public.attribute_definitions ad ON ad.id = adt.attribute_definition_id
    WHERE ad.stable_key = ANY(new_attribute_keys) AND locale NOT IN ('pl','en','de','fr','uk','es','zh')
    UNION ALL
    SELECT locale FROM public.controlled_option_value_translations covt
    JOIN public.controlled_option_values cov ON cov.id = covt.controlled_option_value_id
    JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
    WHERE ad.stable_key = ANY(new_attribute_keys) AND locale NOT IN ('pl','en','de','fr','uk','es','zh')
  ) q;
  IF invalid_locale_count > 0 THEN
    RAISE EXCEPTION 'LM54B contract: invalid locales found' USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.attribute_definition_translations adt
    JOIN public.attribute_definitions ad ON ad.id = adt.attribute_definition_id
    WHERE ad.stable_key = ANY(new_attribute_keys)
    GROUP BY adt.attribute_definition_id, adt.locale
    HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1 FROM public.controlled_option_value_translations covt
    JOIN public.controlled_option_values cov ON cov.id = covt.controlled_option_value_id
    JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
    WHERE ad.stable_key = ANY(new_attribute_keys)
    GROUP BY covt.controlled_option_value_id, covt.locale
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'LM54B contract: duplicate translation locales' USING ERRCODE = 'check_violation';
  END IF;

  -- 10. Exact 4 OAV rows for offer 1 with exact values and typed-slot exclusivity.
  -- The FULL OUTER JOIN also fails on any OAV row for offer 1 outside the 4 scoped attributes.
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
    RAISE EXCEPTION 'LM54B contract: OAV target rows mismatch or slots violation' USING ERRCODE = 'check_violation';
  END IF;

  -- 11. No OAOV rows for offer 1
  IF EXISTS (
    SELECT 1 FROM public.offer_attribute_option_values
    WHERE offer_id = 1
  ) THEN
    RAISE EXCEPTION 'LM54B contract: unexpected OAOV rows found' USING ERRCODE = 'check_violation';
  END IF;

  -- 12. Offer 8 untouched (category_id = 25), offer 1 still in category 21 with intact source data
  IF (SELECT category_id FROM public.offers WHERE id = 8) <> 25 THEN
    RAISE EXCEPTION 'LM54B contract: offer 8 category_id mutated' USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.offers
    WHERE id = 1
      AND category_id = 21
      AND title = 'Elektryczny wózek widłowy 1.5t LogiTrans ET-15'
      AND publication_status = 'published'
      AND offer_model = 'rfq'
      AND technical_attributes ->> 'Udźwig (kg)' = '1500'
      AND technical_attributes ->> 'Wysokość podnoszenia (mm)' = '4500'
      AND technical_attributes ->> 'Napęd' = 'Elektryczny'
      AND technical_attributes ->> 'Typ masztu' = 'Triplex'
  ) THEN
    RAISE EXCEPTION 'LM54B contract: offer 1 source row mutated' USING ERRCODE = 'check_violation';
  END IF;
END $$;
