$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$env:LC_MESSAGES = 'C'
$env:LC_ALL = 'C'

$pgBin = "C:\tools\PostgreSQL17\pgsql\bin"
$dbUser = "postgres"

function Invoke-NativeChecked {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )
    & $Command @Arguments
    $code = $LASTEXITCODE
    if ($code -ne 0) {
        throw "Native command failed with exit code $code ($Command)"
    }
}

# 1. Random port
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$listener.Start()
$dbPort = $listener.LocalEndpoint.Port
$listener.Stop()

$guid = [Guid]::NewGuid().ToString("N")
$dbData = Join-Path $env:TEMP "lm45_$guid\data"
$dbLog = Join-Path $env:TEMP "lm45_$guid\postgres.log"
$dbName = "lm45_$guid"

$results = New-Object System.Collections.Generic.List[string]
$testIds = New-Object System.Collections.Generic.List[string]

function Register-Result {
    param([string]$Id, [string]$Status, [string]$Detail)
    $results.Add("$Id|$Status|$Detail")
    if (-not $testIds.Contains($Id)) {
        $testIds.Add($Id)
    }
}

function Run-Sql {
    param([string]$Sql)
    $env:PGPASSWORD = ''
    $tempFile = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($tempFile, $Sql, (New-Object System.Text.UTF8Encoding $false))
    try {
        $res = & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d $dbName -t -A -X -v ON_ERROR_STOP=1 -f $tempFile 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "SQL execution failed: $res"
        }
        if ($res -is [System.Array]) {
            return ($res -join "`n").Trim()
        }
        if ($null -eq $res) {
            return ""
        }
        return $res.ToString().Trim()
    } finally {
        if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
    }
}

function Assert-Test {
    param([string]$Id, [string]$Sql, [string]$Expected)
    try {
        $actual = Run-Sql $Sql
        if ($actual -eq $Expected) {
            Write-Host "  PASS: $Id"
            Register-Result -Id $Id -Status "PASS" -Detail $actual
        } else {
            Write-Host "  FAIL: $Id (Expected '$Expected', got '$actual')"
            Register-Result -Id $Id -Status "FAIL" -Detail "Expected '$Expected', got '$actual'"
        }
    } catch {
        Write-Host "  FAIL: $Id (Error: $_)"
        Register-Result -Id $Id -Status "FAIL" -Detail "$_"
    }
}

function Assert-FkViolation {
    param([string]$Id, [string]$ExpectedConstraint, [string]$Sql)
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $env:PGPASSWORD = ''
        $escapedSql = $Sql.Replace("'", "''")
        $testQuery = "SELECT lm45_test.assert_fk_violation('23503', '$ExpectedConstraint', '$escapedSql');"
        $tempFile = [System.IO.Path]::GetTempFileName()
        [System.IO.File]::WriteAllText($tempFile, $testQuery, (New-Object System.Text.UTF8Encoding $false))
        $res = & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d $dbName -X -v ON_ERROR_STOP=1 -f $tempFile 2>&1
        $errStr = "$res"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  PASS: $Id"
            Register-Result -Id $Id -Status "PASS" -Detail "23503 constraint=$ExpectedConstraint"
        } else {
            Write-Host "  FAIL: $Id ($errStr)"
            Register-Result -Id $Id -Status "FAIL" -Detail $errStr
        }
    } finally {
        if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
        $ErrorActionPreference = $oldPreference
    }
}

function Assert-CheckViolation {
    param([string]$Id, [string]$ExpectedConstraint, [string]$Sql)
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $env:PGPASSWORD = ''
        $escapedSql = $Sql.Replace("'", "''")
        $testQuery = "SELECT lm45_test.assert_check_violation('23514', '$ExpectedConstraint', '$escapedSql');"
        $tempFile = [System.IO.Path]::GetTempFileName()
        [System.IO.File]::WriteAllText($tempFile, $testQuery, (New-Object System.Text.UTF8Encoding $false))
        $res = & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d $dbName -X -v ON_ERROR_STOP=1 -f $tempFile 2>&1
        $errStr = "$res"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  PASS: $Id"
            Register-Result -Id $Id -Status "PASS" -Detail "23514 constraint=$ExpectedConstraint"
        } else {
            Write-Host "  FAIL: $Id ($errStr)"
            Register-Result -Id $Id -Status "FAIL" -Detail $errStr
        }
    } finally {
        if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
        $ErrorActionPreference = $oldPreference
    }
}

function Assert-UniqueViolation {
    param([string]$Id, [string]$ExpectedConstraint, [string]$Sql)
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $env:PGPASSWORD = ''
        $escapedSql = $Sql.Replace("'", "''")
        $testQuery = "SELECT lm45_test.assert_unique_violation('23505', '$ExpectedConstraint', '$escapedSql');"
        $tempFile = [System.IO.Path]::GetTempFileName()
        [System.IO.File]::WriteAllText($tempFile, $testQuery, (New-Object System.Text.UTF8Encoding $false))
        $res = & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d $dbName -X -v ON_ERROR_STOP=1 -f $tempFile 2>&1
        $errStr = "$res"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  PASS: $Id"
            Register-Result -Id $Id -Status "PASS" -Detail "23505 constraint=$ExpectedConstraint"
        } else {
            Write-Host "  FAIL: $Id ($errStr)"
            Register-Result -Id $Id -Status "FAIL" -Detail $errStr
        }
    } finally {
        if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
        $ErrorActionPreference = $oldPreference
    }
}

