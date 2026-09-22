# LM-CAT-FILTER-49C — lean runtime filter schema runbook

## Scope and approval gate

This artefact applies only to the approved production Supabase project `tpjsiutclowwaxlopemn` in `eu-west-1`. The operator must independently verify both values before every production command. Any mismatch is a hard stop.

The forward script creates exactly seven empty runtime tables: `attribute_definitions`, `controlled_option_values`, `offer_attribute_values`, `offer_attribute_option_values`, `attribute_definition_translations`, `category_attribute_assignments`, and `controlled_option_value_translations`.

It deliberately omits import and manifest infrastructure, staging tables, functions, roles, grants, seeds, taxonomy, offer values, and migration history. Do **not** run `scripts/run-lm44-drizzle-migrations.mjs`, the standard Drizzle migration chain, the whole `drizzle/` directory, or Supabase SQL Editor without a separately approved execution procedure. Backups and connection configuration must never be committed to this repository.

## External connection configuration

Prepare `PGSERVICE`, `PGSERVICEFILE`, and (if required) `PGPASSFILE` outside the repository. `PGSERVICE` is a service name, not a database name; every command below passes it as a libpq service connection string.

```powershell
$ErrorActionPreference = 'Stop'
$env:PGSERVICE = 'lm49c-production-approved'
$env:PGSERVICEFILE = 'D:\secure\pg_service.conf'
$env:PGPASSFILE = 'D:\secure\pgpass'
if ([string]::IsNullOrWhiteSpace($env:PGSERVICE) -or -not (Test-Path -LiteralPath $env:PGSERVICEFILE) -or -not (Test-Path -LiteralPath $env:PGPASSFILE)) {
  throw 'Approved external PostgreSQL service configuration is required.'
}
$connection = "service=$env:PGSERVICE"
```

## Mandatory backups outside the repository

Run this only after separate production approval. Stop immediately on any non-zero exit code or terminating PowerShell error.

```powershell
$ErrorActionPreference = 'Stop'
$connection = "service=$env:PGSERVICE"
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupRoot = Join-Path 'D:\secure\logimarket-backups' "lm49c-$stamp"
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
$schemaDump = Join-Path $backupRoot 'schema-before-lm49c.dump'
$fullDump = Join-Path $backupRoot 'full-before-lm49c.dump'

& pg_dump.exe --dbname=$connection --schema-only --format=custom --no-owner --no-privileges --file=$schemaDump
if ($LASTEXITCODE -ne 0) { throw "schema-only pg_dump failed: $LASTEXITCODE" }
& pg_dump.exe --dbname=$connection --format=custom --no-owner --no-privileges --file=$fullDump
if ($LASTEXITCODE -ne 0) { throw "full pg_dump failed: $LASTEXITCODE" }

$hashes = @(Get-FileHash -LiteralPath $schemaDump -Algorithm SHA256; Get-FileHash -LiteralPath $fullDump -Algorithm SHA256)
$hashes | Format-Table Algorithm, Hash, Path | Out-File -LiteralPath (Join-Path $backupRoot 'SHA256.txt') -Encoding utf8 -ErrorAction Stop

& pg_restore.exe --list $schemaDump | Out-Null
if ($LASTEXITCODE -ne 0) { throw "schema pg_restore --list failed: $LASTEXITCODE" }
& pg_restore.exe --list $fullDump | Out-Null
if ($LASTEXITCODE -ne 0) { throw "full pg_restore --list failed: $LASTEXITCODE" }
```

## Approved forward execution

Run from the repository only after backup completion and another manual project-ref/region check. This is the only approved creation path; it is not a Drizzle migration.

```powershell
$ErrorActionPreference = 'Stop'
$connection = "service=$env:PGSERVICE"
$forward = Resolve-Path 'scripts/sql/production/lm-cat-filter-49c-lean-runtime-schema.sql'
& psql.exe -X -v ON_ERROR_STOP=1 -v VERBOSITY=verbose --dbname=$connection --file=$forward
if ($LASTEXITCODE -ne 0) { throw "LM49C forward migration failed: $LASTEXITCODE" }
```

## Mechanical read-only post-forward check

