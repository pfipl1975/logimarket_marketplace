-- LM-CAT-FILTER-54B. Execute only after approved production preflight.
-- This script configures 4 filters for category 21 'wozki-widlowe-elektryczne'
-- and backfills relational attribute values for offer 1.
-- Dependency: LM-CAT-FILTER-50AB must be applied first (shared attribute definition load_capacity).
BEGIN;
SET LOCAL TIME ZONE 'UTC';
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
  categories_id_attnum smallint;
  v_category_id bigint;
  v_check_id bigint;
  v_offer8_category_id bigint;
  conflicting_stable_key text;
BEGIN
  IF to_regclass('public.categories') IS NULL OR to_regclass('public.offers') IS NULL THEN
    RAISE EXCEPTION 'LM54B: legacy categories or offers is missing' USING ERRCODE = 'check_violation';
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
    RAISE EXCEPTION 'LM54B: categories primary key must be exactly (id bigint not null)' USING ERRCODE = 'check_violation';
  END IF;

  IF (SELECT count(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND relname = ANY(target_tables)) <> 7 THEN
    RAISE EXCEPTION 'LM54B: all seven target runtime tables must exist' USING ERRCODE = 'check_violation';
  END IF;

  -- Verify unique category existence for slug and guard the expected id = 21
  IF (SELECT count(*) FROM public.categories WHERE slug = 'wozki-widlowe-elektryczne') <> 1 THEN
    RAISE EXCEPTION 'LM54B: category wozki-widlowe-elektryczne must exist and be unique' USING ERRCODE = 'check_violation';
  END IF;

  SELECT id INTO v_category_id FROM public.categories WHERE slug = 'wozki-widlowe-elektryczne';
  IF v_category_id <> 21 THEN
    RAISE EXCEPTION 'LM54B: category wozki-widlowe-elektryczne must have id 21, got %', v_category_id USING ERRCODE = 'check_violation';
  END IF;

  -- Shared definition load_capacity must already exist (delivered by LM-CAT-FILTER-50AB).
  -- 54B reuses it: it never creates, modifies, or deletes this definition.
  IF NOT EXISTS (
    SELECT 1 FROM public.attribute_definitions
    WHERE stable_key = 'load_capacity' AND data_type = 'number' AND is_active = true
  ) THEN
    RAISE EXCEPTION 'LM54B: shared attribute definition load_capacity (number, active) is missing - apply LM-CAT-FILTER-50AB first' USING ERRCODE = 'check_violation';
  END IF;

  -- SEMANTIC CONFLICT GUARDS
  -- Check for existing stable_keys with mismatched data_type
  SELECT stable_key INTO conflicting_stable_key
  FROM public.attribute_definitions
  WHERE (stable_key = 'lifting_height' AND data_type <> 'number')
     OR (stable_key = 'drive_type' AND data_type <> 'enum')
     OR (stable_key = 'mast_type' AND data_type <> 'enum');

  IF conflicting_stable_key IS NOT NULL THEN
    RAISE EXCEPTION 'LM54B: semantic conflict for attribute % - data_type mismatch', conflicting_stable_key USING ERRCODE = 'check_violation';
  END IF;

  -- Check for assignment unit_code mismatches on existing assignments of category 21
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
    RAISE EXCEPTION 'LM54B: semantic conflict for assignment of % - unit_code mismatch', conflicting_stable_key USING ERRCODE = 'check_violation';
  END IF;

  -- Check if controlled option stable_keys are used by different attributes
  SELECT co.stable_key INTO conflicting_stable_key
  FROM public.controlled_option_values co
  JOIN public.attribute_definitions ad ON ad.id = co.attribute_id
  WHERE (co.stable_key = 'electric' AND ad.stable_key <> 'drive_type')
     OR (co.stable_key = 'triplex' AND ad.stable_key <> 'mast_type');

  IF conflicting_stable_key IS NOT NULL THEN
    RAISE EXCEPTION 'LM54B: controlled option % is used by a different attribute', conflicting_stable_key USING ERRCODE = 'check_violation';
  END IF;

  -- Lock offer 1 and verify it matches the exact production snapshot
  SELECT id INTO v_check_id
  FROM public.offers
  WHERE id = 1
    AND category_id = v_category_id
    AND title = 'Elektryczny wózek widłowy 1.5t LogiTrans ET-15'
    AND publication_status = 'published'
    AND offer_model = 'rfq'
    AND conversion_type = 'rfq'
    AND price_on_request = true
    AND is_active = true
  FOR SHARE;

  IF v_check_id IS NULL THEN
    RAISE EXCEPTION 'LM54B: source offer 1 pre-assertion failure or modified' USING ERRCODE = 'check_violation';
  END IF;

  -- Drift guard for source values in technical_attributes (all 4 keys must match)
  IF (SELECT technical_attributes ->> 'Udźwig (kg)' FROM public.offers WHERE id = 1) IS DISTINCT FROM '1500'
     OR (SELECT technical_attributes ->> 'Wysokość podnoszenia (mm)' FROM public.offers WHERE id = 1) IS DISTINCT FROM '4500'
     OR (SELECT technical_attributes ->> 'Napęd' FROM public.offers WHERE id = 1) IS DISTINCT FROM 'Elektryczny'
     OR (SELECT technical_attributes ->> 'Typ masztu' FROM public.offers WHERE id = 1) IS DISTINCT FROM 'Triplex' THEN
    RAISE EXCEPTION 'LM54B: source offer 1 technical_attributes drift detected' USING ERRCODE = 'check_violation';
  END IF;

  -- Offer 8 must exist and stay in category 25 (elektryczne-wozki-paletowe); it must never be touched
  SELECT category_id INTO v_offer8_category_id FROM public.offers WHERE id = 8;
  IF v_offer8_category_id IS NULL OR v_offer8_category_id <> 25 THEN
    RAISE EXCEPTION 'LM54B: offer 8 must exist with category_id 25, got %', COALESCE(v_offer8_category_id::text, '<missing>') USING ERRCODE = 'check_violation';
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
        m.attribute_key IS NULL -- Unexpected attribute value outside the 54B scope
        OR (m.attribute_key IN ('load_capacity', 'lifting_height') AND oav.value_number IS DISTINCT FROM m.value_number)
        -- Typed slots integrity: ensure non-target fields are NULL
        OR oav.value_text IS NOT NULL
        OR oav.value_boolean IS NOT NULL
        OR oav.value_date IS NOT NULL
        OR oav.value_year IS NOT NULL
        -- Option ID verification for enum attributes
        OR (m.attribute_key IN ('drive_type', 'mast_type') AND cov.stable_key IS DISTINCT FROM m.option_key)
        OR (m.attribute_key IN ('load_capacity', 'lifting_height') AND oav.option_id IS NOT NULL)
        OR (m.attribute_key IN ('drive_type', 'mast_type') AND oav.option_id IS NULL)
      )
  ) THEN
    RAISE EXCEPTION 'LM54B: conflict with existing offer attribute values or unexpected slots populated' USING ERRCODE = 'check_violation';
  END IF;

  -- Verify no offer_attribute_option_values exist for offer 1
  IF EXISTS (
    SELECT 1 FROM public.offer_attribute_option_values
    WHERE offer_id = 1
  ) THEN
    RAISE EXCEPTION 'LM54B: unexpected rows in offer_attribute_option_values for offer 1' USING ERRCODE = 'check_violation';
  END IF;