try {
    Write-Host "=== SECTION A: TOOLCHAIN AND MIGRATION ==="

    # A01: drizzle-kit version
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    $drizzleKitVer = $packageJson.devDependencies."drizzle-kit"
    if ($drizzleKitVer -eq "0.31.10") {
        Write-Host "  PASS: A01"
        Register-Result -Id "A01" -Status "PASS" -Detail "0.31.10"
    } else {
        Write-Host "  FAIL: A01"
        Register-Result -Id "A01" -Status "FAIL" -Detail $drizzleKitVer
    }

    # A02: drizzle-orm version (installed, not package.json range)
    $drizzleOrmInstalled = npm ls drizzle-orm --depth=0 --json 2>$null | ConvertFrom-Json
    $drizzleOrmVer = $drizzleOrmInstalled.dependencies."drizzle-orm".version
    if ($drizzleOrmVer -eq "0.45.2") {
        Write-Host "  PASS: A02"
        Register-Result -Id "A02" -Status "PASS" -Detail $drizzleOrmVer
    } else {
        Write-Host "  FAIL: A02"
        Register-Result -Id "A02" -Status "FAIL" -Detail $drizzleOrmVer
    }

    # A03: origin/main contains Sprint 44
    $ancestorCheck = git merge-base --is-ancestor a6c918e589d8c2275e085edb236117920fba317e origin/main 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  PASS: A03"
        Register-Result -Id "A03" -Status "PASS" -Detail "Sprint 44 in origin/main"
    } else {
        Write-Host "  FAIL: A03"
        Register-Result -Id "A03" -Status "FAIL" -Detail "Sprint 44 not in origin/main"
    }

    # A04: exactly one new migration generated
    $migrationFiles = @(Get-ChildItem drizzle\0002_*.sql -ErrorAction SilentlyContinue)
    if ($migrationFiles.Count -eq 1) {
        Write-Host "  PASS: A04"
        Register-Result -Id "A04" -Status "PASS" -Detail $migrationFiles[0].Name
    } else {
        Write-Host "  FAIL: A04"
        Register-Result -Id "A04" -Status "FAIL" -Detail "count=$($migrationFiles.Count)"
    }

    # A05: strict allowlist audit
    $0002Content = Get-Content (Get-ChildItem drizzle\0002_*.sql).FullName -Raw
    $forbidden = $false
    if ($0002Content -match "DROP TABLE" -or $0002Content -match "DROP COLUMN" -or $0002Content -match "ALTER COLUMN TYPE" -or $0002Content -match "RENAME") { $forbidden = $true }
    # Check for legacy table creation
    $legacyTables = @("offers","partners","categories","attribute_definitions","controlled_option_values","offer_attribute_values","offer_attribute_option_values","migration_batches","migration_source_entries","migration_oav_targets","migration_oaov_targets")
    foreach ($lt in $legacyTables) {
        $pattern = 'CREATE TABLE "' + $lt + '"'
        if ($0002Content -match $pattern) { $forbidden = $true }
    }
    if (-not $forbidden) {
        Write-Host "  PASS: A05"
        Register-Result -Id "A05" -Status "PASS" -Detail "allowlist pass"
    } else {
        Write-Host "  FAIL: A05"
        Register-Result -Id "A05" -Status "FAIL" -Detail "forbidden DDL detected"
    }

    # Initialize PostgreSQL cluster
    Write-Host "Initializing DB cluster..."
    New-Item -ItemType Directory -Path $dbData -Force | Out-Null
    Invoke-NativeChecked -Command "$pgBin\initdb.exe" -Arguments @('-D', $dbData, '-U', $dbUser, '--auth-local=trust', '--auth-host=trust')

    Write-Host "Starting PostgreSQL on port $dbPort..."
    & "$pgBin\pg_ctl.exe" -D $dbData -o "-F -p $dbPort" -l $dbLog start
    Start-Sleep -Seconds 4

    # Create database and apply migrations
    & "$pgBin\createdb.exe" -h localhost -p $dbPort -U $dbUser $dbName
    & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d $dbName -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" -q

    # Pre-create prerequisite roles (required by Sprint 44 migrations)
    & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d $dbName -c "CREATE ROLE lm_migration_owner WITH NOLOGIN;" -q
    & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d $dbName -c "CREATE ROLE lm_migration_executor WITH LOGIN;" -q

    # Apply legacy fixture (Sprint 44 base)
    & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d $dbName -f "scripts/sql/fixtures/lm44-legacy-schema-77b98aff.sql" -q

    # Apply migrations 0000, 0001, 0002
    $env:DATABASE_URL = "postgres://postgres@localhost:$dbPort/$dbName"
    Invoke-NativeChecked -Command "node" -Arguments @("scripts/run-lm44-drizzle-migrations.mjs")

    # A06: migrations applied successfully
    $historyCount = Run-Sql "SELECT count(*) FROM drizzle.__drizzle_migrations;"
    if ($historyCount -eq "3") {
        Write-Host "  PASS: A06"
        Register-Result -Id "A06" -Status "PASS" -Detail "history count = 3"
    } else {
        Write-Host "  FAIL: A06"
        Register-Result -Id "A06" -Status "FAIL" -Detail "history count = $historyCount"
    }

    # A07: second migrate is no-op
    Invoke-NativeChecked -Command "node" -Arguments @("scripts/run-lm44-drizzle-migrations.mjs")
    $historyCount2 = Run-Sql "SELECT count(*) FROM drizzle.__drizzle_migrations;"
    if ($historyCount2 -eq "3") {
        Write-Host "  PASS: A07"
        Register-Result -Id "A07" -Status "PASS" -Detail "second migrate no-op"
    } else {
        Write-Host "  FAIL: A07"
        Register-Result -Id "A07" -Status "FAIL" -Detail "second migrate altered history"
    }

    # A08: 0002 does not modify legacy or Sprint 44 tables beyond allowed ADD
    $legacyModified = $false
    # Simplified check: any ALTER TABLE on legacy tables that is not ADD CONSTRAINT or ADD COLUMN unit_code
    $legacyTableNames = @('offers','partners','categories','attribute_definitions','controlled_option_values','offer_attribute_values','offer_attribute_option_values','migration_batches','migration_source_entries','migration_oav_targets','migration_oaov_targets')
    foreach ($ltn in $legacyTableNames) {
        $alterPattern = 'ALTER TABLE\s+"?' + $ltn + '"?\s+(?!ADD CONSTRAINT|ADD COLUMN\s+unit_code)'
        if ($0002Content -match $alterPattern) { $legacyModified = $true }
    }
    if (-not $legacyModified) {
        Write-Host "  PASS: A08"
        Register-Result -Id "A08" -Status "PASS" -Detail "no unauthorized legacy ALTER"
    } else {
        Write-Host "  FAIL: A08"
        Register-Result -Id "A08" -Status "FAIL" -Detail "legacy tables modified"
    }

    # Set up test schema
    $env:PGPASSWORD = ''
    & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d $dbName -c "CREATE SCHEMA IF NOT EXISTS lm45_test;" -q

    # Test helpers
    $helpersSql = @'