The following self-contained check performs the contract audit itself; it does not delegate constraint comparison to an operator. It verifies seven tables and sequences, eighteen indexes, seven PK, eight UNIQUE, five CHECK, thirteen FK (including mappings/actions/match/deferrability/validation), exact column layouts and defaults, serial ownership, empty targets, absent import infrastructure, and the legacy `categories`/`offers` contract. It performs no mutation and always rolls back.

```powershell
$ErrorActionPreference = 'Stop'
$connection = "service=$env:PGSERVICE"
$postForwardSql = @'
BEGIN TRANSACTION READ ONLY;
DO $$
DECLARE
  tables text[] := ARRAY['attribute_definitions','controlled_option_values','offer_attribute_values','offer_attribute_option_values','attribute_definition_translations','category_attribute_assignments','controlled_option_value_translations'];
  sequences text[] := ARRAY['attribute_definitions_id_seq','controlled_option_values_id_seq','offer_attribute_values_id_seq','offer_attribute_option_values_id_seq','attribute_definition_translations_id_seq','category_attribute_assignments_id_seq','controlled_option_value_translations_id_seq'];
  indexes text[] := ARRAY['attribute_definitions_pkey','controlled_option_values_pkey','offer_attribute_values_pkey','offer_attribute_option_values_pkey','attribute_definition_translations_pkey','category_attribute_assignments_pkey','controlled_option_value_translations_pkey','uq_ad_stable_key','uq_cov_attr_option','uq_cov_attribute_id_pair','uq_oav_offer_attribute','uq_oaov_offer_attribute_option','uq_adt_attribute_locale','uq_caa_category_attribute','uq_covt_option_locale','idx_caa_cat_visible_sort','idx_caa_cat_filterable_sort','idx_caa_attribute'];
  n text; matches integer; cid smallint; offers_id_attnum smallint; ocid smallint;
BEGIN
  IF (SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' AND relname=ANY(tables)) <> 7
     OR (SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='S' AND relname=ANY(sequences)) <> 7
     OR (SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='i' AND relname=ANY(indexes)) <> 18 THEN RAISE EXCEPTION 'LM49C post-forward object contract mismatch'; END IF;
  IF EXISTS (WITH expected(t,c,pos,typ,nn,def) AS (VALUES
    ('attribute_definitions','id',1,'bigint',true,'nextval'),('attribute_definitions','stable_key',2,'text',true,'none'),('attribute_definitions','data_type',3,'character varying(30)',true,'none'),('attribute_definitions','is_active',4,'boolean',true,'true'),('attribute_definitions','created_at',5,'timestamp with time zone',true,'now'),
    ('controlled_option_values','id',1,'bigint',true,'nextval'),('controlled_option_values','attribute_id',2,'bigint',true,'none'),('controlled_option_values','stable_key',3,'text',true,'none'),('controlled_option_values','is_active',4,'boolean',true,'true'),('controlled_option_values','created_at',5,'timestamp with time zone',true,'now'),
    ('offer_attribute_values','id',1,'bigint',true,'nextval'),('offer_attribute_values','offer_id',2,'bigint',true,'none'),('offer_attribute_values','attribute_id',3,'bigint',true,'none'),('offer_attribute_values','value_text',4,'text',false,'none'),('offer_attribute_values','value_number',5,'numeric',false,'none'),('offer_attribute_values','value_boolean',6,'boolean',false,'none'),('offer_attribute_values','value_date',7,'timestamp with time zone',false,'none'),('offer_attribute_values','value_year',8,'integer',false,'none'),('offer_attribute_values','option_id',9,'bigint',false,'none'),('offer_attribute_values','created_at',10,'timestamp with time zone',true,'now'),('offer_attribute_values','updated_at',11,'timestamp with time zone',true,'now'),
    ('offer_attribute_option_values','id',1,'bigint',true,'nextval'),('offer_attribute_option_values','offer_id',2,'bigint',true,'none'),('offer_attribute_option_values','attribute_id',3,'bigint',true,'none'),('offer_attribute_option_values','option_id',4,'bigint',true,'none'),('offer_attribute_option_values','created_at',5,'timestamp with time zone',true,'now'),
    ('attribute_definition_translations','id',1,'bigint',true,'nextval'),('attribute_definition_translations','attribute_definition_id',2,'bigint',true,'none'),('attribute_definition_translations','locale',3,'character varying(10)',true,'none'),('attribute_definition_translations','name',4,'text',true,'none'),('attribute_definition_translations','short_label',5,'character varying(100)',false,'none'),('attribute_definition_translations','description',6,'text',false,'none'),('attribute_definition_translations','created_at',7,'timestamp with time zone',true,'now'),('attribute_definition_translations','updated_at',8,'timestamp with time zone',false,'none'),
    ('category_attribute_assignments','id',1,'bigint',true,'nextval'),('category_attribute_assignments','category_id',2,'bigint',true,'none'),('category_attribute_assignments','attribute_definition_id',3,'bigint',true,'none'),('category_attribute_assignments','sort_order',4,'integer',true,'zero'),('category_attribute_assignments','is_filterable',5,'boolean',true,'false'),('category_attribute_assignments','is_comparable',6,'boolean',true,'false'),('category_attribute_assignments','is_required',7,'boolean',true,'false'),('category_attribute_assignments','is_visible',8,'boolean',true,'true'),('category_attribute_assignments','unit_code',9,'character varying(20)',false,'none'),('category_attribute_assignments','created_at',10,'timestamp with time zone',true,'now'),('category_attribute_assignments','updated_at',11,'timestamp with time zone',false,'none'),
    ('controlled_option_value_translations','id',1,'bigint',true,'nextval'),('controlled_option_value_translations','controlled_option_value_id',2,'bigint',true,'none'),('controlled_option_value_translations','locale',3,'character varying(10)',true,'none'),('controlled_option_value_translations','label',4,'text',true,'none'),('controlled_option_value_translations','description',5,'text',false,'none'),('controlled_option_value_translations','created_at',6,'timestamp with time zone',true,'now'),('controlled_option_value_translations','updated_at',7,'timestamp with time zone',false,'none')), actual AS (
      SELECT t.relname AS t,a.attname AS c,a.attnum AS pos,format_type(a.atttypid,a.atttypmod) AS typ,a.attnotnull AS nn,coalesce(pg_get_expr(d.adbin,d.adrelid),'') AS def FROM pg_class t JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum>0 AND NOT a.attisdropped LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE t.relnamespace='public'::regnamespace AND t.relname=ANY(tables))
    SELECT 1 FROM expected e FULL JOIN actual a ON (e.t,e.c,e.pos)=(a.t,a.c,a.pos) WHERE e.t IS NULL OR a.t IS NULL OR e.typ<>a.typ OR e.nn<>a.nn OR NOT CASE e.def WHEN 'none' THEN a.def='' WHEN 'nextval' THEN a.def LIKE 'nextval(%' WHEN 'now' THEN lower(a.def) LIKE '%now()%' OR lower(a.def) LIKE '%current_timestamp%' WHEN 'true' THEN a.def ~* 'true' WHEN 'false' THEN a.def ~* 'false' WHEN 'zero' THEN a.def ~ '(^|[^0-9])0([^0-9]|$)' END) THEN RAISE EXCEPTION 'LM49C post-forward column/default contract mismatch'; END IF;
  SELECT attnum INTO cid FROM pg_attribute WHERE attrelid='public.categories'::regclass AND attname='id' AND atttypid='int8'::regtype AND attnotnull AND NOT attisdropped; SELECT attnum INTO offers_id_attnum FROM pg_attribute WHERE attrelid='public.offers'::regclass AND attname='id' AND atttypid='int8'::regtype AND attnotnull AND NOT attisdropped; SELECT attnum INTO ocid FROM pg_attribute WHERE attrelid='public.offers'::regclass AND attname='category_id' AND atttypid='int8'::regtype AND attnotnull AND NOT attisdropped;
  IF NOT EXISTS(SELECT 1 FROM pg_class c WHERE c.oid='public.categories'::regclass AND c.relkind='r') OR NOT EXISTS(SELECT 1 FROM pg_class c WHERE c.oid='public.offers'::regclass AND c.relkind='r') OR cid IS NULL OR offers_id_attnum IS NULL OR ocid IS NULL OR (SELECT count(*) FROM pg_constraint WHERE conrelid='public.categories'::regclass AND contype='p' AND conkey=ARRAY[cid])<>1 OR (SELECT count(*) FROM pg_constraint WHERE conrelid='public.offers'::regclass AND contype='p' AND conkey=ARRAY[offers_id_attnum])<>1 OR (SELECT count(*) FROM pg_constraint WHERE conrelid='public.offers'::regclass AND confrelid='public.categories'::regclass AND contype='f' AND conkey=ARRAY[ocid] AND confkey=ARRAY[cid] AND confmatchtype='s' AND confupdtype='a' AND confdeltype='r' AND NOT condeferrable AND NOT condeferred AND convalidated)<>1 THEN RAISE EXCEPTION 'LM49C post-forward legacy contract mismatch'; END IF;
  IF (SELECT count(*) FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid WHERE t.relnamespace='public'::regnamespace AND t.relname=ANY(tables) AND c.contype='p')<>7 OR (SELECT count(*) FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid WHERE t.relnamespace='public'::regnamespace AND t.relname=ANY(tables) AND c.contype='u')<>8 OR (SELECT count(*) FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid WHERE t.relnamespace='public'::regnamespace AND t.relname=ANY(tables) AND c.contype='c')<>5 OR (SELECT count(*) FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid WHERE t.relnamespace='public'::regnamespace AND t.relname=ANY(tables) AND c.contype='f')<>13 THEN RAISE EXCEPTION 'LM49C post-forward constraint type count mismatch'; END IF;
  FOR n IN SELECT * FROM unnest(ARRAY['attribute_definitions_pkey|p|attribute_definitions|id||','controlled_option_values_pkey|p|controlled_option_values|id||','offer_attribute_values_pkey|p|offer_attribute_values|id||','offer_attribute_option_values_pkey|p|offer_attribute_option_values|id||','attribute_definition_translations_pkey|p|attribute_definition_translations|id||','category_attribute_assignments_pkey|p|category_attribute_assignments|id||','controlled_option_value_translations_pkey|p|controlled_option_value_translations|id||','uq_ad_stable_key|u|attribute_definitions|stable_key||','uq_cov_attr_option|u|controlled_option_values|attribute_id,stable_key||','uq_cov_attribute_id_pair|u|controlled_option_values|attribute_id,id||','uq_oav_offer_attribute|u|offer_attribute_values|offer_id,attribute_id||','uq_oaov_offer_attribute_option|u|offer_attribute_option_values|offer_id,attribute_id,option_id||','uq_adt_attribute_locale|u|attribute_definition_translations|attribute_definition_id,locale||','uq_caa_category_attribute|u|category_attribute_assignments|category_id,attribute_definition_id||','uq_covt_option_locale|u|controlled_option_value_translations|controlled_option_value_id,locale||','chk_ad_data_type|c|attribute_definitions|||','chk_oav_value_exclusivity|c|offer_attribute_values|||','chk_adt_locale|c|attribute_definition_translations|||','chk_caa_sort_order|c|category_attribute_assignments|||','chk_covt_locale|c|controlled_option_value_translations|||','fk_cov_attribute|f|controlled_option_values|attribute_id|attribute_definitions|id','fk_oav_offer|f|offer_attribute_values|offer_id|offers|id','fk_oav_attribute|f|offer_attribute_values|attribute_id|attribute_definitions|id','fk_oav_option|f|offer_attribute_values|option_id|controlled_option_values|id','fk_oav_attribute_option_pair|f|offer_attribute_values|attribute_id,option_id|controlled_option_values|attribute_id,id','fk_oaov_offer|f|offer_attribute_option_values|offer_id|offers|id','fk_oaov_attribute|f|offer_attribute_option_values|attribute_id|attribute_definitions|id','fk_oaov_option|f|offer_attribute_option_values|option_id|controlled_option_values|id','fk_oaov_attribute_option_pair|f|offer_attribute_option_values|attribute_id,option_id|controlled_option_values|attribute_id,id','fk_adt_attribute_definition|f|attribute_definition_translations|attribute_definition_id|attribute_definitions|id','fk_caa_category|f|category_attribute_assignments|category_id|categories|id','fk_caa_attribute_definition|f|category_attribute_assignments|attribute_definition_id|attribute_definitions|id','fk_covt_controlled_option_value|f|controlled_option_value_translations|controlled_option_value_id|controlled_option_values|id']) LOOP
    SELECT count(*) INTO matches FROM pg_constraint c JOIN pg_class s ON s.oid=c.conrelid LEFT JOIN pg_class r ON r.oid=c.confrelid WHERE c.convalidated AND c.conname=split_part(n,'|',1) AND c.contype=split_part(n,'|',2) AND s.relnamespace='public'::regnamespace AND s.relname=split_part(n,'|',3) AND (c.contype='c' OR coalesce(array_to_string(ARRAY(SELECT a.attname FROM unnest(c.conkey) WITH ORDINALITY u(x,o) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=u.x ORDER BY u.o),','),'')=split_part(n,'|',4)) AND (c.contype<>'f' OR (r.relnamespace='public'::regnamespace AND r.relname=split_part(n,'|',5) AND array_to_string(ARRAY(SELECT a.attname FROM unnest(c.confkey) WITH ORDINALITY u(x,o) JOIN pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=u.x ORDER BY u.o),',')=split_part(n,'|',6) AND c.confmatchtype='s' AND c.confupdtype='a' AND c.confdeltype='a' AND NOT c.condeferrable AND NOT c.condeferred));
    IF matches<>1 THEN RAISE EXCEPTION 'LM49C post-forward scoped constraint mapping mismatch: %', split_part(n,'|',1); END IF;
  END LOOP;
  FOR n IN SELECT * FROM unnest(ARRAY['attribute_definitions_pkey|attribute_definitions|true|id','controlled_option_values_pkey|controlled_option_values|true|id','offer_attribute_values_pkey|offer_attribute_values|true|id','offer_attribute_option_values_pkey|offer_attribute_option_values|true|id','attribute_definition_translations_pkey|attribute_definition_translations|true|id','category_attribute_assignments_pkey|category_attribute_assignments|true|id','controlled_option_value_translations_pkey|controlled_option_value_translations|true|id','uq_ad_stable_key|attribute_definitions|true|stable_key','uq_cov_attr_option|controlled_option_values|true|attribute_id,stable_key','uq_cov_attribute_id_pair|controlled_option_values|true|attribute_id,id','uq_oav_offer_attribute|offer_attribute_values|true|offer_id,attribute_id','uq_oaov_offer_attribute_option|offer_attribute_option_values|true|offer_id,attribute_id,option_id','uq_adt_attribute_locale|attribute_definition_translations|true|attribute_definition_id,locale','uq_caa_category_attribute|category_attribute_assignments|true|category_id,attribute_definition_id','uq_covt_option_locale|controlled_option_value_translations|true|controlled_option_value_id,locale','idx_caa_cat_visible_sort|category_attribute_assignments|false|category_id,is_visible,sort_order','idx_caa_cat_filterable_sort|category_attribute_assignments|false|category_id,is_filterable,sort_order','idx_caa_attribute|category_attribute_assignments|false|attribute_definition_id']) LOOP
    SELECT count(*) INTO matches FROM pg_index i JOIN pg_class x ON x.oid=i.indexrelid JOIN pg_class t ON t.oid=i.indrelid WHERE x.relnamespace='public'::regnamespace AND x.relname=split_part(n,'|',1) AND t.relnamespace='public'::regnamespace AND t.relname=split_part(n,'|',2) AND i.indisunique=(split_part(n,'|',3))::boolean AND i.indisvalid AND i.indisready AND i.indpred IS NULL AND i.indexprs IS NULL AND array_to_string(ARRAY(SELECT a.attname FROM unnest(i.indkey) WITH ORDINALITY u(x,o) JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=u.x ORDER BY u.o),',')=split_part(n,'|',4);
    IF matches<>1 THEN RAISE EXCEPTION 'LM49C post-forward index contract mismatch: %', split_part(n,'|',1); END IF;
  END LOOP;
  FOREACH n IN ARRAY sequences LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class s JOIN pg_depend d ON d.objid=s.oid AND d.deptype='a' JOIN pg_class t ON t.oid=d.refobjid JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=d.refobjsubid WHERE s.relnamespace='public'::regnamespace AND s.relkind='S' AND s.relname=n AND t.relnamespace='public'::regnamespace AND t.relname=regexp_replace(n,'_id_seq$','') AND a.attname='id' AND to_regclass(pg_get_serial_sequence(format('public.%I',t.relname),'id'))=s.oid) THEN RAISE EXCEPTION 'LM49C post-forward sequence ownership/default mismatch: %', n; END IF;
  END LOOP;
  -- a.attname::text is projected from c.conkey and c.confkey before text[] comparison.
  IF (SELECT count(*) FROM pg_constraint c JOIN pg_class s ON s.oid=c.conrelid JOIN pg_class r ON r.oid=c.confrelid WHERE c.conname IN ('fk_oav_attribute_option_pair','fk_oaov_attribute_option_pair') AND s.relname IN ('offer_attribute_values','offer_attribute_option_values') AND r.relname='controlled_option_values' AND ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY u(x,o) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=u.x ORDER BY u.o)::text[]=ARRAY['attribute_id','option_id']::text[] AND ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY u(x,o) JOIN pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=u.x ORDER BY u.o)::text[]=ARRAY['attribute_id','id']::text[] AND c.convalidated AND c.confmatchtype='s' AND c.confupdtype='a' AND c.confdeltype='a' AND NOT c.condeferrable AND NOT c.condeferred)<>2 THEN RAISE EXCEPTION 'LM49C post-forward composite FK mapping mismatch'; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.attribute_definitions'::regclass AND conname='chk_ad_data_type' AND ARRAY(SELECT x[1] FROM regexp_matches(lower(pg_get_constraintdef(oid)), $rx$'([^']+)'$rx$,'g') x ORDER BY x[1])<>ARRAY['boolean','date','enum','multi_enum','number','text','year']) THEN RAISE EXCEPTION 'LM49C post-forward data type CHECK mismatch'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.offer_attribute_values'::regclass AND conname='chk_oav_value_exclusivity' AND lower(pg_get_constraintdef(oid)) LIKE '%num_nonnulls%' AND lower(pg_get_constraintdef(oid)) LIKE '%value_text%' AND lower(pg_get_constraintdef(oid)) LIKE '%value_number%' AND lower(pg_get_constraintdef(oid)) LIKE '%value_boolean%' AND lower(pg_get_constraintdef(oid)) LIKE '%value_date%' AND lower(pg_get_constraintdef(oid)) LIKE '%value_year%' AND lower(pg_get_constraintdef(oid)) LIKE '%option_id%') OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.category_attribute_assignments'::regclass AND conname='chk_caa_sort_order' AND regexp_replace(lower(pg_get_constraintdef(oid)),'\s+','','g') LIKE '%sort_order>=0%') OR (SELECT count(*) FROM pg_constraint WHERE conrelid IN ('public.attribute_definition_translations'::regclass,'public.controlled_option_value_translations'::regclass) AND conname IN ('chk_adt_locale','chk_covt_locale') AND ARRAY(SELECT x[1] FROM regexp_matches(lower(pg_get_constraintdef(oid)), $rx$'([^']+)'$rx$,'g') x ORDER BY x[1])=ARRAY['de','en','es','fr','pl','uk','zh'])<>2 THEN RAISE EXCEPTION 'LM49C post-forward CHECK semantic mismatch'; END IF;
  FOREACH n IN ARRAY tables LOOP EXECUTE format('SELECT count(*) FROM public.%I',n) INTO matches; IF matches<>0 THEN RAISE EXCEPTION 'LM49C post-forward target table contains data'; END IF; END LOOP;
  IF to_regnamespace('migration_private') IS NOT NULL OR EXISTS(SELECT 1 FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ('migration_batches','migration_source_entries','migration_oav_targets','migration_oaov_targets','migration_rollback_attempts')) THEN RAISE EXCEPTION 'LM49C post-forward forbidden infrastructure exists'; END IF;
END $$;
ROLLBACK;
'@
& psql.exe -X -v ON_ERROR_STOP=1 -v VERBOSITY=verbose --dbname=$connection --command=$postForwardSql
if ($LASTEXITCODE -ne 0) { throw "LM49C read-only post-forward check failed: $LASTEXITCODE" }
```

