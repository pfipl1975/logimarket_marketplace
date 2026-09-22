-- LM-CAT-FILTER-49C. Execute only after separately approved production preflight.
-- This is deliberately not a Drizzle migration and must not be run by the Drizzle chain.
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

DO $$
DECLARE
  target_tables text[] := ARRAY[
    'attribute_definitions', 'controlled_option_values', 'offer_attribute_values',
    'offer_attribute_option_values', 'attribute_definition_translations',
    'category_attribute_assignments', 'controlled_option_value_translations'
  ];
  created_relations text[] := ARRAY[
    'attribute_definitions', 'controlled_option_values', 'offer_attribute_values',
    'offer_attribute_option_values', 'attribute_definition_translations',
    'category_attribute_assignments', 'controlled_option_value_translations',
    'attribute_definitions_id_seq', 'controlled_option_values_id_seq', 'offer_attribute_values_id_seq',
    'offer_attribute_option_values_id_seq', 'attribute_definition_translations_id_seq',
    'category_attribute_assignments_id_seq', 'controlled_option_value_translations_id_seq',
    'attribute_definitions_pkey', 'controlled_option_values_pkey', 'offer_attribute_values_pkey',
    'offer_attribute_option_values_pkey', 'attribute_definition_translations_pkey',
    'category_attribute_assignments_pkey', 'controlled_option_value_translations_pkey',
    'uq_ad_stable_key', 'uq_cov_attr_option', 'uq_cov_attribute_id_pair', 'uq_oav_offer_attribute',
    'uq_oaov_offer_attribute_option', 'uq_adt_attribute_locale', 'uq_caa_category_attribute',
    'uq_covt_option_locale', 'idx_caa_cat_visible_sort', 'idx_caa_cat_filterable_sort', 'idx_caa_attribute'
  ];
  categories_id_attnum smallint;
  offers_id_attnum smallint;
  offers_category_attnum smallint;
BEGIN
  IF to_regnamespace('public') IS NULL THEN
    RAISE EXCEPTION 'LM49C: public schema is missing' USING ERRCODE = 'check_violation';
  END IF;

  IF to_regclass('public.categories') IS NULL THEN
    RAISE EXCEPTION 'LM49C: public.categories is missing' USING ERRCODE = 'check_violation';
  END IF;
  IF to_regclass('public.offers') IS NULL THEN
    RAISE EXCEPTION 'LM49C: public.offers is missing' USING ERRCODE = 'check_violation';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.categories'::regclass AND relkind = 'r') THEN
    RAISE EXCEPTION 'LM49C: public.categories must be an ordinary table' USING ERRCODE = 'check_violation';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.offers'::regclass AND relkind = 'r') THEN
    RAISE EXCEPTION 'LM49C: public.offers must be an ordinary table' USING ERRCODE = 'check_violation';
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
    RAISE EXCEPTION 'LM49C: categories primary key must be exactly (id bigint not null)' USING ERRCODE = 'check_violation';
  END IF;

  IF offers_id_attnum IS NULL
     OR (SELECT count(*) FROM pg_constraint WHERE conrelid = 'public.offers'::regclass AND contype = 'p') <> 1
     OR NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conrelid = 'public.offers'::regclass AND contype = 'p' AND conkey = ARRAY[offers_id_attnum]
     ) THEN
    RAISE EXCEPTION 'LM49C: offers primary key must be exactly (id bigint not null)' USING ERRCODE = 'check_violation';
  END IF;

  IF offers_category_attnum IS NULL OR (
    SELECT count(*)
    FROM pg_constraint fk
    WHERE fk.contype = 'f'
      AND fk.conrelid = 'public.offers'::regclass
      AND fk.confrelid = 'public.categories'::regclass
      AND fk.conkey = ARRAY[offers_category_attnum]
      AND fk.confkey = ARRAY[categories_id_attnum]
      AND fk.confmatchtype = 's'
      AND fk.confupdtype = 'a'
      AND fk.confdeltype = 'r'
      AND NOT fk.condeferrable
      AND NOT fk.condeferred
      AND fk.convalidated
  ) <> 1 THEN
    RAISE EXCEPTION 'LM49C: offers.category_id must have one validated non-deferrable MATCH SIMPLE FK to categories(id) with ON DELETE RESTRICT' USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class
    WHERE relnamespace = 'public'::regnamespace AND relname = ANY(created_relations)
  ) THEN
    RAISE EXCEPTION 'LM49C: a target relation, sequence, or index name already exists' USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class
    WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND relname = ANY(target_tables)
  ) THEN
    RAISE EXCEPTION 'LM49C: a target table already exists' USING ERRCODE = 'check_violation';
  END IF;