END $$;

-- 2. INSERT/UPDATE ATTRIBUTE DEFINITIONS (load_capacity is shared with 50AB and intentionally NOT listed here)
INSERT INTO public.attribute_definitions (stable_key, data_type, is_active) VALUES
  ('lifting_height', 'number', true),
  ('drive_type', 'enum', true),
  ('mast_type', 'enum', true)
ON CONFLICT (stable_key) DO UPDATE SET
  data_type = EXCLUDED.data_type,
  is_active = EXCLUDED.is_active;

-- 3. INSERT/UPDATE ATTRIBUTE TRANSLATIONS (3 new attributes x 7 locales)
INSERT INTO public.attribute_definition_translations (attribute_definition_id, locale, name, short_label, description)
SELECT ad.id, t.locale, t.name, t.short_label, NULL::text
FROM (
  VALUES
    ('lifting_height', 'pl', 'Wysokość podnoszenia', 'Wysokość podnoszenia'),
    ('lifting_height', 'en', 'Lifting height', 'Lifting height'),
    ('lifting_height', 'de', 'Hubhöhe', 'Hubhöhe'),
    ('lifting_height', 'fr', 'Hauteur de levage', 'Hauteur de levage'),
    ('lifting_height', 'uk', 'Висота підйому', 'Висота підйому'),
    ('lifting_height', 'es', 'Altura de elevación', 'Altura de elevación'),
    ('lifting_height', 'zh', '起升高度', '起升高度'),

    ('drive_type', 'pl', 'Rodzaj napędu', 'Rodzaj napędu'),
    ('drive_type', 'en', 'Drive type', 'Drive type'),
    ('drive_type', 'de', 'Antriebsart', 'Antriebsart'),
    ('drive_type', 'fr', 'Type de propulsion', 'Type de propulsion'),
    ('drive_type', 'uk', 'Тип приводу', 'Тип приводу'),
    ('drive_type', 'es', 'Tipo de accionamiento', 'Tipo de accionamiento'),
    ('drive_type', 'zh', '驱动方式', '驱动方式'),

    ('mast_type', 'pl', 'Typ masztu', 'Typ masztu'),
    ('mast_type', 'en', 'Mast type', 'Mast type'),
    ('mast_type', 'de', 'Masttyp', 'Masttyp'),
    ('mast_type', 'fr', 'Type de mât', 'Type de mât'),
    ('mast_type', 'uk', 'Тип щогли', 'Тип щогли'),
    ('mast_type', 'es', 'Tipo de mástil', 'Tipo de mástil'),
    ('mast_type', 'zh', '门架类型', '门架类型')
) t(stable_key, locale, name, short_label)
JOIN public.attribute_definitions ad ON ad.stable_key = t.stable_key
ON CONFLICT (attribute_definition_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  short_label = EXCLUDED.short_label,
  description = NULL;

-- 4. INSERT/UPDATE CONTROLLED OPTIONS FOR enum attributes
INSERT INTO public.controlled_option_values (attribute_id, stable_key, is_active)
SELECT ad.id, opt.stable_key, true
FROM (
  VALUES
    ('drive_type', 'electric'),
    ('mast_type', 'triplex')
) opt(attr_key, stable_key)
JOIN public.attribute_definitions ad ON ad.stable_key = opt.attr_key
ON CONFLICT (attribute_id, stable_key) DO UPDATE SET
  is_active = EXCLUDED.is_active;

-- 5. INSERT/UPDATE CONTROLLED OPTION VALUE TRANSLATIONS (2 options x 7 locales)
INSERT INTO public.controlled_option_value_translations (controlled_option_value_id, locale, label, description)
SELECT cov.id, t.locale, t.label, NULL::text
FROM (
  VALUES
    ('drive_type', 'electric', 'pl', 'Elektryczny'),
    ('drive_type', 'electric', 'en', 'Electric'),
    ('drive_type', 'electric', 'de', 'Elektrisch'),
    ('drive_type', 'electric', 'fr', 'Électrique'),
    ('drive_type', 'electric', 'uk', 'Електричний'),
    ('drive_type', 'electric', 'es', 'Eléctrico'),
    ('drive_type', 'electric', 'zh', '电动'),

    ('mast_type', 'triplex', 'pl', 'Triplex'),
    ('mast_type', 'triplex', 'en', 'Triplex'),
    ('mast_type', 'triplex', 'de', 'Triplex'),
    ('mast_type', 'triplex', 'fr', 'Triplex'),
    ('mast_type', 'triplex', 'uk', 'Triplex'),
    ('mast_type', 'triplex', 'es', 'Triplex'),
    ('mast_type', 'triplex', 'zh', 'Triplex')
) t(attr_key, opt_key, locale, label)
JOIN public.attribute_definitions ad ON ad.stable_key = t.attr_key
JOIN public.controlled_option_values cov ON cov.attribute_id = ad.id AND cov.stable_key = t.opt_key
ON CONFLICT (controlled_option_value_id, locale) DO UPDATE SET
  label = EXCLUDED.label,
  description = NULL;

-- 6. INSERT/UPDATE CATEGORY ATTRIBUTE ASSIGNMENTS (category resolved by slug, id guarded to 21 in pre-assertions)
INSERT INTO public.category_attribute_assignments (category_id, attribute_definition_id, sort_order, is_filterable, is_comparable, is_required, is_visible, unit_code)
SELECT cat.id, ad.id, assign.sort_order, assign.is_filterable, assign.is_comparable, assign.is_required, assign.is_visible, assign.unit_code
FROM (
  VALUES
    ('load_capacity', 10, true, true, false, true, 'kg'),
    ('lifting_height', 20, true, true, false, true, 'mm'),
    ('drive_type', 30, true, true, false, true, NULL::varchar),
    ('mast_type', 40, true, true, false, true, NULL::varchar)
) assign(stable_key, sort_order, is_filterable, is_comparable, is_required, is_visible, unit_code)
CROSS JOIN (SELECT id FROM public.categories WHERE slug = 'wozki-widlowe-elektryczne') cat
JOIN public.attribute_definitions ad ON ad.stable_key = assign.stable_key
ON CONFLICT (category_id, attribute_definition_id) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  is_filterable = EXCLUDED.is_filterable,
  is_comparable = EXCLUDED.is_comparable,
  is_required = EXCLUDED.is_required,
  is_visible = EXCLUDED.is_visible,
  unit_code = EXCLUDED.unit_code;

-- 7. BACKFILL OFFER 1 VALUES WITHOUT ADVANCING SEQUENCES IF ALREADY PRESENT
INSERT INTO public.offer_attribute_values (offer_id, attribute_id, value_number, value_text, value_boolean, value_date, value_year, option_id)
SELECT 1, ad.id, m.value_number, NULL::text, NULL::boolean, NULL::timestamp with time zone, NULL::integer, opt.id
FROM (
  VALUES
    ('load_capacity', 1500::numeric, NULL::text),
    ('lifting_height', 4500::numeric, NULL::text),
    ('drive_type', NULL::numeric, 'electric'),
    ('mast_type', NULL::numeric, 'triplex')
) m(attribute_key, value_number, option_key)
JOIN public.attribute_definitions ad ON ad.stable_key = m.attribute_key
LEFT JOIN public.controlled_option_values opt ON opt.attribute_id = ad.id AND opt.stable_key = m.option_key
LEFT JOIN public.offer_attribute_values existing ON existing.offer_id = 1 AND existing.attribute_id = ad.id
WHERE existing.id IS NULL
ON CONFLICT (offer_id, attribute_id) DO NOTHING;

-- 8. POST-ASSERTIONS
DO $$
DECLARE
  new_attribute_keys text[] := ARRAY['lifting_height', 'drive_type', 'mast_type'];
  v_category_id bigint;
  actual_adt_count integer;
  actual_cov_count integer;
  actual_covt_count integer;
  non_null_desc_count integer;
BEGIN
  SELECT id INTO v_category_id FROM public.categories WHERE slug = 'wozki-widlowe-elektryczne';

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
    RAISE EXCEPTION 'LM54B post-check: attribute definitions mismatch (expected load_capacity/lifting_height number, drive_type/mast_type enum, all active)' USING ERRCODE = 'check_violation';
  END IF;

  -- Count translations for the 3 new attributes (3 * 7 = 21)
  SELECT count(*) INTO actual_adt_count
  FROM public.attribute_definition_translations adt
  JOIN public.attribute_definitions ad ON ad.id = adt.attribute_definition_id
  WHERE ad.stable_key = ANY(new_attribute_keys);
  IF actual_adt_count <> 21 THEN
    RAISE EXCEPTION 'LM54B post-check: expected 21 attribute translations, got %', actual_adt_count USING ERRCODE = 'check_violation';
  END IF;

  -- Verify no empty labels and no fallback names equal to stable_keys for translations
  IF EXISTS (
    SELECT 1 FROM public.attribute_definition_translations adt
    JOIN public.attribute_definitions ad ON ad.id = adt.attribute_definition_id
    WHERE ad.stable_key = ANY(new_attribute_keys)
      AND (adt.name IS NULL OR adt.name = '' OR adt.name = ad.stable_key OR adt.short_label IS NULL OR adt.short_label = '')
  ) THEN
    RAISE EXCEPTION 'LM54B post-check: translation validation failed (missing name/short_label or equals stable_key)' USING ERRCODE = 'check_violation';
  END IF;

  -- Count options (1 for drive_type + 1 for mast_type = 2)
  SELECT count(*) INTO actual_cov_count
  FROM public.controlled_option_values cov
  JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
  WHERE ad.stable_key = ANY(ARRAY['drive_type', 'mast_type']);
  IF actual_cov_count <> 2 THEN
    RAISE EXCEPTION 'LM54B post-check: expected 2 controlled options, got %', actual_cov_count USING ERRCODE = 'check_violation';
  END IF;

  -- Count option translations (2 options * 7 locales = 14)
  SELECT count(*) INTO actual_covt_count
  FROM public.controlled_option_value_translations covt
  JOIN public.controlled_option_values cov ON cov.id = covt.controlled_option_value_id
  JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
  WHERE ad.stable_key = ANY(ARRAY['drive_type', 'mast_type']);
  IF actual_covt_count <> 14 THEN
    RAISE EXCEPTION 'LM54B post-check: expected 14 option translations, got %', actual_covt_count USING ERRCODE = 'check_violation';
  END IF;

  -- Verify no empty labels for option translations
  IF EXISTS (
    SELECT 1 FROM public.controlled_option_value_translations covt
    JOIN public.controlled_option_values cov ON cov.id = covt.controlled_option_value_id
    JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
    WHERE ad.stable_key = ANY(ARRAY['drive_type', 'mast_type'])
      AND (covt.label IS NULL OR covt.label = '' OR covt.label = cov.stable_key)
  ) THEN
    RAISE EXCEPTION 'LM54B post-check: option translation validation failed (missing label or equals stable_key)' USING ERRCODE = 'check_violation';
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
    RAISE EXCEPTION 'LM54B post-check: description must be NULL for all 54B translations' USING ERRCODE = 'check_violation';
  END IF;

  -- Verify exact 4 assignments for category 21 (set-based drift check)
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
    RAISE EXCEPTION 'LM54B post-check: category attribute assignments mismatch for category 21' USING ERRCODE = 'check_violation';
  END IF;

  -- Set-based verification of exact target OAV values for offer 1 (exactly 4 rows, one slot each)
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
    RAISE EXCEPTION 'LM54B post-check: OAV target rows mismatch or slots violation' USING ERRCODE = 'check_violation';
  END IF;

  -- Verify no OAOV rows for offer 1
  IF EXISTS (
    SELECT 1 FROM public.offer_attribute_option_values
    WHERE offer_id = 1
  ) THEN
    RAISE EXCEPTION 'LM54B post-check: unexpected OAOV rows found' USING ERRCODE = 'check_violation';
  END IF;

  -- Verify offers were not mutated
  IF (SELECT category_id FROM public.offers WHERE id = 1) <> 21 THEN
    RAISE EXCEPTION 'LM54B post-check: offer 1 category_id mutated' USING ERRCODE = 'check_violation';
  END IF;
  IF (SELECT category_id FROM public.offers WHERE id = 8) <> 25 THEN
    RAISE EXCEPTION 'LM54B post-check: offer 8 category_id mutated' USING ERRCODE = 'check_violation';
  END IF;
END $$;

COMMIT;
