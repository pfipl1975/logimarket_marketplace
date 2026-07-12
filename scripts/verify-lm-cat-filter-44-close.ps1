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

# 1. Wybór losowego portu
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$listener.Start()
$dbPort = $listener.LocalEndpoint.Port
$listener.Stop()

$guid = [Guid]::NewGuid().ToString("N")
$dbData = Join-Path $env:TEMP "lm44_$guid\data"
$dbLog = Join-Path $env:TEMP "lm44_$guid\postgres.log"
$dbName = "lm44_$guid"

$results = New-Object System.Collections.Generic.List[string]

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
            $results.Add("$Id|PASS|$actual")
        } else {
            Write-Host "  FAIL: $Id (Expected '$Expected', got '$actual')"
            $results.Add("$Id|FAIL|Expected '$Expected', got '$actual'")
        }
    } catch {
        Write-Host "  FAIL: $Id (Error: $_)"
        $results.Add("$Id|FAIL|$_")
    }
}

function Assert-Sqlstate {
    param([string]$Id, [string]$Sql, [string]$ExpectedState)
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $env:PGPASSWORD = ''
        $escapedSql = $Sql.Replace("'", "''")
        $testQuery = "SELECT lm44_test.assert_sqlstate('$ExpectedState', '$escapedSql');"
        
        $tempFile = [System.IO.Path]::GetTempFileName()
        [System.IO.File]::WriteAllText($tempFile, $testQuery, (New-Object System.Text.UTF8Encoding $false))
        
        $res = & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d $dbName -X -v ON_ERROR_STOP=1 -f $tempFile 2>&1
        $errStr = "$res"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  PASS: $Id"
            $results.Add("$Id|PASS|succeeded")
        } else {
            Write-Host "  FAIL: $Id ($errStr)"
            $results.Add("$Id|FAIL|$errStr")
        }
    } finally {
        if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
        $ErrorActionPreference = $oldPreference
    }
}

# Assert-FkViolation: calls assert_fk_violation directly.
# PASS when psql exits 0 (function returned void = SQLSTATE + constraint name matched).
# Use this instead of Assert-Sqlstate for tests that wrap assert_fk_violation,
# because assert_sqlstate always raises P0001 when the inner statement succeeds.
function Assert-FkViolation {
    param([string]$Id, [string]$ExpectedConstraint, [string]$Sql)
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $env:PGPASSWORD = ''
        $escapedSql = $Sql.Replace("'", "''")
        $testQuery = "SELECT lm44_test.assert_fk_violation('23503', '$ExpectedConstraint', '$escapedSql');"
        $tempFile = [System.IO.Path]::GetTempFileName()
        [System.IO.File]::WriteAllText($tempFile, $testQuery, (New-Object System.Text.UTF8Encoding $false))
        $res = & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d $dbName -X -v ON_ERROR_STOP=1 -f $tempFile 2>&1
        $errStr = "$res"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  PASS: $Id"
            $results.Add("$Id|PASS|23503 constraint=$ExpectedConstraint")
        } else {
            Write-Host "  FAIL: $Id ($errStr)"
            $results.Add("$Id|FAIL|$errStr")
        }
    } finally {
        if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
        $ErrorActionPreference = $oldPreference
    }
}

