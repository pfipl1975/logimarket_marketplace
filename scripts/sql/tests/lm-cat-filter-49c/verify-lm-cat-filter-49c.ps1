[CmdletBinding()]
param()

# Disposable PostgreSQL verification for LM-CAT-FILTER-49C. It never contacts Supabase.
$ErrorActionPreference = 'Stop'

function Assert-That {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw $Message }
}

$root = Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')
$forward = Join-Path $root 'scripts/sql/production/lm-cat-filter-49c-lean-runtime-schema.sql'
$rollback = Join-Path $root 'scripts/sql/production/lm-cat-filter-49c-rollback-empty-schema.sql'
$fixture = Join-Path $PSScriptRoot 'legacy-compatible.sql'
$readme = Join-Path $root 'scripts/sql/production/README-lm-cat-filter-49c.md'
$bin = @($env:LM_PG_BIN, 'C:\tools\PostgreSQL17\pgsql\bin') |
  Where-Object { $_ } |
  Where-Object { Test-Path (Join-Path $_ 'initdb.exe') } |
  Select-Object -First 1
Assert-That ($null -ne $bin) 'PostgreSQL initdb.exe unavailable'

$tmp = Join-Path $env:TEMP ('lm49c-lean-' + [guid]::NewGuid().ToString('N'))
$data = Join-Path $tmp 'data'
$serverLog = Join-Path $tmp 'postgres.log'
$results = @()
$started = $false

$targets = @(
  'attribute_definitions', 'controlled_option_values', 'offer_attribute_values',
  'offer_attribute_option_values', 'attribute_definition_translations',
  'category_attribute_assignments', 'controlled_option_value_translations'
)
$sequences = @(
  'attribute_definitions_id_seq', 'controlled_option_values_id_seq', 'offer_attribute_values_id_seq',
  'offer_attribute_option_values_id_seq', 'attribute_definition_translations_id_seq',
  'category_attribute_assignments_id_seq', 'controlled_option_value_translations_id_seq'
)
$indexes = @(
  'attribute_definitions_pkey', 'controlled_option_values_pkey', 'offer_attribute_values_pkey',
  'offer_attribute_option_values_pkey', 'attribute_definition_translations_pkey',
  'category_attribute_assignments_pkey', 'controlled_option_value_translations_pkey',
  'uq_ad_stable_key', 'uq_cov_attr_option', 'uq_cov_attribute_id_pair', 'uq_oav_offer_attribute',
  'uq_oaov_offer_attribute_option', 'uq_adt_attribute_locale', 'uq_caa_category_attribute',
  'uq_covt_option_locale', 'idx_caa_cat_visible_sort', 'idx_caa_cat_filterable_sort', 'idx_caa_attribute'
)

function Get-FreeLocalPort {
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
  try {
    $listener.Start()
    return ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
  } finally {
    $listener.Stop()
  }
}

$port = Get-FreeLocalPort

function Invoke-Psql {
  param(
    [string]$Database,
    [string]$Sql,
    [string]$File,
    [bool]$ExpectSuccess = $true
  )

  $oldPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $arguments = @(
      '-X', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose',
      '-h', '127.0.0.1', '-p', $port, '-U', 'postgres', '-d', $Database
    )
    if ($File) { $arguments += @('-f', $File) } else { $arguments += @('-c', $Sql) }
    $output = & (Join-Path $bin 'psql.exe') @arguments 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $oldPreference
  }

  $result = [pscustomobject]@{
    ExitCode = $exitCode
    Output = ($output | Out-String)
  }
  if ($ExpectSuccess -and $result.ExitCode -ne 0) {
    throw "psql failed: $($result.Output)"
  }
  if (-not $ExpectSuccess -and $result.ExitCode -eq 0) {
    throw 'expected SQL failure but psql exited 0'
  }
  return $result
}

function Expect-SqlState {
  param([scriptblock]$Operation, [string]$SqlState, [string]$Message)
  $failure = & $Operation
  Assert-That ($failure.ExitCode -ne 0) "${Message}: expected a failing psql invocation"
  Assert-That ($failure.Output -match ("(?m)\b" + [regex]::Escape($SqlState) + '\b')) "${Message}: expected SQLSTATE $SqlState, actual output: $($failure.Output)"
}

function Expect-FailureMessage {
  param([scriptblock]$Operation, [string]$Pattern, [string]$Message)
  $failure = & $Operation
  Assert-That ($failure.ExitCode -ne 0) "${Message}: expected a failing psql invocation"
  Assert-That ($failure.Output -match $Pattern) "${Message}: expected message pattern $Pattern, actual output: $($failure.Output)"
}

function Get-ReadmeHereStringSql {
  param([string]$VariableName)
  $content = Get-Content -LiteralPath $readme -Raw
  $pattern = "(?ms)^\`$" + [regex]::Escape($VariableName) + "\s*=\s*@'\r?\n(.*?)\r?\n'@"
  $matches = [regex]::Matches($content, $pattern)
  Assert-That ($matches.Count -eq 1) "README must contain exactly one here-string for `$$VariableName; found $($matches.Count)"
  return $matches[0].Groups[1].Value
}

function New-Database {
  param([string]$CaseId)
  $database = 'lm49c_' + $CaseId.ToLowerInvariant() + '_' + [guid]::NewGuid().ToString('N').Substring(0, 8)
  Invoke-Psql -Database 'postgres' -Sql "CREATE DATABASE $database" -File $null | Out-Null
  Invoke-Psql -Database $database -Sql $null -File $fixture | Out-Null
  return $database
}

function New-MinimalDatabase {
  param([string]$CaseId, [string]$SchemaSql)
  $database = 'lm49c_' + $CaseId.ToLowerInvariant() + '_' + [guid]::NewGuid().ToString('N').Substring(0, 8)
  Invoke-Psql -Database 'postgres' -Sql "CREATE DATABASE $database" -File $null | Out-Null
  Invoke-Psql -Database $database -Sql $SchemaSql -File $null | Out-Null
  return $database
}

function New-SeededDomain {
  param([string]$CaseId)
  $database = New-Database $CaseId
  Invoke-Psql -Database $database -Sql $null -File $forward | Out-Null
  Invoke-Psql -Database $database -Sql @"
INSERT INTO public.attribute_definitions (id, stable_key, data_type)
VALUES (1, 'enum_a', 'enum'), (2, 'enum_b', 'enum'), (3, 'scalar', 'number');
INSERT INTO public.controlled_option_values (id, attribute_id, stable_key)
VALUES (10, 1, 'x'), (20, 2, 'y');
"@ -File $null | Out-Null
  return $database
}

