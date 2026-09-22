-- LM-CAT-FILTER-50AB rollback.
-- Deletes only the pilot filter configuration for category 'pojemniki-plastikowe-euro'.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

-- 1. PRE-ASSERTIONS
DO $$
DECLARE
  pilot_attribute_keys text[] := ARRAY[
    'external_length', 'external_width', 'external_height', 'capacity',
    'material', 'esd_protection', 'load_capacity', 'stackable'
  ];
  target_tables text[] := ARRAY[
    'attribute_definitions', 'controlled_option_values', 'offer_attribute_values',
    'offer_attribute_option_values', 'attribute_definition_translations',
    'category_attribute_assignments', 'controlled_option_value_translations'
  ];
  categories_id_attnum smallint;
  offers_id_attnum smallint;
  offers_category_attnum smallint;
BEGIN
  IF to_regclass('public.categories') IS NULL OR to_regclass('public.offers') IS NULL THEN
    RAISE EXCEPTION 'LM50AB rollback: legacy categories or offers is missing' USING ERRCODE = 'check_violation';
  END IF;

  SELECT attnum INTO categories_id_attnum FROM pg_attribute WHERE attrelid = 'public.categories'::regclass AND attname = 'id' AND NOT attisdropped AND atttypid = 'int8'::regtype AND attnotnull;
  SELECT attnum INTO offers_id_attnum FROM pg_attribute WHERE attrelid = 'public.offers'::regclass AND attname = 'id' AND NOT attisdropped AND atttypid = 'int8'::regtype AND attnotnull;
  SELECT attnum INTO offers_category_attnum FROM pg_attribute WHERE attrelid = 'public.offers'::regclass AND attname = 'category_id' AND NOT attisdropped AND atttypid = 'int8'::regtype AND attnotnull;

  IF categories_id_attnum IS NULL OR offers_id_attnum IS NULL OR offers_category_attnum IS NULL
     OR (SELECT count(*) FROM pg_constraint WHERE conrelid = 'public.categories'::regclass AND contype = 'p') <> 1
     OR (SELECT count(*) FROM pg_constraint WHERE conrelid = 'public.offers'::regclass AND contype = 'p') <> 1
     OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.categories'::regclass AND contype = 'p' AND conkey = ARRAY[categories_id_attnum])
     OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.offers'::regclass AND contype = 'p' AND conkey = ARRAY[offers_id_attnum])
     OR (SELECT count(*) FROM pg_constraint WHERE contype = 'f' AND conrelid = 'public.offers'::regclass AND confrelid = 'public.categories'::regclass AND conkey = ARRAY[offers_category_attnum] AND confkey = ARRAY[categories_id_attnum] AND confmatchtype = 's' AND confupdtype = 'a' AND confdeltype = 'r' AND NOT condeferrable AND NOT condeferred AND convalidated) <> 1 THEN
    RAISE EXCEPTION 'LM50AB rollback: legacy PK/FK compatibility contract mismatch' USING ERRCODE = 'check_violation';
  END IF;

  IF (SELECT count(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND relname = ANY(target_tables)) <> 7 THEN
    RAISE EXCEPTION 'LM50AB rollback: all seven target runtime tables must exist' USING ERRCODE = 'check_violation';
  END IF;

  -- Verify no offer attribute values reference the pilot attributes
  IF EXISTS (
    SELECT 1 FROM public.offer_attribute_values oav
    JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id
    WHERE ad.stable_key = ANY(pilot_attribute_keys)
  ) THEN
    RAISE EXCEPTION 'LM50AB rollback: cannot rollback because offer_attribute_values exist' USING ERRCODE = 'check_violation';
  END IF;

  -- Verify no offer option values reference the pilot options
  IF EXISTS (
    SELECT 1 FROM public.offer_attribute_option_values oaov
    JOIN public.attribute_definitions ad ON ad.id = oaov.attribute_id
    WHERE ad.stable_key = ANY(pilot_attribute_keys)
  ) THEN
    RAISE EXCEPTION 'LM50AB rollback: cannot rollback because offer_attribute_option_values exist' USING ERRCODE = 'check_violation';
  END IF;

  -- Verify no assignments exist for other categories
  IF EXISTS (
    SELECT 1 FROM public.category_attribute_assignments caa
    JOIN public.attribute_definitions ad ON ad.id = caa.attribute_definition_id
    JOIN public.categories c ON c.id = caa.category_id
    WHERE ad.stable_key = ANY(pilot_attribute_keys) AND c.slug <> 'pojemniki-plastikowe-euro'
  ) THEN
    RAISE EXCEPTION 'LM50AB rollback: assignments exist for a category outside the pilot' USING ERRCODE = 'check_violation';
  END IF;

  -- Verify options are not linked to a different attribute
  IF EXISTS (
    SELECT 1 FROM public.controlled_option_values cov
    JOIN public.attribute_definitions ad ON ad.id = cov.attribute_id
    WHERE cov.stable_key = ANY(ARRAY['pp', 'hdpe']) AND ad.stable_key <> 'material'
  ) THEN
    RAISE EXCEPTION 'LM50AB rollback: options pp/hdpe are used outside the material attribute' USING ERRCODE = 'check_violation';
  END IF;
END $$;

-- 2. DELETE IN SEQUENCE
-- 2.1. category_attribute_assignments
DELETE FROM public.category_attribute_assignments caa
USING public.attribute_definitions ad, public.categories cat
WHERE caa.attribute_definition_id = ad.id
  AND caa.category_id = cat.id
  AND ad.stable_key = ANY(ARRAY['external_length', 'external_width', 'external_height', 'capacity', 'material', 'esd_protection', 'load_capacity', 'stackable'])
  AND cat.slug = 'pojemniki-plastikowe-euro';

-- 2.2. controlled_option_value_translations
DELETE FROM public.controlled_option_value_translations covt
USING public.controlled_option_values cov, public.attribute_definitions ad
WHERE covt.controlled_option_value_id = cov.id
  AND cov.attribute_id = ad.id
  AND ad.stable_key = 'material'
  AND cov.stable_key = ANY(ARRAY['pp', 'hdpe']);

-- 2.3. controlled_option_values
DELETE FROM public.controlled_option_values cov
USING public.attribute_definitions ad
WHERE cov.attribute_id = ad.id
  AND ad.stable_key = 'material'
  AND cov.stable_key = ANY(ARRAY['pp', 'hdpe']);

-- 2.4. attribute_definition_translations
DELETE FROM public.attribute_definition_translations adt
USING public.attribute_definitions ad
WHERE adt.attribute_definition_id = ad.id
  AND ad.stable_key = ANY(ARRAY['external_length', 'external_width', 'external_height', 'capacity', 'material', 'esd_protection', 'load_capacity', 'stackable']);

-- 2.5. attribute_definitions
DELETE FROM public.attribute_definitions
WHERE stable_key = ANY(ARRAY['external_length', 'external_width', 'external_height', 'capacity', 'material', 'esd_protection', 'load_capacity', 'stackable']);

-- 3. POST-ASSERTIONS
DO $$
DECLARE
  pilot_attribute_keys text[] := ARRAY[
    'external_length', 'external_width', 'external_height', 'capacity',
    'material', 'esd_protection', 'load_capacity', 'stackable'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM public.attribute_definitions WHERE stable_key = ANY(pilot_attribute_keys)) THEN
    RAISE EXCEPTION 'LM50AB rollback: some pilot attribute definitions still remain' USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.category_attribute_assignments caa
    JOIN public.categories c ON c.id = caa.category_id
    WHERE c.slug = 'pojemniki-plastikowe-euro'
  ) THEN
    RAISE EXCEPTION 'LM50AB rollback: some assignments still remain' USING ERRCODE = 'check_violation';
  END IF;
END $$;

COMMIT;
