-- LM-CAT-FILTER-49C emergency rollback. Valid only before any runtime data exists.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

DO $$
DECLARE
  target_tables text[] := ARRAY['attribute_definitions','controlled_option_values','offer_attribute_values','offer_attribute_option_values','attribute_definition_translations','category_attribute_assignments','controlled_option_value_translations'];
  target_sequences text[] := ARRAY['attribute_definitions_id_seq','controlled_option_values_id_seq','offer_attribute_values_id_seq','offer_attribute_option_values_id_seq','attribute_definition_translations_id_seq','category_attribute_assignments_id_seq','controlled_option_value_translations_id_seq'];
  target_indexes text[] := ARRAY['attribute_definitions_pkey','controlled_option_values_pkey','offer_attribute_values_pkey','offer_attribute_option_values_pkey','attribute_definition_translations_pkey','category_attribute_assignments_pkey','controlled_option_value_translations_pkey','uq_ad_stable_key','uq_cov_attr_option','uq_cov_attribute_id_pair','uq_oav_offer_attribute','uq_oaov_offer_attribute_option','uq_adt_attribute_locale','uq_caa_category_attribute','uq_covt_option_locale','idx_caa_cat_visible_sort','idx_caa_cat_filterable_sort','idx_caa_attribute'];
  categories_id_attnum smallint;
  offers_id_attnum smallint;
  offers_category_attnum smallint;
  target_name text;
  has_rows boolean;
BEGIN
  IF to_regclass('public.categories') IS NULL OR to_regclass('public.offers') IS NULL THEN
    RAISE EXCEPTION 'LM49C rollback: legacy categories or offers is missing' USING ERRCODE = 'check_violation';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.categories'::regclass AND relkind = 'r')
     OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.offers'::regclass AND relkind = 'r') THEN
    RAISE EXCEPTION 'LM49C rollback: legacy categories and offers must be ordinary tables' USING ERRCODE = 'check_violation';
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
    RAISE EXCEPTION 'LM49C rollback: legacy PK/FK compatibility contract mismatch' USING ERRCODE = 'check_violation';
  END IF;

  IF (SELECT count(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND relname = ANY(target_tables)) <> 7 THEN
    RAISE EXCEPTION 'LM49C rollback: all seven target tables must exist' USING ERRCODE = 'check_violation';
  END IF;
  -- Close the TOCTOU window: no concurrent insert may follow the emptiness guard before DROP.
  LOCK TABLE
    public.attribute_definitions,
    public.controlled_option_values,
    public.offer_attribute_values,
    public.offer_attribute_option_values,
    public.attribute_definition_translations,
    public.category_attribute_assignments,
    public.controlled_option_value_translations
  IN ACCESS EXCLUSIVE MODE;
  IF (SELECT count(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'S' AND relname = ANY(target_sequences)) <> 7 THEN
    RAISE EXCEPTION 'LM49C rollback: all seven target sequences must exist' USING ERRCODE = 'check_violation';
  END IF;
  IF (SELECT count(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'i' AND relname = ANY(target_indexes)) <> 18 THEN
    RAISE EXCEPTION 'LM49C rollback: all eighteen target indexes must exist' USING ERRCODE = 'check_violation';
  END IF;
  FOREACH target_name IN ARRAY target_tables LOOP
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I LIMIT 1)', target_name) INTO has_rows;
    IF has_rows THEN
      RAISE EXCEPTION 'LM49C rollback: target table % is not empty', target_name USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;
END $$;

DROP TABLE public.controlled_option_value_translations;
DROP TABLE public.attribute_definition_translations;
DROP TABLE public.category_attribute_assignments;
DROP TABLE public.offer_attribute_option_values;
DROP TABLE public.offer_attribute_values;
DROP TABLE public.controlled_option_values;
DROP TABLE public.attribute_definitions;

DO $$
DECLARE
  target_tables text[] := ARRAY['attribute_definitions','controlled_option_values','offer_attribute_values','offer_attribute_option_values','attribute_definition_translations','category_attribute_assignments','controlled_option_value_translations'];
  target_sequences text[] := ARRAY['attribute_definitions_id_seq','controlled_option_values_id_seq','offer_attribute_values_id_seq','offer_attribute_option_values_id_seq','attribute_definition_translations_id_seq','category_attribute_assignments_id_seq','controlled_option_value_translations_id_seq'];
  target_indexes text[] := ARRAY['attribute_definitions_pkey','controlled_option_values_pkey','offer_attribute_values_pkey','offer_attribute_option_values_pkey','attribute_definition_translations_pkey','category_attribute_assignments_pkey','controlled_option_value_translations_pkey','uq_ad_stable_key','uq_cov_attr_option','uq_cov_attribute_id_pair','uq_oav_offer_attribute','uq_oaov_offer_attribute_option','uq_adt_attribute_locale','uq_caa_category_attribute','uq_covt_option_locale','idx_caa_cat_visible_sort','idx_caa_cat_filterable_sort','idx_caa_attribute'];
  categories_id_attnum smallint;
  offers_id_attnum smallint;
  offers_category_attnum smallint;
BEGIN
  IF to_regclass('public.categories') IS NULL OR to_regclass('public.offers') IS NULL THEN
    RAISE EXCEPTION 'LM49C rollback: legacy categories or offers disappeared' USING ERRCODE = 'check_violation';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.categories'::regclass AND relkind = 'r')
     OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.offers'::regclass AND relkind = 'r') THEN
    RAISE EXCEPTION 'LM49C rollback: legacy categories and offers must remain ordinary tables' USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname = ANY(target_tables))
     OR EXISTS (SELECT 1 FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname = ANY(target_sequences))
     OR EXISTS (SELECT 1 FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname = ANY(target_indexes)) THEN
    RAISE EXCEPTION 'LM49C rollback: lean table, sequence, or index remains' USING ERRCODE = 'check_violation';
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
    RAISE EXCEPTION 'LM49C rollback: legacy PK/FK changed' USING ERRCODE = 'check_violation';
  END IF;
END $$;

COMMIT;