function Get-Scalar {
  param([string]$Database, [string]$Sql)
  return (Invoke-Psql -Database $Database -Sql $Sql -File $null).Output.Trim()
}

function Assert-NoLeanObjects {
  param([string]$Database, [string]$Message)
  $targetList = ($targets | ForEach-Object { "'$_'" }) -join ','
  $sequenceList = ($sequences | ForEach-Object { "'$_'" }) -join ','
  $indexList = ($indexes | ForEach-Object { "'$_'" }) -join ','
  Assert-That ((Get-Scalar $Database "SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ($targetList)") -eq '0') "${Message}: target relation remains"
  Assert-That ((Get-Scalar $Database "SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ($sequenceList)") -eq '0') "${Message}: target sequence remains"
  Assert-That ((Get-Scalar $Database "SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ($indexList)") -eq '0') "${Message}: lean index remains"
}

function Assert-AllTargetTables {
  param([string]$Database, [string]$Message)
  $targetList = ($targets | ForEach-Object { "'$_'" }) -join ','
  Assert-That ((Get-Scalar $Database "SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' AND relname IN ($targetList)") -eq '7') "${Message}: expected seven target tables"
}

function Assert-LegacyCategoryFkContract {
  param([string]$Database, [string]$Message)
  $sql = @"
WITH attrs AS (
  SELECT
    (SELECT attnum FROM pg_attribute WHERE attrelid='public.categories'::regclass AND attname='id' AND NOT attisdropped AND atttypid='int8'::regtype AND attnotnull) AS category_id_attnum,
    (SELECT attnum FROM pg_attribute WHERE attrelid='public.offers'::regclass AND attname='id' AND NOT attisdropped AND atttypid='int8'::regtype AND attnotnull) AS offer_id_attnum,
    (SELECT attnum FROM pg_attribute WHERE attrelid='public.offers'::regclass AND attname='category_id' AND NOT attisdropped AND atttypid='int8'::regtype AND attnotnull) AS offer_category_attnum
)
SELECT
  (SELECT relkind='r' FROM pg_class WHERE oid='public.categories'::regclass)
  AND (SELECT relkind='r' FROM pg_class WHERE oid='public.offers'::regclass)
  AND (SELECT count(*) FROM pg_constraint WHERE conrelid='public.categories'::regclass AND contype='p')=1
  AND (SELECT count(*) FROM pg_constraint WHERE conrelid='public.offers'::regclass AND contype='p')=1
  AND EXISTS (SELECT 1 FROM pg_constraint c, attrs WHERE c.conrelid='public.categories'::regclass AND c.contype='p' AND c.conkey=ARRAY[attrs.category_id_attnum])
  AND EXISTS (SELECT 1 FROM pg_constraint c, attrs WHERE c.conrelid='public.offers'::regclass AND c.contype='p' AND c.conkey=ARRAY[attrs.offer_id_attnum])
  AND (SELECT count(*) FROM pg_constraint c, attrs WHERE c.contype='f' AND c.conrelid='public.offers'::regclass AND c.confrelid='public.categories'::regclass AND c.conkey=ARRAY[attrs.offer_category_attnum] AND c.confkey=ARRAY[attrs.category_id_attnum] AND c.confmatchtype='s' AND c.confupdtype='a' AND c.confdeltype='r' AND NOT c.condeferrable AND NOT c.condeferred AND c.convalidated)=1
FROM attrs
"@
  Assert-That ((Get-Scalar $Database $sql) -eq 't') "${Message}: legacy offers.category_id FK contract mismatch"
}