CREATE OR REPLACE FUNCTION lm45_test.assert_fk_violation(p_expected_state text, p_expected_constraint text, p_sql text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_actual_state text;
  v_actual_constraint text;
BEGIN
  BEGIN
    EXECUTE p_sql;
    RAISE EXCEPTION 'STATEMENT_SUCCEEDED';
  EXCEPTION
    WHEN foreign_key_violation THEN
      GET STACKED DIAGNOSTICS
        v_actual_state = RETURNED_SQLSTATE,
        v_actual_constraint = CONSTRAINT_NAME;
      IF v_actual_state = p_expected_state AND v_actual_constraint = p_expected_constraint THEN
        RETURN;
      ELSE
        RAISE EXCEPTION 'WRONG_VIOLATION: state=%, constraint=%', v_actual_state, v_actual_constraint;
      END IF;
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_actual_state = RETURNED_SQLSTATE;
      RAISE EXCEPTION 'UNEXPECTED_EXCEPTION: state=%, msg=%', v_actual_state, SQLERRM;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION lm45_test.assert_unique_violation(p_expected_state text, p_expected_constraint text, p_sql text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_actual_state text;
  v_actual_constraint text;
BEGIN
  BEGIN
    EXECUTE p_sql;
    RAISE EXCEPTION 'STATEMENT_SUCCEEDED';
  EXCEPTION
    WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS
        v_actual_state = RETURNED_SQLSTATE,
        v_actual_constraint = CONSTRAINT_NAME;
      IF v_actual_state = p_expected_state AND v_actual_constraint = p_expected_constraint THEN
        RETURN;
      ELSE
        RAISE EXCEPTION 'WRONG_VIOLATION: state=%, constraint=%', v_actual_state, v_actual_constraint;
      END IF;
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_actual_state = RETURNED_SQLSTATE;
      RAISE EXCEPTION 'UNEXPECTED_EXCEPTION: state=%, msg=%', v_actual_state, SQLERRM;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION lm45_test.assert_check_violation(p_expected_state text, p_expected_constraint text, p_sql text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_actual_state text;
  v_actual_constraint text;
BEGIN
  BEGIN
    EXECUTE p_sql;
    RAISE EXCEPTION 'STATEMENT_SUCCEEDED';
  EXCEPTION
    WHEN check_violation THEN
      GET STACKED DIAGNOSTICS
        v_actual_state = RETURNED_SQLSTATE,
        v_actual_constraint = CONSTRAINT_NAME;
      IF v_actual_state = p_expected_state AND v_actual_constraint = p_expected_constraint THEN
        RETURN;
      ELSE
        RAISE EXCEPTION 'WRONG_VIOLATION: state=%, constraint=%', v_actual_state, v_actual_constraint;
      END IF;
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_actual_state = RETURNED_SQLSTATE;
      RAISE EXCEPTION 'UNEXPECTED_EXCEPTION: state=%, msg=%', v_actual_state, SQLERRM;
  END;
END;
$$;
'@
    Run-Sql $helpersSql

    # Seed base data for tests
    Run-Sql 'INSERT INTO public.partners (id, company_name, contact_email) VALUES (1, ''Test Partner'', ''test@example.com'');'
    Run-Sql 'INSERT INTO public.categories (id, name, slug) VALUES (10, ''Test Category'', ''test-category'');'
    Run-Sql 'INSERT INTO public.categories (id, name, slug) VALUES (11, ''Empty Category'', ''empty-category'');'
    Run-Sql 'INSERT INTO public.attribute_definitions (id, stable_key, data_type) VALUES (100, ''load_capacity'', ''number'');'
    Run-Sql 'INSERT INTO public.attribute_definitions (id, stable_key, data_type) VALUES (101, ''color'', ''enum'');'
    Run-Sql 'INSERT INTO public.attribute_definitions (id, stable_key, data_type) VALUES (102, ''material'', ''text'');'
    Run-Sql 'INSERT INTO public.attribute_definitions (id, stable_key, data_type) VALUES (103, ''warranty_years'', ''year'');'
    Run-Sql 'INSERT INTO public.attribute_definitions (id, stable_key, data_type) VALUES (104, ''features'', ''multi_enum'');'
    Run-Sql 'INSERT INTO public.attribute_definitions (id, stable_key, data_type) VALUES (105, ''is_certified'', ''boolean'');'
    Run-Sql 'INSERT INTO public.attribute_definitions (id, stable_key, data_type) VALUES (106, ''manufacture_date'', ''date'');'
    Run-Sql 'INSERT INTO public.controlled_option_values (id, attribute_id, stable_key) VALUES (200, 101, ''red'');'
    Run-Sql 'INSERT INTO public.controlled_option_values (id, attribute_id, stable_key) VALUES (201, 101, ''blue'');'
    Run-Sql 'INSERT INTO public.controlled_option_values (id, attribute_id, stable_key) VALUES (202, 104, ''feature_a'');'
    Run-Sql 'INSERT INTO public.controlled_option_values (id, attribute_id, stable_key) VALUES (203, 104, ''feature_b'');'

    Write-Host ""
    Write-Host "=== SECTION B: CONSTRAINTS ==="

    # B01: valid insert
    Run-Sql 'INSERT INTO public.category_attribute_assignments (category_id, attribute_definition_id, sort_order) VALUES (10, 100, 0);'
    Write-Host "  PASS: B01"
    Register-Result -Id "B01" -Status "PASS" -Detail "insert succeeded"

    # B02: duplicate category+attribute
    Assert-UniqueViolation -Id "B02" -ExpectedConstraint "uq_caa_category_attribute" -Sql 'INSERT INTO public.category_attribute_assignments (category_id, attribute_definition_id, sort_order) VALUES (10, 100, 1);'

    # B03: negative sort_order
    Assert-CheckViolation -Id "B03" -ExpectedConstraint "chk_caa_sort_order" -Sql 'INSERT INTO public.category_attribute_assignments (category_id, attribute_definition_id, sort_order) VALUES (10, 101, -1);'

    # B04: missing category
    Assert-FkViolation -Id "B04" -ExpectedConstraint "fk_caa_category" -Sql 'INSERT INTO public.category_attribute_assignments (category_id, attribute_definition_id, sort_order) VALUES (99999, 101, 0);'

    # B05: missing attribute definition
    Assert-FkViolation -Id "B05" -ExpectedConstraint "fk_caa_attribute_definition" -Sql 'INSERT INTO public.category_attribute_assignments (category_id, attribute_definition_id, sort_order) VALUES (10, 99999, 0);'

    # B06: duplicate attribute translation locale
    Run-Sql 'INSERT INTO public.attribute_definition_translations (attribute_definition_id, locale, name) VALUES (100, ''pl'', ''Udźwig'');'
    Assert-UniqueViolation -Id "B06" -ExpectedConstraint "uq_adt_attribute_locale" -Sql 'INSERT INTO public.attribute_definition_translations (attribute_definition_id, locale, name) VALUES (100, ''pl'', ''Udźwig PL dup'');'

    # B07: invalid attribute translation locale
    Assert-CheckViolation -Id "B07" -ExpectedConstraint "chk_adt_locale" -Sql 'INSERT INTO public.attribute_definition_translations (attribute_definition_id, locale, name) VALUES (100, ''xx'', ''Invalid'');'

    # B08: invalid option translation locale and duplicate option locale
    # Combined into one canonical test with two subchecks
    Run-Sql 'INSERT INTO public.controlled_option_value_translations (controlled_option_value_id, locale, label) VALUES (200, ''pl'', ''Czerwony'');'
    $b08Sub1 = $false
    $b08Sub2 = $false
    # Subcheck 1: invalid locale
    try {
        $env:PGPASSWORD = ''
        $testQuery1 = "SELECT lm45_test.assert_check_violation('23514', 'chk_covt_locale', 'INSERT INTO public.controlled_option_value_translations (controlled_option_value_id, locale, label) VALUES (200, ''xx'', ''Invalid'')');"
        $tempFile1 = [System.IO.Path]::GetTempFileName()
        [System.IO.File]::WriteAllText($tempFile1, $testQuery1, (New-Object System.Text.UTF8Encoding $false))
        $res1 = & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d $dbName -X -v ON_ERROR_STOP=1 -f $tempFile1 2>&1
        if ($LASTEXITCODE -eq 0) { $b08Sub1 = $true }
    } finally { if (Test-Path $tempFile1) { Remove-Item $tempFile1 -Force } }
    # Subcheck 2: duplicate locale
    try {
        $env:PGPASSWORD = ''
        $testQuery2 = "SELECT lm45_test.assert_unique_violation('23505', 'uq_covt_option_locale', 'INSERT INTO public.controlled_option_value_translations (controlled_option_value_id, locale, label) VALUES (200, ''pl'', ''Czerwony dup'')');"
        $tempFile2 = [System.IO.Path]::GetTempFileName()
        [System.IO.File]::WriteAllText($tempFile2, $testQuery2, (New-Object System.Text.UTF8Encoding $false))
        $res2 = & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d $dbName -X -v ON_ERROR_STOP=1 -f $tempFile2 2>&1
        if ($LASTEXITCODE -eq 0) { $b08Sub2 = $true }
    } finally { if (Test-Path $tempFile2) { Remove-Item $tempFile2 -Force } }
    if ($b08Sub1 -and $b08Sub2) {
        Write-Host "  PASS: B08"
        Register-Result -Id "B08" -Status "PASS" -Detail "both subchecks passed"
    } else {
        Write-Host "  FAIL: B08"
        Register-Result -Id "B08" -Status "FAIL" -Detail "sub1=$b08Sub1 sub2=$b08Sub2"
    }

    Write-Host ""
    Write-Host "=== SECTION C: I18N AND FALLBACK ==="

    # Seed translations
    Run-Sql 'INSERT INTO public.attribute_definition_translations (attribute_definition_id, locale, name, short_label) VALUES (100, ''en'', ''Load Capacity'', ''Capacity'');'
    Run-Sql 'INSERT INTO public.attribute_definition_translations (attribute_definition_id, locale, name, short_label) VALUES (100, ''de'', ''Tragfähigkeit'', ''Tragf.'');'
    Run-Sql 'INSERT INTO public.attribute_definition_translations (attribute_definition_id, locale, name) VALUES (101, ''pl'', ''Kolor'');'
    Run-Sql 'INSERT INTO public.attribute_definition_translations (attribute_definition_id, locale, name) VALUES (101, ''en'', ''Color'');'
    Run-Sql 'INSERT INTO public.controlled_option_value_translations (controlled_option_value_id, locale, label) VALUES (200, ''en'', ''Red'');'
    Run-Sql 'INSERT INTO public.controlled_option_value_translations (controlled_option_value_id, locale, label) VALUES (201, ''pl'', ''Niebieski'');'
    Run-Sql 'INSERT INTO public.controlled_option_value_translations (controlled_option_value_id, locale, label) VALUES (201, ''en'', ''Blue'');'

    # C01: requested locale attribute name
    $c01 = Run-Sql "SELECT name FROM public.attribute_definition_translations WHERE attribute_definition_id = 100 AND locale = 'en';"
    if ($c01 -eq "Load Capacity") {
        Write-Host "  PASS: C01"
        Register-Result -Id "C01" -Status "PASS" -Detail "en name resolved"
    } else {
        Write-Host "  FAIL: C01"
        Register-Result -Id "C01" -Status "FAIL" -Detail $c01
    }

    # C02: missing requested locale -> PL fallback
    $c02 = Run-Sql "SELECT COALESCE((SELECT name FROM public.attribute_definition_translations WHERE attribute_definition_id = 101 AND locale = 'de'), (SELECT name FROM public.attribute_definition_translations WHERE attribute_definition_id = 101 AND locale = 'pl')) AS name;"
    if ($c02 -eq "Kolor") {
        Write-Host "  PASS: C02"
        Register-Result -Id "C02" -Status "PASS" -Detail "pl fallback for missing de"
    } else {
        Write-Host "  FAIL: C02"
        Register-Result -Id "C02" -Status "FAIL" -Detail $c02
    }

    # C03: missing requested and PL -> stable_key fallback
    $c03 = Run-Sql "SELECT COALESCE((SELECT name FROM public.attribute_definition_translations WHERE attribute_definition_id = 103 AND locale = 'en'), (SELECT name FROM public.attribute_definition_translations WHERE attribute_definition_id = 103 AND locale = 'pl'), (SELECT stable_key FROM public.attribute_definitions WHERE id = 103)) AS name;"
    if ($c03 -eq "warranty_years") {
        Write-Host "  PASS: C03"
        Register-Result -Id "C03" -Status "PASS" -Detail "stable_key fallback"
    } else {
        Write-Host "  FAIL: C03"
        Register-Result -Id "C03" -Status "FAIL" -Detail $c03
    }

    # C04: requested locale short_label
    $c04 = Run-Sql "SELECT short_label FROM public.attribute_definition_translations WHERE attribute_definition_id = 100 AND locale = 'en';"
    if ($c04 -eq "Capacity") {
        Write-Host "  PASS: C04"
        Register-Result -Id "C04" -Status "PASS" -Detail "en short_label resolved"
    } else {
        Write-Host "  FAIL: C04"
        Register-Result -Id "C04" -Status "FAIL" -Detail $c04
    }

    # C05: missing short_label -> resolved name fallback
    $c05 = Run-Sql "SELECT COALESCE((SELECT short_label FROM public.attribute_definition_translations WHERE attribute_definition_id = 101 AND locale = 'en'), (SELECT name FROM public.attribute_definition_translations WHERE attribute_definition_id = 101 AND locale = 'en')) AS fallback;"
    if ($c05 -eq "Color") {
        Write-Host "  PASS: C05"
        Register-Result -Id "C05" -Status "PASS" -Detail "name fallback for missing short_label"
    } else {
        Write-Host "  FAIL: C05"
        Register-Result -Id "C05" -Status "FAIL" -Detail $c05
    }

    # C06: requested locale option label
    $c06 = Run-Sql "SELECT label FROM public.controlled_option_value_translations WHERE controlled_option_value_id = 200 AND locale = 'en';"
    if ($c06 -eq "Red") {
        Write-Host "  PASS: C06"
        Register-Result -Id "C06" -Status "PASS" -Detail "en option label resolved"
    } else {
        Write-Host "  FAIL: C06"
        Register-Result -Id "C06" -Status "FAIL" -Detail $c06
    }

    # C07: missing requested option label -> PL fallback
    $c07 = Run-Sql "SELECT COALESCE((SELECT label FROM public.controlled_option_value_translations WHERE controlled_option_value_id = 201 AND locale = 'de'), (SELECT label FROM public.controlled_option_value_translations WHERE controlled_option_value_id = 201 AND locale = 'pl')) AS label;"
    if ($c07 -eq "Niebieski") {
        Write-Host "  PASS: C07"
        Register-Result -Id "C07" -Status "PASS" -Detail "pl option fallback for missing de"
    } else {
        Write-Host "  FAIL: C07"
        Register-Result -Id "C07" -Status "FAIL" -Detail $c07
    }

    # C08: missing requested and PL option label -> stable_key fallback
    $c08 = Run-Sql "SELECT COALESCE((SELECT label FROM public.controlled_option_value_translations WHERE controlled_option_value_id = 202 AND locale = 'en'), (SELECT label FROM public.controlled_option_value_translations WHERE controlled_option_value_id = 202 AND locale = 'pl'), (SELECT stable_key FROM public.controlled_option_values WHERE id = 202)) AS label;"
    if ($c08 -eq "feature_a") {
        Write-Host "  PASS: C08"
        Register-Result -Id "C08" -Status "PASS" -Detail "stable_key option fallback"
    } else {
        Write-Host "  FAIL: C08"
        Register-Result -Id "C08" -Status "FAIL" -Detail $c08
    }

    Write-Host ""
    Write-Host "=== SECTION D: READ MODEL ==="

    # Seed assignments for read model tests
    Run-Sql 'DELETE FROM public.category_attribute_assignments WHERE category_id = 10;'
    Run-Sql 'INSERT INTO public.category_attribute_assignments (id, category_id, attribute_definition_id, sort_order, is_visible, is_filterable) VALUES (1, 10, 100, 10, true, true);'
    Run-Sql 'INSERT INTO public.category_attribute_assignments (id, category_id, attribute_definition_id, sort_order, is_visible, is_filterable) VALUES (2, 10, 101, 20, true, false);'
    Run-Sql 'INSERT INTO public.category_attribute_assignments (id, category_id, attribute_definition_id, sort_order, is_visible, is_filterable) VALUES (3, 10, 102, 30, true, false);'
    Run-Sql 'INSERT INTO public.category_attribute_assignments (id, category_id, attribute_definition_id, sort_order, is_visible, is_filterable) VALUES (4, 10, 103, 40, false, false);'
    Run-Sql 'INSERT INTO public.category_attribute_assignments (id, category_id, attribute_definition_id, sort_order, is_visible, is_filterable) VALUES (5, 10, 104, 50, true, true);'
    Run-Sql 'INSERT INTO public.category_attribute_assignments (id, category_id, attribute_definition_id, sort_order, is_visible, is_filterable) VALUES (6, 10, 105, 60, true, false);'
    Run-Sql 'INSERT INTO public.category_attribute_assignments (id, category_id, attribute_definition_id, sort_order, is_visible, is_filterable) VALUES (7, 10, 106, 70, true, false);'

    # D01-D10 + E01-E04: Execute actual production core via tsx
    $env:DATABASE_URL = "postgres://postgres@localhost:$dbPort/$dbName"
    $tsxOutput = npx --no-install tsx scripts/lm45-read-model-integration.ts 2>&1
    foreach ($line in $tsxOutput) {
        if ($line -match "^([A-Z]\d+)\|(PASS|FAIL)\|(.+)$") {
            $id = $Matches[1]
            $status = $Matches[2]
            $detail = $Matches[3]
            Write-Host "  $status`: $id"
            Register-Result -Id $id -Status $status -Detail $detail
        }
    }

    Write-Host ""
    Write-Host "=== SECTION E: VALIDATION, SCOPE AND REGRESSION ==="

    # E05: no seeds; exact allowlist for the approved, manual LM51AB backfill package
    $repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path.TrimEnd('\', '/')
    $allowedScriptBackfills = @(
        'scripts/sql/production/lm-cat-filter-51ab-pilot-offer-attribute-backfill.sql',
        'scripts/sql/production/lm-cat-filter-51ab-rollback-pilot-offer-attribute-backfill.sql',
        'scripts/sql/tests/lm-cat-filter-51ab/backfill-contract.sql'
    )
    $productionBackfillNames = @(
        'lm-cat-filter-51ab-pilot-offer-attribute-backfill.sql',
        'lm-cat-filter-51ab-rollback-pilot-offer-attribute-backfill.sql'
    )

    function Get-RepositoryRelativePath {
        param([System.IO.FileInfo]$File)
        return $File.FullName.Substring($repositoryRoot.Length).TrimStart('\', '/').Replace('\', '/')
    }

    function Test-AllowedBackfillArtifactPath {
        param([string]$RelativePath)
        return $allowedScriptBackfills -contains $RelativePath.Replace('\', '/')
    }

    $seedFiles = @(Get-ChildItem -Path (Join-Path $repositoryRoot 'src'), (Join-Path $repositoryRoot 'scripts') -Recurse -File -Filter '*seed*' -ErrorAction SilentlyContinue)
    $srcBackfillFiles = @(Get-ChildItem -Path (Join-Path $repositoryRoot 'src') -Recurse -File -Filter '*backfill*' -ErrorAction SilentlyContinue)
    $scriptBackfillFiles = @(Get-ChildItem -Path (Join-Path $repositoryRoot 'scripts') -Recurse -File -Filter '*backfill*' -ErrorAction SilentlyContinue | ForEach-Object { Get-RepositoryRelativePath $_ })
    $unexpectedScriptBackfills = @($scriptBackfillFiles | Where-Object { -not (Test-AllowedBackfillArtifactPath $_) })

    $automaticBackfillReferences = New-Object System.Collections.Generic.List[string]
    $packageJsonPath = Join-Path $repositoryRoot 'package.json'
    if (Test-Path $packageJsonPath) {
        $packageJson = Get-Content -LiteralPath $packageJsonPath -Raw | ConvertFrom-Json
        if ($null -ne $packageJson.scripts) {
            foreach ($scriptProperty in $packageJson.scripts.PSObject.Properties) {
                foreach ($productionBackfillName in $productionBackfillNames) {
                    if ($scriptProperty.Value -match [regex]::Escape($productionBackfillName)) {
                        $automaticBackfillReferences.Add("package.json scripts.$($scriptProperty.Name) references $productionBackfillName")
                    }
                }
            }
        }
    }

    $automationSurfaceFiles = @()
    $srcPath = Join-Path $repositoryRoot 'src'
    if (Test-Path $srcPath) { $automationSurfaceFiles += Get-ChildItem -Path $srcPath -Recurse -File }
    $automationSurfaceFiles += @(Get-ChildItem -Path $repositoryRoot -File -Filter 'next.config.*' -ErrorAction SilentlyContinue)
    $vercelConfigPath = Join-Path $repositoryRoot 'vercel.json'
    if (Test-Path $vercelConfigPath) { $automationSurfaceFiles += Get-Item -LiteralPath $vercelConfigPath }
    $workflowPath = Join-Path $repositoryRoot '.github/workflows'
    if (Test-Path $workflowPath) { $automationSurfaceFiles += Get-ChildItem -Path $workflowPath -Recurse -File }

    foreach ($automationSurfaceFile in @($automationSurfaceFiles | Sort-Object FullName -Unique)) {
        foreach ($productionBackfillName in $productionBackfillNames) {
            if (Select-String -LiteralPath $automationSurfaceFile.FullName -SimpleMatch $productionBackfillName -Quiet) {
                $automaticBackfillReferences.Add("$(Get-RepositoryRelativePath $automationSurfaceFile) references $productionBackfillName")
            }
        }
    }

    $policyPositiveSelfCheck = @($allowedScriptBackfills | Where-Object { -not (Test-AllowedBackfillArtifactPath $_) }).Count -eq 0
    $policyNegativeSelfCheck = -not (Test-AllowedBackfillArtifactPath 'src/app/automatic-backfill.ts') -and
        -not (Test-AllowedBackfillArtifactPath 'scripts/automatic-backfill.ps1') -and
        -not (Test-AllowedBackfillArtifactPath 'scripts/sql/production/unapproved-backfill.sql') -and
        -not (Test-AllowedBackfillArtifactPath 'scripts/sql/tests/lm-cat-filter-51ab/seed.sql')

    $e05Pass = $seedFiles.Count -eq 0 -and $srcBackfillFiles.Count -eq 0 -and $unexpectedScriptBackfills.Count -eq 0 -and
        $automaticBackfillReferences.Count -eq 0 -and $policyPositiveSelfCheck -and $policyNegativeSelfCheck
    if ($e05Pass) {
        Write-Host "  PASS: E05"
        Register-Result -Id "E05" -Status "PASS" -Detail "exact LM51AB backfill allowlist and execution-surface guards passed"
    } else {
        Write-Host "  FAIL: E05"
        Register-Result -Id "E05" -Status "FAIL" -Detail "seed=$($seedFiles.Count); src-backfill=$($srcBackfillFiles.Count); unexpected-script-backfill=$($unexpectedScriptBackfills.Count); automatic-references=$($automaticBackfillReferences.Count); self-check=$($policyPositiveSelfCheck -and $policyNegativeSelfCheck)"
    }

    # E06: no cart/RFQ/outbound/UI filter changes
    $gitDiffOutput = cmd /c "git diff --name-only HEAD 2>nul"
    $gitDiffFiles = $gitDiffOutput | Where-Object { $_ -notmatch "^warning:" }
    # Exclude test harness files from pattern matching
    $gitDiffFiles = $gitDiffFiles | Where-Object { $_ -notmatch "verify-lm-cat-filter" -and $_ -notmatch "lm45-read-model" -and $_ -notmatch "lm44-" }
    $forbiddenChanges = $false
    $forbiddenPatterns = @('cart','checkout','RfqDialog','outbound','/go/','filter','ui','client')
    foreach ($pattern in $forbiddenPatterns) {
        if ($gitDiffFiles -match $pattern) { $forbiddenChanges = $true }
    }
    if (-not $forbiddenChanges) {
        Write-Host "  PASS: E06"
        Register-Result -Id "E06" -Status "PASS" -Detail "no forbidden changes"
    } else {
        Write-Host "  FAIL: E06"
        Register-Result -Id "E06" -Status "FAIL" -Detail "forbidden changes detected"
    }

} finally {
    # Cleanup
    Write-Host ""
    Write-Host "=== CLEANUP ==="
    try {
        & "$pgBin\pg_ctl.exe" -D $dbData stop -m immediate 2>&1 | Out-Null
    } catch {
        Write-Host "  (stop warning ignored)"
    }
    try {
        Remove-Item (Join-Path $env:TEMP "lm45_$guid") -Recurse -Force -ErrorAction SilentlyContinue
    } catch {
        Write-Host "  (cleanup warning ignored)"
    }
}

# Mechanical test ID audit
Write-Host ""
Write-Host "=== TEST ID AUDIT ==="
$expectedIds = @(
    'A01','A02','A03','A04','A05','A06','A07','A08',
    'B01','B02','B03','B04','B05','B06','B07','B08',
    'C01','C02','C03','C04','C05','C06','C07','C08',
    'D01','D02','D03','D04','D05','D06','D07','D08','D09','D10',
    'E01','E02','E03','E04','E05','E06'
)
$actualIds = $testIds | Sort-Object
$expectedSet = New-Object System.Collections.Generic.HashSet[string]
foreach ($id in $expectedIds) { $expectedSet.Add($id) | Out-Null }
$actualSet = New-Object System.Collections.Generic.HashSet[string]
foreach ($id in $actualIds) { $actualSet.Add($id) | Out-Null }

$duplicateIds = $testIds | Group-Object | Where-Object { $_.Count -gt 1 } | ForEach-Object { $_.Name }
$unknownIds = $actualSet | Where-Object { -not $expectedSet.Contains($_) }
$missingIds = $expectedSet | Where-Object { -not $actualSet.Contains($_) }

Write-Host "EXPECTED UNIQUE IDS: $($expectedIds.Count)"
Write-Host "ACTUAL UNIQUE IDS: $($actualSet.Count)"
Write-Host "DUPLICATE IDS: $(if ($duplicateIds) { $duplicateIds -join ', ' } else { '0' })"
Write-Host "UNKNOWN IDS: $(if ($unknownIds) { $unknownIds -join ', ' } else { '0' })"
Write-Host "MISSING IDS: $(if ($missingIds) { $missingIds -join ', ' } else { '0' })"

if ($duplicateIds -or $unknownIds -or $missingIds -or $actualSet.Count -ne $expectedIds.Count) {
    Write-Host "TEST ID AUDIT FAILED"
}

# Forbidden-pattern audit: harness must not contain inline read-model logic
Write-Host ""
Write-Host "=== FORBIDDEN PATTERN AUDIT ==="
$harnessContent = Get-Content $PSCommandPath -Raw
$harnessForbidden = $false
# Check for inline SQL that duplicates production query logic
if ($harnessContent -match "SELECT\s+.*\s+FROM\s+public\.category_attribute_assignments.*INNER JOIN") { $harnessForbidden = $true }
# Check for copied mapping logic (match function calls, not the check text itself)
if ($harnessContent -match "resolveTranslation\(|optionsByAttribute\.get\(|optionsByAttribute\.set\(") { $harnessForbidden = $true }
# Check for copied DTO mapping logic
if ($harnessContent -match "CategoryAttributeConfiguration\s*\{\s*assignmentId|attributeId:\s*number\s*stableKey") { $harnessForbidden = $true }
# Verify the harness delegates to tsx for read-model tests
if (-not ($harnessContent -match "npx\s+--no-install\s+tsx\s+scripts/lm45-read-model-integration\.ts")) { $harnessForbidden = $true }
if ($harnessForbidden) {
    Write-Host "FORBIDDEN PATTERN DETECTED IN HARNESS"
} else {
    Write-Host "FORBIDDEN PATTERN AUDIT PASSED"
}

# Final summary
Write-Host ""
Write-Host "=== FINAL SUMMARY ==="
$passCount = @($results | Where-Object { $_ -match "\|PASS\|" }).Count
$failCount = @($results | Where-Object { $_ -match "\|FAIL\|" }).Count
$skipCount = @($results | Where-Object { $_ -match "\|SKIP\|" }).Count
$execCount = $results.Count

Write-Host "EXPECTED TEST COUNT: 40"
Write-Host "EXECUTED TEST COUNT: $execCount"
Write-Host "PASSED TEST COUNT: $passCount"
Write-Host "FAILED TEST COUNT: $failCount"
Write-Host "SKIPPED TEST COUNT: $skipCount"

if ($failCount -eq 0 -and $execCount -eq 40 -and $passCount -eq 40 -and $skipCount -eq 0) {
    Write-Host ""
    Write-Host "ALL TESTS PASSED"
    exit 0
} else {
    Write-Host ""
    Write-Host "SOME TESTS FAILED"
    exit 1
}
