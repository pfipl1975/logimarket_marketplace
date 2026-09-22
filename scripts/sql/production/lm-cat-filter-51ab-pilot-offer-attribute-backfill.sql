-- LM-CAT-FILTER-51AB. Execute only after approved production preflight.
-- This script backfills relational attribute values for two published offers in category 'pojemniki-plastikowe-euro'.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

-- 1. PRE-ASSERTIONS
DO $$
DECLARE
  target_tables text[] := ARRAY[
    'attribute_definitions', 'controlled_option_values', 'offer_attribute_values',
    'offer_attribute_option_values', 'attribute_definition_translations',
    'category_attribute_assignments', 'controlled_option_value_translations'
  ];
  v_category_id bigint;
  v_check_id bigint;
BEGIN
  IF to_regclass('public.categories') IS NULL OR to_regclass('public.offers') IS NULL THEN
    RAISE EXCEPTION 'LM51AB: legacy categories or offers is missing' USING ERRCODE = 'check_violation';
  END IF;

  IF (SELECT count(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND relname = ANY(target_tables)) <> 7 THEN
    RAISE EXCEPTION 'LM51AB: all seven target runtime tables must exist' USING ERRCODE = 'check_violation';
  END IF;

  -- Dynamically resolve category ID from the full path
  SELECT c1.id INTO v_category_id
  FROM public.categories c1
  JOIN public.categories c2 ON c2.id = c1.parent_id
  JOIN public.categories c3 ON c3.id = c2.parent_id
  WHERE c1.slug = 'pojemniki-plastikowe-euro'
    AND c2.slug = 'pojemniki-i-kuwety'
    AND c3.slug = 'wyposazenie-magazynu';

  IF v_category_id IS NULL THEN
    RAISE EXCEPTION 'LM51AB: pilot category path wyposazenie-magazynu > pojemniki-i-kuwety > pojemniki-plastikowe-euro not found' USING ERRCODE = 'check_violation';
  END IF;

  -- Verify definitions exactly match the expected list
  IF EXISTS (
    SELECT 1 FROM (
      VALUES
        ('external_length', 'number', true),
        ('external_width', 'number', true),
        ('external_height', 'number', true),
        ('capacity', 'number', true),
        ('material', 'enum', true),
        ('esd_protection', 'boolean', true),
        ('load_capacity', 'number', true),
        ('stackable', 'boolean', true)
    ) m(stable_key, data_type, is_active)
    FULL OUTER JOIN public.attribute_definitions ad ON ad.stable_key = m.stable_key
    WHERE m.stable_key IS NULL
       OR ad.stable_key IS NULL
       OR ad.data_type IS DISTINCT FROM m.data_type
       OR ad.is_active IS DISTINCT FROM m.is_active
  ) THEN
    RAISE EXCEPTION 'LM51AB: attribute definitions configuration drift detected' USING ERRCODE = 'check_violation';
  END IF;

  -- Verify controlled options for material
  IF EXISTS (
    SELECT 1 FROM (
      VALUES
        ('material', 'pp', true),
        ('material', 'hdpe', true)
    ) m(attr_key, stable_key, is_active)
    FULL OUTER JOIN (
      SELECT ad.stable_key AS attr_key, cov.stable_key, cov.is_active
      FROM public.controlled_option_values cov
      JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
    ) cov_act ON cov_act.attr_key = m.attr_key AND cov_act.stable_key = m.stable_key
    WHERE m.stable_key IS NULL
       OR cov_act.stable_key IS NULL
       OR cov_act.is_active IS DISTINCT FROM m.is_active
  ) THEN
    RAISE EXCEPTION 'LM51AB: controlled option values configuration drift detected' USING ERRCODE = 'check_violation';
  END IF;

  -- Verify assignments
  IF EXISTS (
    SELECT 1 FROM (
      VALUES
        ('external_length', 10, true, true, true, true, 'mm'),
        ('external_width', 20, true, true, true, true, 'mm'),
        ('external_height', 30, true, true, true, true, 'mm'),
        ('capacity', 40, true, true, true, true, 'l'),
        ('material', 50, true, true, true, true, NULL::varchar),
        ('esd_protection', 60, false, true, false, true, NULL::varchar),
        ('load_capacity', 70, false, true, false, true, 'kg'),
        ('stackable', 80, false, true, false, true, NULL::varchar)
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
    RAISE EXCEPTION 'LM51AB: category attribute assignments configuration drift detected' USING ERRCODE = 'check_violation';
  END IF;

  -- Lock offers 5 and 6 and verify they match the exact snapshot
  SELECT id INTO v_check_id
  FROM public.offers
  WHERE id = 5
    AND category_id = v_category_id
    AND title = 'Pojemnik Euro plastikowy 600x400x220 mm'
    AND publication_status = 'published'
    AND offer_model = 'ecommerce'
    AND technical_attributes = '{"Materiał": "PP (Polipropylen)", "Pojemność (l)": 45, "Wymiary zewnętrzne (mm)": "600x400x220"}'::jsonb
  FOR SHARE;

  IF v_check_id IS NULL THEN
    RAISE EXCEPTION 'LM51AB: source offer 5 pre-assertion failure or modified' USING ERRCODE = 'check_violation';
  END IF;

  v_check_id := NULL;
  SELECT id INTO v_check_id
  FROM public.offers
  WHERE id = 6
    AND category_id = v_category_id
    AND title = 'Pojemnik Euro plastikowy 400x300x120 mm'
    AND publication_status = 'published'
    AND offer_model = 'ecommerce'
    AND technical_attributes = '{"Materiał": "PP (Polipropylen)", "Pojemność (l)": 10, "Wymiary zewnętrzne (mm)": "400x300x120"}'::jsonb
  FOR SHARE;

  IF v_check_id IS NULL THEN
    RAISE EXCEPTION 'LM51AB: source offer 6 pre-assertion failure or modified' USING ERRCODE = 'check_violation';
  END IF;

  -- Check existing values for offers 5 and 6 (must be absent or exactly match targets)
  IF EXISTS (
    SELECT 1
    FROM public.offer_attribute_values oav
    JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id
    LEFT JOIN public.controlled_option_values cov ON cov.id = oav.option_id
    LEFT JOIN (
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
      ON m.offer_id = oav.offer_id AND m.attribute_key = ad.stable_key
    WHERE oav.offer_id IN (5, 6)
      AND ad.stable_key = ANY(ARRAY['external_length', 'external_width', 'external_height', 'capacity', 'material', 'esd_protection', 'load_capacity', 'stackable'])
      AND (
        m.offer_id IS NULL -- Unexpected attribute value (e.g. for inactive attributes)
        OR (m.attribute_key <> 'material' AND oav.value_number IS DISTINCT FROM m.value_number)
        -- Typed slots integrity: ensure non-target fields are NULL
        OR oav.value_text IS NOT NULL
        OR oav.value_boolean IS NOT NULL
        OR oav.value_date IS NOT NULL
        OR oav.value_year IS NOT NULL
        -- Option ID verification for material
        OR (m.attribute_key = 'material' AND cov.stable_key IS DISTINCT FROM m.option_key)
        OR (m.attribute_key <> 'material' AND oav.option_id IS NOT NULL)
        OR (m.attribute_key = 'material' AND oav.option_id IS NULL)
      )
  ) THEN
    RAISE EXCEPTION 'LM51AB: conflict with existing offer attribute values or unexpected slots populated' USING ERRCODE = 'check_violation';
  END IF;

  -- Verify no offer_attribute_option_values exist for target offers
  IF EXISTS (
    SELECT 1 FROM public.offer_attribute_option_values
    WHERE offer_id IN (5, 6)
  ) THEN
    RAISE EXCEPTION 'LM51AB: unexpected rows in offer_attribute_option_values for pilot offers' USING ERRCODE = 'check_violation';
  END IF;
END $$;

-- 2. INSERT VALUES WITHOUT ADVANCING SEQUENCES IF ALREADY PRESENT
INSERT INTO public.offer_attribute_values (offer_id, attribute_id, value_number, value_text, value_boolean, value_date, value_year, option_id)
SELECT m.offer_id, ad.id, m.value_number, NULL::text, NULL::boolean, NULL::timestamp with time zone, NULL::integer, opt.id
FROM (
  VALUES
    (5, 'external_length', 600::numeric, NULL::text),
    (5, 'external_width', 400::numeric, NULL::text),
    (5, 'external_height', 220::numeric, NULL::text),
    (5, 'capacity', 45::numeric, NULL::text),
    (5, 'material', NULL::numeric, 'pp'),

    (6, 'external_length', 400::numeric, NULL::text),
    (6, 'external_width', 300::numeric, NULL::text),
    (6, 'external_height', 120::numeric, NULL::text),
    (6, 'capacity', 10::numeric, NULL::text),
    (6, 'material', NULL::numeric, 'pp')
) m(offer_id, attribute_key, value_number, option_key)
JOIN public.attribute_definitions ad ON ad.stable_key = m.attribute_key
LEFT JOIN public.controlled_option_values opt ON opt.attribute_id = ad.id AND opt.stable_key = m.option_key
LEFT JOIN public.offer_attribute_values existing ON existing.offer_id = m.offer_id AND existing.attribute_id = ad.id
WHERE existing.id IS NULL
ON CONFLICT (offer_id, attribute_id) DO NOTHING;

-- 3. POST-ASSERTIONS
DO $$
DECLARE
  v_category_id bigint;
BEGIN
  -- Dynamically resolve category ID from the full path
  SELECT c1.id INTO v_category_id
  FROM public.categories c1
  JOIN public.categories c2 ON c2.id = c1.parent_id
  JOIN public.categories c3 ON c3.id = c2.parent_id
  WHERE c1.slug = 'pojemniki-plastikowe-euro'
    AND c2.slug = 'pojemniki-i-kuwety'
    AND c3.slug = 'wyposazenie-magazynu';

  -- Set-based verification of exact target values
  IF EXISTS (
    SELECT 1 FROM (
      VALUES
        (5, 'external_length', 600::numeric, NULL::text),
        (5, 'external_width', 400::numeric, NULL::text),
        (5, 'external_height', 220::numeric, NULL::text),
        (5, 'capacity', 45::numeric, NULL::text),
        (5, 'material', NULL::numeric, 'pp'),

        (6, 'external_length', 400::numeric, NULL::text),
        (6, 'external_width', 300::numeric, NULL::text),
        (6, 'external_height', 120::numeric, NULL::text),
        (6, 'capacity', 10::numeric, NULL::text),
        (6, 'material', NULL::numeric, 'pp')
    ) m(offer_id, attribute_key, value_number, option_key)
    FULL OUTER JOIN (
      SELECT oav.offer_id, ad.stable_key AS attribute_key, oav.value_number, cov.stable_key AS option_key,
             oav.value_text, oav.value_boolean, oav.value_date, oav.value_year, oav.option_id
      FROM public.offer_attribute_values oav
      JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id
      LEFT JOIN public.controlled_option_values cov ON cov.id = oav.option_id
      WHERE oav.offer_id IN (5, 6)
    ) oav_act ON oav_act.offer_id = m.offer_id AND oav_act.attribute_key = m.attribute_key
    WHERE m.offer_id IS NULL
       OR oav_act.offer_id IS NULL
       OR (m.attribute_key <> 'material' AND oav_act.value_number IS DISTINCT FROM m.value_number)
       OR (m.attribute_key = 'material' AND oav_act.option_key IS DISTINCT FROM m.option_key)
       OR oav_act.value_text IS NOT NULL
       OR oav_act.value_boolean IS NOT NULL
       OR oav_act.value_date IS NOT NULL
       OR oav_act.value_year IS NOT NULL
       OR (m.attribute_key <> 'material' AND oav_act.option_id IS NOT NULL)
       OR (m.attribute_key = 'material' AND oav_act.option_id IS NULL)
       OR num_nonnulls(oav_act.value_text, oav_act.value_number, oav_act.value_boolean, oav_act.value_date, oav_act.value_year, oav_act.option_id) <> 1
  ) THEN
    RAISE EXCEPTION 'LM51AB post-check: OAV target rows mismatch or slots violation' USING ERRCODE = 'check_violation';
  END IF;

  -- Verify no inactive attribute values for offers 5 and 6
  IF EXISTS (
    SELECT 1 FROM public.offer_attribute_values oav
    JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id
    WHERE oav.offer_id IN (5, 6) AND ad.stable_key IN ('esd_protection', 'load_capacity', 'stackable')
  ) THEN
    RAISE EXCEPTION 'LM51AB post-check: unexpected values for inactive attributes' USING ERRCODE = 'check_violation';
  END IF;

  -- Verify no OAOV rows for offers 5 and 6
  IF EXISTS (
    SELECT 1 FROM public.offer_attribute_option_values
    WHERE offer_id IN (5, 6)
  ) THEN
    RAISE EXCEPTION 'LM51AB post-check: unexpected OAOV rows found' USING ERRCODE = 'check_violation';
  END IF;
END $$;

COMMIT;
