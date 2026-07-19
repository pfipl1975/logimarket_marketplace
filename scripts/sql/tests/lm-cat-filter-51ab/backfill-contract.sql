-- LM-CAT-FILTER-51AB backfill contract validation.
DO $$
DECLARE
  v_category_id bigint;
  missing_count integer := 0;
  unexpected_count integer := 0;
  mismatched_count integer := 0;
  wrong_slot_count integer := 0;
  cross_table_count integer := 0;
  inactive_count integer := 0;
BEGIN
  -- Dynamically resolve category ID from the full path
  SELECT c1.id INTO v_category_id
  FROM public.categories c1
  JOIN public.categories c2 ON c2.id = c1.parent_id
  JOIN public.categories c3 ON c3.id = c2.parent_id
  WHERE c1.slug = 'pojemniki-plastikowe-euro'
    AND c2.slug = 'pojemniki-i-kuwety'
    AND c3.slug = 'wyposazenie-magazynu';

  IF v_category_id IS NULL THEN
    RAISE EXCEPTION 'LM51AB contract: pilot category path not found' USING ERRCODE = 'check_violation';
  END IF;

  -- 1. Check for missing target rows (present in manifest but missing in OAV)
  SELECT count(*) INTO missing_count
  FROM (
    VALUES
      (5, 'external_length'),
      (5, 'external_width'),
      (5, 'external_height'),
      (5, 'capacity'),
      (5, 'material'),
      (6, 'external_length'),
      (6, 'external_width'),
      (6, 'external_height'),
      (6, 'capacity'),
      (6, 'material')
  ) m(offer_id, attribute_key)
  LEFT JOIN public.offer_attribute_values oav ON oav.offer_id = m.offer_id
    AND oav.attribute_id = (SELECT id FROM public.attribute_definitions WHERE stable_key = m.attribute_key)
  WHERE oav.id IS NULL;

  -- 2. Check for unexpected target-scope rows (present in OAV for offers 5/6 and active attributes but not in manifest)
  SELECT count(*) INTO unexpected_count
  FROM public.offer_attribute_values oav
  JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id
  LEFT JOIN (
    VALUES
      (5, 'external_length'),
      (5, 'external_width'),
      (5, 'external_height'),
      (5, 'capacity'),
      (5, 'material'),
      (6, 'external_length'),
      (6, 'external_width'),
      (6, 'external_height'),
      (6, 'capacity'),
      (6, 'material')
  ) m(offer_id, attribute_key) ON m.offer_id = oav.offer_id AND m.attribute_key = ad.stable_key
  WHERE oav.offer_id IN (5, 6)
    AND ad.stable_key = ANY(ARRAY['external_length', 'external_width', 'external_height', 'capacity', 'material'])
    AND m.offer_id IS NULL;

  -- 3. Check for mismatched target rows (values or option_ids do not match the expected manifest)
  SELECT count(*) INTO mismatched_count
  FROM (
    VALUES
      (5, 'external_length', 600::numeric, 'pp'),
      (5, 'external_width', 400::numeric, 'pp'),
      (5, 'external_height', 220::numeric, 'pp'),
      (5, 'capacity', 45::numeric, 'pp'),
      (5, 'material', NULL::numeric, 'pp'),
      (6, 'external_length', 400::numeric, 'pp'),
      (6, 'external_width', 300::numeric, 'pp'),
      (6, 'external_height', 120::numeric, 'pp'),
      (6, 'capacity', 10::numeric, 'pp'),
      (6, 'material', NULL::numeric, 'pp')
  ) m(offer_id, attribute_key, value_number, option_key)
  JOIN public.offer_attribute_values oav ON oav.offer_id = m.offer_id
    AND oav.attribute_id = (SELECT id FROM public.attribute_definitions WHERE stable_key = m.attribute_key)
  LEFT JOIN public.controlled_option_values cov ON cov.id = oav.option_id
  WHERE (m.attribute_key <> 'material' AND oav.value_number IS DISTINCT FROM m.value_number)
     OR (m.attribute_key = 'material' AND cov.stable_key IS DISTINCT FROM m.option_key);

  -- 4. Check for wrong typed slot rows (e.g. non-target fields are populated or exclusivity is violated)
  SELECT count(*) INTO wrong_slot_count
  FROM public.offer_attribute_values oav
  JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id
  WHERE oav.offer_id IN (5, 6)
    AND ad.stable_key = ANY(ARRAY['external_length', 'external_width', 'external_height', 'capacity', 'material'])
    AND (
      oav.value_text IS NOT NULL
      OR oav.value_boolean IS NOT NULL
      OR oav.value_date IS NOT NULL
      OR oav.value_year IS NOT NULL
      OR (ad.stable_key <> 'material' AND oav.option_id IS NOT NULL)
      OR (ad.stable_key = 'material' AND oav.option_id IS NULL)
      OR num_nonnulls(oav.value_text, oav.value_number, oav.value_boolean, oav.value_date, oav.value_year, oav.option_id) <> 1
    );

  -- 5. Check for cross-table conflicts (e.g. pilot rows in offer_attribute_option_values)
  SELECT count(*) INTO cross_table_count
  FROM public.offer_attribute_option_values
  WHERE offer_id IN (5, 6);

  -- 6. Check for inactive rows (OAV rows for pilot offers and inactive attributes)
  SELECT count(*) INTO inactive_count
  FROM public.offer_attribute_values oav
  JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id
  WHERE oav.offer_id IN (5, 6) AND ad.stable_key IN ('esd_protection', 'load_capacity', 'stackable');

  -- Assert all are 0
  IF missing_count > 0 OR unexpected_count > 0 OR mismatched_count > 0 OR wrong_slot_count > 0 OR cross_table_count > 0 OR inactive_count > 0 THEN
    RAISE EXCEPTION 'LM51AB contract check failed: missing=%, unexpected=%, mismatched=%, wrong_slot=%, cross_table=%, inactive=%',
      missing_count, unexpected_count, mismatched_count, wrong_slot_count, cross_table_count, inactive_count USING ERRCODE = 'check_violation';
  END IF;
END $$;