function Assert-FullRuntimeContract {
  param([string]$Database, [string]$Message)
  Assert-AllTargetTables $Database $Message
  Assert-LegacyCategoryFkContract $Database $Message
  $expectedColumns = @{
    attribute_definitions = @('id:bigint:t','stable_key:text:t','data_type:character varying(30):t','is_active:boolean:t','created_at:timestamp with time zone:t')
    controlled_option_values = @('id:bigint:t','attribute_id:bigint:t','stable_key:text:t','is_active:boolean:t','created_at:timestamp with time zone:t')
    offer_attribute_values = @('id:bigint:t','offer_id:bigint:t','attribute_id:bigint:t','value_text:text:f','value_number:numeric:f','value_boolean:boolean:f','value_date:timestamp with time zone:f','value_year:integer:f','option_id:bigint:f','created_at:timestamp with time zone:t','updated_at:timestamp with time zone:t')
    offer_attribute_option_values = @('id:bigint:t','offer_id:bigint:t','attribute_id:bigint:t','option_id:bigint:t','created_at:timestamp with time zone:t')
    attribute_definition_translations = @('id:bigint:t','attribute_definition_id:bigint:t','locale:character varying(10):t','name:text:t','short_label:character varying(100):f','description:text:f','created_at:timestamp with time zone:t','updated_at:timestamp with time zone:f')
    category_attribute_assignments = @('id:bigint:t','category_id:bigint:t','attribute_definition_id:bigint:t','sort_order:integer:t','is_filterable:boolean:t','is_comparable:boolean:t','is_required:boolean:t','is_visible:boolean:t','unit_code:character varying(20):f','created_at:timestamp with time zone:t','updated_at:timestamp with time zone:f')
    controlled_option_value_translations = @('id:bigint:t','controlled_option_value_id:bigint:t','locale:character varying(10):t','label:text:t','description:text:f','created_at:timestamp with time zone:t','updated_at:timestamp with time zone:f')
  }
  foreach ($table in $expectedColumns.Keys) {
    $actual = @((Invoke-Psql -Database $Database -Sql "SELECT attname || ':' || format_type(atttypid,atttypmod) || ':' || CASE WHEN attnotnull THEN 't' ELSE 'f' END FROM pg_attribute WHERE attrelid='public.$table'::regclass AND attnum>0 AND NOT attisdropped ORDER BY attnum" -File $null).Output.Split("`n") | ForEach-Object { $_.Trim() } | Where-Object { $_ })
    Assert-That ((@($actual) -join '|') -eq ($expectedColumns[$table] -join '|')) "${Message}: exact column contract mismatch for $table; expected=$($expectedColumns[$table] -join '|'); actual=$(@($actual) -join '|')"
  }
  $expectedDefaultKinds = @{
    attribute_definitions = @{ id='nextval'; is_active='true'; created_at='now' }
    controlled_option_values = @{ id='nextval'; is_active='true'; created_at='now' }
    offer_attribute_values = @{ id='nextval'; created_at='now'; updated_at='now' }
    offer_attribute_option_values = @{ id='nextval'; created_at='now' }
    attribute_definition_translations = @{ id='nextval'; created_at='now' }
    category_attribute_assignments = @{ id='nextval'; sort_order='zero'; is_filterable='false'; is_comparable='false'; is_required='false'; is_visible='true'; created_at='now' }
    controlled_option_value_translations = @{ id='nextval'; created_at='now' }
  }
  foreach ($table in $expectedColumns.Keys) {
    foreach ($column in $expectedColumns[$table]) {
      $columnName = $column.Split(':')[0]
      $expectedKind = if ($expectedDefaultKinds[$table].ContainsKey($columnName)) { $expectedDefaultKinds[$table][$columnName] } else { 'none' }
      $actualDefault = Get-Scalar $Database "SELECT COALESCE(pg_get_expr(d.adbin,d.adrelid),'') FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid='public.$table'::regclass AND a.attname='$columnName'"
      $validDefault = switch ($expectedKind) {
        'none' { $actualDefault -eq '' }
        'nextval' { $actualDefault -like 'nextval(*' }
        'now' { $actualDefault.ToLowerInvariant().Contains('now()') -or $actualDefault.ToLowerInvariant().Contains('current_timestamp') }
        'true' { $actualDefault -match '(?i)true' }
        'false' { $actualDefault -match '(?i)false' }
        'zero' { $actualDefault -match '(^|[^0-9])0([^0-9]|$)' }
      }
      Assert-That $validDefault "${Message}: default contract mismatch for $table.$columnName; expected=$expectedKind; actual=$actualDefault"
    }
  }
  $expectedConstraints = @(
    'attribute_definitions_pkey|p|attribute_definitions|id||','controlled_option_values_pkey|p|controlled_option_values|id||','offer_attribute_values_pkey|p|offer_attribute_values|id||','offer_attribute_option_values_pkey|p|offer_attribute_option_values|id||','attribute_definition_translations_pkey|p|attribute_definition_translations|id||','category_attribute_assignments_pkey|p|category_attribute_assignments|id||','controlled_option_value_translations_pkey|p|controlled_option_value_translations|id||',
    'uq_ad_stable_key|u|attribute_definitions|stable_key||','uq_cov_attr_option|u|controlled_option_values|attribute_id,stable_key||','uq_cov_attribute_id_pair|u|controlled_option_values|attribute_id,id||','uq_oav_offer_attribute|u|offer_attribute_values|offer_id,attribute_id||','uq_oaov_offer_attribute_option|u|offer_attribute_option_values|offer_id,attribute_id,option_id||','uq_adt_attribute_locale|u|attribute_definition_translations|attribute_definition_id,locale||','uq_caa_category_attribute|u|category_attribute_assignments|category_id,attribute_definition_id||','uq_covt_option_locale|u|controlled_option_value_translations|controlled_option_value_id,locale||',
    'chk_ad_data_type|c|attribute_definitions|||','chk_oav_value_exclusivity|c|offer_attribute_values|||','chk_adt_locale|c|attribute_definition_translations|||','chk_caa_sort_order|c|category_attribute_assignments|||','chk_covt_locale|c|controlled_option_value_translations|||',
    'fk_cov_attribute|f|controlled_option_values|attribute_id|attribute_definitions|id','fk_oav_offer|f|offer_attribute_values|offer_id|offers|id','fk_oav_attribute|f|offer_attribute_values|attribute_id|attribute_definitions|id','fk_oav_option|f|offer_attribute_values|option_id|controlled_option_values|id','fk_oav_attribute_option_pair|f|offer_attribute_values|attribute_id,option_id|controlled_option_values|attribute_id,id','fk_oaov_offer|f|offer_attribute_option_values|offer_id|offers|id','fk_oaov_attribute|f|offer_attribute_option_values|attribute_id|attribute_definitions|id','fk_oaov_option|f|offer_attribute_option_values|option_id|controlled_option_values|id','fk_oaov_attribute_option_pair|f|offer_attribute_option_values|attribute_id,option_id|controlled_option_values|attribute_id,id','fk_adt_attribute_definition|f|attribute_definition_translations|attribute_definition_id|attribute_definitions|id','fk_caa_category|f|category_attribute_assignments|category_id|categories|id','fk_caa_attribute_definition|f|category_attribute_assignments|attribute_definition_id|attribute_definitions|id','fk_covt_controlled_option_value|f|controlled_option_value_translations|controlled_option_value_id|controlled_option_values|id'
  )
  foreach ($entry in $expectedConstraints) {
    $parts = $entry.Split('|'); $name,$kind,$source,$sourceColumns,$reference,$referenceColumns = $parts
    $fkClause = if ($kind -eq 'f') { "AND r.relnamespace='public'::regnamespace AND r.relname='$reference' AND COALESCE((SELECT string_agg(a.attname,',' ORDER BY u.ord) FROM unnest(c.confkey) WITH ORDINALITY u(attnum,ord) JOIN pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=u.attnum),'')='$referenceColumns' AND c.confmatchtype='s' AND c.confupdtype='a' AND c.confdeltype='a' AND NOT c.condeferrable AND NOT c.condeferred" } else { '' }
    $sourceClause = if ($kind -eq 'c') { '' } else { "AND COALESCE((SELECT string_agg(a.attname,',' ORDER BY u.ord) FROM unnest(c.conkey) WITH ORDINALITY u(attnum,ord) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=u.attnum),'')='$sourceColumns'" }
    $sql = "SELECT count(*) FROM pg_constraint c JOIN pg_class s ON s.oid=c.conrelid LEFT JOIN pg_class r ON r.oid=c.confrelid WHERE c.convalidated AND c.conname='$name' AND c.contype='$kind' AND s.relnamespace='public'::regnamespace AND s.relname='$source' $sourceClause $fkClause"
    Assert-That ((Get-Scalar $Database $sql) -eq '1') "${Message}: scoped constraint contract mismatch for $name"
  }
  Assert-That ((Get-Scalar $Database "SELECT count(*) FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid WHERE t.relnamespace='public'::regnamespace AND t.relname IN ('attribute_definitions','controlled_option_values','offer_attribute_values','offer_attribute_option_values','attribute_definition_translations','category_attribute_assignments','controlled_option_value_translations')") -eq '33') "${Message}: expected 33 target constraints"
  Assert-That ((Get-Scalar $Database "SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='S' AND relname IN ('attribute_definitions_id_seq','controlled_option_values_id_seq','offer_attribute_values_id_seq','offer_attribute_option_values_id_seq','attribute_definition_translations_id_seq','category_attribute_assignments_id_seq','controlled_option_value_translations_id_seq')") -eq '7') "${Message}: expected seven owned sequences"
  Assert-That ((Get-Scalar $Database "SELECT count(*) FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid WHERE t.relnamespace='public'::regnamespace AND t.relname IN ('attribute_definitions','controlled_option_values','offer_attribute_values','offer_attribute_option_values','attribute_definition_translations','category_attribute_assignments','controlled_option_value_translations')") -eq '18') "${Message}: expected eighteen indexes"
  foreach ($constraint in @('fk_oav_attribute_option_pair','fk_oaov_attribute_option_pair')) {
    $source = if ($constraint -eq 'fk_oav_attribute_option_pair') { 'offer_attribute_values' } else { 'offer_attribute_option_values' }
    Assert-That ((Get-Scalar $Database "SELECT string_agg(a.attname,',' ORDER BY u.ord)='attribute_id,option_id' AND (SELECT string_agg(ra.attname,',' ORDER BY ru.ord) FROM pg_constraint rc CROSS JOIN LATERAL unnest(rc.confkey) WITH ORDINALITY ru(attnum,ord) JOIN pg_attribute ra ON ra.attrelid=rc.confrelid AND ra.attnum=ru.attnum WHERE rc.oid=c.oid)='attribute_id,id' AND c.confrelid='public.controlled_option_values'::regclass AND c.convalidated FROM pg_constraint c CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY u(attnum,ord) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=u.attnum WHERE c.conrelid='public.$source'::regclass AND c.conname='$constraint' GROUP BY c.oid,c.confrelid,c.convalidated") -eq 't') "${Message}: composite FK mismatch for $constraint"
  }
  $expectedIndexes = @(
    'attribute_definitions_pkey|attribute_definitions|true|id','controlled_option_values_pkey|controlled_option_values|true|id','offer_attribute_values_pkey|offer_attribute_values|true|id','offer_attribute_option_values_pkey|offer_attribute_option_values|true|id','attribute_definition_translations_pkey|attribute_definition_translations|true|id','category_attribute_assignments_pkey|category_attribute_assignments|true|id','controlled_option_value_translations_pkey|controlled_option_value_translations|true|id',
    'uq_ad_stable_key|attribute_definitions|true|stable_key','uq_cov_attr_option|controlled_option_values|true|attribute_id,stable_key','uq_cov_attribute_id_pair|controlled_option_values|true|attribute_id,id','uq_oav_offer_attribute|offer_attribute_values|true|offer_id,attribute_id','uq_oaov_offer_attribute_option|offer_attribute_option_values|true|offer_id,attribute_id,option_id','uq_adt_attribute_locale|attribute_definition_translations|true|attribute_definition_id,locale','uq_caa_category_attribute|category_attribute_assignments|true|category_id,attribute_definition_id','uq_covt_option_locale|controlled_option_value_translations|true|controlled_option_value_id,locale',
    'idx_caa_cat_visible_sort|category_attribute_assignments|false|category_id,is_visible,sort_order','idx_caa_cat_filterable_sort|category_attribute_assignments|false|category_id,is_filterable,sort_order','idx_caa_attribute|category_attribute_assignments|false|attribute_definition_id'
  )
  foreach ($entry in $expectedIndexes) {
    $parts = $entry.Split('|'); $name,$table,$isUnique,$columns = $parts
    $sql = "SELECT count(*) FROM pg_index i JOIN pg_class x ON x.oid=i.indexrelid JOIN pg_class t ON t.oid=i.indrelid WHERE x.relnamespace='public'::regnamespace AND x.relname='$name' AND t.relname='$table' AND i.indisunique=$isUnique AND i.indisvalid AND i.indisready AND i.indpred IS NULL AND i.indexprs IS NULL AND (SELECT string_agg(a.attname,',' ORDER BY u.ord) FROM unnest(i.indkey) WITH ORDINALITY u(attnum,ord) JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=u.attnum)='$columns'"
    Assert-That ((Get-Scalar $Database $sql) -eq '1') "${Message}: exact index contract mismatch for $name"
  }
  foreach ($table in $expectedColumns.Keys) {
    $sequence = "$table`_id_seq"
    $sql = "SELECT count(*) FROM pg_class seq JOIN pg_depend d ON d.objid=seq.oid AND d.deptype='a' JOIN pg_class t ON t.oid=d.refobjid JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=d.refobjsubid WHERE seq.relnamespace='public'::regnamespace AND seq.relkind='S' AND seq.relname='$sequence' AND t.relnamespace='public'::regnamespace AND t.relname='$table' AND a.attname='id' AND to_regclass(pg_get_serial_sequence('public.$table','id'))=seq.oid"
    Assert-That ((Get-Scalar $Database $sql) -eq '1') "${Message}: sequence ownership/default mismatch for $sequence"
  }
}