## Approved rollback and mechanical post-rollback check

Rollback requires separate approval and a controlled write freeze. It is permitted only before any runtime data has been written. It is not a general downgrade and never uses `CASCADE`. The post-rollback command below is a **readability check** of legacy tables; it does not claim byte-for-byte preservation of production data.

```powershell
$ErrorActionPreference = 'Stop'
$connection = "service=$env:PGSERVICE"
$rollback = Resolve-Path 'scripts/sql/production/lm-cat-filter-49c-rollback-empty-schema.sql'
& psql.exe -X -v ON_ERROR_STOP=1 -v VERBOSITY=verbose --dbname=$connection --file=$rollback
if ($LASTEXITCODE -ne 0) { throw "LM49C rollback failed: $LASTEXITCODE" }

$postRollbackSql = @'
BEGIN TRANSACTION READ ONLY;
DO $$
DECLARE cid smallint; offers_id_attnum smallint; ocid smallint;
BEGIN
  IF (SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relname=ANY(ARRAY['attribute_definitions','controlled_option_values','offer_attribute_values','offer_attribute_option_values','attribute_definition_translations','category_attribute_assignments','controlled_option_value_translations']))<>0 OR (SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relname=ANY(ARRAY['attribute_definitions_id_seq','controlled_option_values_id_seq','offer_attribute_values_id_seq','offer_attribute_option_values_id_seq','attribute_definition_translations_id_seq','category_attribute_assignments_id_seq','controlled_option_value_translations_id_seq']))<>0 OR (SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relname=ANY(ARRAY['attribute_definitions_pkey','controlled_option_values_pkey','offer_attribute_values_pkey','offer_attribute_option_values_pkey','attribute_definition_translations_pkey','category_attribute_assignments_pkey','controlled_option_value_translations_pkey','uq_ad_stable_key','uq_cov_attr_option','uq_cov_attribute_id_pair','uq_oav_offer_attribute','uq_oaov_offer_attribute_option','uq_adt_attribute_locale','uq_caa_category_attribute','uq_covt_option_locale','idx_caa_cat_visible_sort','idx_caa_cat_filterable_sort','idx_caa_attribute']))<>0 THEN RAISE EXCEPTION 'LM49C post-rollback object absence mismatch'; END IF;
  SELECT attnum INTO cid FROM pg_attribute WHERE attrelid='public.categories'::regclass AND attname='id' AND atttypid='int8'::regtype AND attnotnull AND NOT attisdropped; SELECT attnum INTO offers_id_attnum FROM pg_attribute WHERE attrelid='public.offers'::regclass AND attname='id' AND atttypid='int8'::regtype AND attnotnull AND NOT attisdropped; SELECT attnum INTO ocid FROM pg_attribute WHERE attrelid='public.offers'::regclass AND attname='category_id' AND atttypid='int8'::regtype AND attnotnull AND NOT attisdropped;
  IF NOT EXISTS(SELECT 1 FROM pg_class c WHERE c.oid='public.categories'::regclass AND c.relkind='r') OR NOT EXISTS(SELECT 1 FROM pg_class c WHERE c.oid='public.offers'::regclass AND c.relkind='r') OR cid IS NULL OR offers_id_attnum IS NULL OR ocid IS NULL OR (SELECT count(*) FROM pg_constraint WHERE conrelid='public.categories'::regclass AND contype='p' AND conkey=ARRAY[cid])<>1 OR (SELECT count(*) FROM pg_constraint WHERE conrelid='public.offers'::regclass AND contype='p' AND conkey=ARRAY[offers_id_attnum])<>1 OR (SELECT count(*) FROM pg_constraint WHERE conrelid='public.offers'::regclass AND confrelid='public.categories'::regclass AND contype='f' AND conkey=ARRAY[ocid] AND confkey=ARRAY[cid] AND confmatchtype='s' AND confupdtype='a' AND confdeltype='r' AND NOT condeferrable AND NOT condeferred AND convalidated)<>1 THEN RAISE EXCEPTION 'LM49C post-rollback legacy contract mismatch'; END IF;
  PERFORM count(*) FROM public.categories;
  PERFORM count(*) FROM public.offers;
END $$;
ROLLBACK;
'@
& psql.exe -X -v ON_ERROR_STOP=1 -v VERBOSITY=verbose --dbname=$connection --command=$postRollbackSql
if ($LASTEXITCODE -ne 0) { throw "LM49C read-only post-rollback check failed: $LASTEXITCODE" }
```

The final count query is an actual control query proving that legacy data remains readable; it deliberately does not claim a fixed production row count.