END $$;

CREATE TABLE public.attribute_definitions (
  id bigserial PRIMARY KEY,
  stable_key text NOT NULL,
  data_type varchar(30) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_ad_stable_key UNIQUE (stable_key),
  CONSTRAINT chk_ad_data_type CHECK (data_type IN ('text','number','boolean','date','year','enum','multi_enum'))
);

CREATE TABLE public.controlled_option_values (
  id bigserial PRIMARY KEY,
  attribute_id bigint NOT NULL,
  stable_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_cov_attr_option UNIQUE (attribute_id, stable_key),
  CONSTRAINT uq_cov_attribute_id_pair UNIQUE (attribute_id, id),
  CONSTRAINT fk_cov_attribute FOREIGN KEY (attribute_id) REFERENCES public.attribute_definitions(id)
);

CREATE TABLE public.offer_attribute_values (
  id bigserial PRIMARY KEY,
  offer_id bigint NOT NULL,
  attribute_id bigint NOT NULL,
  value_text text,
  value_number numeric,
  value_boolean boolean,
  value_date timestamptz,
  value_year integer,
  option_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_oav_offer_attribute UNIQUE (offer_id, attribute_id),
  CONSTRAINT chk_oav_value_exclusivity CHECK (num_nonnulls(value_text, value_number, value_boolean, value_date, value_year, option_id) = 1),
  CONSTRAINT fk_oav_offer FOREIGN KEY (offer_id) REFERENCES public.offers(id),
  CONSTRAINT fk_oav_attribute FOREIGN KEY (attribute_id) REFERENCES public.attribute_definitions(id),
  CONSTRAINT fk_oav_option FOREIGN KEY (option_id) REFERENCES public.controlled_option_values(id),
  CONSTRAINT fk_oav_attribute_option_pair FOREIGN KEY (attribute_id, option_id) REFERENCES public.controlled_option_values(attribute_id, id)
);

CREATE TABLE public.offer_attribute_option_values (
  id bigserial PRIMARY KEY,
  offer_id bigint NOT NULL,
  attribute_id bigint NOT NULL,
  option_id bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_oaov_offer_attribute_option UNIQUE (offer_id, attribute_id, option_id),
  CONSTRAINT fk_oaov_offer FOREIGN KEY (offer_id) REFERENCES public.offers(id),
  CONSTRAINT fk_oaov_attribute FOREIGN KEY (attribute_id) REFERENCES public.attribute_definitions(id),
  CONSTRAINT fk_oaov_option FOREIGN KEY (option_id) REFERENCES public.controlled_option_values(id),
  CONSTRAINT fk_oaov_attribute_option_pair FOREIGN KEY (attribute_id, option_id) REFERENCES public.controlled_option_values(attribute_id, id)
);

CREATE TABLE public.attribute_definition_translations (
  id bigserial PRIMARY KEY,
  attribute_definition_id bigint NOT NULL,
  locale varchar(10) NOT NULL,
  name text NOT NULL,
  short_label varchar(100),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  CONSTRAINT uq_adt_attribute_locale UNIQUE (attribute_definition_id, locale),
  CONSTRAINT chk_adt_locale CHECK (locale IN ('pl','en','de','fr','uk','es','zh')),
  CONSTRAINT fk_adt_attribute_definition FOREIGN KEY (attribute_definition_id) REFERENCES public.attribute_definitions(id)
);

