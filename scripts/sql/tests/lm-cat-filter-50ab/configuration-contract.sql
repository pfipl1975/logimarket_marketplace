-- LM-CAT-FILTER-50AB. Local configuration contract check.
DO $$
DECLARE
  pilot_attribute_keys text[] := ARRAY[
    'external_length', 'external_width', 'external_height', 'capacity',
    'material', 'esd_protection', 'load_capacity', 'stackable'
  ];
  actual_ad_count integer;
  actual_adt_count integer;
  actual_cov_count integer;
  actual_covt_count integer;
  actual_caa_count integer;
  non_null_desc_count integer;
  invalid_locale_count integer;
  invalid_fallback_count integer;
  forbidden_options_count integer;
BEGIN
  -- 1. Check pilot attribute definitions count
  SELECT count(*) INTO actual_ad_count
  FROM public.attribute_definitions
  WHERE stable_key = ANY(pilot_attribute_keys);
  IF actual_ad_count <> 8 THEN
    RAISE EXCEPTION 'post-forward contract mismatch: expected 8 pilot attributes, got %', actual_ad_count USING ERRCODE = 'check_violation';
  END IF;

  -- 2. Check controlled option values count
  SELECT count(*) INTO actual_cov_count
  FROM public.controlled_option_values cov
  JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
  WHERE ad.stable_key = 'material';
  IF actual_cov_count <> 2 THEN
    RAISE EXCEPTION 'post-forward contract mismatch: expected 2 controlled options, got %', actual_cov_count USING ERRCODE = 'check_violation';
  END IF;

  -- 3. Check for forbidden option stable_keys
  SELECT count(*) INTO forbidden_options_count
  FROM public.controlled_option_values cov
  JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
  WHERE ad.stable_key = 'material' AND cov.stable_key = ANY(ARRAY['esd', 'esd_conductive', 'pe', 'other']);
  IF forbidden_options_count > 0 THEN
    RAISE EXCEPTION 'post-forward contract mismatch: forbidden option keys found' USING ERRCODE = 'check_violation';
  END IF;

  -- 4. Check translations count (8 * 7 = 56)
  SELECT count(*) INTO actual_adt_count
  FROM public.attribute_definition_translations adt
  JOIN public.attribute_definitions ad ON ad.id = adt.attribute_definition_id
  WHERE ad.stable_key = ANY(pilot_attribute_keys);
  IF actual_adt_count <> 56 THEN
    RAISE EXCEPTION 'post-forward contract mismatch: expected 56 translations, got %', actual_adt_count USING ERRCODE = 'check_violation';
  END IF;

  -- 5. Check option translations count (2 * 7 = 14)
  SELECT count(*) INTO actual_covt_count
  FROM public.controlled_option_value_translations covt
  JOIN public.controlled_option_values cov ON cov.id = covt.controlled_option_value_id
  JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
  WHERE ad.stable_key = 'material';
  IF actual_covt_count <> 14 THEN
    RAISE EXCEPTION 'post-forward contract mismatch: expected 14 option translations, got %', actual_covt_count USING ERRCODE = 'check_violation';
  END IF;

  -- 6. Check that description is NULL everywhere
  SELECT count(*) INTO non_null_desc_count
  FROM (
    SELECT description FROM public.attribute_definition_translations adt
    JOIN public.attribute_definitions ad ON ad.id = adt.attribute_definition_id
    WHERE ad.stable_key = ANY(pilot_attribute_keys) AND adt.description IS NOT NULL
    UNION ALL
    SELECT description FROM public.controlled_option_value_translations covt
    JOIN public.controlled_option_values cov ON cov.id = covt.controlled_option_value_id
    JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
    WHERE ad.stable_key = ANY(pilot_attribute_keys) AND covt.description IS NOT NULL
  ) q;
  IF non_null_desc_count > 0 THEN
    RAISE EXCEPTION 'post-forward contract mismatch: description must be NULL for all translations' USING ERRCODE = 'check_violation';
  END IF;

  -- 7. Check category assignments count
  SELECT count(*) INTO actual_caa_count
  FROM public.category_attribute_assignments caa
  JOIN public.attribute_definitions ad ON ad.id = caa.attribute_definition_id
  JOIN public.categories c ON c.id = caa.category_id
  WHERE c.slug = 'pojemniki-plastikowe-euro' AND ad.stable_key = ANY(pilot_attribute_keys);
  IF actual_caa_count <> 8 THEN
    RAISE EXCEPTION 'post-forward contract mismatch: expected 8 category assignments, got %', actual_caa_count USING ERRCODE = 'check_violation';
  END IF;

  -- 8. Check active assignments count
  IF (
    SELECT count(*) FROM public.category_attribute_assignments caa
    JOIN public.attribute_definitions ad ON ad.id = caa.attribute_definition_id
    JOIN public.categories c ON c.id = caa.category_id
    WHERE c.slug = 'pojemniki-plastikowe-euro' AND ad.stable_key = ANY(pilot_attribute_keys) AND caa.is_filterable = true
  ) <> 5 THEN
    RAISE EXCEPTION 'post-forward contract mismatch: expected 5 filterable assignments' USING ERRCODE = 'check_violation';
  END IF;

  -- 9. Check inactive assignments count
  IF (
    SELECT count(*) FROM public.category_attribute_assignments caa
    JOIN public.attribute_definitions ad ON ad.id = caa.attribute_definition_id
    JOIN public.categories c ON c.id = caa.category_id
    WHERE c.slug = 'pojemniki-plastikowe-euro' AND ad.stable_key = ANY(pilot_attribute_keys) AND caa.is_filterable = false
  ) <> 3 THEN
    RAISE EXCEPTION 'post-forward contract mismatch: expected 3 non-filterable assignments' USING ERRCODE = 'check_violation';
  END IF;

  -- 10. Check for empty name/short_label or fallback names equal to stable_key
  IF EXISTS (
    SELECT 1 FROM public.attribute_definition_translations adt
    JOIN public.attribute_definitions ad ON ad.id = adt.attribute_definition_id
    WHERE ad.stable_key = ANY(pilot_attribute_keys)
      AND (adt.name IS NULL OR adt.name = '' OR adt.name = ad.stable_key OR adt.short_label IS NULL OR adt.short_label = '')
  ) THEN
    RAISE EXCEPTION 'post-forward contract mismatch: empty/fallback translation names' USING ERRCODE = 'check_violation';
  END IF;
  
  -- 11. Check option translations label
  IF EXISTS (
    SELECT 1 FROM public.controlled_option_value_translations covt
    JOIN public.controlled_option_values cov ON cov.id = covt.controlled_option_value_id
    JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
    WHERE ad.stable_key = 'material'
      AND (covt.label IS NULL OR covt.label = '' OR covt.label = cov.stable_key)
  ) THEN
    RAISE EXCEPTION 'post-forward contract mismatch: empty/fallback option translation labels' USING ERRCODE = 'check_violation';
  END IF;

  -- 12. Check translation locales are exactly pl/en/de/fr/uk/es/zh
  SELECT count(*) INTO invalid_locale_count
  FROM (
    SELECT locale FROM public.attribute_definition_translations adt
    JOIN public.attribute_definitions ad ON ad.id = adt.attribute_definition_id
    WHERE ad.stable_key = ANY(pilot_attribute_keys) AND locale NOT IN ('pl','en','de','fr','uk','es','zh')
    UNION ALL
    SELECT locale FROM public.controlled_option_value_translations covt
    JOIN public.controlled_option_values cov ON cov.id = covt.controlled_option_value_id
    JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
    WHERE ad.stable_key = ANY(pilot_attribute_keys) AND locale NOT IN ('pl','en','de','fr','uk','es','zh')
  ) q;
  IF invalid_locale_count > 0 THEN
    RAISE EXCEPTION 'post-forward contract mismatch: invalid locales found' USING ERRCODE = 'check_violation';
  END IF;
  
  -- Check for duplicates locale per attribute
  IF EXISTS (
    SELECT 1 FROM public.attribute_definition_translations adt
    JOIN public.attribute_definitions ad ON ad.id = adt.attribute_definition_id
    WHERE ad.stable_key = ANY(pilot_attribute_keys)
    GROUP BY adt.attribute_definition_id, adt.locale
    HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1 FROM public.controlled_option_value_translations covt
    JOIN public.controlled_option_values cov ON cov.id = covt.controlled_option_value_id
    JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
    WHERE ad.stable_key = ANY(pilot_attribute_keys)
    GROUP BY covt.controlled_option_value_id, covt.locale
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'post-forward contract mismatch: duplicate translation locales' USING ERRCODE = 'check_violation';
  END IF;
  
  -- Verify no modifications on offer values tables
  IF EXISTS (SELECT 1 FROM public.offer_attribute_values LIMIT 1) THEN
    RAISE EXCEPTION 'post-forward contract mismatch: offer_attribute_values nonempty' USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM public.offer_attribute_option_values LIMIT 1) THEN
    RAISE EXCEPTION 'post-forward contract mismatch: offer_attribute_option_values nonempty' USING ERRCODE = 'check_violation';
  END IF;
END $$;
