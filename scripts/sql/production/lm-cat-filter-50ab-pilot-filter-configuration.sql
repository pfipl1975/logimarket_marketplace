-- LM-CAT-FILTER-50AB. Execute only after approved production preflight.
-- This script configures pilot filters for B2B plastic containers in the category 'pojemniki-plastikowe-euro'.
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
  categories_id_attnum smallint;
  offers_id_attnum smallint;
  offers_category_attnum smallint;
  conflicting_stable_key text;
BEGIN
  IF to_regclass('public.categories') IS NULL OR to_regclass('public.offers') IS NULL THEN
    RAISE EXCEPTION 'LM50AB: legacy categories or offers is missing' USING ERRCODE = 'check_violation';
  END IF;

  SELECT attnum INTO categories_id_attnum
  FROM pg_attribute
  WHERE attrelid = 'public.categories'::regclass AND attname = 'id' AND NOT attisdropped
    AND atttypid = 'int8'::regtype AND attnotnull;
  SELECT attnum INTO offers_id_attnum
  FROM pg_attribute
  WHERE attrelid = 'public.offers'::regclass AND attname = 'id' AND NOT attisdropped
    AND atttypid = 'int8'::regtype AND attnotnull;
  SELECT attnum INTO offers_category_attnum
  FROM pg_attribute
  WHERE attrelid = 'public.offers'::regclass AND attname = 'category_id' AND NOT attisdropped
    AND atttypid = 'int8'::regtype AND attnotnull;

  IF categories_id_attnum IS NULL
     OR (SELECT count(*) FROM pg_constraint WHERE conrelid = 'public.categories'::regclass AND contype = 'p') <> 1
     OR NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conrelid = 'public.categories'::regclass AND contype = 'p' AND conkey = ARRAY[categories_id_attnum]
     ) THEN
    RAISE EXCEPTION 'LM50AB: categories primary key must be exactly (id bigint not null)' USING ERRCODE = 'check_violation';
  END IF;

  IF (SELECT count(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND relname = ANY(target_tables)) <> 7 THEN
    RAISE EXCEPTION 'LM50AB: all seven target runtime tables must exist' USING ERRCODE = 'check_violation';
  END IF;

  -- Verify unique leaf category existence for slug
  IF (SELECT count(*) FROM public.categories WHERE slug = 'pojemniki-plastikowe-euro') <> 1 THEN
    RAISE EXCEPTION 'LM50AB: category pojemniki-plastikowe-euro must exist and be unique' USING ERRCODE = 'check_violation';
  END IF;

  -- SEMANTIC CONFLICT GUARDS
  -- Check for existing stable_keys with mismatched data_type
  SELECT stable_key INTO conflicting_stable_key
  FROM public.attribute_definitions
  WHERE (stable_key = 'external_length' AND data_type <> 'number')
     OR (stable_key = 'external_width' AND data_type <> 'number')
     OR (stable_key = 'external_height' AND data_type <> 'number')
     OR (stable_key = 'capacity' AND data_type <> 'number')
     OR (stable_key = 'material' AND data_type <> 'enum')
     OR (stable_key = 'esd_protection' AND data_type <> 'boolean')
     OR (stable_key = 'load_capacity' AND data_type <> 'number')
     OR (stable_key = 'stackable' AND data_type <> 'boolean');

  IF conflicting_stable_key IS NOT NULL THEN
    RAISE EXCEPTION 'LM50AB: semantic conflict for attribute % - data_type mismatch', conflicting_stable_key USING ERRCODE = 'check_violation';
  END IF;

  -- Check for assignment unit_code mismatches
  SELECT a.stable_key INTO conflicting_stable_key
  FROM public.category_attribute_assignments caa
  JOIN public.attribute_definitions a ON a.id = caa.attribute_definition_id
  JOIN public.categories c ON c.id = caa.category_id
  WHERE c.slug = 'pojemniki-plastikowe-euro'
    AND (
      (a.stable_key = 'external_length' AND caa.unit_code <> 'mm') OR
      (a.stable_key = 'external_width' AND caa.unit_code <> 'mm') OR
      (a.stable_key = 'external_height' AND caa.unit_code <> 'mm') OR
      (a.stable_key = 'capacity' AND caa.unit_code <> 'l') OR
      (a.stable_key = 'load_capacity' AND caa.unit_code <> 'kg') OR
      (a.stable_key IN ('material', 'esd_protection', 'stackable') AND caa.unit_code IS NOT NULL)
    );

  IF conflicting_stable_key IS NOT NULL THEN
    RAISE EXCEPTION 'LM50AB: semantic conflict for assignment of % - unit_code mismatch', conflicting_stable_key USING ERRCODE = 'check_violation';
  END IF;

  -- Check if controlled option stable_keys are used by different attributes
  SELECT co.stable_key INTO conflicting_stable_key
  FROM public.controlled_option_values co
  JOIN public.attribute_definitions ad ON ad.id = co.attribute_id
  WHERE co.stable_key IN ('pp', 'hdpe') AND ad.stable_key <> 'material';

  IF conflicting_stable_key IS NOT NULL THEN
    RAISE EXCEPTION 'LM50AB: controlled option % is used by a different attribute', conflicting_stable_key USING ERRCODE = 'check_violation';
  END IF;
END $$;

-- 2. INSERT/UPDATE ATTRIBUTE DEFINITIONS
INSERT INTO public.attribute_definitions (stable_key, data_type, is_active) VALUES
  ('external_length', 'number', true),
  ('external_width', 'number', true),
  ('external_height', 'number', true),
  ('capacity', 'number', true),
  ('material', 'enum', true),
  ('esd_protection', 'boolean', true),
  ('load_capacity', 'number', true),
  ('stackable', 'boolean', true)
ON CONFLICT (stable_key) DO UPDATE SET
  data_type = EXCLUDED.data_type,
  is_active = EXCLUDED.is_active;

-- 3. INSERT/UPDATE ATTRIBUTE TRANSLATIONS
INSERT INTO public.attribute_definition_translations (attribute_definition_id, locale, name, short_label, description)
SELECT ad.id, t.locale, t.name, t.short_label, NULL::text
FROM (
  VALUES
    ('external_length', 'pl', 'Długość zewnętrzna', 'Dł. zewn.'),
    ('external_length', 'en', 'External length', 'Ext. length'),
    ('external_length', 'de', 'Außenlänge', 'Außenlänge'),
    ('external_length', 'fr', 'Longueur extérieure', 'Long. ext.'),
    ('external_length', 'uk', 'Зовнішня довжина', 'Зовн. довжина'),
    ('external_length', 'es', 'Longitud externa', 'Long. ext.'),
    ('external_length', 'zh', '外长', '外长'),

    ('external_width', 'pl', 'Szerokość zewnętrzna', 'Szer. zewn.'),
    ('external_width', 'en', 'External width', 'Ext. width'),
    ('external_width', 'de', 'Außenbreite', 'Außenbreite'),
    ('external_width', 'fr', 'Largeur extérieure', 'Larg. ext.'),
    ('external_width', 'uk', 'Зовнішня ширина', 'Зовн. ширина'),
    ('external_width', 'es', 'Anchura externa', 'Ancho ext.'),
    ('external_width', 'zh', '外宽', '外宽'),

    ('external_height', 'pl', 'Wysokość zewnętrzna', 'Wys. zewn.'),
    ('external_height', 'en', 'External height', 'Ext. height'),
    ('external_height', 'de', 'Außenhöhe', 'Außenhöhe'),
    ('external_height', 'fr', 'Hauteur extérieure', 'Haut. ext.'),
    ('external_height', 'uk', 'Зовнішня висота', 'Зовн. висота'),
    ('external_height', 'es', 'Altura externa', 'Alt. ext.'),
    ('external_height', 'zh', '外高', '外高'),

    ('capacity', 'pl', 'Pojemność', 'Pojemność'),
    ('capacity', 'en', 'Capacity', 'Capacity'),
    ('capacity', 'de', 'Volumen', 'Volumen'),
    ('capacity', 'fr', 'Capacité', 'Capacité'),
    ('capacity', 'uk', 'Місткість', 'Місткість'),
    ('capacity', 'es', 'Capacidad', 'Capacidad'),
    ('capacity', 'zh', '容量', '容量'),

    ('material', 'pl', 'Materiał', 'Materiał'),
    ('material', 'en', 'Material', 'Material'),
    ('material', 'de', 'Material', 'Material'),
    ('material', 'fr', 'Matériau', 'Matériau'),
    ('material', 'uk', 'Матеріал', 'Матеріал'),
    ('material', 'es', 'Material', 'Material'),
    ('material', 'zh', '材质', '材质'),

    ('esd_protection', 'pl', 'Ochrona ESD', 'ESD'),
    ('esd_protection', 'en', 'ESD protection', 'ESD'),
    ('esd_protection', 'de', 'ESD-Schutz', 'ESD'),
    ('esd_protection', 'fr', 'Protection ESD', 'ESD'),
    ('esd_protection', 'uk', 'ESD-захист', 'ESD'),
    ('esd_protection', 'es', 'Protección ESD', 'ESD'),
    ('esd_protection', 'zh', 'ESD防静电', 'ESD'),

    ('load_capacity', 'pl', 'Nośność', 'Nośność'),
    ('load_capacity', 'en', 'Load capacity', 'Load cap.'),
    ('load_capacity', 'de', 'Traglast', 'Traglast'),
    ('load_capacity', 'fr', 'Capacité de charge', 'Cap. charge'),
    ('load_capacity', 'uk', 'Вантажопідйомність', 'Вантажопід.'),
    ('load_capacity', 'es', 'Capacidad de carga', 'Cap. carga'),
    ('load_capacity', 'zh', '承载能力', '承重'),

    ('stackable', 'pl', 'Możliwość sztaplowania', 'Sztaplowanie'),
    ('stackable', 'en', 'Stackable', 'Stackable'),
    ('stackable', 'de', 'Stapelbar', 'Stapelbar'),
    ('stackable', 'fr', 'Empilable', 'Empilable'),
    ('stackable', 'uk', 'Moжливість штабелювання', 'Штабелювання'),
    ('stackable', 'es', 'Apilable', 'Apilable'),
    ('stackable', 'zh', '可堆叠', '可堆叠')
) t(stable_key, locale, name, short_label)
JOIN public.attribute_definitions ad ON ad.stable_key = t.stable_key
ON CONFLICT (attribute_definition_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  short_label = EXCLUDED.short_label,
  description = NULL;

-- 4. INSERT/UPDATE CONTROLLED OPTIONS FOR enum/multi_enum
INSERT INTO public.controlled_option_values (attribute_id, stable_key, is_active)
SELECT ad.id, opt.stable_key, true
FROM (
  VALUES
    ('material', 'pp'),
    ('material', 'hdpe')
) opt(attr_key, stable_key)
JOIN public.attribute_definitions ad ON ad.stable_key = opt.attr_key
ON CONFLICT (attribute_id, stable_key) DO UPDATE SET
  is_active = EXCLUDED.is_active;

-- 5. INSERT/UPDATE CONTROLLED OPTION VALUE TRANSLATIONS
INSERT INTO public.controlled_option_value_translations (controlled_option_value_id, locale, label, description)
SELECT cov.id, t.locale, t.label, NULL::text
FROM (
  VALUES
    ('material', 'pp', 'pl', 'PP (Polipropylen)'),
    ('material', 'pp', 'en', 'PP (Polypropylene)'),
    ('material', 'pp', 'de', 'PP (Polypropylen)'),
    ('material', 'pp', 'fr', 'PP (Polypropylène)'),
    ('material', 'pp', 'uk', 'PP (Поліпропілен)'),
    ('material', 'pp', 'es', 'PP (Polipropileno)'),
    ('material', 'pp', 'zh', 'PP (聚丙烯)'),

    ('material', 'hdpe', 'pl', 'HDPE (Polietylen o wysokiej gęstości)'),
    ('material', 'hdpe', 'en', 'HDPE (High-density polyethylene)'),
    ('material', 'hdpe', 'de', 'HDPE (Polyethylen hoher Dichte)'),
    ('material', 'hdpe', 'fr', 'PEHD (Polyéthylène haute densité)'),
    ('material', 'hdpe', 'uk', 'HDPE (Поліетилен високої щільності)'),
    ('material', 'hdpe', 'es', 'HDPE (Polietileno de alta densidad)'),
    ('material', 'hdpe', 'zh', 'HDPE (高密度聚乙烯)')
) t(attr_key, opt_key, locale, label)
JOIN public.attribute_definitions ad ON ad.stable_key = t.attr_key
JOIN public.controlled_option_values cov ON cov.attribute_id = ad.id AND cov.stable_key = t.opt_key
ON CONFLICT (controlled_option_value_id, locale) DO UPDATE SET
  label = EXCLUDED.label,
  description = NULL;

-- 6. INSERT/UPDATE CATEGORY ATTRIBUTE ASSIGNMENTS
INSERT INTO public.category_attribute_assignments (category_id, attribute_definition_id, sort_order, is_filterable, is_comparable, is_required, is_visible, unit_code)
SELECT cat.id, ad.id, assign.sort_order, assign.is_filterable, assign.is_comparable, assign.is_required, assign.is_visible, assign.unit_code
FROM (
  VALUES
    ('external_length', 10, true, true, true, true, 'mm'),
    ('external_width', 20, true, true, true, true, 'mm'),
    ('external_height', 30, true, true, true, true, 'mm'),
    ('capacity', 40, true, true, true, true, 'l'),
    ('material', 50, true, true, true, true, NULL::varchar),
    ('esd_protection', 60, false, true, false, true, NULL::varchar),
    ('load_capacity', 70, false, true, false, true, 'kg'),
    ('stackable', 80, false, true, false, true, NULL::varchar)
) assign(stable_key, sort_order, is_filterable, is_comparable, is_required, is_visible, unit_code)
CROSS JOIN (SELECT id FROM public.categories WHERE slug = 'pojemniki-plastikowe-euro') cat
JOIN public.attribute_definitions ad ON ad.stable_key = assign.stable_key
ON CONFLICT (category_id, attribute_definition_id) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  is_filterable = EXCLUDED.is_filterable,
  is_comparable = EXCLUDED.is_comparable,
  is_required = EXCLUDED.is_required,
  is_visible = EXCLUDED.is_visible,
  unit_code = EXCLUDED.unit_code;

-- 7. POST-ASSERTIONS
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
  null_desc_count integer;
  non_null_desc_count integer;
BEGIN
  -- Count attributes
  SELECT count(*) INTO actual_ad_count
  FROM public.attribute_definitions
  WHERE stable_key = ANY(pilot_attribute_keys);
  IF actual_ad_count <> 8 THEN
    RAISE EXCEPTION 'LM50AB: expected 8 pilot attributes, got %', actual_ad_count USING ERRCODE = 'check_violation';
  END IF;

  -- Count translations (8 attributes * 7 locales = 56 translations)
  SELECT count(*) INTO actual_adt_count
  FROM public.attribute_definition_translations adt
  JOIN public.attribute_definitions ad ON ad.id = adt.attribute_definition_id
  WHERE ad.stable_key = ANY(pilot_attribute_keys);
  IF actual_adt_count <> 56 THEN
    RAISE EXCEPTION 'LM50AB: expected 56 attribute translations, got %', actual_adt_count USING ERRCODE = 'check_violation';
  END IF;

  -- Verify no empty labels and no fallback names equal to stable_keys for translations
  IF EXISTS (
    SELECT 1 FROM public.attribute_definition_translations adt
    JOIN public.attribute_definitions ad ON ad.id = adt.attribute_definition_id
    WHERE ad.stable_key = ANY(pilot_attribute_keys)
      AND (adt.name IS NULL OR adt.name = '' OR adt.name = ad.stable_key OR adt.short_label IS NULL OR adt.short_label = '')
  ) THEN
    RAISE EXCEPTION 'LM50AB: translation validation failed (missing name/short_label or equals stable_key)' USING ERRCODE = 'check_violation';
  END IF;

  -- Count options (2 option values for material)
  SELECT count(*) INTO actual_cov_count
  FROM public.controlled_option_values cov
  JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
  WHERE ad.stable_key = 'material';
  IF actual_cov_count <> 2 THEN
    RAISE EXCEPTION 'LM50AB: expected 2 controlled options for material, got %', actual_cov_count USING ERRCODE = 'check_violation';
  END IF;

  -- Count option translations (2 options * 7 locales = 14 translations)
  SELECT count(*) INTO actual_covt_count
  FROM public.controlled_option_value_translations covt
  JOIN public.controlled_option_values cov ON cov.id = covt.controlled_option_value_id
  JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
  WHERE ad.stable_key = 'material';
  IF actual_covt_count <> 14 THEN
    RAISE EXCEPTION 'LM50AB: expected 14 option translations, got %', actual_covt_count USING ERRCODE = 'check_violation';
  END IF;

  -- Verify no empty labels for option translations
  IF EXISTS (
    SELECT 1 FROM public.controlled_option_value_translations covt
    JOIN public.controlled_option_values cov ON cov.id = covt.controlled_option_value_id
    JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
    WHERE ad.stable_key = 'material'
      AND (covt.label IS NULL OR covt.label = '' OR covt.label = cov.stable_key)
  ) THEN
    RAISE EXCEPTION 'LM50AB: option translation validation failed (missing label or equals stable_key)' USING ERRCODE = 'check_violation';
  END IF;

  -- Verify description is NULL for all pilot translations
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
    RAISE EXCEPTION 'LM50AB: description must be NULL for all pilot translations' USING ERRCODE = 'check_violation';
  END IF;

  -- Count category assignments (8 assignments)
  SELECT count(*) INTO actual_caa_count
  FROM public.category_attribute_assignments caa
  JOIN public.attribute_definitions ad ON ad.id = caa.attribute_definition_id
  JOIN public.categories c ON c.id = caa.category_id
  WHERE c.slug = 'pojemniki-plastikowe-euro' AND ad.stable_key = ANY(pilot_attribute_keys);
  IF actual_caa_count <> 8 THEN
    RAISE EXCEPTION 'LM50AB: expected 8 category assignments, got %', actual_caa_count USING ERRCODE = 'check_violation';
  END IF;

  -- Verify 5 assignments are filterable and 3 are not
  IF (
    SELECT count(*) FROM public.category_attribute_assignments caa
    JOIN public.attribute_definitions ad ON ad.id = caa.attribute_definition_id
    JOIN public.categories c ON c.id = caa.category_id
    WHERE c.slug = 'pojemniki-plastikowe-euro' AND ad.stable_key = ANY(pilot_attribute_keys) AND caa.is_filterable = true
  ) <> 5 THEN
    RAISE EXCEPTION 'LM50AB: expected 5 filterable assignments' USING ERRCODE = 'check_violation';
  END IF;

  IF (
    SELECT count(*) FROM public.category_attribute_assignments caa
    JOIN public.attribute_definitions ad ON ad.id = caa.attribute_definition_id
    JOIN public.categories c ON c.id = caa.category_id
    WHERE c.slug = 'pojemniki-plastikowe-euro' AND ad.stable_key = ANY(pilot_attribute_keys) AND caa.is_filterable = false
  ) <> 3 THEN
    RAISE EXCEPTION 'LM50AB: expected 3 non-filterable assignments' USING ERRCODE = 'check_violation';
  END IF;

  -- Verify no modifications on offer values tables
  IF EXISTS (SELECT 1 FROM public.offer_attribute_values LIMIT 1) THEN
    RAISE EXCEPTION 'LM50AB: offer_attribute_values must remain empty' USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM public.offer_attribute_option_values LIMIT 1) THEN
    RAISE EXCEPTION 'LM50AB: offer_attribute_option_values must remain empty' USING ERRCODE = 'check_violation';
  END IF;
END $$;

COMMIT;