function Invoke-Case {
  param([string]$Id, [scriptblock]$Body)
  try {
    & $Body
    $script:results += $Id
    Write-Output "$Id PASS"
  } catch {
    throw "$Id FAIL: $($_.Exception.Message)"
  }
}

try {
  New-Item -ItemType Directory -Path $tmp -Force | Out-Null
  & (Join-Path $bin 'initdb.exe') -D $data -A trust -U postgres --locale=C --encoding=UTF8
  Assert-That ($LASTEXITCODE -eq 0) 'initdb failed'

  & (Join-Path $bin 'pg_ctl.exe') `
    -D $data `
    -l $serverLog `
    -o "-h 127.0.0.1 -p $port" `
    -w `
    start
  Assert-That ($LASTEXITCODE -eq 0) "postgres start failed; log: $serverLog"
  $started = $true

  Invoke-Case 'A' {
    $database = New-Database 'A'
    Invoke-Psql -Database $database -Sql $null -File $forward | Out-Null
    Assert-FullRuntimeContract $database 'A'
    Assert-That ((Get-Scalar $database "SELECT count(*) FROM pg_constraint WHERE conrelid='public.controlled_option_values'::regclass AND conname='uq_cov_attribute_id_pair' AND convalidated") -eq '1') 'A: composite unique missing'
  }

  Invoke-Case 'B' {
    $database = New-Database 'B'
    Invoke-Psql -Database $database -Sql 'ALTER TABLE public.categories RENAME TO categories_missing' -File $null | Out-Null
    Assert-That ((Get-Scalar $database "SELECT to_regclass('public.categories') IS NULL") -eq 't') 'B: categories must be absent'
    Assert-That ((Get-Scalar $database "SELECT to_regclass('public.offers') IS NOT NULL") -eq 't') 'B: offers must remain present'
    Assert-That ((Get-Scalar $database "SELECT to_regclass('public.categories_missing') IS NOT NULL") -eq 't') 'B: renamed categories must exist'
    Expect-SqlState { Invoke-Psql -Database $database -Sql $null -File $forward -ExpectSuccess $false } '23514' 'B'
    Assert-NoLeanObjects $database 'B'
  }

  Invoke-Case 'C' {
    $database = New-Database 'C'
    Invoke-Psql -Database $database -Sql 'DROP TABLE public.offers' -File $null | Out-Null
    Assert-That ((Get-Scalar $database "SELECT to_regclass('public.categories') IS NOT NULL") -eq 't') 'C: categories must remain present'
    Assert-That ((Get-Scalar $database "SELECT to_regclass('public.offers') IS NULL") -eq 't') 'C: offers must be absent'
    Expect-SqlState { Invoke-Psql -Database $database -Sql $null -File $forward -ExpectSuccess $false } '23514' 'C'
    Assert-NoLeanObjects $database 'C'
  }

  Invoke-Case 'D' {
    $database = New-MinimalDatabase 'D' 'CREATE TABLE public.categories (id integer PRIMARY KEY); CREATE TABLE public.offers (id bigint PRIMARY KEY, category_id integer NOT NULL REFERENCES public.categories(id));'
    Expect-SqlState { Invoke-Psql -Database $database -Sql $null -File $forward -ExpectSuccess $false } '23514' 'D'
    Assert-NoLeanObjects $database 'D'
    $invalidLegacyFixtures = @(
      'CREATE TABLE public.categories (id bigint PRIMARY KEY); CREATE TABLE public.offers (id bigint PRIMARY KEY);',
      'CREATE TABLE public.categories (id bigint PRIMARY KEY); CREATE TABLE public.offers (id bigint PRIMARY KEY, category_id integer NOT NULL REFERENCES public.categories(id));',
      'CREATE TABLE public.categories (id bigint PRIMARY KEY); CREATE TABLE public.offers (id bigint PRIMARY KEY, category_id bigint REFERENCES public.categories(id));',
      'CREATE TABLE public.categories (id bigint PRIMARY KEY); CREATE TABLE public.offers (id bigint PRIMARY KEY, category_id bigint NOT NULL);',
      'CREATE TABLE public.categories (id bigint PRIMARY KEY); CREATE TABLE public.other_categories (id bigint PRIMARY KEY); CREATE TABLE public.offers (id bigint PRIMARY KEY, category_id bigint NOT NULL REFERENCES public.other_categories(id));',
      'CREATE TABLE public.categories (id bigint PRIMARY KEY); CREATE TABLE public.offers (id bigint PRIMARY KEY, category_id bigint NOT NULL REFERENCES public.categories(id) ON DELETE NO ACTION);',
      'CREATE TABLE public.categories (id bigint PRIMARY KEY); CREATE TABLE public.offers (id bigint PRIMARY KEY, category_id bigint NOT NULL REFERENCES public.categories(id) DEFERRABLE);',
      'CREATE TABLE public.categories (id bigint PRIMARY KEY); CREATE TABLE public.offers (id bigint PRIMARY KEY, category_id bigint NOT NULL); ALTER TABLE public.offers ADD CONSTRAINT offers_category_unvalidated FOREIGN KEY (category_id) REFERENCES public.categories(id) NOT VALID;'
    )
    foreach ($fixtureSql in $invalidLegacyFixtures) {
      $invalidDatabase = New-MinimalDatabase 'Dfk' $fixtureSql
      Expect-SqlState { Invoke-Psql -Database $invalidDatabase -Sql $null -File $forward -ExpectSuccess $false } '23514' 'D legacy FK variant'
      Assert-NoLeanObjects $invalidDatabase 'D legacy FK variant'
    }
  }

  Invoke-Case 'E' {
    $database = New-MinimalDatabase 'E' 'CREATE TABLE public.categories (id bigint PRIMARY KEY); CREATE TABLE public.offers (id integer PRIMARY KEY, category_id bigint NOT NULL REFERENCES public.categories(id));'
    Expect-SqlState { Invoke-Psql -Database $database -Sql $null -File $forward -ExpectSuccess $false } '23514' 'E'
    Assert-NoLeanObjects $database 'E'
  }

  Invoke-Case 'F' {
    $database = New-Database 'F'
    Invoke-Psql -Database $database -Sql 'CREATE TABLE public.attribute_definitions (id bigint)' -File $null | Out-Null
    Expect-SqlState { Invoke-Psql -Database $database -Sql $null -File $forward -ExpectSuccess $false } '23514' 'F'
    Assert-That ((Get-Scalar $database "SELECT to_regclass('public.attribute_definitions') IS NOT NULL") -eq 't') 'F: pre-existing table changed'
    $remaining = ($targets | Where-Object { $_ -ne 'attribute_definitions' } | ForEach-Object { "'$_'" }) -join ','
    Assert-That ((Get-Scalar $database "SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ($remaining)") -eq '0') 'F: remaining target object created'
    $scopedDatabase = New-Database 'Fscope'
    Invoke-Psql -Database $scopedDatabase -Sql 'CREATE TABLE public.unrelated_constraints (id bigint PRIMARY KEY, value integer, CONSTRAINT chk_ad_data_type CHECK (value > 0));' -File $null | Out-Null
    Invoke-Psql -Database $scopedDatabase -Sql $null -File $forward | Out-Null
    Assert-FullRuntimeContract $scopedDatabase 'F scoped constraint'
  }

  Invoke-Case 'G' {
    $database = New-Database 'G'
    Invoke-Psql -Database $database -Sql 'CREATE SEQUENCE public.attribute_definitions_id_seq' -File $null | Out-Null
    Expect-SqlState { Invoke-Psql -Database $database -Sql $null -File $forward -ExpectSuccess $false } '23514' 'G'
    Assert-That ((Get-Scalar $database "SELECT to_regclass('public.attribute_definitions_id_seq') IS NOT NULL") -eq 't') 'G: pre-existing sequence changed'
    $remaining = ($targets | ForEach-Object { "'$_'" }) -join ','
    Assert-That ((Get-Scalar $database "SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ($remaining)") -eq '0') 'G: target table created'
  }

  Invoke-Case 'H' {
    $database = New-Database 'H'
    Invoke-Psql -Database $database -Sql $null -File $forward | Out-Null
    Expect-SqlState { Invoke-Psql -Database $database -Sql $null -File $forward -ExpectSuccess $false } '23514' 'H'
    Assert-AllTargetTables $database 'H'
  }

  Invoke-Case 'I' {
    $database = New-SeededDomain 'I'
    foreach ($sql in @(
      'INSERT INTO public.offer_attribute_values(offer_id,attribute_id,option_id) VALUES(999,1,10)',
      'INSERT INTO public.offer_attribute_option_values(offer_id,attribute_id,option_id) VALUES(999,1,10)'
    )) { Expect-SqlState { Invoke-Psql -Database $database -Sql $sql -File $null -ExpectSuccess $false } '23503' 'I' }
  }

  Invoke-Case 'J' {
    $database = New-SeededDomain 'J'
    Expect-SqlState { Invoke-Psql -Database $database -Sql 'INSERT INTO public.category_attribute_assignments(category_id,attribute_definition_id) VALUES(999,1)' -File $null -ExpectSuccess $false } '23503' 'J'
  }

  Invoke-Case 'K' {
    $database = New-SeededDomain 'K'
    foreach ($sql in @(
      'INSERT INTO public.offer_attribute_values(offer_id,attribute_id,option_id) VALUES(1,999,10)',
      'INSERT INTO public.offer_attribute_option_values(offer_id,attribute_id,option_id) VALUES(1,999,10)'
    )) { Expect-SqlState { Invoke-Psql -Database $database -Sql $sql -File $null -ExpectSuccess $false } '23503' 'K' }
  }

  Invoke-Case 'L' {
    $database = New-SeededDomain 'L'
    foreach ($sql in @(
      'INSERT INTO public.offer_attribute_values(offer_id,attribute_id,option_id) VALUES(1,1,999)',
      'INSERT INTO public.offer_attribute_option_values(offer_id,attribute_id,option_id) VALUES(1,1,999)'
    )) { Expect-SqlState { Invoke-Psql -Database $database -Sql $sql -File $null -ExpectSuccess $false } '23503' 'L' }
  }

  Invoke-Case 'M' {
    $database = New-SeededDomain 'M'
    foreach ($sql in @(
      'INSERT INTO public.offer_attribute_values(offer_id,attribute_id,option_id) VALUES(1,1,20)',
      'INSERT INTO public.offer_attribute_option_values(offer_id,attribute_id,option_id) VALUES(1,1,20)'
    )) { Expect-SqlState { Invoke-Psql -Database $database -Sql $sql -File $null -ExpectSuccess $false } '23503' 'M' }
  }

  Invoke-Case 'N' {
    $database = New-SeededDomain 'N'
    Invoke-Psql -Database $database -Sql 'INSERT INTO public.offer_attribute_values(offer_id,attribute_id,option_id) VALUES(1,1,10); INSERT INTO public.offer_attribute_option_values(offer_id,attribute_id,option_id) VALUES(1,1,10)' -File $null | Out-Null
  }

  Invoke-Case 'O' {
    $database = New-SeededDomain 'O'
    Invoke-Psql -Database $database -Sql @"
INSERT INTO public.offer_attribute_values(offer_id,attribute_id,value_number) VALUES(1,3,1);
INSERT INTO public.offer_attribute_values(offer_id,attribute_id,value_year) VALUES(2,3,2024);
INSERT INTO public.offer_attribute_values(offer_id,attribute_id,value_boolean) VALUES(3,3,true);
INSERT INTO public.offer_attribute_values(offer_id,attribute_id,value_text) VALUES(4,3,'x');
INSERT INTO public.offer_attribute_values(offer_id,attribute_id,value_date) VALUES(5,3,now());
"@ -File $null | Out-Null
  }

  Invoke-Case 'P' {
    $database = New-SeededDomain 'P'
    foreach ($sql in @(
      'INSERT INTO public.offer_attribute_values(offer_id,attribute_id) VALUES(1,3)',
      'INSERT INTO public.offer_attribute_values(offer_id,attribute_id,value_number,value_year) VALUES(2,3,1,2024)'
    )) { Expect-SqlState { Invoke-Psql -Database $database -Sql $sql -File $null -ExpectSuccess $false } '23514' 'P' }
    Invoke-Psql -Database $database -Sql 'INSERT INTO public.offer_attribute_values(offer_id,attribute_id,value_number) VALUES(3,3,1)' -File $null | Out-Null
  }

  Invoke-Case 'Q' {
    $database = New-SeededDomain 'Q'
    foreach ($sql in @(
      "INSERT INTO public.attribute_definition_translations(attribute_definition_id,locale,name) VALUES(1,'it','x')",
      "INSERT INTO public.controlled_option_value_translations(controlled_option_value_id,locale,label) VALUES(10,'it','x')"
    )) { Expect-SqlState { Invoke-Psql -Database $database -Sql $sql -File $null -ExpectSuccess $false } '23514' 'Q' }
  }

  Invoke-Case 'R' {
    $database = New-SeededDomain 'R'
    foreach ($locale in @('pl','en','de','fr','uk','es','zh')) {
      Invoke-Psql -Database $database -Sql "INSERT INTO public.attribute_definition_translations(attribute_definition_id,locale,name) VALUES(1,'$locale','x'); INSERT INTO public.controlled_option_value_translations(controlled_option_value_id,locale,label) VALUES(10,'$locale','x')" -File $null | Out-Null
    }
    Assert-That ((Get-Scalar $database 'SELECT count(*) FROM public.attribute_definition_translations') -eq '7') 'R: attribute translations incomplete'
    Assert-That ((Get-Scalar $database 'SELECT count(*) FROM public.controlled_option_value_translations') -eq '7') 'R: option translations incomplete'
  }

  Invoke-Case 'S' {
    $database = New-Database 'S'
    Invoke-Psql -Database $database -Sql $null -File $forward | Out-Null
    Assert-FullRuntimeContract $database 'S'
    $postForwardSql = Get-ReadmeHereStringSql 'postForwardSql'
    Invoke-Psql -Database $database -Sql $postForwardSql -File $null | Out-Null
    $negativeDatabase = New-Database 'Snegative'
    Invoke-Psql -Database $negativeDatabase -Sql $null -File $forward | Out-Null
    Invoke-Psql -Database $negativeDatabase -Sql 'DROP INDEX public.idx_caa_attribute' -File $null | Out-Null
    Expect-FailureMessage { Invoke-Psql -Database $negativeDatabase -Sql $postForwardSql -File $null -ExpectSuccess $false } 'post-forward (object|index) contract mismatch' 'S README post-forward detects missing index'
    foreach ($dataType in @('text','number','boolean','date','year','enum','multi_enum')) {
      Invoke-Psql -Database $database -Sql "INSERT INTO public.attribute_definitions(stable_key,data_type) VALUES('type_$dataType','$dataType')" -File $null | Out-Null
    }
    Expect-SqlState { Invoke-Psql -Database $database -Sql "INSERT INTO public.attribute_definitions(stable_key,data_type) VALUES('type_invalid','unsupported')" -File $null -ExpectSuccess $false } '23514' 'S invalid data_type'
  }

  Invoke-Case 'T' {
    $database = New-Database 'T'
    Invoke-Psql -Database $database -Sql $null -File $forward | Out-Null
    Invoke-Psql -Database $database -Sql $null -File $rollback | Out-Null
    Assert-NoLeanObjects $database 'T'
    Assert-That ((Get-Scalar $database "SELECT to_regclass('public.categories') IS NOT NULL AND to_regclass('public.offers') IS NOT NULL") -eq 't') 'T: legacy schema missing'
    Assert-That ((Get-Scalar $database 'SELECT (SELECT count(*) FROM public.categories) = 1 AND (SELECT count(*) FROM public.offers) = 10') -eq 't') 'T: legacy fixture data changed'
    Assert-LegacyCategoryFkContract $database 'T'
    $postRollbackSql = Get-ReadmeHereStringSql 'postRollbackSql'
    Invoke-Psql -Database $database -Sql $postRollbackSql -File $null | Out-Null
  }

  Invoke-Case 'U' {
    $database = New-Database 'U'
    Invoke-Psql -Database $database -Sql $null -File $forward | Out-Null
    Invoke-Psql -Database $database -Sql "INSERT INTO public.attribute_definitions(stable_key,data_type) VALUES('data_guard','text')" -File $null | Out-Null
    Assert-That ((Get-Scalar $database 'SELECT count(*) FROM public.attribute_definitions') -eq '1') 'U: committed runtime row missing before rollback'
    Expect-SqlState { Invoke-Psql -Database $database -Sql $null -File $rollback -ExpectSuccess $false } '23514' 'U nonempty schema'
    Assert-AllTargetTables $database 'U'
    Assert-That ((Get-Scalar $database 'SELECT count(*) FROM public.attribute_definitions') -eq '1') 'U: rollback changed data'
    $lockDatabase = New-Database 'Ulock'
    Invoke-Psql -Database $lockDatabase -Sql $null -File $forward | Out-Null
    $rollbackText = Get-Content -LiteralPath $rollback -Raw
    Assert-That ($rollbackText -match '(?s)LOCK\s+TABLE\s+public\.attribute_definitions.*?IN\s+ACCESS\s+EXCLUSIVE\s+MODE') 'U: rollback lacks the required ACCESS EXCLUSIVE lock'
    $lockApplicationName = 'lm49c_u_' + [guid]::NewGuid().ToString('N')
    $lockHolderSql = @"
SET application_name = '$lockApplicationName';
BEGIN;
LOCK TABLE public.attribute_definitions IN ROW EXCLUSIVE MODE;
SELECT pg_sleep(60);
ROLLBACK;
"@
    $holderStdout = Join-Path $tmp 'case-u-lock-holder.stdout.log'
    $holderStderr = Join-Path $tmp 'case-u-lock-holder.stderr.log'
    $holderProcess = $null
    $holderBackendPid = 0
    $holderSessionRemoved = $false
    $holderCleanupFailures = @()
    try {
      $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
      $startInfo.FileName = Join-Path $bin 'psql.exe'
      $startInfo.UseShellExecute = $false
      $startInfo.CreateNoWindow = $true
      $startInfo.RedirectStandardOutput = $true
      $startInfo.RedirectStandardError = $true
      foreach ($argument in @('-X','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-h','127.0.0.1','-p',[string]$port,'-U','postgres','-d',$lockDatabase,'-c',$lockHolderSql)) { [void]$startInfo.ArgumentList.Add($argument) }
      $holderProcess = [System.Diagnostics.Process]::new(); $holderProcess.StartInfo = $startInfo
      if (-not $holderProcess.Start()) { throw 'U: failed to start lock-holder psql process' }
      $lockGranted = $false; $lockDiagnostic = ''
      for ($attempt = 1; $attempt -le 100 -and -not $lockGranted; $attempt++) {
        if ($holderProcess.HasExited) { throw "U: lock-holder exited before granting lock; exit code=$($holderProcess.ExitCode)" }
        $holderBackendPidText = Get-Scalar $lockDatabase @"
SELECT COALESCE(max(activity.pid), 0) FROM pg_stat_activity activity JOIN pg_locks lock ON lock.pid=activity.pid
WHERE activity.datname=current_database() AND activity.application_name='$lockApplicationName'
  AND lock.locktype='relation' AND lock.relation='public.attribute_definitions'::regclass
  AND lock.mode='RowExclusiveLock' AND lock.granted;
"@
        $holderBackendPid = [int]$holderBackendPidText
        if ($holderBackendPid -gt 0) { $lockGranted = $true; $lockDiagnostic = Get-Scalar $lockDatabase "SELECT activity.pid || '|' || activity.application_name || '|' || lock.mode || '|' || lock.granted FROM pg_stat_activity activity JOIN pg_locks lock ON lock.pid=activity.pid WHERE activity.datname=current_database() AND activity.application_name='$lockApplicationName' AND lock.relation='public.attribute_definitions'::regclass"; break }
        Start-Sleep -Milliseconds 200
      }
      Assert-That $lockGranted 'U: named lock-holder RowExclusiveLock was not granted before rollback'
      Assert-That ($holderBackendPid -gt 0) 'U: holder backend PID was not captured'
      Assert-That ($lockDiagnostic -match [regex]::Escape($lockApplicationName) + '\|RowExclusiveLock\|t') 'U: named lock-holder diagnostic mismatch'
      Expect-SqlState { Invoke-Psql -Database $lockDatabase -Sql $null -File $rollback -ExpectSuccess $false } '55P03' 'U rollback lock conflict'
      Assert-AllTargetTables $lockDatabase 'U lock conflict'
      Assert-That ((Get-Scalar $lockDatabase "SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='S' AND relname IN ('attribute_definitions_id_seq','controlled_option_values_id_seq','offer_attribute_values_id_seq','offer_attribute_option_values_id_seq','attribute_definition_translations_id_seq','category_attribute_assignments_id_seq','controlled_option_value_translations_id_seq')") -eq '7') 'U: rollback removed a sequence during lock conflict'
      Assert-That ((Get-Scalar $lockDatabase "SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='i' AND relname IN ('attribute_definitions_pkey','controlled_option_values_pkey','offer_attribute_values_pkey','offer_attribute_option_values_pkey','attribute_definition_translations_pkey','category_attribute_assignments_pkey','controlled_option_value_translations_pkey','uq_ad_stable_key','uq_cov_attr_option','uq_cov_attribute_id_pair','uq_oav_offer_attribute','uq_oaov_offer_attribute_option','uq_adt_attribute_locale','uq_caa_category_attribute','uq_covt_option_locale','idx_caa_cat_visible_sort','idx_caa_cat_filterable_sort','idx_caa_attribute')") -eq '18') 'U: rollback removed an index during lock conflict'
    } finally {
      try {
        Invoke-Psql -Database $lockDatabase -Sql @"
SELECT pg_terminate_backend(activity.pid)
FROM pg_stat_activity activity
WHERE activity.datname=current_database()
  AND activity.application_name='$lockApplicationName'
  AND activity.pid <> pg_backend_pid();
"@ -File $null | Out-Null
      } catch {
        $holderCleanupFailures += "U: pg_terminate_backend failed: $($_.Exception.Message)"
      }
      if ($null -ne $holderProcess -and -not $holderProcess.HasExited) {
        if (-not $holderProcess.WaitForExit(5000)) { $holderProcess.Kill($true); $holderProcess.WaitForExit() }
      }
      if ($null -ne $holderProcess) { $holderProcess.Dispose() }
      for ($attempt = 1; $attempt -le 100; $attempt++) {
        $remainingHolderSessions = [int](Get-Scalar $lockDatabase @"
SELECT count(*)
FROM pg_stat_activity activity
WHERE activity.datname=current_database()
  AND activity.application_name='$lockApplicationName';
"@)
        if ($remainingHolderSessions -eq 0) { $holderSessionRemoved = $true; break }
        Start-Sleep -Milliseconds 200
      }
      if (-not $holderSessionRemoved) {
        try {
          $holderDiagnostics = (Invoke-Psql -Database $lockDatabase -Sql @"
SELECT activity.pid, activity.application_name, activity.state, activity.wait_event_type,
       activity.wait_event, activity.backend_start, activity.xact_start, activity.query_start
FROM pg_stat_activity activity
WHERE activity.datname=current_database()
  AND activity.application_name='$lockApplicationName';
"@ -File $null).Output
          $holderCleanupFailures += "U: lock-holder session remains after pg_terminate_backend; diagnostics: $holderDiagnostics"
        } catch {
          $holderCleanupFailures += "U: lock-holder session remains and diagnostics failed: $($_.Exception.Message)"
        }
      }
    }
    Assert-That ($holderCleanupFailures.Count -eq 0) ($holderCleanupFailures -join '; ')
    Assert-That $holderSessionRemoved 'U: lock-holder session remains after pg_terminate_backend'
    Invoke-Psql -Database $lockDatabase -Sql $null -File $rollback | Out-Null
    Assert-NoLeanObjects $lockDatabase 'U post-lock empty rollback'
  }

  Invoke-Case 'V' {
    $database = New-Database 'V'
    Invoke-Psql -Database $database -Sql $null -File $forward | Out-Null
    Invoke-Psql -Database $database -Sql 'DROP TABLE public.controlled_option_value_translations' -File $null | Out-Null
    Expect-SqlState { Invoke-Psql -Database $database -Sql $null -File $rollback -ExpectSuccess $false } '23514' 'V'
    $remaining = ($targets | Where-Object { $_ -ne 'controlled_option_value_translations' } | ForEach-Object { "'$_'" }) -join ','
    Assert-That ((Get-Scalar $database "SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' AND relname IN ($remaining)") -eq '6') 'V: rollback removed remaining table'
  }

  Invoke-Case 'W' {
    $database = New-Database 'W'
    Invoke-Psql -Database $database -Sql 'CREATE TABLE public.idx_caa_attribute (id bigint)' -File $null | Out-Null
    Expect-SqlState { Invoke-Psql -Database $database -Sql $null -File $forward -ExpectSuccess $false } '23514' 'W'
    $targetList = ($targets | ForEach-Object { "'$_'" }) -join ','
    $sequenceList = ($sequences | ForEach-Object { "'$_'" }) -join ','
    $indexList = ($indexes | ForEach-Object { "'$_'" }) -join ','
    Assert-That ((Get-Scalar $database "SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ($targetList)") -eq '0') 'W: target table created'
    Assert-That ((Get-Scalar $database "SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ($sequenceList)") -eq '0') 'W: target sequence created'
    Assert-That ((Get-Scalar $database "SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='i' AND relname IN ($indexList)") -eq '0') 'W: target index created'
    $runbook = Get-Content -LiteralPath $readme -Raw
    Assert-That (-not $runbook.Contains('--dbname=$env:PGSERVICE')) 'W: README passes PGSERVICE as a database name'
    Assert-That (-not $runbook.Contains('count(*)<0')) 'W: README contains a vacuous legacy-data assertion'
    foreach ($fragment in @('$connection = "service=$env:PGSERVICE"','pg_dump.exe --dbname=$connection --schema-only --format=custom --no-owner --no-privileges','Get-FileHash -LiteralPath $schemaDump -Algorithm SHA256','pg_restore.exe --list $schemaDump','psql.exe -X -v ON_ERROR_STOP=1 -v VERBOSITY=verbose --dbname=$connection --file=$forward','$postForwardSql = @''','BEGIN TRANSACTION READ ONLY;','column/default contract mismatch','scoped constraint mapping mismatch','$postRollbackSql = @''','post-rollback object absence mismatch','LM49C rollback failed')) {
      Assert-That ($runbook.Contains($fragment)) "W: README missing required runbook fragment: $fragment"
    }
  }

  Assert-That ($results.Count -eq 23) "expected 23 executed cases, got $($results.Count)"
  Write-Output "LM49C_LEAN_TESTS=$($results.Count)/23 PASS"
} finally {
  $cleanupFailures = @()
  if ($started) {
    & (Join-Path $bin 'pg_ctl.exe') -D $data -m fast -w stop
    if ($LASTEXITCODE -ne 0) { $cleanupFailures += 'pg_ctl stop failed' }
  }
  if (Test-Path $tmp) {
    try { Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction Stop } catch { $cleanupFailures += $_.Exception.Message }
  }
  if (Test-Path $tmp) { $cleanupFailures += 'temporary PostgreSQL directory remains' }
  if ($cleanupFailures.Count -eq 0) {
    Write-Output 'LM49C_LEAN_CLEANUP=PASS'
  } else {
    Write-Output 'LM49C_LEAN_CLEANUP=FAIL'
    throw ('LM49C lean cleanup failed: ' + ($cleanupFailures -join '; '))
  }
}