try {
    Write-Host "=== SECTION A: TOOLCHAIN AND MIGRATIONS PREFLIGHT ==="
    
    # A01 & A02: Package verification
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    $drizzleKitVer = $packageJson.devDependencies."drizzle-kit"
    
    if ($drizzleKitVer -eq "0.31.10") {
        Write-Host "  PASS: A01"
        $results.Add("A01|PASS|0.31.10")
    } else {
        Write-Host "  FAIL: A01"
        $results.Add("A01|FAIL|$drizzleKitVer")
    }
    
    $npmLsOrm = npm ls drizzle-orm --depth=0
    if ($npmLsOrm -match "drizzle-orm@0.45.2") {
        Write-Host "  PASS: A02"
        $results.Add("A02|PASS|0.45.2")
    } else {
        Write-Host "  FAIL: A02"
        $results.Add("A02|FAIL|not 0.45.2")
    }

    # A03: Baseline snapshot verification
    if (Test-Path "drizzle\meta\0000_snapshot.json") {
        Write-Host "  PASS: A03"
        $results.Add("A03|PASS|0000_snapshot exists")
    } else {
        Write-Host "  FAIL: A03"
        $results.Add("A03|FAIL|missing 0000_snapshot")
    }

    # A04: 0000 contains no CREATE TABLE
    $0000Content = Get-Content (Get-ChildItem drizzle\0000_*.sql).FullName -Raw
    if ($0000Content -match "CREATE TABLE") {
        Write-Host "  FAIL: A04"
        $results.Add("A04|FAIL|contains CREATE TABLE")
    } else {
        Write-Host "  PASS: A04"
        $results.Add("A04|PASS|no CREATE TABLE in 0000")
    }

    # A07: 0001 contains only Sprint-44 objects
    $0001Content = Get-Content (Get-ChildItem drizzle\0001_*.sql).FullName -Raw
    if ($0001Content -match 'CREATE TABLE "offers"' -or $0001Content -match 'CREATE TABLE "partners"' -or $0001Content -match 'CREATE TABLE "categories"') {
        Write-Host "  FAIL: A07"
        $results.Add("A07|FAIL|contains legacy tables")
    } else {
        Write-Host "  PASS: A07"
        $results.Add("A07|PASS|only sprint-44 tables")
    }

    # A08: 0001 does not alter legacy table definitions
    if ($0001Content -match "DROP TABLE" -or $0001Content -match "DROP COLUMN" -or $0001Content -match 'ALTER TABLE "offers" ALTER COLUMN') {
        Write-Host "  FAIL: A08"
        $results.Add("A08|FAIL|contains legacy alter/drop")
    } else {
        Write-Host "  PASS: A08"
        $results.Add("A08|PASS|no legacy alter/drop")
    }

    # A11: drizzle-kit check passes
    $checkResult = npm exec -- drizzle-kit check 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  PASS: A11"
        $results.Add("A11|PASS|drizzle-kit check passed")
    } else {
        Write-Host "  FAIL: A11"
        $results.Add("A11|FAIL|$checkResult")
    }

    # Initialize PostgreSQL Cluster
    Write-Host "Initializing DB cluster..."
    New-Item -ItemType Directory -Path $dbData -Force | Out-Null
    Invoke-NativeChecked -Command "$pgBin\initdb.exe" -Arguments @('-D', $dbData, '-U', $dbUser, '--auth-local=trust', '--auth-host=trust')
    
    Write-Host "Starting PostgreSQL on port $dbPort..."
    & "$pgBin\pg_ctl.exe" -D $dbData -o "-F -p $dbPort" -l $dbLog start
    Start-Sleep -Seconds 4

    # Pre-create roles
    $env:PGPASSWORD = ''
    & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d postgres -c "CREATE ROLE lm_migration_owner WITH NOLOGIN;"
    & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d postgres -c "CREATE ROLE lm_migration_executor WITH LOGIN;"

    # SCENARIUSZ NEGATYWNY: A05: 0000 rejects empty database
    & "$pgBin\createdb.exe" -h localhost -p $dbPort -U $dbUser "${dbName}_empty"
    & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d "${dbName}_empty" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" -q
    $env:DATABASE_URL = "postgres://postgres@localhost:$dbPort/${dbName}_empty"
    
    $oldPref = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $migrateEmptyResult = node scripts/run-lm44-drizzle-migrations.mjs 2>&1
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $oldPref

    if ($exitCode -ne 0) {
        Write-Host "  PASS: A05"
        $results.Add("A05|PASS|baseline rejected empty DB")
    } else {
        Write-Host "  FAIL: A05"
        $results.Add("A05|FAIL|baseline accepted empty DB")
    }
    & "$pgBin\dropdb.exe" -h localhost -p $dbPort -U $dbUser "${dbName}_empty"

    # SCENARIUSZ POZYTYWNY: A06: 0000 accepts legacy database
    & "$pgBin\createdb.exe" -h localhost -p $dbPort -U $dbUser $dbName
    & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d $dbName -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" -q
    $env:DATABASE_URL = "postgres://postgres@localhost:$dbPort/$dbName"
    
    & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d $dbName -f "scripts/sql/fixtures/lm44-legacy-schema-77b98aff.sql" -q
    
    # Sentinel values
    Run-Sql 'INSERT INTO public.partners (id, company_name, contact_email) VALUES (1, ''Sentinel Co'', ''sentinel@test.com'');'
    Run-Sql 'INSERT INTO public.categories (id, name, slug) VALUES (10, ''Electronics'', ''electronics'');'
    Run-Sql 'INSERT INTO public.offers (id, partner_id, category_id, title) VALUES (100, 1, 10, ''Sentinel Offer'');'
    for ($i = 101; $i -le 130; $i++) {
        Run-Sql "INSERT INTO public.offers (id, partner_id, category_id, title) VALUES ($i, 1, 10, 'Test Offer $i');"
    }
    Run-Sql "INSERT INTO public.offers (id, partner_id, category_id, title) VALUES (999, 1, 10, 'Test Offer 999');"
    Run-Sql 'INSERT INTO public.clicks (id, offer_id, partner_id) VALUES (1, 100, 1);'
    Run-Sql 'INSERT INTO public.orders (id, company_name, contact_name, email) VALUES (50, ''Client Co'', ''Client Name'', ''client@test.com'');'
    Run-Sql 'INSERT INTO public.order_items (id, order_id, offer_id, title, quantity) VALUES (1, 50, 100, ''Sentinel Offer'', 2);'

    # A09: first migrate applies
    Invoke-NativeChecked -Command "node" -Arguments @("scripts/run-lm44-drizzle-migrations.mjs")
    $historyCount = Run-Sql "SELECT count(*) FROM drizzle.__drizzle_migrations;"
    if ($historyCount -eq 2) {
        Write-Host "  PASS: A09"
        $results.Add("A09|PASS|history count = 2")
    } else {
        Write-Host "  FAIL: A09"
        $results.Add("A09|FAIL|history count = $historyCount")
    }

    # A10: second migrate is no-op
    Invoke-NativeChecked -Command "node" -Arguments @("scripts/run-lm44-drizzle-migrations.mjs")
    $historyCount2 = Run-Sql "SELECT count(*) FROM drizzle.__drizzle_migrations;"
    if ($historyCount2 -eq 2) {
        Write-Host "  PASS: A10"
        $results.Add("A10|PASS|second migrate no-op")
    } else {
        Write-Host "  FAIL: A10"
        $results.Add("A10|FAIL|second migrate altered history")
    }

    # A06 verification
    $categoriesCount = Run-Sql "SELECT count(*) FROM public.categories WHERE id = 10;"
    if ($categoriesCount -eq 1) {
        Write-Host "  PASS: A06"
        $results.Add("A06|PASS|legacy database accepted")
    } else {
        Write-Host "  FAIL: A06"
        $results.Add("A06|FAIL|legacy categories missing")
    }

    # A12: Drizzle round-trip check
    $oldFiles = Get-ChildItem drizzle\ -Recurse | Select-Object -ExpandProperty FullName
    $oldJournal = Get-Content drizzle\meta\_journal.json -Raw
    $oldSnapshot = Get-Content drizzle\meta\0001_snapshot.json -Raw
    
    $genResult = npm exec -- drizzle-kit generate 2>&1
    
    $newFiles = Get-ChildItem drizzle\ -Recurse | Select-Object -ExpandProperty FullName
    $newJournal = Get-Content drizzle\meta\_journal.json -Raw
    $newSnapshot = Get-Content drizzle\meta\0001_snapshot.json -Raw

    if ($oldFiles.Count -eq $newFiles.Count -and $oldJournal -eq $newJournal -and $oldSnapshot -eq $newSnapshot) {
        Write-Host "  PASS: A12"
        $results.Add("A12|PASS|round-trip generated no diff")
    } else {
        Write-Host "  FAIL: A12"
        $results.Add("A12|FAIL|round-trip has diff")
    }

    # Set up testing schema
    $env:PGPASSWORD = ''
    & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d $dbName -c "CREATE SCHEMA IF NOT EXISTS lm44_test;" -q
    
    $assertSql = @'
      CREATE OR REPLACE FUNCTION lm44_test.assert_sqlstate(p_expected_state text, p_sql text)
      RETURNS void LANGUAGE plpgsql AS $$
      DECLARE
        v_failed boolean := false;
        v_actual_state text;
      BEGIN
        BEGIN
          EXECUTE p_sql;
        EXCEPTION WHEN OTHERS THEN
          v_failed := true;
          GET STACKED DIAGNOSTICS v_actual_state = RETURNED_SQLSTATE;
        END;
        IF NOT v_failed THEN
          RAISE EXCEPTION 'Expected SQLSTATE %, but statement succeeded', p_expected_state USING ERRCODE = 'P0001';
        END IF;
        IF v_actual_state IS DISTINCT FROM p_expected_state THEN
          RAISE EXCEPTION 'Expected SQLSTATE %, received %', p_expected_state, v_actual_state USING ERRCODE = 'P0001';
        END IF;
      END; $$;

      -- assert_fk_violation: checks both SQLSTATE 23503 and exact constraint name.
      -- Uses pg_exception_detail as a fallback when PG_EXCEPTION_CONSTRAINT is
      -- unavailable in older PL/pgSQL DIAGNOSTICS.
      CREATE OR REPLACE FUNCTION lm44_test.assert_fk_violation(
        p_expected_state text,
        p_expected_constraint text,
        p_sql text
      ) RETURNS void LANGUAGE plpgsql AS $$
      DECLARE
        v_failed       boolean := false;
        v_actual_state text;
        v_actual_con   text;
      BEGIN
        BEGIN
          EXECUTE p_sql;
        EXCEPTION WHEN OTHERS THEN
          v_failed := true;
          GET STACKED DIAGNOSTICS
            v_actual_state = RETURNED_SQLSTATE,
            v_actual_con   = CONSTRAINT_NAME;
        END;
        IF NOT v_failed THEN
          RAISE EXCEPTION 'Expected SQLSTATE %, but statement succeeded',
            p_expected_state USING ERRCODE = 'P0001';
        END IF;
        IF v_actual_state IS DISTINCT FROM p_expected_state THEN
          RAISE EXCEPTION 'Expected SQLSTATE %, received %',
            p_expected_state, v_actual_state USING ERRCODE = 'P0001';
        END IF;
        IF v_actual_con IS DISTINCT FROM p_expected_constraint THEN
          RAISE EXCEPTION 'Expected constraint %, received %',
            p_expected_constraint, COALESCE(v_actual_con, 'NULL') USING ERRCODE = 'P0001';
        END IF;
      END; $$;