CREATE TABLE public.category_attribute_assignments (
  id bigserial PRIMARY KEY,
  category_id bigint NOT NULL,
  attribute_definition_id bigint NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_filterable boolean NOT NULL DEFAULT false,
  is_comparable boolean NOT NULL DEFAULT false,
  is_required boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
  unit_code varchar(20),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  CONSTRAINT uq_caa_category_attribute UNIQUE (category_id, attribute_definition_id),
  CONSTRAINT chk_caa_sort_order CHECK (sort_order >= 0),
  CONSTRAINT fk_caa_category FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT fk_caa_attribute_definition FOREIGN KEY (attribute_definition_id) REFERENCES public.attribute_definitions(id)
);
CREATE INDEX idx_caa_cat_visible_sort ON public.category_attribute_assignments(category_id, is_visible, sort_order);
CREATE INDEX idx_caa_cat_filterable_sort ON public.category_attribute_assignments(category_id, is_filterable, sort_order);
CREATE INDEX idx_caa_attribute ON public.category_attribute_assignments(attribute_definition_id);

CREATE TABLE public.controlled_option_value_translations (
  id bigserial PRIMARY KEY,
  controlled_option_value_id bigint NOT NULL,
  locale varchar(10) NOT NULL,
  label text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  CONSTRAINT uq_covt_option_locale UNIQUE (controlled_option_value_id, locale),
  CONSTRAINT chk_covt_locale CHECK (locale IN ('pl','en','de','fr','uk','es','zh')),
  CONSTRAINT fk_covt_controlled_option_value FOREIGN KEY (controlled_option_value_id) REFERENCES public.controlled_option_values(id)
);

DO $$
DECLARE
  target_tables text[] := ARRAY[
    'attribute_definitions', 'controlled_option_values', 'offer_attribute_values',
    'offer_attribute_option_values', 'attribute_definition_translations',
    'category_attribute_assignments', 'controlled_option_value_translations'
  ];
  target_sequences text[] := ARRAY[
    'attribute_definitions_id_seq', 'controlled_option_values_id_seq', 'offer_attribute_values_id_seq',
    'offer_attribute_option_values_id_seq', 'attribute_definition_translations_id_seq',
    'category_attribute_assignments_id_seq', 'controlled_option_value_translations_id_seq'
  ];
  target_indexes text[] := ARRAY[
    'attribute_definitions_pkey', 'controlled_option_values_pkey', 'offer_attribute_values_pkey',
    'offer_attribute_option_values_pkey', 'attribute_definition_translations_pkey',
    'category_attribute_assignments_pkey', 'controlled_option_value_translations_pkey',
    'uq_ad_stable_key', 'uq_cov_attr_option', 'uq_cov_attribute_id_pair', 'uq_oav_offer_attribute',
    'uq_oaov_offer_attribute_option', 'uq_adt_attribute_locale', 'uq_caa_category_attribute',
    'uq_covt_option_locale', 'idx_caa_cat_visible_sort', 'idx_caa_cat_filterable_sort', 'idx_caa_attribute'
  ];
  expected record;
  match_count integer;
  categories_id_attnum smallint;
  offers_id_attnum smallint;
  offers_category_attnum smallint;
  target_name text;
  has_rows boolean;
  default_expr text;