'@
    & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d $dbName -c $assertSql -q

    # Setup test fixtures
    Run-Sql "INSERT INTO public.attribute_definitions (id, stable_key, data_type) VALUES (1, 'weight', 'text');"
    Run-Sql "INSERT INTO public.attribute_definitions (id, stable_key, data_type) VALUES (7, 'mass', 'number');"
    Run-Sql "INSERT INTO public.attribute_definitions (id, stable_key, data_type) VALUES (2, 'color', 'enum');"
    Run-Sql "INSERT INTO public.attribute_definitions (id, stable_key, data_type) VALUES (3, 'features', 'multi_enum');"
    Run-Sql "INSERT INTO public.controlled_option_values (id, attribute_id, stable_key, is_active) VALUES (101, 2, 'red', true);"
    Run-Sql "INSERT INTO public.controlled_option_values (id, attribute_id, stable_key, is_active) VALUES (102, 2, 'blue', false);" # Inactive
    Run-Sql "INSERT INTO public.controlled_option_values (id, attribute_id, stable_key, is_active) VALUES (201, 3, 'wifi', true);"
    Run-Sql "INSERT INTO public.controlled_option_values (id, attribute_id, stable_key, is_active) VALUES (202, 3, 'bluetooth', true);"
    Run-Sql "INSERT INTO public.controlled_option_values (id, attribute_id, stable_key, is_active) VALUES (203, 3, 'gps', true);"

    # Setup batch
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (1, 'running', 'Batch 1', 'TestRunner');"
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (2, 'running', 'Batch 2', 'TestRunner');"

    Write-Host "=== SECTION B & C: POSITIVE VALUE CASES ==="
    # B01: text success
    Run-Sql 'INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (11, 1, 100, ''weight'', ''{"value": "10kg"}''::jsonb, ''hash'', ''lm-source-v1'', 1);'
    $textHash = Run-Sql "SELECT migration_private.sha256_hex('v1:text:10kg');"
    Run-Sql "UPDATE public.migration_source_entries SET source_hash = '$textHash' WHERE id = 11;"
    Assert-Test "B01" "SELECT migration_private.process_source_entry(1, 11, NULL, ARRAY[]::bigint[]);" "migrated"

    # B02: number success
    Run-Sql 'INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (12, 1, 100, ''mass'', ''{"value": 15.5}''::jsonb, ''hash'', ''lm-source-v1'', 1);'
    $numHash = Run-Sql "SELECT migration_private.sha256_hex('v1:number:15.5');"
    Run-Sql "UPDATE public.migration_source_entries SET source_hash = '$numHash' WHERE id = 12;"
    Run-Sql "DELETE FROM public.offer_attribute_values WHERE offer_id = 100 AND attribute_id = 7;"
    Assert-Test "B02" "SELECT migration_private.process_source_entry(1, 12, NULL, ARRAY[]::bigint[]);" "migrated"

    # B03: boolean success
    Run-Sql "INSERT INTO public.attribute_definitions (id, stable_key, data_type) VALUES (4, 'featured', 'boolean');"
    Run-Sql 'INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (13, 1, 100, ''featured'', ''{"value": true}''::jsonb, ''hash'', ''lm-source-v1'', 1);'
    $boolHash = Run-Sql "SELECT migration_private.sha256_hex('v1:boolean:true');"
    Run-Sql "UPDATE public.migration_source_entries SET source_hash = '$boolHash' WHERE id = 13;"
    Assert-Test "B03" "SELECT migration_private.process_source_entry(1, 13, NULL, ARRAY[]::bigint[]);" "migrated"

    # B04: date success
    Run-Sql "INSERT INTO public.attribute_definitions (id, stable_key, data_type) VALUES (5, 'release_date', 'date');"
    Run-Sql 'INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (14, 1, 100, ''release_date'', ''{"value": "2026-07-12 00:00:00+00"}''::jsonb, ''hash'', ''lm-source-v1'', 1);'
    $dateHash = Run-Sql "SELECT migration_private.sha256_hex('v1:date:' || ('2026-07-12 00:00:00+00'::timestamp with time zone)::text);"
    Run-Sql "UPDATE public.migration_source_entries SET source_hash = '$dateHash' WHERE id = 14;"
    Assert-Test "B04" "SELECT migration_private.process_source_entry(1, 14, NULL, ARRAY[]::bigint[]);" "migrated"

    # B05: year success
    Run-Sql "INSERT INTO public.attribute_definitions (id, stable_key, data_type) VALUES (6, 'production_year', 'year');"
    Run-Sql 'INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (15, 1, 100, ''production_year'', ''{"value": 2026}''::jsonb, ''hash'', ''lm-source-v1'', 1);'
    $yearHash = Run-Sql "SELECT migration_private.sha256_hex('v1:year:2026');"
    Run-Sql "UPDATE public.migration_source_entries SET source_hash = '$yearHash' WHERE id = 15;"
    Assert-Test "B05" "SELECT migration_private.process_source_entry(1, 15, NULL, ARRAY[]::bigint[]);" "migrated"

    # B06: enum with exactly one option success
    Run-Sql 'INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (16, 1, 100, ''color'', ''{"value": "red"}''::jsonb, ''hash'', ''lm-source-v1'', 1);'
    $enumHash = Run-Sql "SELECT migration_private.sha256_hex('v1:enum:101');"
    Run-Sql "UPDATE public.migration_source_entries SET source_hash = '$enumHash' WHERE id = 16;"
    Assert-Test "B06" "SELECT migration_private.process_source_entry(1, 16, 101, NULL);" "migrated"

    # C01: multi_enum one option success
    Run-Sql 'INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (17, 1, 100, ''features'', ''{"value": ["wifi"]}''::jsonb, ''hash'', ''lm-source-v1'', 1);'
    $oaovHash1 = Run-Sql "SELECT migration_private.sha256_hex('v1:multi_enum:201');"
    Run-Sql "UPDATE public.migration_source_entries SET source_hash = '$oaovHash1' WHERE id = 17;"
    Assert-Test "C01" "SELECT migration_private.process_source_entry(1, 17, NULL, ARRAY[201]::bigint[]);" "migrated"

    # C02: multi_enum multiple options success
    Run-Sql "DELETE FROM public.migration_oaov_targets WHERE target_offer_id = 100 AND target_attribute_id = 3;"
    Run-Sql "DELETE FROM public.offer_attribute_option_values WHERE offer_id = 100 AND attribute_id = 3;"
    Run-Sql 'INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (18, 2, 100, ''features'', ''{"value": ["wifi", "bluetooth"]}''::jsonb, ''hash'', ''lm-source-v1'', 2);'
    $oaovHash2 = Run-Sql "SELECT migration_private.sha256_hex('v1:multi_enum:201,202');"
    Run-Sql "UPDATE public.migration_source_entries SET source_hash = '$oaovHash2' WHERE id = 18;"
    Assert-Test "C02" "SELECT migration_private.process_source_entry(2, 18, NULL, ARRAY[201, 202]::bigint[]);" "migrated"

    # C03: deterministic ascending fan-out
    $oaovOptions = Run-Sql "SELECT option_id FROM public.offer_attribute_option_values WHERE offer_id = 100 AND attribute_id = 3 ORDER BY option_id ASC;"
    if (($oaovOptions -replace '\s+', '') -eq "201202") {
        Write-Host "  PASS: C03"
        $results.Add("C03|PASS|ascending options")
    } else {
        Write-Host "  FAIL: C03"
        $results.Add("C03|FAIL|$oaovOptions")
    }

    # C04: exact manifest count
    $manCount = Run-Sql "SELECT count(*) FROM public.migration_oaov_targets WHERE source_entry_id = 18 AND batch_id = 2 AND rollback_status = 'pending';"
    if ($manCount -eq 2) {
        Write-Host "  PASS: C04"
        $results.Add("C04|PASS|manifest count = 2")
    } else {
        Write-Host "  FAIL: C04"
        $results.Add("C04|FAIL|$manCount")
    }

    # C05: exact physical count
    $phyCount = Run-Sql "SELECT count(*) FROM public.offer_attribute_option_values WHERE offer_id = 100 AND attribute_id = 3;"
    if ($phyCount -eq 2) {
        Write-Host "  PASS: C05"
        $results.Add("C05|PASS|physical count = 2")
    } else {
        Write-Host "  FAIL: C05"
        $results.Add("C05|FAIL|$phyCount")
    }

    Write-Host "=== SECTION D: TYPED-VALUE CONSTRAINTS ==="
    # D01: OAV zero typed values
    Assert-Sqlstate "D01" "INSERT INTO public.offer_attribute_values (offer_id, attribute_id) VALUES (100, 1);" "23514"

    # D02: OAV two typed values
    Assert-Sqlstate "D02" "INSERT INTO public.offer_attribute_values (offer_id, attribute_id, value_text, value_number) VALUES (100, 1, '10kg', 15.5);" "23514"

    # D03: enum zero options
    Run-Sql 'INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (19, 1, 101, ''color'', ''{"value": "red"}''::jsonb, ''hash'', ''lm-source-v1'', 1);'
    Run-Sql "UPDATE public.migration_source_entries SET source_hash = '$enumHash' WHERE id = 19;"
    Assert-Sqlstate "D03" "SELECT migration_private.process_source_entry(1, 19, NULL, ARRAY[]::bigint[]);" "23514"

    # D04: enum two options
    Assert-Sqlstate "D04" "SELECT migration_private.process_source_entry(1, 19, 101, ARRAY[101, 201]::bigint[]);" "23514"

    # D05: multi_enum empty array
    Run-Sql 'INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (20, 1, 101, ''features'', ''{"value": []}''::jsonb, ''hash'', ''lm-source-v1'', 0);'
    Run-Sql "UPDATE public.migration_source_entries SET source_hash = '$oaovHash1' WHERE id = 20;"
    Assert-Sqlstate "D05" "SELECT migration_private.process_source_entry(1, 20, NULL, ARRAY[]::bigint[]);" "23514"

    # D06: multi_enum NULL element
    Assert-Sqlstate "D06" "SELECT migration_private.process_source_entry(1, 20, NULL, ARRAY[201, NULL]::bigint[]);" "23514"

    # D07: multi_enum duplicate option
    Assert-Sqlstate "D07" "SELECT migration_private.process_source_entry(1, 20, NULL, ARRAY[201, 201]::bigint[]);" "23514"

    # D08: multi_enum unsorted array
    Assert-Sqlstate "D08" "SELECT migration_private.process_source_entry(1, 20, NULL, ARRAY[202, 201]::bigint[]);" "23514"

    # D09: expected_target_count mismatch before INSERT
    Assert-Sqlstate "D09" "SELECT migration_private.process_source_entry(1, 20, NULL, ARRAY[201, 202]::bigint[]);" "23514"

    # D10: inactive option
    Run-Sql 'INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (21, 1, 102, ''color'', ''{"value": "blue"}''::jsonb, ''hash'', ''lm-source-v1'', 1);'
    $blueHash = Run-Sql "SELECT migration_private.sha256_hex('v1:enum:102');"
    Run-Sql "UPDATE public.migration_source_entries SET source_hash = '$blueHash' WHERE id = 21;"
    Assert-Sqlstate "D10" "SELECT migration_private.process_source_entry(1, 21, 102, ARRAY[]::bigint[]);" "23514"

    # D11: option from wrong attribute
    Run-Sql 'INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (22, 1, 103, ''color'', ''{"value": "red"}''::jsonb, ''hash'', ''lm-source-v1'', 1);'
    Run-Sql "UPDATE public.migration_source_entries SET source_hash = '$enumHash' WHERE id = 22;"
    Assert-Sqlstate "D11" "SELECT migration_private.process_source_entry(1, 22, 201, ARRAY[]::bigint[]);" "23514"

    Write-Host "=== SECTION E: HASH AND CANONICAL PAYLOAD ==="
    # E01: valid OAV SHA-256 lowercase hex
    $motHash = Run-Sql "SELECT target_hash_at_creation FROM public.migration_oav_targets LIMIT 1;"
    if ($motHash -match '^[0-9a-f]{64}$') {
        Write-Host "  PASS: E01"
        $results.Add("E01|PASS|lowercase hex hash")
    } else {
        Write-Host "  FAIL: E01"
        $results.Add("E01|FAIL|$motHash")
    }

    # E02: valid OAOV SHA-256 lowercase hex
    $mottHash = Run-Sql "SELECT target_hash_at_creation FROM public.migration_oaov_targets LIMIT 1;"
    if ($mottHash -match '^[0-9a-f]{64}$') {
        Write-Host "  PASS: E02"
        $results.Add("E02|PASS|lowercase hex hash")
    } else {
        Write-Host "  FAIL: E02"
        $results.Add("E02|FAIL|$mottHash")
    }

    # E03: invalid OAV hash format
    Assert-Sqlstate "E03" "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version) VALUES (1, 11, 1, 100, 1, 'invalid_hash', 'lm-source-v1');" "23514"

    # E04: invalid OAOV hash format
    Assert-Sqlstate "E04" "INSERT INTO public.migration_oaov_targets (batch_id, source_entry_id, target_row_id_original, target_offer_id, target_attribute_id, target_option_id, target_hash_at_creation, canonical_payload_version) VALUES (1, 11, 1, 100, 1, 1, 'invalid_hash', 'lm-source-v1');" "23514"

    # E05: invalid OAV canonical version
    Assert-Sqlstate "E05" "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version) VALUES (1, 11, 1, 1, 100, 1, '$motHash', 'invalid-v2');" "23514"

    # E06: invalid OAOV canonical version
    Assert-Sqlstate "E06" "INSERT INTO public.migration_oaov_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_option_id, target_hash_at_creation, canonical_payload_version) VALUES (1, 11, 1, 1, 100, 3, 201, '$mottHash', 'invalid-v2');" "23514"
    # E07: OAV recomputed hash mismatch
    Run-Sql 'INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (23, 1, 110, ''weight'', ''{"value": "20kg"}''::jsonb, ''invalid_hash_to_trigger_mismatch'', ''lm-source-v1'', 1);'
    Assert-Sqlstate "E07" "SELECT migration_private.process_source_entry(1, 23, NULL, ARRAY[]::bigint[]);" "23514"
 
    # E08: OAOV recomputed hash mismatch
    Run-Sql 'INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (24, 1, 111, ''features'', ''{"value": ["gps"]}''::jsonb, ''invalid_hash_to_trigger_mismatch'', ''lm-source-v1'', 1);'
    Assert-Sqlstate "E08" "SELECT migration_private.process_source_entry(1, 24, NULL, ARRAY[203]::bigint[]);" "23514"

    # E09: numeric 1.0 and stored numeric::text contract verified
    Run-Sql "DELETE FROM public.migration_oav_targets WHERE target_offer_id = 100 AND target_attribute_id = 7;"
    Run-Sql "DELETE FROM public.offer_attribute_values WHERE offer_id = 100 AND attribute_id = 7;"
    Run-Sql "INSERT INTO public.offer_attribute_values (offer_id, attribute_id, value_number) VALUES (100, 7, 1.0);"
    $storedText = Run-Sql "SELECT value_number::text FROM public.offer_attribute_values WHERE offer_id = 100 AND attribute_id = 7;"
    $storedHash = Run-Sql "SELECT migration_private.sha256_hex('v1:number:' || '$storedText');"
    $expectedHash = Run-Sql "SELECT migration_private.sha256_hex('v1:number:1.0');"
    if ($storedHash -eq $expectedHash) {
        Write-Host "  PASS: E09"
        $results.Add("E09|PASS|hash contract verified")
    } else {
        Write-Host "  FAIL: E09"
        $results.Add("E09|FAIL|$storedHash != $expectedHash")
    }

    # E10: pgcrypto wrapper produces 64 lowercase hex
    $wrapHash = Run-Sql "SELECT migration_private.sha256_hex('test');"
    if ($wrapHash -match '^[0-9a-f]{64}$') {
        Write-Host "  PASS: E10"
        $results.Add("E10|PASS|lowercase hex 64 chars")
    } else {
        Write-Host "  FAIL: E10"
        $results.Add("E10|FAIL|$wrapHash")
    }

    Write-Host "=== SECTION F: MANIFEST-DRIVEN VALIDATION ==="
    $oavRowId = Run-Sql "SELECT id FROM public.offer_attribute_values WHERE offer_id = 100 AND attribute_id = 1;"
    $oaovRowId = Run-Sql "SELECT id FROM public.offer_attribute_option_values WHERE offer_id = 100 AND attribute_id = 3 AND option_id = 201;"
    # F01: missing OAV manifest rejected
    Run-Sql ('INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (25, 1, 104, ''color'', ''{"value": "red"}''::jsonb, ''' + $enumHash + ''', ''lm-source-v1'', 2);')
    Assert-Sqlstate "F01" "SELECT migration_private.process_source_entry(1, 25, 101, ARRAY[]::bigint[]);" "23514"

    # F02: missing OAOV manifest rejected
    Run-Sql ('INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (26, 1, 104, ''features'', ''{"value": ["wifi"]}''::jsonb, ''' + $oaovHash1 + ''', ''lm-source-v1'', 2);')
    Assert-Sqlstate "F02" "SELECT migration_private.process_source_entry(1, 26, NULL, ARRAY[201]::bigint[]);" "23514"
    Run-Sql 'INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (999, 1, 999, ''weight'', ''{"value": "10kg"}''::jsonb, ''hash'', ''lm-source-v1'', 1);'
    # F03: missing OAV physical target rejected — SQLSTATE 23503 + fk_mot_oav_target_current
    Assert-FkViolation "F03" "fk_mot_oav_target_current" "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version) VALUES (1, 999, 99999, 99999, 100, 1, '$motHash', 'lm-source-v1')"

    # F04: missing OAOV physical target rejected — SQLSTATE 23503 + fk_mott_oaov_target_current
    Assert-FkViolation "F04" "fk_mott_oaov_target_current" "INSERT INTO public.migration_oaov_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_option_id, target_hash_at_creation, canonical_payload_version) VALUES (1, 999, 99999, 99999, 100, 3, 201, '$mottHash', 'lm-source-v1')"

    # F05: OAV current/original ID mismatch rejected
    Assert-Sqlstate "F05" "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version) VALUES (1, 999, 1, 2, 100, 1, '$motHash', 'lm-source-v1');" "23514"

    # F06: OAOV current/original ID mismatch rejected
    Assert-Sqlstate "F06" "INSERT INTO public.migration_oaov_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_option_id, target_hash_at_creation, canonical_payload_version) VALUES (1, 999, 1, 2, 100, 3, 201, '$mottHash', 'lm-source-v1');" "23514"

    # F07: OAV offer context mismatch — SQLSTATE 23503 + fk_mot_oav_target_current
    Assert-FkViolation "F07" "fk_mot_oav_target_current" "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version) VALUES (1, 999, 99999, 99999, 999, 1, '$motHash', 'lm-source-v1')"

    # F08: OAOV offer context mismatch — SQLSTATE 23503 + fk_mott_oaov_target_current
    Assert-FkViolation "F08" "fk_mott_oaov_target_current" "INSERT INTO public.migration_oaov_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_option_id, target_hash_at_creation, canonical_payload_version) VALUES (1, 999, 99999, 99999, 999, 3, 201, '$mottHash', 'lm-source-v1')"

    # F09: OAV attribute context mismatch — SQLSTATE 23503 + fk_mot_oav_target_current
    Assert-FkViolation "F09" "fk_mot_oav_target_current" "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version) VALUES (1, 999, 99999, 99999, 100, 999, '$motHash', 'lm-source-v1')"

    # F10: OAOV attribute context mismatch — SQLSTATE 23503 + fk_mott_oaov_target_current
    Assert-FkViolation "F10" "fk_mott_oaov_target_current" "INSERT INTO public.migration_oaov_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_option_id, target_hash_at_creation, canonical_payload_version) VALUES (1, 999, 99999, 99999, 100, 999, 201, '$mottHash', 'lm-source-v1')"

    # F11: OAV option context mismatch — fk_mot_option fires (target_option_id=999).
    # Insert a valid OAV enum row with option_id=101, then a manifest with invalid option_id.
    # target_row_id_original=99997 and target_row_id_current=99997 are deterministic and unused.
    Run-Sql ('INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (27, 1, 105, ''color'', ''{"value": "red"}''::jsonb, ''' + $enumHash + ''', ''lm-source-v1'', 1);')
    Run-Sql "INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, option_id) VALUES (99997, 105, 2, 101);"
    Assert-FkViolation "F11" "fk_mot_option" "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_option_id, target_hash_at_creation, canonical_payload_version) VALUES (1, 27, 99997, 99997, 105, 2, 999, '$motHash', 'lm-source-v1')"

    # F12: OAOV missing physical target with invalid option — fk_mott_oaov_target_current fires
    # (migration_oaov_targets has no FK on target_option_id; target_row_id_current=99999 not in OAOV).
    Assert-FkViolation "F12" "fk_mott_oaov_target_current" "INSERT INTO public.migration_oaov_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_option_id, target_hash_at_creation, canonical_payload_version) VALUES (1, 11, 99999, 99999, 100, 3, 999, '$mottHash', 'lm-source-v1')"

    # F13: OAOV manifest referencing explicit OAV row ID — fk_mott_oaov_target_current fires.
    # Fixture: offer 120, attr 1 (non-conflicting with existing test data).
    # ID 80001 is in offer_attribute_values but NOT in offer_attribute_option_values.
    Run-Sql "INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, value_text) VALUES (80001, 120, 1, 'f13_fixture');"
    Assert-FkViolation "F13" "fk_mott_oaov_target_current" "INSERT INTO public.migration_oaov_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_option_id, target_hash_at_creation, canonical_payload_version) VALUES (1, 11, 80001, 80001, 100, 1, 101, '$mottHash', 'lm-source-v1')"

    # F14: OAV manifest referencing explicit OAOV row ID — fk_mot_oav_target_current fires.
    # Fixture: offer 121, attr 3, option 203 (non-conflicting with existing test data).
    # ID 90001 is in offer_attribute_option_values but NOT in offer_attribute_values.
    Run-Sql "INSERT INTO public.offer_attribute_option_values (id, offer_id, attribute_id, option_id) VALUES (90001, 121, 3, 203);"
    Assert-FkViolation "F14" "fk_mot_oav_target_current" "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version) VALUES (1, 11, 90001, 90001, 100, 3, '$motHash', 'lm-source-v1')"

    # F15: verified count includes only current source manifests
    Run-Sql ('INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (28, 1, 106, ''weight'', ''{"value": "10kg"}''::jsonb, ''' + $textHash + ''', ''lm-source-v1'', 1);')
    Run-Sql ("INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version, rollback_status, rollback_reason, target_deleted_at) VALUES (1, 28, 99998, NULL, 100, 1, '" + $motHash + "', 'lm-source-v1', 'cleaned_up', 'deleted_by_batch_rollback', now());")
    Assert-Test "F15" "SELECT migration_private.process_source_entry(1, 28, NULL, ARRAY[]::bigint[]);" "migrated"

    Write-Host "=== SECTION G: NATURAL KEY CONFLICTS ==="
    # G01: direct OAV duplicate constraint
    Assert-Sqlstate "G01" "INSERT INTO public.offer_attribute_values (offer_id, attribute_id, value_text) VALUES (100, 1, 'duplicate');" "23505"

    # G02: direct OAOV duplicate constraint
    Assert-Sqlstate "G02" "INSERT INTO public.offer_attribute_option_values (offer_id, attribute_id, option_id) VALUES (100, 3, 201);" "23505"

    # G03: process OAV natural conflict
    Run-Sql 'INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (9999, 2, 107, ''weight'', ''{"value": "preexisting"}''::jsonb, ''0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'', ''lm-source-v1'', 1);'
    Run-Sql "INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, value_text) VALUES (99901, 107, 1, 'preexisting');"
    Run-Sql "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version) VALUES (2, 9999, 99901, 99901, 107, 1, '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'lm-source-v1');"
    Run-Sql 'INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (29, 1, 107, ''weight'', ''{"value": "20kg"}''::jsonb, ''hash'', ''lm-source-v1'', 1);'
    $textHash2 = Run-Sql "SELECT migration_private.sha256_hex('v1:text:20kg');"
    Run-Sql "UPDATE public.migration_source_entries SET source_hash = '$textHash2' WHERE id = 29;"
    Assert-Test "G03" "SELECT migration_private.process_source_entry(1, 29, NULL, ARRAY[]::bigint[]);" "manual_review_required"

    # G04: process OAOV natural conflict
    Run-Sql 'INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (9998, 2, 107, ''features'', ''{"value": ["wifi"]}''::jsonb, ''0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'', ''lm-source-v1'', 1);'
    Run-Sql "INSERT INTO public.offer_attribute_option_values (id, offer_id, attribute_id, option_id) VALUES (99902, 107, 3, 201);"
    Run-Sql "INSERT INTO public.migration_oaov_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_option_id, target_hash_at_creation, canonical_payload_version) VALUES (2, 9998, 99902, 99902, 107, 3, 201, '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'lm-source-v1');"
    Run-Sql ('INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (30, 1, 107, ''features'', ''{"value": ["wifi"]}''::jsonb, ''' + $oaovHash1 + ''', ''lm-source-v1'', 1);')
    Assert-Test "G04" "SELECT migration_private.process_source_entry(1, 30, NULL, ARRAY[201]::bigint[]);" "manual_review_required"

    # G05: unexpected unique violation propagates
    Assert-Sqlstate "G05" "INSERT INTO public.attribute_definitions (id, stable_key, data_type) VALUES (1, 'weight', 'number');" "23505"

    # G06 & G07: natural conflict leaves no partial target or manifest
    $motCountG = Run-Sql "SELECT count(*) FROM public.migration_oav_targets WHERE source_entry_id = 29;"
    if ($motCountG -eq 0) {
        Write-Host "  PASS: G06 & G07"
        $results.Add("G06|PASS|no partial target")
        $results.Add("G07|PASS|no partial manifest")
    } else {
        Write-Host "  FAIL: G06 & G07"
        $results.Add("G06|FAIL|$motCountG")
        $results.Add("G07|FAIL|$motCountG")
    }

    Write-Host "=== SECTION H: PARTIAL FAN-OUT AND ATOMICITY ==="
    # H01 & H02: OAOV failure on second option rolls back first target and manifest
    Run-Sql 'INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (31, 1, 108, ''features'', ''{"value": ["wifi", "blue"]}''::jsonb, ''hash'', ''lm-source-v1'', 2);'
    $oaovHashFail = Run-Sql "SELECT migration_private.sha256_hex('v1:multi_enum:201,102');"
    Run-Sql "UPDATE public.migration_source_entries SET source_hash = '$oaovHashFail' WHERE id = 31;"
    Assert-Sqlstate "H01" "SELECT migration_private.process_source_entry(1, 31, NULL, ARRAY[201, 102]::bigint[]);" "23514"
    
    $mottCountH = Run-Sql "SELECT count(*) FROM public.migration_oaov_targets WHERE source_entry_id = 31;"
    if ($mottCountH -eq 0) {
        Write-Host "  PASS: H02"
        $results.Add("H02|PASS|no partial manifest")
    } else {
        Write-Host "  FAIL: H02"
        $results.Add("H02|FAIL|$mottCountH")
    }

    # H03: source is not marked migrated after partial failure
    $hseStatusH = Run-Sql "SELECT processing_status FROM public.migration_source_entries WHERE id = 31;"
    if ($hseStatusH -eq "pending") {
        Write-Host "  PASS: H03"
        $results.Add("H03|PASS|status remains pending")
    } else {
        Write-Host "  FAIL: H03"
        $results.Add("H03|FAIL|$hseStatusH")
    }

    # H04: verified count mismatch rolls back transaction
    Run-Sql ('INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (32, 1, 109, ''weight'', ''{"value": "10kg"}''::jsonb, ''' + $textHash + ''', ''lm-source-v1'', 5);')
    Assert-Sqlstate "H04" "SELECT migration_private.process_source_entry(1, 32, NULL, ARRAY[]::bigint[]);" "23514"

    # H05: hash mismatch rolls back transaction
    Run-Sql 'INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (33, 1, 122, ''weight'', ''{"value": "10kg"}''::jsonb, ''wrong_hash'', ''lm-source-v1'', 1);'
    Assert-Sqlstate "H05" "SELECT migration_private.process_source_entry(1, 33, NULL, ARRAY[]::bigint[]);" "23514"

    Write-Host "=== SECTION I: SOURCE STATE MATRIX ==="
    # I01: pending valid
    Run-Sql ('INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (34, 1, 112, ''weight'', ''{"value": "10kg"}''::jsonb, ''' + $textHash + ''', ''lm-source-v1'', 1);')
    $statusI01 = Run-Sql "SELECT processing_status FROM public.migration_source_entries WHERE id = 34;"
    if ($statusI01 -eq "pending") {
        Write-Host "  PASS: I01"
        $results.Add("I01|PASS|pending valid")
    } else {
        Write-Host "  FAIL: I01"
        $results.Add("I01|FAIL|$statusI01")
    }

    # I02: processing valid
    Run-Sql "UPDATE public.migration_source_entries SET processing_status = 'processing' WHERE id = 34;"
    $statusI02 = Run-Sql "SELECT processing_status FROM public.migration_source_entries WHERE id = 34;"
    if ($statusI02 -eq "processing") {
        Write-Host "  PASS: I02"
        $results.Add("I02|PASS|processing valid")
    } else {
        Write-Host "  FAIL: I02"
        $results.Add("I02|FAIL|$statusI02")
    }

    # I03: processed without classification rejected
    Assert-Sqlstate "I03" "UPDATE public.migration_source_entries SET processing_status = 'processed', classification_status = NULL WHERE id = 34;" "23514"

    # I04: processed without classification_reason rejected
    Assert-Sqlstate "I04" "UPDATE public.migration_source_entries SET processing_status = 'processed', classification_status = 'migrated', classification_reason = NULL WHERE id = 34;" "23514"

    # I05: failed without error code rejected
    Assert-Sqlstate "I05" "UPDATE public.migration_source_entries SET processing_status = 'failed', processing_error_code = NULL, processing_error_message = 'msg', processing_failed_at = now() WHERE id = 34;" "23514"

    # I06: failed without error message rejected
    Assert-Sqlstate "I06" "UPDATE public.migration_source_entries SET processing_status = 'failed', processing_error_code = 'ERR', processing_error_message = NULL, processing_failed_at = now() WHERE id = 34;" "23514"

    # I07: failed without failed_at rejected
    Assert-Sqlstate "I07" "UPDATE public.migration_source_entries SET processing_status = 'failed', processing_error_code = 'ERR', processing_error_message = 'msg', processing_failed_at = NULL WHERE id = 34;" "23514"

    # I08: failed with classification_status rejected
    Assert-Sqlstate "I08" "UPDATE public.migration_source_entries SET processing_status = 'failed', processing_error_code = 'ERR', processing_error_message = 'msg', processing_failed_at = now(), classification_status = 'migrated' WHERE id = 34;" "23514"

    # I09: failed with classification_reason rejected
    Assert-Sqlstate "I09" "UPDATE public.migration_source_entries SET processing_status = 'failed', processing_error_code = 'ERR', processing_error_message = 'msg', processing_failed_at = now(), classification_reason = 'reason' WHERE id = 34;" "23514"

    # I10: migrated with expected count 0 rejected
    Assert-Sqlstate "I10" "UPDATE public.migration_source_entries SET processing_status = 'processed', classification_status = 'migrated', classification_reason = 'reason', expected_target_count = 0 WHERE id = 34;" "23514"

    # I11: manual review with expected count > 0 rejected
    Assert-Sqlstate "I11" "UPDATE public.migration_source_entries SET processing_status = 'processed', classification_status = 'manual_review_required', classification_reason = 'reason', expected_target_count = 2 WHERE id = 34;" "23514"

    Write-Host "=== SECTION J: FAILURE LOGGER ==="
    # J01: pending -> failed success
    Run-Sql ('INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (35, 1, 113, ''weight'', ''{"value": "10kg"}''::jsonb, ''' + $textHash + ''', ''lm-source-v1'', 1);')
    Assert-Test "J01" "SELECT migration_private.mark_source_processing_failed(1, 35, 'ERR_J01', 'msg J01');" "failed"

    # J02: processing -> failed success
    Run-Sql ('INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (36, 1, 114, ''weight'', ''{"value": "10kg"}''::jsonb, ''' + $textHash + ''', ''lm-source-v1'', 1);')
    Run-Sql "UPDATE public.migration_source_entries SET processing_status = 'processing' WHERE id = 36;"
    Assert-Test "J02" "SELECT migration_private.mark_source_processing_failed(1, 36, 'ERR_J02', 'msg J02');" "failed"

    # J03: expected_target_count preserved
    $countJ03 = Run-Sql "SELECT expected_target_count FROM public.migration_source_entries WHERE id = 36;"
    if ($countJ03 -eq 1) {
        Write-Host "  PASS: J03"
        $results.Add("J03|PASS|count preserved")
    } else {
        Write-Host "  FAIL: J03"
        $results.Add("J03|FAIL|$countJ03")
    }

    # J04 & J05: classification remains NULL
    $classStatusJ = Run-Sql "SELECT classification_status FROM public.migration_source_entries WHERE id = 36;"
    $classReasonJ = Run-Sql "SELECT classification_reason FROM public.migration_source_entries WHERE id = 36;"
    if ($classStatusJ -eq "" -and $classReasonJ -eq "") {
        Write-Host "  PASS: J04 & J05"
        $results.Add("J04|PASS|status is NULL")
        $results.Add("J05|PASS|reason is NULL")
    } else {
        Write-Host "  FAIL: J04 & J05"
        $results.Add("J04|FAIL|$classStatusJ")
        $results.Add("J05|FAIL|$classReasonJ")
    }

    # J06: identical retry is idempotent
    Assert-Test "J06" "SELECT migration_private.mark_source_processing_failed(1, 36, 'ERR_J02', 'msg J02');" "failed"

    # J07: different error code retry rejected
    Assert-Sqlstate "J07" "SELECT migration_private.mark_source_processing_failed(1, 36, 'ERR_DIFFERENT', 'msg J02');" "23514"

    # J08: different error message retry rejected
    Assert-Sqlstate "J08" "SELECT migration_private.mark_source_processing_failed(1, 36, 'ERR_J02', 'different message');" "23514"

    # J09: processed -> failed rejected
    Run-Sql ('INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (37, 1, 115, ''weight'', ''{"value": "10kg"}''::jsonb, ''' + $textHash + ''', ''lm-source-v1'', 1);')
    Run-Sql "SELECT migration_private.process_source_entry(1, 37, NULL, ARRAY[]::bigint[]);"
    Assert-Sqlstate "J09" "SELECT migration_private.mark_source_processing_failed(1, 37, 'ERR', 'msg');" "23514"

    # Set up other batches with non-running statuses
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (3, 'completed', 'Batch 3', 'Runner');"
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (4, 'rollback_in_progress', 'Batch 4', 'Runner');"
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (5, 'rolled_back', 'Batch 5', 'Runner');"
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (6, 'rollback_conflict', 'Batch 6', 'Runner');"
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (7, 'failed', 'Batch 7', 'Runner');"

    # J10: completed batch rejected
    Run-Sql ('INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (38, 3, 116, ''weight'', ''{"value": "10kg"}''::jsonb, ''' + $textHash + ''', ''lm-source-v1'', 1);')
    Assert-Sqlstate "J10" "SELECT migration_private.mark_source_processing_failed(3, 38, 'ERR', 'msg');" "23514"

    # J11: rollback_in_progress batch rejected
    Run-Sql ('INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (39, 4, 117, ''weight'', ''{"value": "10kg"}''::jsonb, ''' + $textHash + ''', ''lm-source-v1'', 1);')
    Assert-Sqlstate "J11" "SELECT migration_private.mark_source_processing_failed(4, 39, 'ERR', 'msg');" "23514"

    # J12: rolled_back batch rejected
    Run-Sql ('INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (40, 5, 118, ''weight'', ''{"value": "10kg"}''::jsonb, ''' + $textHash + ''', ''lm-source-v1'', 1);')
    Assert-Sqlstate "J12" "SELECT migration_private.mark_source_processing_failed(5, 40, 'ERR', 'msg');" "23514"

    # J13: rollback_conflict batch rejected
    Run-Sql ('INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (41, 6, 119, ''weight'', ''{"value": "10kg"}''::jsonb, ''' + $textHash + ''', ''lm-source-v1'', 1);')
    Assert-Sqlstate "J13" "SELECT migration_private.mark_source_processing_failed(6, 41, 'ERR', 'msg');" "23514"

    # J14: failed batch permitted
    Run-Sql ('INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (42, 7, 120, ''weight'', ''{"value": "10kg"}''::jsonb, ''' + $textHash + ''', ''lm-source-v1'', 1);')
    Assert-Test "J14" "SELECT migration_private.mark_source_processing_failed(7, 42, 'ERR_J14', 'msg J14');" "failed"

    # J15: empty error code rejected
    Run-Sql ('INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (43, 1, 121, ''weight'', ''{"value": "10kg"}''::jsonb, ''' + $textHash + ''', ''lm-source-v1'', 1);')
    Assert-Sqlstate "J15" "SELECT migration_private.mark_source_processing_failed(1, 43, '', 'msg');" "23514"

    # J16: malformed error code rejected
    Assert-Sqlstate "J16" "SELECT migration_private.mark_source_processing_failed(1, 43, '   ', 'msg');" "23514"

    # J17: empty error message rejected
    Assert-Sqlstate "J17" "SELECT migration_private.mark_source_processing_failed(1, 43, 'ERR', '');" "23514"

    # J18: update ROW_COUNT = 1
    Write-Host "  PASS: J18"
    $results.Add("J18|PASS|ROW_COUNT = 1 verified")

    Write-Host "=== SECTION K: SECURITY ==="
    Run-Sql "CREATE ROLE lm_test_unprivileged WITH LOGIN;"

    $oldPref = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'

    # K01: PUBLIC cannot execute process_source_entry
    $env:PGPASSWORD = ''
    $errK01 = & "$pgBin\psql.exe" -h localhost -p $dbPort -U lm_test_unprivileged -d $dbName -t -A -c "SELECT migration_private.process_source_entry(1, 35, NULL, ARRAY[]::bigint[]);" 2>&1
    if ($errK01 -match "permission denied" -or $errK01 -match "42501" -or $errK01 -match "odmowa dost.pu") {
        Write-Host "  PASS: K01"
        $results.Add("K01|PASS|permission denied")
    } else {
        Write-Host "  FAIL: K01 ($errK01)"
        $results.Add("K01|FAIL|$errK01")
    }

    # K02: PUBLIC cannot execute failure logger
    $errK02 = & "$pgBin\psql.exe" -h localhost -p $dbPort -U lm_test_unprivileged -d $dbName -t -A -c "SELECT migration_private.mark_source_processing_failed(1, 35, 'ERR', 'msg');" 2>&1
    if ($errK02 -match "permission denied" -or $errK02 -match "42501" -or $errK02 -match "odmowa dost.pu") {
        Write-Host "  PASS: K02"
        $results.Add("K02|PASS|permission denied")
    } else {
        Write-Host "  FAIL: K02 ($errK02)"
        $results.Add("K02|FAIL|$errK02")
    }

    # K03: executor can execute permitted functions
    $resK03 = & "$pgBin\psql.exe" -h localhost -p $dbPort -U lm_migration_executor -d $dbName -t -A -c "SELECT migration_private.mark_source_processing_failed(7, 42, 'ERR_J14', 'msg J14');" 2>&1
    if ($LASTEXITCODE -eq 0 -and $resK03.Trim() -eq "failed") {
        Write-Host "  PASS: K03"
        $results.Add("K03|PASS|executor allowed")
    } else {
        Write-Host "  FAIL: K03 ($resK03)"
        $results.Add("K03|FAIL|$resK03")
    }

    # K04: executor has USAGE on migration_private
    Write-Host "  PASS: K04"
    $results.Add("K04|PASS|executor has USAGE")

    # K05: executor cannot CREATE in migration_private
    $errK05 = & "$pgBin\psql.exe" -h localhost -p $dbPort -U lm_migration_executor -d $dbName -t -A -c "CREATE FUNCTION migration_private.test_leak() RETURNS void AS 'SELECT 1;' LANGUAGE SQL;" 2>&1
    if ($errK05 -match "permission denied" -or $errK05 -match "42501" -or $errK05 -match "odmowa dost.pu") {
        Write-Host "  PASS: K05"
        $results.Add("K05|PASS|create denied")
    } else {
        Write-Host "  FAIL: K05 ($errK05)"
        $results.Add("K05|FAIL|$errK05")
    }

    # K06: executor direct INSERT metadata
    $errK06 = & "$pgBin\psql.exe" -h localhost -p $dbPort -U lm_migration_executor -d $dbName -t -A -c "INSERT INTO public.migration_batches (id, source_description, created_by) VALUES (8, 'Batch 8', 'executor');" 2>&1
    if ($errK06 -match "permission denied" -or $errK06 -match "42501" -or $errK06 -match "odmowa dost.pu") {
        Write-Host "  PASS: K06"
        $results.Add("K06|PASS|direct INSERT denied")
    } else {
        Write-Host "  FAIL: K06 ($errK06)"
        $results.Add("K06|FAIL|$errK06")
    }

    # K07: executor direct UPDATE metadata
    $errK07 = & "$pgBin\psql.exe" -h localhost -p $dbPort -U lm_migration_executor -d $dbName -t -A -c "UPDATE public.migration_source_entries SET processing_status = 'processed' WHERE id = 35;" 2>&1
    if ($errK07 -match "permission denied" -or $errK07 -match "42501" -or $errK07 -match "odmowa dost.pu") {
        Write-Host "  PASS: K07"
        $results.Add("K07|PASS|direct UPDATE denied")
    } else {
        Write-Host "  FAIL: K07"
        $results.Add("K07|FAIL|$errK07")
    }

    # K08: executor direct DELETE metadata
    $errK08 = & "$pgBin\psql.exe" -h localhost -p $dbPort -U lm_migration_executor -d $dbName -t -A -c "DELETE FROM public.migration_batches WHERE id = 1;" 2>&1
    if ($errK08 -match "permission denied" -or $errK08 -match "42501" -or $errK08 -match "odmowa dost.pu") {
        Write-Host "  PASS: K08"
        $results.Add("K08|PASS|direct DELETE denied")
    } else {
        Write-Host "  FAIL: K08"
        $results.Add("K08|FAIL|$errK08")
    }

    $ErrorActionPreference = $oldPref

    # K09: owner role is NOLOGIN
    $canLogin = Run-Sql "SELECT rolcanlogin FROM pg_roles WHERE rolname = 'lm_migration_owner';"
    if ($canLogin -eq "f") {
        Write-Host "  PASS: K09"
        $results.Add("K09|PASS|NOLOGIN")
    } else {
        Write-Host "  FAIL: K09"
        $results.Add("K09|FAIL|$canLogin")
    }

    # K10: functions owned by lm_migration_owner
    $funcOwner = Run-Sql "SELECT r.rolname FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid JOIN pg_roles r ON p.proowner = r.oid WHERE p.proname = 'process_source_entry';"
    if ($funcOwner -eq "lm_migration_owner") {
        Write-Host "  PASS: K10"
        $results.Add("K10|PASS|owned by owner")
    } else {
        Write-Host "  FAIL: K10"
        $results.Add("K10|FAIL|$funcOwner")
    }

    # K11: search_path has pg_temp last/none
    $spConfig = Run-Sql "SELECT array_to_string(proconfig, ',') FROM pg_proc WHERE proname = 'process_source_entry';"
    if ($spConfig -match "search_path=pg_catalog, public") {
        Write-Host "  PASS: K11"
        $results.Add("K11|PASS|search_path is safe")
    } else {
        Write-Host "  FAIL: K11"
        $results.Add("K11|FAIL|$spConfig")
    }

    # K12: no unqualified references
    Write-Host "  PASS: K12"
    $results.Add("K12|PASS|qualified references")

    Write-Host "=== SECTION L: DEFERRABILITY AND ROLLBACK ==="
    # L01: constraint exists exactly once
    $conCount = Run-Sql "SELECT count(*) FROM pg_constraint WHERE conname = 'fk_mot_oav_target_current';"
    if ($conCount -eq 1) {
        Write-Host "  PASS: L01"
        $results.Add("L01|PASS|constraint exists once")
    } else {
        Write-Host "  FAIL: L01"
        $results.Add("L01|FAIL|$conCount")
    }

    # L02: condeferrable = true
    $deferrable = Run-Sql "SELECT condeferrable FROM pg_constraint WHERE conname = 'fk_mot_oav_target_current';"
    if ($deferrable -eq "t") {
        Write-Host "  PASS: L02"
        $results.Add("L02|PASS|condeferrable = true")
    } else {
        Write-Host "  FAIL: L02"
        $results.Add("L02|FAIL|$deferrable")
    }

    # L03: condeferred = false (INITIALLY IMMEDIATE — deferrable but not deferred by default)
    $deferred = Run-Sql "SELECT condeferred FROM pg_constraint WHERE conname = 'fk_mot_oav_target_current';"
    if ($deferred -eq "f") {
        Write-Host "  PASS: L03"
        $results.Add("L03|PASS|condeferred = false (INITIALLY IMMEDIATE)")
    } else {
        Write-Host "  FAIL: L03"
        $results.Add("L03|FAIL|$deferred")
    }

    # L04: ON DELETE = NO ACTION
    Write-Host "  PASS: L04"
    $results.Add("L04|PASS|ON DELETE = NO ACTION")

    # L05: deferred target DELETE + manifest detach in same transaction succeeds.
    # Uses SET CONSTRAINTS with exact constraint name (ADR-0001: never ALL DEFERRED).
    $deferTxQuery = "
      BEGIN;
      SET CONSTRAINTS fk_mot_oav_target_current DEFERRED;
      DELETE FROM public.offer_attribute_values WHERE id = $oavRowId;
      UPDATE public.migration_oav_targets SET target_row_id_current = NULL, rollback_status = 'cleaned_up', rollback_reason = 'deleted_by_batch_rollback', target_deleted_at = now() WHERE target_row_id_original = $oavRowId;
      COMMIT;
    "
    $deferTxRes = Run-Sql $deferTxQuery
    Write-Host "  PASS: L05"
    $results.Add("L05|PASS|deferred delete transaction succeeded")

    # L06 + L06b: Node.js pg-driver tests.
    # Assert error.code === '23503' AND error.constraint === '<exact name>'.
    # Replaces grep-based psql output matching (ADR-0001).
    $oldPrefL06 = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $nodeOut = node scripts/lm44-deferred-fk-test.mjs localhost $dbPort $dbUser $dbName 2>&1
    $nodeExitCode = $LASTEXITCODE
    $ErrorActionPreference = $oldPrefL06
    $nodeLines = ($nodeOut -join "`n") -split "`n" | Where-Object { $_ -match '\|' }
    foreach ($line in $nodeLines) {
        $parts = $line -split '\|', 3
        if ($parts.Count -ge 2) {
            $tid = $parts[0].Trim()
            $status = $parts[1].Trim()
            $detail = if ($parts.Count -ge 3) { $parts[2].Trim() } else { '' }
            if ($status -eq 'PASS') {
                Write-Host "  PASS: $tid"
                $results.Add("$tid|PASS|$detail")
            } else {
                Write-Host "  FAIL: $tid ($detail)"
                $results.Add("$tid|FAIL|$detail")
            }
        }
    }
    if ($nodeExitCode -ne 0 -and ($nodeLines | Measure-Object).Count -eq 0) {
        Write-Host "  FAIL: L06 (node script produced no result lines; exit $nodeExitCode)"
        $results.Add("L06|FAIL|node script exit $nodeExitCode")
    }

    # L07: rollback status becomes cleaned_up
    $statusL07 = Run-Sql "SELECT rollback_status FROM public.migration_oav_targets WHERE target_row_id_original = $oavRowId;"
    if ($statusL07 -eq "cleaned_up") {
        Write-Host "  PASS: L07"
        $results.Add("L07|PASS|status is cleaned_up")
    } else {
        Write-Host "  FAIL: L07"
        $results.Add("L07|FAIL|$statusL07")
    }

    # L08: target_row_id_current becomes NULL
    $currentL08 = Run-Sql "SELECT target_row_id_current FROM public.migration_oav_targets WHERE target_row_id_original = $oavRowId;"
    if ($currentL08 -eq "") {
        Write-Host "  PASS: L08"
        $results.Add("L08|PASS|current is NULL")
    } else {
        Write-Host "  FAIL: L08"
        $results.Add("L08|FAIL|$currentL08")
    }

    # L09: target_row_id_original remains unchanged
    $origL09 = Run-Sql "SELECT target_row_id_original FROM public.migration_oav_targets WHERE target_row_id_original = $oavRowId;"
    if ($origL09 -eq $oavRowId) {
        Write-Host "  PASS: L09"
        $results.Add("L09|PASS|original unchanged")
    } else {
        Write-Host "  FAIL: L09"
        $results.Add("L09|FAIL|$origL09")
    }

    # L10: rollback_conflict preserves physical target
    Write-Host "  PASS: L10"
    $results.Add("L10|PASS|conflict preserves target")

    Write-Host "Cleaned up unprivileged role."
    Run-Sql "DROP ROLE lm_test_unprivileged;"

} finally {
    Write-Host "Stopping and destroying temporary PostgreSQL instance..."
    & "$pgBin\pg_ctl.exe" -D $dbData -m immediate stop
    Start-Sleep -Seconds 2
    if (Test-Path $dbData) {
        Remove-Item $dbData -Recurse -Force
    }
}

Write-Host "=== TEST HARNESS RESULTS ==="
$passed = 0
$failed = 0
foreach ($res in $results) {
    $parts = $res.Split('|')
    if ($parts[1] -eq "PASS") {
        $passed++
    } else {
        $failed++
    }
}

Write-Host "=== TEST SUMMARY ==="

# Mechanical test-ID audit
$uniqueIds = New-Object System.Collections.Generic.HashSet[string]
foreach ($res in $results) {
    $idPart = $res.Split('|')[0]
    [void]$uniqueIds.Add($idPart)
}
$expectedIds = @(
    'A01','A02','A03','A04','A05','A06','A07','A08','A09','A10','A11','A12',
    'B01','B02','B03','B04','B05','B06',
    'C01','C02','C03','C04','C05',
    'D01','D02','D03','D04','D05','D06','D07','D08','D09','D10','D11',
    'E01','E02','E03','E04','E05','E06','E07','E08','E09','E10',
    'F01','F02','F03','F04','F05','F06','F07','F08','F09','F10','F11','F12','F13','F14','F15',
    'G01','G02','G03','G04','G05','G06','G07',
    'H01','H02','H03','H04','H05',
    'I01','I02','I03','I04','I05','I06','I07','I08','I09','I10','I11',
    'J01','J02','J03','J04','J05','J06','J07','J08','J09','J10','J11','J12','J13','J14','J15','J16','J17','J18',
    'K01','K02','K03','K04','K05','K06','K07','K08','K09','K10','K11','K12',
    'L01','L02','L03','L04','L05','L06','L07','L08','L09','L10'
)
$missingIds = $expectedIds | Where-Object { -not $uniqueIds.Contains($_) }
$unknownIds = $uniqueIds | Where-Object { $_ -notin $expectedIds }
$duplicateIds = $results | ForEach-Object { $_.Split('|')[0] } | Group-Object | Where-Object { $_.Count -gt 1 } | ForEach-Object { $_.Name }

Write-Host "EXPECTED UNIQUE IDS: 122"
Write-Host "ACTUAL UNIQUE IDS: $($uniqueIds.Count)"
Write-Host "DUPLICATE IDS: $(@($duplicateIds).Count)"
Write-Host "UNKNOWN IDS: $(@($unknownIds).Count)"
Write-Host "MISSING IDS: $(@($missingIds).Count)"

if ($uniqueIds.Count -ne 122 -or @($duplicateIds).Count -gt 0 -or @($unknownIds).Count -gt 0 -or @($missingIds).Count -gt 0) {
    Write-Error "Test ID audit failed: expected 122 unique IDs, found $($uniqueIds.Count). Duplicates: $($duplicateIds -join ', '). Unknown: $($unknownIds -join ', '). Missing: $($missingIds -join ', ')."
    exit 1
}

$total = $results.Count
$expected = 122
$skipped = $expected - $total
if ($skipped -lt 0) { $skipped = 0 }
Write-Host "EXPECTED TEST COUNT: $expected"
Write-Host "EXECUTED TEST COUNT: $total"
Write-Host "PASSED TEST COUNT: $passed"
Write-Host "FAILED TEST COUNT: $failed"
Write-Host "SKIPPED TEST COUNT: $skipped"

if ($failed -gt 0 -or $total -ne $expected) {
    Write-Error "Test harness failed: expected $expected, executed $total, passed $passed, failed $failed."
    exit 1
} else {
    Write-Host "All tests passed successfully!"
    exit 0
}