BEGIN
  IF (SELECT count(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND relname = ANY(target_tables)) <> 7 THEN
    RAISE EXCEPTION 'LM49C: post-assertion requires exactly seven target tables' USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    WITH expected(table_name, column_name, ordinal_position, type_name, not_null, default_kind) AS (
      VALUES
      ('attribute_definitions','id',1,'bigint',true,'nextval'),('attribute_definitions','stable_key',2,'text',true,'none'),('attribute_definitions','data_type',3,'character varying(30)',true,'none'),('attribute_definitions','is_active',4,'boolean',true,'true'),('attribute_definitions','created_at',5,'timestamp with time zone',true,'now'),
      ('controlled_option_values','id',1,'bigint',true,'nextval'),('controlled_option_values','attribute_id',2,'bigint',true,'none'),('controlled_option_values','stable_key',3,'text',true,'none'),('controlled_option_values','is_active',4,'boolean',true,'true'),('controlled_option_values','created_at',5,'timestamp with time zone',true,'now'),
      ('offer_attribute_values','id',1,'bigint',true,'nextval'),('offer_attribute_values','offer_id',2,'bigint',true,'none'),('offer_attribute_values','attribute_id',3,'bigint',true,'none'),('offer_attribute_values','value_text',4,'text',false,'none'),('offer_attribute_values','value_number',5,'numeric',false,'none'),('offer_attribute_values','value_boolean',6,'boolean',false,'none'),('offer_attribute_values','value_date',7,'timestamp with time zone',false,'none'),('offer_attribute_values','value_year',8,'integer',false,'none'),('offer_attribute_values','option_id',9,'bigint',false,'none'),('offer_attribute_values','created_at',10,'timestamp with time zone',true,'now'),('offer_attribute_values','updated_at',11,'timestamp with time zone',true,'now'),
      ('offer_attribute_option_values','id',1,'bigint',true,'nextval'),('offer_attribute_option_values','offer_id',2,'bigint',true,'none'),('offer_attribute_option_values','attribute_id',3,'bigint',true,'none'),('offer_attribute_option_values','option_id',4,'bigint',true,'none'),('offer_attribute_option_values','created_at',5,'timestamp with time zone',true,'now'),
      ('attribute_definition_translations','id',1,'bigint',true,'nextval'),('attribute_definition_translations','attribute_definition_id',2,'bigint',true,'none'),('attribute_definition_translations','locale',3,'character varying(10)',true,'none'),('attribute_definition_translations','name',4,'text',true,'none'),('attribute_definition_translations','short_label',5,'character varying(100)',false,'none'),('attribute_definition_translations','description',6,'text',false,'none'),('attribute_definition_translations','created_at',7,'timestamp with time zone',true,'now'),('attribute_definition_translations','updated_at',8,'timestamp with time zone',false,'none'),
      ('category_attribute_assignments','id',1,'bigint',true,'nextval'),('category_attribute_assignments','category_id',2,'bigint',true,'none'),('category_attribute_assignments','attribute_definition_id',3,'bigint',true,'none'),('category_attribute_assignments','sort_order',4,'integer',true,'zero'),('category_attribute_assignments','is_filterable',5,'boolean',true,'false'),('category_attribute_assignments','is_comparable',6,'boolean',true,'false'),('category_attribute_assignments','is_required',7,'boolean',true,'false'),('category_attribute_assignments','is_visible',8,'boolean',true,'true'),('category_attribute_assignments','unit_code',9,'character varying(20)',false,'none'),('category_attribute_assignments','created_at',10,'timestamp with time zone',true,'now'),('category_attribute_assignments','updated_at',11,'timestamp with time zone',false,'none'),
      ('controlled_option_value_translations','id',1,'bigint',true,'nextval'),('controlled_option_value_translations','controlled_option_value_id',2,'bigint',true,'none'),('controlled_option_value_translations','locale',3,'character varying(10)',true,'none'),('controlled_option_value_translations','label',4,'text',true,'none'),('controlled_option_value_translations','description',5,'text',false,'none'),('controlled_option_value_translations','created_at',6,'timestamp with time zone',true,'now'),('controlled_option_value_translations','updated_at',7,'timestamp with time zone',false,'none')
    ), actual AS (
      SELECT c.relname AS table_name, a.attname AS column_name, a.attnum AS ordinal_position,
        format_type(a.atttypid, a.atttypmod) AS type_name, a.attnotnull AS not_null,
        COALESCE(pg_get_expr(d.adbin, d.adrelid), '') AS default_expr
      FROM pg_class c JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
      LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r' AND c.relname = ANY(target_tables)
    )
    SELECT 1 FROM expected e FULL JOIN actual a USING (table_name, column_name, ordinal_position)
    WHERE e.table_name IS NULL OR a.table_name IS NULL
      OR e.type_name <> a.type_name OR e.not_null <> a.not_null
      OR NOT CASE e.default_kind
        WHEN 'none' THEN a.default_expr = ''
        WHEN 'nextval' THEN a.default_expr LIKE 'nextval(%'
        WHEN 'now' THEN position('now()' IN lower(a.default_expr)) > 0 OR position('current_timestamp' IN lower(a.default_expr)) > 0
        WHEN 'true' THEN a.default_expr ~* 'true'
        WHEN 'false' THEN a.default_expr ~* 'false'
        WHEN 'zero' THEN a.default_expr ~* '(^|[^0-9])0([^0-9]|$)'
      END
  ) THEN
    RAISE EXCEPTION 'LM49C: target column contract mismatch' USING ERRCODE = 'check_violation';
  END IF;

  FOR expected IN SELECT * FROM (VALUES
    ('attribute_definitions','attribute_definitions_id_seq'),('controlled_option_values','controlled_option_values_id_seq'),('offer_attribute_values','offer_attribute_values_id_seq'),('offer_attribute_option_values','offer_attribute_option_values_id_seq'),('attribute_definition_translations','attribute_definition_translations_id_seq'),('category_attribute_assignments','category_attribute_assignments_id_seq'),('controlled_option_value_translations','controlled_option_value_translations_id_seq')
  ) AS v(table_name, sequence_name) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class seq JOIN pg_depend dep ON dep.objid = seq.oid AND dep.deptype = 'a'
      JOIN pg_class tbl ON tbl.oid = dep.refobjid AND tbl.relnamespace = 'public'::regnamespace AND tbl.relname = expected.table_name
      JOIN pg_attribute col ON col.attrelid = tbl.oid AND col.attnum = dep.refobjsubid AND col.attname = 'id'
      WHERE seq.relnamespace = 'public'::regnamespace AND seq.relkind = 'S' AND seq.relname = expected.sequence_name
        AND to_regclass(pg_get_serial_sequence(format('public.%I', expected.table_name), 'id')) = seq.oid
    ) THEN
      RAISE EXCEPTION 'LM49C: sequence ownership/default mismatch for %', expected.table_name USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;
  IF (SELECT count(*) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'S' AND relname = ANY(target_sequences)) <> 7 THEN
    RAISE EXCEPTION 'LM49C: post-assertion sequence count mismatch' USING ERRCODE = 'check_violation';
  END IF;

  FOR expected IN SELECT * FROM (VALUES
    ('attribute_definitions_pkey','p','attribute_definitions',ARRAY['id']::text[],NULL::text,NULL::text[]),('controlled_option_values_pkey','p','controlled_option_values',ARRAY['id']::text[],NULL::text,NULL::text[]),('offer_attribute_values_pkey','p','offer_attribute_values',ARRAY['id']::text[],NULL::text,NULL::text[]),('offer_attribute_option_values_pkey','p','offer_attribute_option_values',ARRAY['id']::text[],NULL::text,NULL::text[]),('attribute_definition_translations_pkey','p','attribute_definition_translations',ARRAY['id']::text[],NULL::text,NULL::text[]),('category_attribute_assignments_pkey','p','category_attribute_assignments',ARRAY['id']::text[],NULL::text,NULL::text[]),('controlled_option_value_translations_pkey','p','controlled_option_value_translations',ARRAY['id']::text[],NULL::text,NULL::text[]),
    ('uq_ad_stable_key','u','attribute_definitions',ARRAY['stable_key']::text[],NULL::text,NULL::text[]),('uq_cov_attr_option','u','controlled_option_values',ARRAY['attribute_id','stable_key']::text[],NULL::text,NULL::text[]),('uq_cov_attribute_id_pair','u','controlled_option_values',ARRAY['attribute_id','id']::text[],NULL::text,NULL::text[]),('uq_oav_offer_attribute','u','offer_attribute_values',ARRAY['offer_id','attribute_id']::text[],NULL::text,NULL::text[]),('uq_oaov_offer_attribute_option','u','offer_attribute_option_values',ARRAY['offer_id','attribute_id','option_id']::text[],NULL::text,NULL::text[]),('uq_adt_attribute_locale','u','attribute_definition_translations',ARRAY['attribute_definition_id','locale']::text[],NULL::text,NULL::text[]),('uq_caa_category_attribute','u','category_attribute_assignments',ARRAY['category_id','attribute_definition_id']::text[],NULL::text,NULL::text[]),('uq_covt_option_locale','u','controlled_option_value_translations',ARRAY['controlled_option_value_id','locale']::text[],NULL::text,NULL::text[]),
    ('chk_ad_data_type','c','attribute_definitions',NULL::text[],NULL::text,NULL::text[]),('chk_oav_value_exclusivity','c','offer_attribute_values',NULL::text[],NULL::text,NULL::text[]),('chk_adt_locale','c','attribute_definition_translations',NULL::text[],NULL::text,NULL::text[]),('chk_caa_sort_order','c','category_attribute_assignments',NULL::text[],NULL::text,NULL::text[]),('chk_covt_locale','c','controlled_option_value_translations',NULL::text[],NULL::text,NULL::text[]),
    ('fk_cov_attribute','f','controlled_option_values',ARRAY['attribute_id']::text[],'attribute_definitions',ARRAY['id']::text[]),('fk_oav_offer','f','offer_attribute_values',ARRAY['offer_id']::text[],'offers',ARRAY['id']::text[]),('fk_oav_attribute','f','offer_attribute_values',ARRAY['attribute_id']::text[],'attribute_definitions',ARRAY['id']::text[]),('fk_oav_option','f','offer_attribute_values',ARRAY['option_id']::text[],'controlled_option_values',ARRAY['id']::text[]),('fk_oav_attribute_option_pair','f','offer_attribute_values',ARRAY['attribute_id','option_id']::text[],'controlled_option_values',ARRAY['attribute_id','id']::text[]),('fk_oaov_offer','f','offer_attribute_option_values',ARRAY['offer_id']::text[],'offers',ARRAY['id']::text[]),('fk_oaov_attribute','f','offer_attribute_option_values',ARRAY['attribute_id']::text[],'attribute_definitions',ARRAY['id']::text[]),('fk_oaov_option','f','offer_attribute_option_values',ARRAY['option_id']::text[],'controlled_option_values',ARRAY['id']::text[]),('fk_oaov_attribute_option_pair','f','offer_attribute_option_values',ARRAY['attribute_id','option_id']::text[],'controlled_option_values',ARRAY['attribute_id','id']::text[]),('fk_adt_attribute_definition','f','attribute_definition_translations',ARRAY['attribute_definition_id']::text[],'attribute_definitions',ARRAY['id']::text[]),('fk_caa_category','f','category_attribute_assignments',ARRAY['category_id']::text[],'categories',ARRAY['id']::text[]),('fk_caa_attribute_definition','f','category_attribute_assignments',ARRAY['attribute_definition_id']::text[],'attribute_definitions',ARRAY['id']::text[]),('fk_covt_controlled_option_value','f','controlled_option_value_translations',ARRAY['controlled_option_value_id']::text[],'controlled_option_values',ARRAY['id']::text[])
  ) AS v(constraint_name, constraint_type, source_table, source_columns, referenced_table, referenced_columns) LOOP
    SELECT count(*) INTO match_count
    FROM pg_constraint c JOIN pg_class src ON src.oid = c.conrelid AND src.relnamespace = 'public'::regnamespace
    LEFT JOIN pg_class ref ON ref.oid = c.confrelid AND ref.relnamespace = 'public'::regnamespace
    WHERE c.conname = expected.constraint_name AND c.contype = expected.constraint_type
      AND src.relname = expected.source_table AND c.convalidated
      AND (expected.source_columns IS NULL OR ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY u(attnum, ord) JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = u.attnum ORDER BY u.ord)::text[] = expected.source_columns)
      AND (expected.referenced_table IS NULL OR (ref.relname = expected.referenced_table AND ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY u(attnum, ord) JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = u.attnum ORDER BY u.ord)::text[] = expected.referenced_columns AND c.confmatchtype = 's' AND c.confupdtype = 'a' AND c.confdeltype = 'a' AND NOT c.condeferrable AND NOT c.condeferred));
    IF match_count <> 1 THEN
      RAISE EXCEPTION 'LM49C: scoped constraint contract mismatch for %', expected.constraint_name USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;
  IF (SELECT count(*) FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid WHERE t.relnamespace = 'public'::regnamespace AND t.relname = ANY(target_tables)) <> 33 THEN
    RAISE EXCEPTION 'LM49C: target constraint count mismatch' USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
       SELECT 1
       FROM pg_constraint c
       WHERE c.conrelid = 'public.attribute_definitions'::regclass
         AND c.conname = 'chk_ad_data_type'
         AND c.contype = 'c'
         AND ARRAY(
           SELECT token[1]
           FROM regexp_matches(lower(pg_get_constraintdef(c.oid)), $rx$'([^']+)'$rx$, 'g') AS token
           ORDER BY token[1]
         ) = ARRAY['boolean','date','enum','multi_enum','number','text','year']
     )
     OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.offer_attribute_values'::regclass AND conname = 'chk_oav_value_exclusivity' AND lower(pg_get_constraintdef(oid)) LIKE '%num_nonnulls%' AND lower(pg_get_constraintdef(oid)) LIKE '%value_text%' AND lower(pg_get_constraintdef(oid)) LIKE '%option_id%')
     OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.category_attribute_assignments'::regclass AND conname = 'chk_caa_sort_order' AND lower(pg_get_constraintdef(oid)) LIKE '%sort_order >= 0%')
     OR (SELECT count(*) FROM pg_constraint WHERE conrelid IN ('public.attribute_definition_translations'::regclass, 'public.controlled_option_value_translations'::regclass) AND conname IN ('chk_adt_locale','chk_covt_locale') AND lower(pg_get_constraintdef(oid)) LIKE '%pl%' AND lower(pg_get_constraintdef(oid)) LIKE '%en%' AND lower(pg_get_constraintdef(oid)) LIKE '%de%' AND lower(pg_get_constraintdef(oid)) LIKE '%fr%' AND lower(pg_get_constraintdef(oid)) LIKE '%uk%' AND lower(pg_get_constraintdef(oid)) LIKE '%es%' AND lower(pg_get_constraintdef(oid)) LIKE '%zh%') <> 2 THEN
    RAISE EXCEPTION 'LM49C: check constraint semantic mismatch' USING ERRCODE = 'check_violation';
  END IF;

  FOR expected IN SELECT * FROM (VALUES
    ('attribute_definitions_pkey','attribute_definitions',true,ARRAY['id']::text[]),('controlled_option_values_pkey','controlled_option_values',true,ARRAY['id']::text[]),('offer_attribute_values_pkey','offer_attribute_values',true,ARRAY['id']::text[]),('offer_attribute_option_values_pkey','offer_attribute_option_values',true,ARRAY['id']::text[]),('attribute_definition_translations_pkey','attribute_definition_translations',true,ARRAY['id']::text[]),('category_attribute_assignments_pkey','category_attribute_assignments',true,ARRAY['id']::text[]),('controlled_option_value_translations_pkey','controlled_option_value_translations',true,ARRAY['id']::text[]),
    ('uq_ad_stable_key','attribute_definitions',true,ARRAY['stable_key']::text[]),('uq_cov_attr_option','controlled_option_values',true,ARRAY['attribute_id','stable_key']::text[]),('uq_cov_attribute_id_pair','controlled_option_values',true,ARRAY['attribute_id','id']::text[]),('uq_oav_offer_attribute','offer_attribute_values',true,ARRAY['offer_id','attribute_id']::text[]),('uq_oaov_offer_attribute_option','offer_attribute_option_values',true,ARRAY['offer_id','attribute_id','option_id']::text[]),('uq_adt_attribute_locale','attribute_definition_translations',true,ARRAY['attribute_definition_id','locale']::text[]),('uq_caa_category_attribute','category_attribute_assignments',true,ARRAY['category_id','attribute_definition_id']::text[]),('uq_covt_option_locale','controlled_option_value_translations',true,ARRAY['controlled_option_value_id','locale']::text[]),
    ('idx_caa_cat_visible_sort','category_attribute_assignments',false,ARRAY['category_id','is_visible','sort_order']::text[]),('idx_caa_cat_filterable_sort','category_attribute_assignments',false,ARRAY['category_id','is_filterable','sort_order']::text[]),('idx_caa_attribute','category_attribute_assignments',false,ARRAY['attribute_definition_id']::text[])
  ) AS v(index_name, table_name, is_unique, columns) LOOP
    SELECT count(*) INTO match_count
    FROM pg_index i JOIN pg_class idx ON idx.oid = i.indexrelid AND idx.relnamespace = 'public'::regnamespace
    JOIN pg_class tbl ON tbl.oid = i.indrelid AND tbl.relnamespace = 'public'::regnamespace
    WHERE idx.relname = expected.index_name AND tbl.relname = expected.table_name
      AND i.indisunique = expected.is_unique AND i.indisvalid AND i.indisready AND i.indpred IS NULL AND i.indexprs IS NULL
      AND ARRAY(SELECT a.attname::text FROM unnest(i.indkey) WITH ORDINALITY u(attnum, ord) JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = u.attnum ORDER BY u.ord)::text[] = expected.columns;
    IF match_count <> 1 THEN
      RAISE EXCEPTION 'LM49C: scoped index contract mismatch for %', expected.index_name USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;
  IF (SELECT count(*) FROM pg_index i JOIN pg_class t ON t.oid = i.indrelid WHERE t.relnamespace = 'public'::regnamespace AND t.relname = ANY(target_tables)) <> 18 THEN
    RAISE EXCEPTION 'LM49C: target index count mismatch' USING ERRCODE = 'check_violation';
  END IF;

  IF to_regclass('public.categories') IS NULL OR to_regclass('public.offers') IS NULL
     OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.categories'::regclass AND relkind = 'r')
     OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.offers'::regclass AND relkind = 'r') THEN
    RAISE EXCEPTION 'LM49C: legacy tables changed during migration' USING ERRCODE = 'check_violation';
  END IF;
  SELECT attnum INTO categories_id_attnum FROM pg_attribute WHERE attrelid = 'public.categories'::regclass AND attname = 'id' AND NOT attisdropped AND atttypid = 'int8'::regtype AND attnotnull;
  SELECT attnum INTO offers_id_attnum FROM pg_attribute WHERE attrelid = 'public.offers'::regclass AND attname = 'id' AND NOT attisdropped AND atttypid = 'int8'::regtype AND attnotnull;
  SELECT attnum INTO offers_category_attnum FROM pg_attribute WHERE attrelid = 'public.offers'::regclass AND attname = 'category_id' AND NOT attisdropped AND atttypid = 'int8'::regtype AND attnotnull;
  IF categories_id_attnum IS NULL OR offers_id_attnum IS NULL OR offers_category_attnum IS NULL
     OR (SELECT count(*) FROM pg_constraint WHERE conrelid = 'public.categories'::regclass AND contype = 'p') <> 1
     OR (SELECT count(*) FROM pg_constraint WHERE conrelid = 'public.offers'::regclass AND contype = 'p') <> 1
     OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.categories'::regclass AND contype = 'p' AND conkey = ARRAY[categories_id_attnum])
     OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.offers'::regclass AND contype = 'p' AND conkey = ARRAY[offers_id_attnum])
     OR (SELECT count(*) FROM pg_constraint WHERE conrelid = 'public.offers'::regclass AND contype = 'f' AND confrelid = 'public.categories'::regclass AND conkey = ARRAY[offers_category_attnum] AND confkey = ARRAY[categories_id_attnum] AND confmatchtype = 's' AND confupdtype = 'a' AND confdeltype = 'r' AND NOT condeferrable AND NOT condeferred AND convalidated) <> 1 THEN
    RAISE EXCEPTION 'LM49C: legacy PK/FK contract changed during migration' USING ERRCODE = 'check_violation';
  END IF;

  FOREACH target_name IN ARRAY target_tables LOOP
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I LIMIT 1)', target_name) INTO has_rows;
    IF has_rows THEN RAISE EXCEPTION 'LM49C: target table % is not empty', target_name USING ERRCODE = 'check_violation'; END IF;
  END LOOP;
  IF to_regnamespace('migration_private') IS NOT NULL OR EXISTS (SELECT 1 FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname IN ('migration_batches','migration_source_entries','migration_oav_targets','migration_oaov_targets','migration_rollback_attempts')) THEN
    RAISE EXCEPTION 'LM49C: forbidden import infrastructure exists' USING ERRCODE = 'check_violation';
  END IF;
END $$;

COMMIT;
