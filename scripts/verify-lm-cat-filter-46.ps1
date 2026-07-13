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

# Find random port
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$listener.Start()
$dbPort = $listener.LocalEndpoint.Port
$listener.Stop()

$guid = [Guid]::NewGuid().ToString("N")
$dbData = Join-Path $env:TEMP "lm46_$guid\data"
$dbLog = Join-Path $env:TEMP "lm46_$guid\postgres.log"
$dbName = "lm46_$guid"

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
            Register-Result -Id $Id -Status "PASS" -Detail ($actual -replace '[\r\n]+', ' ')
        } else {
            Register-Result -Id $Id -Status "FAIL" -Detail ("Expected '$Expected', got '$actual'" -replace '[\r\n]+', ' ')
        }
    } catch {
        Register-Result -Id $Id -Status "FAIL" -Detail ("$_" -replace '[\r\n]+', ' ')
    }
}

function Assert-Value {
    param([string]$Id, $Actual, $Expected, [string]$Detail)
    if ($Actual -eq $Expected) {
        Register-Result -Id $Id -Status "PASS" -Detail $Detail
    } else {
        Register-Result -Id $Id -Status "FAIL" -Detail "Expected '$Expected', got '$Actual'. Detail: $Detail"
    }
}

function Assert-Sqlstate {
    param([string]$Id, [string]$Sql, [string]$ExpectedState)
    $escapedSql = $Sql.Replace("'", "''")
    Assert-Test -Id $Id -Sql "SELECT lm46_test.assert_sqlstate('$ExpectedState', '$escapedSql');" -Expected "PASS"
}

# Capture Git baseline before any test mutations
$GitStatusBaseline = @(git status --porcelain=v1 --untracked-files=all)
$GitDiffBaseline = @(git diff --binary)
$GitCachedBaseline = @(git diff --cached --binary)
$BaselineHash0003 = git hash-object "drizzle/0003_wet_scarlet_spider.sql" 2>$null
$BaselineHashSchema = git hash-object "src/lib/schema.ts" 2>$null
$BaselineHash46 = git hash-object "scripts/verify-lm-cat-filter-46.ps1" 2>$null

try {
    # ==================================================================
    # R001–R010: FIXTURE, MANIFEST AND DELIVERY INTEGRITY
    # ==================================================================

    # R001: Fixture file contains valid JSON
    try {
        $fixtureContent = Get-Content "scripts/sql/fixtures/lm46-technical-attributes-sanitized.json" -Raw
        $fixture = $fixtureContent | ConvertFrom-Json
        Register-Result -Id "R001" -Status "PASS" -Detail "Fixture JSON parsed"
    } catch {
        Register-Result -Id "R001" -Status "FAIL" -Detail "Failed parsing: $_"
    }

    # R002: Fixture contractVersion check
    if ($fixture.contractVersion -eq "lm46-sanitized-source-v1") {
        Register-Result -Id "R002" -Status "PASS" -Detail "contractVersion ok"
    } else {
        Register-Result -Id "R002" -Status "FAIL" -Detail "Wrong contractVersion: $($fixture.contractVersion)"
    }

    # R003: Fixture class check
    if ($fixture.fixtureClass -eq "REAL_SANITIZED_SOURCE") {
        Register-Result -Id "R003" -Status "PASS" -Detail "fixtureClass ok"
    } else {
        Register-Result -Id "R003" -Status "FAIL" -Detail "Wrong fixtureClass: $($fixture.fixtureClass)"
    }

    # R004: Fixture offer count
    if ($fixture.offers.Count -eq 9) {
        Register-Result -Id "R004" -Status "PASS" -Detail "Exactly 9 offers"
    } else {
        Register-Result -Id "R004" -Status "FAIL" -Detail "Offer count: $($fixture.offers.Count)"
    }

    # R005: Fixture category count
    $categories = New-Object System.Collections.Generic.HashSet[int]
    foreach ($o in $fixture.offers) { $categories.Add($o.sourceCategoryId) | Out-Null }
    if ($categories.Count -eq 6) {
        Register-Result -Id "R005" -Status "PASS" -Detail "Exactly 6 categories"
    } else {
        Register-Result -Id "R005" -Status "FAIL" -Detail "Category count: $($categories.Count)"
    }

    # R006: Fixture source-key count
    $keys = New-Object System.Collections.Generic.HashSet[string]
    $totalOccurrences = 0
    foreach ($o in $fixture.offers) {
        foreach ($k in $o.technicalAttributes.psobject.Properties.Name) {
            $keys.Add($k) | Out-Null
            $totalOccurrences++
        }
    }
    if ($keys.Count -eq 23) {
        Register-Result -Id "R006" -Status "PASS" -Detail "Exactly 23 keys"
    } else {
        Register-Result -Id "R006" -Status "FAIL" -Detail "Key count: $($keys.Count)"
    }

    # R007: Fixture technical attribute occurrence count
    if ($totalOccurrences -eq 27) {
        Register-Result -Id "R007" -Status "PASS" -Detail "Exactly 27 occurrences"
    } else {
        Register-Result -Id "R007" -Status "FAIL" -Detail "Occurrences: $totalOccurrences"
    }

    # R008: Mapping manifest contains valid JSON
    try {
        $mapContent = Get-Content "scripts/sql/fixtures/lm-cat-filter-46-map-v1.json" -Raw
        $mappings = $mapContent | ConvertFrom-Json
        Register-Result -Id "R008" -Status "PASS" -Detail "Mapping JSON parsed"
    } catch {
        Register-Result -Id "R008" -Status "FAIL" -Detail "Failed parsing mapping: $_"
    }

    # R009: Mapping manifest has 23 unique records
    $uniqueMapKeys = New-Object System.Collections.Generic.HashSet[string]
    foreach ($m in $mappings) { $uniqueMapKeys.Add($m.sourceKey) | Out-Null }
    if ($mappings.Count -eq 23 -and $uniqueMapKeys.Count -eq 23) {
        Register-Result -Id "R009" -Status "PASS" -Detail "Exactly 23 records"
    } else {
        Register-Result -Id "R009" -Status "FAIL" -Detail "Records: $($mappings.Count), Unique: $($uniqueMapKeys.Count)"
    }

    # R010: Mapping manifest manual_review counts
    $manualReviewCount = 0
    $mappedCount = 0
    foreach ($m in $mappings) {
        if ($m.decision -eq "manual_review_required") { $manualReviewCount++ }
        if ($m.decision -eq "mapped") { $mappedCount++ }
    }
    if ($mappedCount -eq 0 -and $manualReviewCount -eq 23) {
        Register-Result -Id "R010" -Status "PASS" -Detail "0 mapped, 23 manual_review"
    } else {
        Register-Result -Id "R010" -Status "FAIL" -Detail "Mapped: $mappedCount, Manual: $manualReviewCount"
    }

    # Initialize PostgreSQL cluster
    New-Item -ItemType Directory -Path $dbData -Force | Out-Null
    Invoke-NativeChecked -Command "$pgBin\initdb.exe" -Arguments @('-D', $dbData, '-U', $dbUser, '--auth-local=trust', '--auth-host=trust')

    & "$pgBin\pg_ctl.exe" -D $dbData -o "-F -p $dbPort" -l $dbLog start
    Start-Sleep -Seconds 4

    # Create database and roles
    & "$pgBin\createdb.exe" -h localhost -p $dbPort -U $dbUser $dbName
    & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d $dbName -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" -q
    & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d $dbName -c "CREATE ROLE lm_migration_owner WITH NOLOGIN;" -q
    & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d $dbName -c "CREATE ROLE lm_migration_executor WITH LOGIN;" -q

    # Apply legacy schema fixture (Sprint 44 baseline)
    & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d $dbName -f "scripts/sql/fixtures/lm44-legacy-schema-77b98aff.sql" -q

    # Run Drizzle migrations up to 0003
    $env:DATABASE_URL = "postgres://postgres@localhost:$dbPort/$dbName"
    Invoke-NativeChecked -Command "node" -Arguments @("scripts/run-lm44-drizzle-migrations.mjs")

    # Set up testing schema and test helpers
    Run-Sql "CREATE SCHEMA IF NOT EXISTS lm46_test;" | Out-Null
    $testHelperSql = @'
CREATE OR REPLACE FUNCTION lm46_test.assert_sqlstate(p_expected_state text, p_sql text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_actual_state text;
BEGIN
  BEGIN
    EXECUTE p_sql;
    RAISE EXCEPTION 'STATEMENT_SUCCEEDED';
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_actual_state = RETURNED_SQLSTATE;
      IF v_actual_state = p_expected_state THEN
        RETURN 'PASS';
      ELSE
        RAISE EXCEPTION 'WRONG_STATE: expected %, got %, msg: %', p_expected_state, v_actual_state, SQLERRM;
      END IF;
  END;
END;
$$;
'@
    Run-Sql $testHelperSql | Out-Null

    # Seed core tables
    Run-Sql "INSERT INTO public.partners (id, company_name, contact_email) VALUES (1, 'Test Co', 'test@co.com');" | Out-Null
    Run-Sql "INSERT INTO public.categories (id, name, slug) VALUES (21, 'Forklifts', 'forklifts');" | Out-Null
    Run-Sql "INSERT INTO public.offers (id, partner_id, category_id, title) SELECT x, 1, 21, 'Offer ' || x FROM generate_series(100, 150) x;" | Out-Null

    # ==================================================================
    # R011–R030: SCHEMA, DDL, PROVENANCE AND ATTEMPT-STATE CONSTRAINTS
    # ==================================================================

    # R011: target_provenance exists on migration_oav_targets
    Assert-Test -Id "R011" -Sql "SELECT count(*) FROM information_schema.columns WHERE table_name = 'migration_oav_targets' AND column_name = 'target_provenance';" -Expected "1"

    # R012: target_provenance exists on migration_oaov_targets
    Assert-Test -Id "R012" -Sql "SELECT count(*) FROM information_schema.columns WHERE table_name = 'migration_oaov_targets' AND column_name = 'target_provenance';" -Expected "1"

    # R013: target_provenance is NOT NULL in migration_oav_targets
    Assert-Test -Id "R013" -Sql "SELECT is_nullable FROM information_schema.columns WHERE table_name = 'migration_oav_targets' AND column_name = 'target_provenance';" -Expected "NO"

    # R014: target_provenance is NOT NULL in migration_oaov_targets
    Assert-Test -Id "R014" -Sql "SELECT is_nullable FROM information_schema.columns WHERE table_name = 'migration_oaov_targets' AND column_name = 'target_provenance';" -Expected "NO"

    # Seed batches for schema tests
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (10, 'running', 'Batch 10', 'TestRunner');" | Out-Null
    # Seed dependencies for OAV and OAOV FKs
    Run-Sql "INSERT INTO public.attribute_definitions (id, stable_key, data_type, is_active) VALUES (99, 'dummy_attr', 'text', true) ON CONFLICT (id) DO NOTHING;" | Out-Null
    Run-Sql "INSERT INTO public.attribute_definitions (id, stable_key, data_type, is_active) VALUES (98, 'dummy_attr2', 'text', true) ON CONFLICT (id) DO NOTHING;" | Out-Null
    Run-Sql "INSERT INTO public.controlled_option_values (id, attribute_id, stable_key, is_active) VALUES (99, 99, 'dummy_opt', true) ON CONFLICT (id) DO NOTHING;" | Out-Null
    Run-Sql "INSERT INTO public.controlled_option_values (id, attribute_id, stable_key, is_active) VALUES (98, 98, 'dummy_opt2', true) ON CONFLICT (id) DO NOTHING;" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, value_text) VALUES (9999, 150, 99, 'DummyText') ON CONFLICT (id) DO NOTHING;" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, value_text) VALUES (9898, 150, 98, 'DummyText2') ON CONFLICT (id) DO NOTHING;" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_option_values (id, offer_id, attribute_id, option_id) VALUES (9999, 150, 99, 99) ON CONFLICT (id) DO NOTHING;" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_option_values (id, offer_id, attribute_id, option_id) VALUES (9898, 150, 98, 98) ON CONFLICT (id) DO NOTHING;" | Out-Null
    # Seed source entries for batch 10 to satisfy FK constraint
    foreach ($entry_id in 100..105) {
        $skey = "naped_$entry_id"
        Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES ($entry_id, 10, 100, '$skey', '{`"value`": `"Elektryczny`"}'::jsonb, '1234567890123456789012345678901234567890123456789012345678901234', 'lm-source-v2', 1);" | Out-Null
    }

    # R015: target_provenance allows created_by_batch in OAV
    Assert-Test -Id "R015" -Sql "
        WITH cte AS (
            INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version, target_provenance)
            VALUES (10, 100, 9999, 9999, 150, 99, '1234567890123456789012345678901234567890123456789012345678901234', 'lm-source-v2', 'created_by_batch') RETURNING 'PASS' AS val
        ) SELECT val FROM cte;
    " -Expected "PASS"

    # R016: target_provenance allows unknown_legacy in OAV
    Assert-Test -Id "R016" -Sql "
        WITH cte AS (
            INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version, target_provenance)
            VALUES (10, 101, 9898, 9898, 150, 98, '1234567890123456789012345678901234567890123456789012345678901234', 'lm-source-v2', 'unknown_legacy') RETURNING 'PASS' AS val
        ) SELECT val FROM cte;
    " -Expected "PASS"

    # R017: target_provenance rejects other values in OAV
    Assert-Sqlstate -Id "R017" -Sql "
        INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version, target_provenance)
        VALUES (10, 102, 9997, 9997, 100, 1, '1234567890123456789012345678901234567890123456789012345678901234', 'lm-source-v2', 'custom_provenance')
    " -ExpectedState "23514"

    # R018: target_provenance allows created_by_batch in OAOV
    Assert-Test -Id "R018" -Sql "
        WITH cte AS (
            INSERT INTO public.migration_oaov_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_option_id, target_hash_at_creation, canonical_payload_version, target_provenance)
            VALUES (10, 103, 9999, 9999, 150, 99, 99, '1234567890123456789012345678901234567890123456789012345678901234', 'lm-source-v2', 'created_by_batch') RETURNING 'PASS' AS val
        ) SELECT val FROM cte;
    " -Expected "PASS"

    # R019: target_provenance allows unknown_legacy in OAOV
    Assert-Test -Id "R019" -Sql "
        WITH cte AS (
            INSERT INTO public.migration_oaov_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_option_id, target_hash_at_creation, canonical_payload_version, target_provenance)
            VALUES (10, 104, 9898, 9898, 150, 98, 98, '1234567890123456789012345678901234567890123456789012345678901234', 'lm-source-v2', 'unknown_legacy') RETURNING 'PASS' AS val
        ) SELECT val FROM cte;
    " -Expected "PASS"

    # R020: target_provenance rejects other values in OAOV
    Assert-Sqlstate -Id "R020" -Sql "
        INSERT INTO public.migration_oaov_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_option_id, target_hash_at_creation, canonical_payload_version, target_provenance)
        VALUES (10, 105, 9997, 9997, 100, 1, 1, '1234567890123456789012345678901234567890123456789012345678901234', 'lm-source-v2', 'custom_provenance')
    " -ExpectedState "23514"

    # R021: migration_rollback_attempts table exists
    Assert-Test -Id "R021" -Sql "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'migration_rollback_attempts';" -Expected "1"

    # R022: batch_id FK is RESTRICT
    Assert-Test -Id "R022" -Sql "
        SELECT confdeltype FROM pg_constraint WHERE conname = 'fk_mra_batch';
    " -Expected "r"  # 'r' represents RESTRICT in pg_constraint

    # R023: migration_rollback_attempts unique constraint
    Assert-Test -Id "R023" -Sql "
        SELECT count(*) FROM pg_constraint WHERE conname = 'uq_mra_batch_attempt';
    " -Expected "1"

    # R024: attempt_number positive constraint
    Assert-Sqlstate -Id "R024" -Sql "
        INSERT INTO public.migration_rollback_attempts (batch_id, attempt_number, status, initiated_by)
        VALUES (10, 0, 'running', 'user')
    " -ExpectedState "23514"

    # R025: targets_deleted_count non-negative constraint
    Assert-Sqlstate -Id "R025" -Sql "
        INSERT INTO public.migration_rollback_attempts (batch_id, attempt_number, status, targets_deleted_count, initiated_by)
        VALUES (10, 1, 'running', -1, 'user')
    " -ExpectedState "23514"

    # R026: targets_skipped_count non-negative constraint
    Assert-Sqlstate -Id "R026" -Sql "
        INSERT INTO public.migration_rollback_attempts (batch_id, attempt_number, status, targets_skipped_count, initiated_by)
        VALUES (10, 1, 'running', -2, 'user')
    " -ExpectedState "23514"

    # R027: targets_conflict_count non-negative constraint
    Assert-Sqlstate -Id "R027" -Sql "
        INSERT INTO public.migration_rollback_attempts (batch_id, attempt_number, status, targets_conflict_count, initiated_by)
        VALUES (10, 1, 'running', -3, 'user')
    " -ExpectedState "23514"

    # R028: status check constraint
    Assert-Sqlstate -Id "R028" -Sql "
        INSERT INTO public.migration_rollback_attempts (batch_id, attempt_number, status, initiated_by)
        VALUES (10, 1, 'invalid_status', 'user')
    " -ExpectedState "23514"

    # R029: lifecycle check constraint for running state
    Assert-Sqlstate -Id "R029" -Sql "
        INSERT INTO public.migration_rollback_attempts (batch_id, attempt_number, status, finished_at, initiated_by)
        VALUES (10, 1, 'running', now(), 'user')
    " -ExpectedState "23514"

    # R030: lifecycle check constraint for succeeded state
    Assert-Sqlstate -Id "R030" -Sql "
        INSERT INTO public.migration_rollback_attempts (batch_id, attempt_number, status, finished_at, targets_deleted_count, initiated_by)
        VALUES (10, 1, 'succeeded', NULL, 5, 'user')
    " -ExpectedState "23514"

    # ==================================================================
    # R031–R045: CANONICAL V2 PARSING AND DETERMINISTIC SERIALIZATION
    # ==================================================================

    # R031: sha256_hex formats text correctly
    Assert-Test -Id "R031" -Sql "SELECT migration_private.sha256_hex('v2:text:Value');" -Expected "03414a356236315ae7ce1b8fd9f6e36a5698853513a5dffa045f30064c45c71d"

    # R032: sha256_hex formats number integer correctly
    Assert-Test -Id "R032" -Sql "SELECT migration_private.sha256_hex('v2:number:100');" -Expected "f3068a27312a6d659bd5fa1cc8729fc78d09c46163ebb08733021c3cdb583758"

    # R033: sha256_hex formats number decimal correctly
    Assert-Test -Id "R033" -Sql "SELECT migration_private.sha256_hex('v2:number:12.34');" -Expected "a0f2817bbec2017582cacc549bbe8fd73f9254d4e0b5f7c4e336f9925cd757e8"

    # R034: sha256_hex formats boolean true correctly
    Assert-Test -Id "R034" -Sql "SELECT migration_private.sha256_hex('v2:boolean:true');" -Expected "bcff65a4f38e4c21ecfb18272d7494d4dec03663a7c425438935f05a47bc80a9"

    # R035: sha256_hex formats boolean false correctly
    Assert-Test -Id "R035" -Sql "SELECT migration_private.sha256_hex('v2:boolean:false');" -Expected "2c3e0344b203be2fbc19c43885a87b101bcfb81fcbb0a34c88dc7572f80be175"

    # R036: sha256_hex formats year correctly
    Assert-Test -Id "R036" -Sql "SELECT migration_private.sha256_hex('v2:year:2026');" -Expected "7971436c02612065df3ddcb68d3167dc6ca872e3e9a29026769ca728f013b6f3"

    # R037: sha256_hex formats enum correctly
    Assert-Test -Id "R037" -Sql "SELECT migration_private.sha256_hex('v2:enum:10');" -Expected "56fc43024a131caf2438dc7a13c67fe3cfb5896f846223c458fefc215c95d900"

    # R038: sha256_hex formats multi_enum sorted array correctly
    Assert-Test -Id "R038" -Sql "SELECT migration_private.sha256_hex('v2:multi_enum:10,20');" -Expected "184c1aff15132214a1195b14c699a8eb0c0eee894a00a54eeab22da1454fa4e3"

    # R039: sha256_hex formats date with Z offset correctly
    Assert-Test -Id "R039" -Sql "SELECT migration_private.sha256_hex('v2:date:2026-07-12T18:25:55.000000Z');" -Expected "8c8676eb6628070aae02c49a1e1f33411ba24203aa35738fdb0daeb2dbbbf12f"

    # R040: sha256_hex formats date with positive offset correctly
    Assert-Test -Id "R040" -Sql "SELECT migration_private.sha256_hex('v2:date:2026-07-12T16:25:55.000000Z');" -Expected "17cb8001ed2199eae26a41114060bed0de5142f7fdfb0300ceb5238339a4692f"

    # R041: sha256_hex formats date with negative offset correctly
    Assert-Test -Id "R041" -Sql "SELECT migration_private.sha256_hex('v2:date:2026-07-12T20:25:55.000000Z');" -Expected "6a8587daaa439887b3fab87420cd43dafbe0c47ef05b9c1562d9eca1b03bbd63"

    # Create attribute definitions for v2 parsing tests
    Run-Sql "INSERT INTO public.attribute_definitions (id, stable_key, data_type, is_active) VALUES (1, 'naped', 'text', true) ON CONFLICT (id) DO NOTHING;" | Out-Null
    Run-Sql "INSERT INTO public.attribute_definitions (id, stable_key, data_type, is_active) VALUES (4, 'date_attr', 'date', true) ON CONFLICT (id) DO NOTHING;" | Out-Null
    Run-Sql "INSERT INTO public.attribute_definitions (id, stable_key, data_type, is_active) VALUES (3, 'features', 'multi_enum', true) ON CONFLICT (id) DO NOTHING;" | Out-Null
    Run-Sql "INSERT INTO public.controlled_option_values (id, attribute_id, stable_key, is_active) VALUES (10, 3, 'triplex', true) ON CONFLICT (id) DO NOTHING;" | Out-Null
    Run-Sql "INSERT INTO public.controlled_option_values (id, attribute_id, stable_key, is_active) VALUES (20, 3, 'duplex', true) ON CONFLICT (id) DO NOTHING;" | Out-Null

    # Seed batch 30 for Section 2
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (30, 'running', 'Batch 30', 'TestRunner');" | Out-Null

    # R042: process_source_entry rejects offset-free date values
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (200, 30, 106, 'date_attr', '{`"value`": `"2026-07-12 18:25:55`"}'::jsonb, 'hash', 'lm-source-v2', 1);" | Out-Null
    Assert-Sqlstate -Id "R042" -Sql "SELECT migration_private.process_source_entry(30, 200, NULL, NULL)" -ExpectedState "23514"

    # R043: process_source_entry date parsing is TimeZone independent
    $dateHashZ = Run-Sql "SELECT migration_private.sha256_hex('v2:date:2026-07-12T18:25:55.000000Z');"
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (201, 30, 107, 'date_attr', '{`"value`": `"2026-07-12T18:25:55.000Z`"}'::jsonb, '$dateHashZ', 'lm-source-v2', 1);" | Out-Null
    Assert-Test -Id "R043" -Sql "SELECT migration_private.process_source_entry(30, 201, NULL, NULL);" -Expected "migrated"

    # R044: process_source_entry rejects multi_enum null options
    $oaovHashNull = Run-Sql "SELECT migration_private.sha256_hex('v2:multi_enum:10,20');"
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (202, 30, 108, 'features', '{`"value`": [`"triplex`", `"duplex`"]}'::jsonb, '$oaovHashNull', 'lm-source-v2', 2);" | Out-Null
    Assert-Sqlstate -Id "R044" -Sql "SELECT migration_private.process_source_entry(30, 202, NULL, ARRAY[10, NULL]::bigint[])" -ExpectedState "23514"

    # R045: process_source_entry rejects multi_enum duplicate options
    Assert-Sqlstate -Id "R045" -Sql "SELECT migration_private.process_source_entry(30, 202, NULL, ARRAY[10, 10]::bigint[])" -ExpectedState "23514"

    # ==================================================================
    # R046–R063: OAV FORWARD RUNTIME
    # ==================================================================

    # Seed batch 50 for Section 3
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (50, 'running', 'Batch 50', 'TestRunner');" | Out-Null

    # R046: OAV text insert
    $napedHash = Run-Sql "SELECT migration_private.sha256_hex('v2:text:Elektryczny');"
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (300, 50, 100, 'naped', '{`"value`": `"Elektryczny`"}'::jsonb, '$napedHash', 'lm-source-v2', 1);" | Out-Null
    Assert-Test -Id "R046" -Sql "SELECT migration_private.process_source_entry(50, 300, NULL, NULL);" -Expected "migrated"

    # R047: OAV number insert
    Run-Sql "INSERT INTO public.attribute_definitions (id, stable_key, data_type, is_active) VALUES (2, 'udzwig', 'number', true);" | Out-Null
    $udzwigHash = Run-Sql "SELECT migration_private.sha256_hex('v2:number:1200');"
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (301, 50, 100, 'udzwig', '{`"value`": 1200}'::jsonb, '$udzwigHash', 'lm-source-v2', 1);" | Out-Null
    Assert-Test -Id "R047" -Sql "SELECT migration_private.process_source_entry(50, 301, NULL, NULL);" -Expected "migrated"

    # R048: OAV boolean insert
    Run-Sql "INSERT INTO public.attribute_definitions (id, stable_key, data_type, is_active) VALUES (5, 'is_new', 'boolean', true);" | Out-Null
    $boolHash = Run-Sql "SELECT migration_private.sha256_hex('v2:boolean:true');"
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (302, 50, 100, 'is_new', '{`"value`": true}'::jsonb, '$boolHash', 'lm-source-v2', 1);" | Out-Null
    Assert-Test -Id "R048" -Sql "SELECT migration_private.process_source_entry(50, 302, NULL, NULL);" -Expected "migrated"

    # R049: OAV year insert
    Run-Sql "INSERT INTO public.attribute_definitions (id, stable_key, data_type, is_active) VALUES (6, 'production_year', 'year', true);" | Out-Null
    $yearHash = Run-Sql "SELECT migration_private.sha256_hex('v2:year:2026');"
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (303, 50, 100, 'production_year', '{`"value`": 2026}'::jsonb, '$yearHash', 'lm-source-v2', 1);" | Out-Null
    Assert-Test -Id "R049" -Sql "SELECT migration_private.process_source_entry(50, 303, NULL, NULL);" -Expected "migrated"

    # R050: OAV enum insert
    Run-Sql "INSERT INTO public.attribute_definitions (id, stable_key, data_type, is_active) VALUES (7, 'color', 'enum', true);" | Out-Null
    Run-Sql "INSERT INTO public.controlled_option_values (id, attribute_id, stable_key, is_active) VALUES (30, 7, 'red', true);" | Out-Null
    Run-Sql "INSERT INTO public.controlled_option_values (id, attribute_id, stable_key, is_active) VALUES (31, 7, 'blue', true);" | Out-Null
    $enumHash = Run-Sql "SELECT migration_private.sha256_hex('v2:enum:30');"
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (304, 50, 100, 'color', '{`"value`": `"red`"}'::jsonb, '$enumHash', 'lm-source-v2', 1);" | Out-Null
    Assert-Test -Id "R050" -Sql "SELECT migration_private.process_source_entry(50, 304, 30, NULL);" -Expected "migrated"

    # R051: OAV date insert
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (305, 50, 100, 'date_attr', '{`"value`": `"2026-07-12T18:25:55.000Z`"}'::jsonb, '$dateHashZ', 'lm-source-v2', 1);" | Out-Null
    Assert-Test -Id "R051" -Sql "SELECT migration_private.process_source_entry(50, 305, NULL, NULL);" -Expected "migrated"

    # R052: OAV manifest creation
    Assert-Test -Id "R052" -Sql "SELECT count(*) FROM public.migration_oav_targets WHERE source_entry_id = 300;" -Expected "1"

    # R053: OAV target_provenance set
    Assert-Test -Id "R053" -Sql "SELECT target_provenance FROM public.migration_oav_targets WHERE source_entry_id = 300;" -Expected "created_by_batch"

    # R054: OAV exact text skip
    Run-Sql "INSERT INTO public.offer_attribute_values (offer_id, attribute_id, value_text) VALUES (101, 1, 'Elektryczny');" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (306, 50, 101, 'naped', '{`"value`": `"Elektryczny`"}'::jsonb, '$napedHash', 'lm-source-v2', 1);" | Out-Null
    Assert-Test -Id "R054" -Sql "SELECT migration_private.process_source_entry(50, 306, NULL, NULL);" -Expected "intentionally_skipped"

    # R055: OAV exact number skip
    Run-Sql "INSERT INTO public.offer_attribute_values (offer_id, attribute_id, value_number) VALUES (101, 2, 1200);" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (307, 50, 101, 'udzwig', '{`"value`": 1200}'::jsonb, '$udzwigHash', 'lm-source-v2', 1);" | Out-Null
    Assert-Test -Id "R055" -Sql "SELECT migration_private.process_source_entry(50, 307, NULL, NULL);" -Expected "intentionally_skipped"

    # R056: OAV exact boolean skip
    Run-Sql "INSERT INTO public.offer_attribute_values (offer_id, attribute_id, value_boolean) VALUES (101, 5, true);" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (308, 50, 101, 'is_new', '{`"value`": true}'::jsonb, '$boolHash', 'lm-source-v2', 1);" | Out-Null
    Assert-Test -Id "R056" -Sql "SELECT migration_private.process_source_entry(50, 308, NULL, NULL);" -Expected "intentionally_skipped"

    # R057: OAV exact year skip
    Run-Sql "INSERT INTO public.offer_attribute_values (offer_id, attribute_id, value_year) VALUES (101, 6, 2026);" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (309, 50, 101, 'production_year', '{`"value`": 2026}'::jsonb, '$yearHash', 'lm-source-v2', 1);" | Out-Null
    Assert-Test -Id "R057" -Sql "SELECT migration_private.process_source_entry(50, 309, NULL, NULL);" -Expected "intentionally_skipped"

    # R058: OAV exact enum skip
    Run-Sql "INSERT INTO public.offer_attribute_values (offer_id, attribute_id, option_id) VALUES (101, 7, 30);" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (310, 50, 101, 'color', '{`"value`": `"red`"}'::jsonb, '$enumHash', 'lm-source-v2', 1);" | Out-Null
    Assert-Test -Id "R058" -Sql "SELECT migration_private.process_source_entry(50, 310, 30, NULL);" -Expected "intentionally_skipped"

    # R059: OAV exact date skip
    Run-Sql "INSERT INTO public.offer_attribute_values (offer_id, attribute_id, value_date) VALUES (101, 4, '2026-07-12T18:25:55.000Z'::timestamp with time zone);" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (311, 50, 101, 'date_attr', '{`"value`": `"2026-07-12T18:25:55.000Z`"}'::jsonb, '$dateHashZ', 'lm-source-v2', 1);" | Out-Null
    Assert-Test -Id "R059" -Sql "SELECT migration_private.process_source_entry(50, 311, NULL, NULL);" -Expected "intentionally_skipped"

    # R060: OAV text value mismatch
    Run-Sql "INSERT INTO public.offer_attribute_values (offer_id, attribute_id, value_text) VALUES (102, 1, 'Spalinowy');" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (312, 50, 102, 'naped', '{`"value`": `"Elektryczny`"}'::jsonb, '$napedHash', 'lm-source-v2', 1);" | Out-Null
    Assert-Test -Id "R060" -Sql "SELECT migration_private.process_source_entry(50, 312, NULL, NULL);" -Expected "manual_review_required"

    # R061: OAV number value mismatch
    Run-Sql "INSERT INTO public.offer_attribute_values (offer_id, attribute_id, value_number) VALUES (102, 2, 1500);" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (313, 50, 102, 'udzwig', '{`"value`": 1200}'::jsonb, '$udzwigHash', 'lm-source-v2', 1);" | Out-Null
    Assert-Test -Id "R061" -Sql "SELECT migration_private.process_source_entry(50, 313, NULL, NULL);" -Expected "manual_review_required"

    # R062: OAV date value mismatch
    Run-Sql "INSERT INTO public.offer_attribute_values (offer_id, attribute_id, value_date) VALUES (102, 4, '2026-07-12T10:00:00.000Z'::timestamp with time zone);" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (314, 50, 102, 'date_attr', '{`"value`": `"2026-07-12T18:25:55.000Z`"}'::jsonb, '$dateHashZ', 'lm-source-v2', 1);" | Out-Null
    Assert-Test -Id "R062" -Sql "SELECT migration_private.process_source_entry(50, 314, NULL, NULL);" -Expected "manual_review_required"

    # R063: Legacy v1 source entries prohibition
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (315, 50, 103, 'naped', '{`"value`": `"Elektryczny`"}'::jsonb, 'hash', 'lm-source-v1', 1);" | Out-Null
    Assert-Test -Id "R063" -Sql "SELECT migration_private.process_source_entry(50, 315, NULL, NULL);" -Expected "manual_review_required"

    # ==================================================================
    # R064–R081: OAOV FORWARD RUNTIME
    # ==================================================================

    # Seed batch 70 for Section 4
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (70, 'running', 'Batch 70', 'TestRunner');" | Out-Null

    # R064: OAOV multi_enum set insert
    $oaovHash = Run-Sql "SELECT migration_private.sha256_hex('v2:multi_enum:10,20');"
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (400, 70, 103, 'features', '{`"value`": [`"triplex`", `"duplex`"]}'::jsonb, '$oaovHash', 'lm-source-v2', 2);" | Out-Null
    Assert-Test -Id "R064" -Sql "SELECT migration_private.process_source_entry(70, 400, NULL, ARRAY[10,20]::bigint[]);" -Expected "migrated"

    # R065: OAOV approved option sorting check (input order [20, 10], must sort to [10, 20])
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (401, 70, 104, 'features', '{`"value`": [`"duplex`", `"triplex`"]}'::jsonb, '$oaovHash', 'lm-source-v2', 2);" | Out-Null
    Assert-Test -Id "R065" -Sql "SELECT migration_private.process_source_entry(70, 401, NULL, ARRAY[20,10]::bigint[]);" -Expected "migrated"

    # R066: OAOV duplicate approved options check - use fresh unprocessed entry on offer 116
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (402, 70, 116, 'features', '{`"value`": [`"triplex`", `"duplex`"]}'::jsonb, '$oaovHash', 'lm-source-v2', 2);" | Out-Null
    Assert-Sqlstate -Id "R066" -Sql "SELECT migration_private.process_source_entry(70, 402, NULL, ARRAY[10, 10]::bigint[])" -ExpectedState "23514"

    # R067: OAOV NULL approved option check - use fresh unprocessed entry on offer 117
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (403, 70, 117, 'features', '{`"value`": [`"triplex`", `"duplex`"]}'::jsonb, '$oaovHash', 'lm-source-v2', 2);" | Out-Null
    Assert-Sqlstate -Id "R067" -Sql "SELECT migration_private.process_source_entry(70, 403, NULL, ARRAY[10, NULL]::bigint[])" -ExpectedState "23514"

    # R068: OAOV inactive option check
    Run-Sql "INSERT INTO public.controlled_option_values (id, attribute_id, stable_key, is_active) VALUES (21, 3, 'quad', false);" | Out-Null
    $oaovHashInactive = Run-Sql "SELECT migration_private.sha256_hex('v2:multi_enum:10,21');"
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (404, 70, 105, 'features', '{`"value`": [`"triplex`", `"quad`"]}'::jsonb, '$oaovHashInactive', 'lm-source-v2', 2);" | Out-Null
    Assert-Sqlstate -Id "R068" -Sql "SELECT migration_private.process_source_entry(70, 404, NULL, ARRAY[10,21]::bigint[])" -ExpectedState "23514"

    # R069: OAOV wrong attribute option check
    Assert-Sqlstate -Id "R069" -Sql "SELECT migration_private.process_source_entry(70, 404, NULL, ARRAY[10,30]::bigint[])" -ExpectedState "23514"

    # R070: OAOV exact set match skip
    Run-Sql "INSERT INTO public.offer_attribute_option_values (offer_id, attribute_id, option_id) VALUES (115, 3, 10), (115, 3, 20);" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (405, 70, 115, 'features', '{`"value`": [`"triplex`", `"duplex`"]}'::jsonb, '$oaovHash', 'lm-source-v2', 2);" | Out-Null
    Assert-Test -Id "R070" -Sql "SELECT migration_private.process_source_entry(70, 405, NULL, ARRAY[10,20]::bigint[]);" -Expected "intentionally_skipped"

    # R071: OAOV target manifest reuse check
    Assert-Test -Id "R071" -Sql "SELECT count(*) FROM public.migration_oaov_targets WHERE source_entry_id = 405;" -Expected "0"

    # R072: OAOV partial option set overlap
    Run-Sql "INSERT INTO public.offer_attribute_option_values (offer_id, attribute_id, option_id) VALUES (106, 3, 10);" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (406, 70, 106, 'features', '{`"value`": [`"triplex`", `"duplex`"]}'::jsonb, '$oaovHash', 'lm-source-v2', 2);" | Out-Null
    Assert-Test -Id "R072" -Sql "SELECT migration_private.process_source_entry(70, 406, NULL, ARRAY[10,20]::bigint[]);" -Expected "manual_review_required"

    # R073: OAOV extra option set elements
    Run-Sql "INSERT INTO public.offer_attribute_option_values (offer_id, attribute_id, option_id) VALUES (107, 3, 10), (107, 3, 20), (107, 3, 21);" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (407, 70, 107, 'features', '{`"value`": [`"triplex`", `"duplex`"]}'::jsonb, '$oaovHash', 'lm-source-v2', 2);" | Out-Null
    Assert-Test -Id "R073" -Sql "SELECT migration_private.process_source_entry(70, 407, NULL, ARRAY[10,20]::bigint[]);" -Expected "manual_review_required"

    # R074: OAOV different option set
    Run-Sql "INSERT INTO public.offer_attribute_option_values (offer_id, attribute_id, option_id) VALUES (114, 3, 20);" | Out-Null
    $oaovHashSingle = Run-Sql "SELECT migration_private.sha256_hex('v2:multi_enum:10');"
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (408, 70, 114, 'features', '{`"value`": [`"triplex`"]}'::jsonb, '$oaovHashSingle', 'lm-source-v2', 1);" | Out-Null
    Assert-Test -Id "R074" -Sql "SELECT migration_private.process_source_entry(70, 408, NULL, ARRAY[10]::bigint[]);" -Expected "manual_review_required"

    # R075: OAOV partial insert check
    $oaovHashInvalid2 = Run-Sql "SELECT migration_private.sha256_hex('v2:multi_enum:10,21');"
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (409, 70, 109, 'features', '{`"value`": [`"triplex`", `"quad`"]}'::jsonb, '$oaovHashInvalid2', 'lm-source-v2', 2);" | Out-Null
    try {
        Run-Sql "SELECT migration_private.process_source_entry(70, 409, NULL, ARRAY[10,21]::bigint[]);" | Out-Null
    } catch {}
    Assert-Test -Id "R075" -Sql "SELECT count(*) FROM public.offer_attribute_option_values WHERE offer_id = 109;" -Expected "0"

    # R076: OAOV manifest creation count
    Assert-Test -Id "R076" -Sql "SELECT count(*) FROM public.migration_oaov_targets WHERE source_entry_id = 400;" -Expected "2"

    # R077: OAOV group hash check
    Assert-Test -Id "R077" -Sql "SELECT count(DISTINCT target_hash_at_creation) FROM public.migration_oaov_targets WHERE source_entry_id = 400;" -Expected "1"

    # R078: OAOV expected target count check
    Assert-Sqlstate -Id "R078" -Sql "
        INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count)
        VALUES (410, 70, 110, 'features', '{`"value`": [`"triplex`", `"duplex`"]}'::jsonb, '$oaovHash', 'lm-source-v2', 1);
        SELECT migration_private.process_source_entry(70, 410, NULL, ARRAY[10,20]::bigint[]);
    " -ExpectedState "23514"

    # R079: OAOV repeated processing idempotency
    Assert-Test -Id "R079" -Sql "SELECT migration_private.process_source_entry(70, 400, NULL, ARRAY[10,20]::bigint[]);" -Expected "migrated"

    # R080: OAOV input-order independence
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (411, 70, 111, 'features', '{`"value`": [`"triplex`", `"duplex`"]}'::jsonb, '$oaovHash', 'lm-source-v2', 2);" | Out-Null
    Assert-Test -Id "R080" -Sql "SELECT migration_private.process_source_entry(70, 411, NULL, ARRAY[20,10]::bigint[]);" -Expected "migrated"

    # R081: OAOV deterministic set reconstruction check
    Assert-Test -Id "R081" -Sql "
        SELECT array_to_string(array_agg(option_id ORDER BY option_id ASC), ',')
        FROM public.offer_attribute_option_values
        WHERE offer_id = 111 AND attribute_id = 3;
    " -Expected "10,20"

    # ==================================================================
    # R082–R106: ROLLBACK, OWNERSHIP, LIFECYCLE AND AUDIT
    # ==================================================================

    # R082: Rollback OAV text target
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (502, 'completed', 'Batch 502', 'TestRunner');" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (5000, 502, 112, 'naped', '{`"value`": `"Elektryczny`"}'::jsonb, '$napedHash', 'lm-source-v2', 1);" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, value_text) VALUES (50000, 112, 1, 'Elektryczny');" | Out-Null
    Run-Sql "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version, target_provenance) VALUES (502, 5000, 50000, 50000, 112, 1, '$napedHash', 'lm-source-v2', 'created_by_batch');" | Out-Null

    $resR082 = Run-Sql "SELECT migration_private.rollback_batch(502);"
    if ($resR082 -eq "succeeded") {
        $motStatus = Run-Sql "SELECT rollback_status FROM public.migration_oav_targets WHERE source_entry_id = 5000;"
        $physExists = Run-Sql "SELECT count(*) FROM public.offer_attribute_values WHERE id = 50000;"
        if ($motStatus -eq "cleaned_up" -and $physExists -eq "0") {
            Register-Result -Id "R082" -Status "PASS" -Detail "OAV text rolled back"
        } else {
            Register-Result -Id "R082" -Status "FAIL" -Detail "Status: $motStatus, Phys: $physExists"
        }
    } else {
        Register-Result -Id "R082" -Status "FAIL" -Detail "Rollback failed: $resR082"
    }

    # R083: Rollback OAV number target
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (503, 'completed', 'Batch 503', 'TestRunner');" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (5001, 503, 112, 'udzwig', '{`"value`": 1200}'::jsonb, '$udzwigHash', 'lm-source-v2', 1);" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, value_number) VALUES (50001, 112, 2, 1200);" | Out-Null
    Run-Sql "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version, target_provenance) VALUES (503, 5001, 50001, 50001, 112, 2, '$udzwigHash', 'lm-source-v2', 'created_by_batch');" | Out-Null

    $resR083 = Run-Sql "SELECT migration_private.rollback_batch(503);"
    if ($resR083 -eq "succeeded") {
        $physExists = Run-Sql "SELECT count(*) FROM public.offer_attribute_values WHERE id = 50001;"
        if ($physExists -eq "0") { Register-Result -Id "R083" -Status "PASS" -Detail "OAV number rolled back" } else { Register-Result -Id "R083" -Status "FAIL" -Detail "Phys exists" }
    } else { Register-Result -Id "R083" -Status "FAIL" -Detail "Failed: $resR083" }

    # R084: Rollback OAV boolean target
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (504, 'completed', 'Batch 504', 'TestRunner');" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (5002, 504, 112, 'is_new', '{`"value`": true}'::jsonb, '$boolHash', 'lm-source-v2', 1);" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, value_boolean) VALUES (50002, 112, 5, true);" | Out-Null
    Run-Sql "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version, target_provenance) VALUES (504, 5002, 50002, 50002, 112, 5, '$boolHash', 'lm-source-v2', 'created_by_batch');" | Out-Null

    $resR084 = Run-Sql "SELECT migration_private.rollback_batch(504);"
    if ($resR084 -eq "succeeded") {
        $physExists = Run-Sql "SELECT count(*) FROM public.offer_attribute_values WHERE id = 50002;"
        if ($physExists -eq "0") { Register-Result -Id "R084" -Status "PASS" -Detail "OAV bool rolled back" } else { Register-Result -Id "R084" -Status "FAIL" -Detail "Phys exists" }
    } else { Register-Result -Id "R084" -Status "FAIL" -Detail "Failed: $resR084" }

    # R085: Rollback OAV year target
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (505, 'completed', 'Batch 505', 'TestRunner');" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (5003, 505, 112, 'production_year', '{`"value`": 2026}'::jsonb, '$yearHash', 'lm-source-v2', 1);" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, value_year) VALUES (50003, 112, 6, 2026);" | Out-Null
    Run-Sql "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version, target_provenance) VALUES (505, 5003, 50003, 50003, 112, 6, '$yearHash', 'lm-source-v2', 'created_by_batch');" | Out-Null

    $resR085 = Run-Sql "SELECT migration_private.rollback_batch(505);"
    if ($resR085 -eq "succeeded") {
        $physExists = Run-Sql "SELECT count(*) FROM public.offer_attribute_values WHERE id = 50003;"
        if ($physExists -eq "0") { Register-Result -Id "R085" -Status "PASS" -Detail "OAV year rolled back" } else { Register-Result -Id "R085" -Status "FAIL" -Detail "Phys exists" }
    } else { Register-Result -Id "R085" -Status "FAIL" -Detail "Failed: $resR085" }

    # R086: Rollback OAV enum target
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (506, 'completed', 'Batch 506', 'TestRunner');" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (5004, 506, 112, 'color', '{`"value`": `"red`"}'::jsonb, '$enumHash', 'lm-source-v2', 1);" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, option_id) VALUES (50004, 112, 7, 30);" | Out-Null
    Run-Sql "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_option_id, target_hash_at_creation, canonical_payload_version, target_provenance) VALUES (506, 5004, 50004, 50004, 112, 7, 30, '$enumHash', 'lm-source-v2', 'created_by_batch');" | Out-Null

    $resR086 = Run-Sql "SELECT migration_private.rollback_batch(506);"
    if ($resR086 -eq "succeeded") {
        $physExists = Run-Sql "SELECT count(*) FROM public.offer_attribute_values WHERE id = 50004;"
        if ($physExists -eq "0") { Register-Result -Id "R086" -Status "PASS" -Detail "OAV enum rolled back" } else { Register-Result -Id "R086" -Status "FAIL" -Detail "Phys exists" }
    } else { Register-Result -Id "R086" -Status "FAIL" -Detail "Failed: $resR086" }

    # R087: Rollback OAV date target
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (507, 'completed', 'Batch 507', 'TestRunner');" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (5005, 507, 112, 'date_attr', '{`"value`": `"2026-07-12T18:25:55.000Z`"}'::jsonb, '$dateHashZ', 'lm-source-v2', 1);" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, value_date) VALUES (50005, 112, 4, '2026-07-12T18:25:55.000Z'::timestamp with time zone);" | Out-Null
    Run-Sql "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version, target_provenance) VALUES (507, 5005, 50005, 50005, 112, 4, '$dateHashZ', 'lm-source-v2', 'created_by_batch');" | Out-Null

    $resR087 = Run-Sql "SELECT migration_private.rollback_batch(507);"
    if ($resR087 -eq "succeeded") {
        $physExists = Run-Sql "SELECT count(*) FROM public.offer_attribute_values WHERE id = 50005;"
        if ($physExists -eq "0") { Register-Result -Id "R087" -Status "PASS" -Detail "OAV date rolled back" } else { Register-Result -Id "R087" -Status "FAIL" -Detail "Phys exists" }
    } else { Register-Result -Id "R087" -Status "FAIL" -Detail "Failed: $resR087" }

    # R088: Rollback whole-group OAOV successfully
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (508, 'completed', 'Batch 508', 'TestRunner');" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (5006, 508, 113, 'features', '{`"value`": [`"triplex`", `"duplex`"]}'::jsonb, '$oaovHash', 'lm-source-v2', 2);" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_option_values (id, offer_id, attribute_id, option_id) VALUES (70000, 113, 3, 10), (70001, 113, 3, 20);" | Out-Null
    Run-Sql "INSERT INTO public.migration_oaov_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_option_id, target_hash_at_creation, canonical_payload_version, target_provenance) VALUES (508, 5006, 70000, 70000, 113, 3, 10, '$oaovHash', 'lm-source-v2', 'created_by_batch'), (508, 5006, 70001, 70001, 113, 3, 20, '$oaovHash', 'lm-source-v2', 'created_by_batch');" | Out-Null

    $resR088 = Run-Sql "SELECT migration_private.rollback_batch(508);"
    if ($resR088 -eq "succeeded") {
        $physExists = Run-Sql "SELECT count(*) FROM public.offer_attribute_option_values WHERE id IN (70000, 70001);"
        if ($physExists -eq "0") { Register-Result -Id "R088" -Status "PASS" -Detail "OAOV group rolled back" } else { Register-Result -Id "R088" -Status "FAIL" -Detail "Phys exists: $physExists" }
    } else { Register-Result -Id "R088" -Status "FAIL" -Detail "Failed: $resR088" }

    # R089: No single-manifest multi-enum rollback
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (509, 'completed', 'Batch 509', 'TestRunner');" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (5007, 509, 113, 'features', '{`"value`": [`"triplex`", `"duplex`"]}'::jsonb, '$oaovHash', 'lm-source-v2', 2);" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_option_values (id, offer_id, attribute_id, option_id) VALUES (70002, 113, 3, 10), (70003, 113, 3, 20);" | Out-Null
    # Missing option 20 manifest for R089 test!
    Run-Sql "INSERT INTO public.migration_oaov_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_option_id, target_hash_at_creation, canonical_payload_version, target_provenance) VALUES (509, 5007, 70002, 70002, 113, 3, 10, '$oaovHash', 'lm-source-v2', 'created_by_batch');" | Out-Null

    $resR089 = Run-Sql "SELECT migration_private.rollback_batch(509);"
    if ($resR089 -eq "conflict") {
        Register-Result -Id "R089" -Status "PASS" -Detail "single-manifest rollback blocked"
    } else {
        Register-Result -Id "R089" -Status "FAIL" -Detail "Result: $resR089"
    }

    # R090: Rollback unknown_legacy blocked
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (510, 'completed', 'Batch 510', 'TestRunner');" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (5008, 510, 120, 'naped', '{`"value`": `"Elektryczny`"}'::jsonb, '$napedHash', 'lm-source-v2', 1);" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, value_text) VALUES (50006, 120, 1, 'Elektryczny');" | Out-Null
    Run-Sql "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version, target_provenance) VALUES (510, 5008, 50006, 50006, 120, 1, '$napedHash', 'lm-source-v2', 'unknown_legacy');" | Out-Null
    Assert-Test -Id "R090" -Sql "SELECT migration_private.rollback_batch(510);" -Expected "conflict"

    # R091: Rollback legacy v1 manifest blocked
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (511, 'completed', 'Batch 511', 'TestRunner');" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (5009, 511, 121, 'naped', '{`"value`": `"Elektryczny`"}'::jsonb, '$napedHash', 'lm-source-v2', 1);" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, value_text) VALUES (50007, 121, 1, 'Elektryczny');" | Out-Null
    Run-Sql "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version, target_provenance) VALUES (511, 5009, 50007, 50007, 121, 1, '$napedHash', 'lm-source-v1', 'created_by_batch');" | Out-Null
    Assert-Test -Id "R091" -Sql "SELECT migration_private.rollback_batch(511);" -Expected "conflict"

    # Drop constraints to allow inserting mismatched/corrupt target records for R092/R093 tests (adhering to user request: drop before corrupt insert, restore immediately after)
    Run-Sql "ALTER TABLE public.migration_oav_targets DROP CONSTRAINT IF EXISTS chk_mot_lifecycle;" | Out-Null
    Run-Sql "ALTER TABLE public.migration_oav_targets DROP CONSTRAINT IF EXISTS chk_mot_row_ids;" | Out-Null

    # R092: Rollback OAV target_row_id_current mismatch conflict
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (512, 'completed', 'Batch 512', 'TestRunner');" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (5010, 512, 122, 'naped', '{`"value`": `"Elektryczny`"}'::jsonb, '$napedHash', 'lm-source-v2', 1);" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, value_text) VALUES (50008, 122, 1, 'Elektryczny');" | Out-Null
    Run-Sql "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version, target_provenance) VALUES (512, 5010, 50008, NULL, 122, 1, '$napedHash', 'lm-source-v2', 'created_by_batch');" | Out-Null
    Assert-Test -Id "R092" -Sql "SELECT migration_private.rollback_batch(512);" -Expected "conflict"

    # R093: Rollback OAV target_row_id_original mismatch conflict
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (513, 'completed', 'Batch 513', 'TestRunner');" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (5011, 513, 123, 'naped', '{`"value`": `"Elektryczny`"}'::jsonb, '$napedHash', 'lm-source-v2', 1);" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, value_text) VALUES (50009, 123, 1, 'Elektryczny');" | Out-Null
    Run-Sql "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version, target_provenance) VALUES (513, 5011, 99999, 50009, 123, 1, '$napedHash', 'lm-source-v2', 'created_by_batch');" | Out-Null
    Assert-Test -Id "R093" -Sql "SELECT migration_private.rollback_batch(513);" -Expected "conflict"

    # Clean up the invalid corrupt records for R092 & R093 so we can safely re-enable the constraints
    Run-Sql "DELETE FROM public.migration_oav_targets WHERE batch_id IN (512, 513);" | Out-Null

    # Re-enable/re-add the constraints to verify the rest of the tests run with active constraints
    Run-Sql "ALTER TABLE public.migration_oav_targets ADD CONSTRAINT chk_mot_row_ids CHECK (target_row_id_current IS NULL OR target_row_id_current = target_row_id_original);" | Out-Null
    Run-Sql "ALTER TABLE public.migration_oav_targets ADD CONSTRAINT chk_mot_lifecycle CHECK (
      (rollback_status = 'pending' AND target_row_id_current IS NOT NULL AND target_deleted_at IS NULL AND rollback_reason IS NULL)
      OR
      (rollback_status = 'cleaned_up' AND target_row_id_current IS NULL AND target_deleted_at IS NOT NULL AND rollback_reason = 'deleted_by_batch_rollback')
      OR
      (rollback_status = 'rollback_conflict' AND rollback_reason IS NOT NULL AND target_deleted_at IS NULL)
    );" | Out-Null

    # R094: Rollback physical target offer mismatch conflict
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (514, 'completed', 'Batch 514', 'TestRunner');" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (5012, 514, 124, 'naped', '{`"value`": `"Elektryczny`"}'::jsonb, '$napedHash', 'lm-source-v2', 1);" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, value_text) VALUES (50010, 125, 1, 'Elektryczny');" | Out-Null # offer 125 instead of 124
    Run-Sql "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version, target_provenance) VALUES (514, 5012, 50010, 50010, 124, 1, '$napedHash', 'lm-source-v2', 'created_by_batch');" | Out-Null
    Assert-Test -Id "R094" -Sql "SELECT migration_private.rollback_batch(514);" -Expected "conflict"

    # R095: Rollback physical target attribute mismatch conflict
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (515, 'completed', 'Batch 515', 'TestRunner');" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (5013, 515, 126, 'naped', '{`"value`": `"Elektryczny`"}'::jsonb, '$napedHash', 'lm-source-v2', 1);" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, value_text) VALUES (50011, 126, 2, 'Elektryczny');" | Out-Null # attribute 2 instead of 1
    Run-Sql "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version, target_provenance) VALUES (515, 5013, 50011, 50011, 126, 1, '$napedHash', 'lm-source-v2', 'created_by_batch');" | Out-Null
    Assert-Test -Id "R095" -Sql "SELECT migration_private.rollback_batch(515);" -Expected "conflict"

    # R096: Rollback physical target option mismatch conflict
    # Use blueHash (option 31) as manifest hash but actual row has option 30 → hash mismatch → conflict
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (516, 'completed', 'Batch 516', 'TestRunner');" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (5014, 516, 127, 'color', '{`"value`": `"red`"}'::jsonb, '$enumHash', 'lm-source-v2', 1);" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, option_id) VALUES (50012, 127, 7, 30);" | Out-Null
    # Manifest expects hash of option 31 (blue) but actual row has option 30 (red) → hash mismatch → conflict
    $blueHash = Run-Sql "SELECT migration_private.sha256_hex('v2:enum:31');"
    Run-Sql "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_option_id, target_hash_at_creation, canonical_payload_version, target_provenance) VALUES (516, 5014, 50012, 50012, 127, 7, 31, '$blueHash', 'lm-source-v2', 'created_by_batch');" | Out-Null
    Assert-Test -Id "R096" -Sql "SELECT migration_private.rollback_batch(516);" -Expected "conflict"

    # R097: Rollback physical target canonical hash mismatch conflict
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (517, 'completed', 'Batch 517', 'TestRunner');" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (5015, 517, 128, 'naped', '{`"value`": `"Elektryczny`"}'::jsonb, '$napedHash', 'lm-source-v2', 1);" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, value_text) VALUES (50013, 128, 1, 'Spalinowy');" | Out-Null # Different value -> different hash
    Run-Sql "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version, target_provenance) VALUES (517, 5015, 50013, 50013, 128, 1, '$napedHash', 'lm-source-v2', 'created_by_batch');" | Out-Null
    Assert-Test -Id "R097" -Sql "SELECT migration_private.rollback_batch(517);" -Expected "conflict"

    # R098: Rollback batch ownership mismatch — target_provenance = 'unknown_legacy'
    # Create batch with a target that was NOT created by this batch (provenance mismatch)
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (519, 'completed', 'Batch 519', 'TestRunner');" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (5018, 519, 130, 'naped', '{`"value`": `"Elektryczny`"}'::jsonb, '$napedHash', 'lm-source-v2', 1);" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, value_text) VALUES (50015, 130, 1, 'Elektryczny');" | Out-Null
    # Manifest claims provenance 'unknown_legacy' — batch does not own this target
    Run-Sql "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version, target_provenance) VALUES (519, 5018, 50015, 50015, 130, 1, '$napedHash', 'lm-source-v2', 'unknown_legacy');" | Out-Null
    $resR098 = Run-Sql "SELECT migration_private.rollback_batch(519);"
    $physR098 = Run-Sql "SELECT count(*) FROM public.offer_attribute_values WHERE id = 50015;"
    $motR098 = Run-Sql "SELECT rollback_status FROM public.migration_oav_targets WHERE source_entry_id = 5018;"
    if ($resR098 -eq "conflict" -and $physR098 -eq "1" -and $motR098 -eq "pending") {
        Register-Result -Id "R098" -Status "PASS" -Detail "target provenance ownership mismatch conflict"
    } else {
        Register-Result -Id "R098" -Status "FAIL" -Detail "res=$resR098 phys=$physR098 mot=$motR098"
    }

    # R099: Rollback source entry integrity mismatch — legacy canonical version
    # Create a manifest with legacy v1 canonical version — automatic rollback forbidden
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (521, 'completed', 'Batch 521', 'TestRunner');" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (5019, 521, 131, 'naped', '{`"value`": `"Elektryczny`"}'::jsonb, '$napedHash', 'lm-source-v2', 1);" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, value_text) VALUES (50016, 131, 1, 'Elektryczny');" | Out-Null
    # Manifest with legacy v1 canonical version — integrity mismatch with current runtime
    Run-Sql "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version, target_provenance) VALUES (521, 5019, 50016, 50016, 131, 1, '$napedHash', 'lm-source-v1', 'created_by_batch');" | Out-Null
    $resR099 = Run-Sql "SELECT migration_private.rollback_batch(521);"
    $physR099 = Run-Sql "SELECT count(*) FROM public.offer_attribute_values WHERE id = 50016;"
    $motR099 = Run-Sql "SELECT rollback_status FROM public.migration_oav_targets WHERE source_entry_id = 5019;"
    if ($resR099 -eq "conflict" -and $physR099 -eq "1" -and $motR099 -eq "pending") {
        Register-Result -Id "R099" -Status "PASS" -Detail "legacy canonical version integrity mismatch conflict"
    } else {
        Register-Result -Id "R099" -Status "FAIL" -Detail "res=$resR099 phys=$physR099 mot=$motR099"
    }

    # R100: Rollback non-pending target lifecycle conflict
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (518, 'completed', 'Batch 518', 'TestRunner');" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (5016, 518, 129, 'naped', '{`"value`": `"Elektryczny`"}'::jsonb, '$napedHash', 'lm-source-v2', 1);" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, value_text) VALUES (50014, 129, 1, 'Elektryczny');" | Out-Null
    Run-Sql "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version, target_provenance) VALUES (518, 5016, 50014, 50014, 129, 1, '$napedHash', 'lm-source-v2', 'created_by_batch');" | Out-Null

    # Try updating status to 'rollback_conflict' directly on target manifest, which triggers conflict if rerun
    Run-Sql "UPDATE public.migration_oav_targets SET rollback_status = 'rollback_conflict', rollback_reason = 'Manually marked conflict' WHERE source_entry_id = 5016;" | Out-Null
    Assert-Test -Id "R100" -Sql "SELECT migration_private.rollback_batch(518);" -Expected "conflict"

    # Seed for R102 physical delete count check
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (522, 'completed', 'Batch 522', 'TestRunner');" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (50022, 522, 112, 'naped', '{`"value`": `"Elektryczny`"}'::jsonb, '$napedHash', 'lm-source-v2', 1);" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, value_text) VALUES (50022, 112, 1, 'Elektryczny');" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, value_number) VALUES (50023, 112, 2, 1200);" | Out-Null
    Run-Sql "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version, target_provenance) VALUES (522, 50022, 50022, 50022, 112, 1, '$napedHash', 'lm-source-v2', 'created_by_batch');" | Out-Null

    # R101: Rollback manifest update count check
    Assert-Test -Id "R101" -Sql "
        SELECT COALESCE(SUM(c), 0) FROM (
            SELECT COUNT(*) AS c FROM public.migration_oav_targets WHERE batch_id = 502 AND rollback_status = 'cleaned_up' AND target_row_id_current IS NULL AND target_deleted_at IS NOT NULL
            UNION ALL
            SELECT COUNT(*) AS c FROM public.migration_oaov_targets WHERE batch_id = 508 AND rollback_status = 'cleaned_up' AND target_row_id_current IS NULL AND target_deleted_at IS NOT NULL
        ) t;
    " -Expected "3"

    # R102: Rollback physical delete count check
    $preExists = Run-Sql "SELECT EXISTS(SELECT 1 FROM public.offer_attribute_values WHERE id = 50022);"
    $rbResult = Run-Sql "SELECT migration_private.rollback_batch(522);"
    $postExists = Run-Sql "SELECT EXISTS(SELECT 1 FROM public.offer_attribute_values WHERE id = 50022);"
    $unrelatedExists = Run-Sql "SELECT EXISTS(SELECT 1 FROM public.offer_attribute_values WHERE id = 50023);"
    $r102Pass = ($preExists -eq "t" -and $rbResult -eq "succeeded" -and $postExists -eq "f" -and $unrelatedExists -eq "t")
    Assert-Value -Id "R102" -Actual $r102Pass -Expected $true -Detail "Physical delete check (pre=$preExists, res=$rbResult, post=$postExists, unrelated=$unrelatedExists)"

    # R103: Rollback attempt status succeeded check
    Assert-Test -Id "R103" -Sql "SELECT status FROM public.migration_rollback_attempts WHERE batch_id = 502;" -Expected "succeeded"

    # R104: Rollback attempt status conflict check
    Assert-Test -Id "R104" -Sql "SELECT status FROM public.migration_rollback_attempts WHERE batch_id = 512;" -Expected "conflict"

    # R105: Rollback attempt status failed check — REAL technical failure via trigger injection
    # Create a disposable trigger that forces DELETE failure on a specific target
    # lm46_test schema already created during test setup (line 220)
    Run-Sql "CREATE OR REPLACE FUNCTION lm46_test.force_rollback_delete_failure()
RETURNS trigger LANGUAGE plpgsql AS `$`$
BEGIN
  IF OLD.id = 50017 THEN
    RAISE EXCEPTION 'LM46_TEST_FORCED_ROLLBACK_FAILURE'
      USING ERRCODE = 'P0001',
            DETAIL = 'LM46_TEST_DETAIL',
            HINT = 'LM46_TEST_HINT';
  END IF;
  RETURN OLD;
END;
`$`$;" | Out-Null
    Run-Sql "CREATE TRIGGER trg_force_rollback_delete
BEFORE DELETE ON public.offer_attribute_values
FOR EACH ROW
EXECUTE FUNCTION lm46_test.force_rollback_delete_failure();" | Out-Null

    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (523, 'completed', 'Batch 523', 'TestRunner');" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (5021, 523, 132, 'naped', '{`"value`": `"Elektryczny`"}'::jsonb, '$napedHash', 'lm-source-v2', 1);" | Out-Null
    Run-Sql "INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, value_text) VALUES (50017, 132, 1, 'Elektryczny');" | Out-Null
    Run-Sql "INSERT INTO public.migration_oav_targets (batch_id, source_entry_id, target_row_id_original, target_row_id_current, target_offer_id, target_attribute_id, target_hash_at_creation, canonical_payload_version, target_provenance) VALUES (523, 5021, 50017, 50017, 132, 1, '$napedHash', 'lm-source-v2', 'created_by_batch');" | Out-Null

    # Execute rollback_batch with ErrorActionPreference=Continue to avoid ErrorRecord from trigger
    $tempRbFile = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($tempRbFile, "SELECT migration_private.rollback_batch(523);", (New-Object System.Text.UTF8Encoding $false))
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $resR105 = & "$pgBin\psql.exe" -h localhost -p $dbPort -U $dbUser -d $dbName -t -A -X -v ON_ERROR_STOP=1 -f $tempRbFile 2>&1
    $rbExit = $LASTEXITCODE
    $ErrorActionPreference = $prevEAP
    if ($rbExit -ne 0) { $resR105 = "error" }
    if (Test-Path $tempRbFile) { Remove-Item $tempRbFile -Force }

    $physR105 = Run-Sql "SELECT count(*) FROM public.offer_attribute_values WHERE id = 50017;"
    $attemptR105 = Run-Sql "SELECT status FROM public.migration_rollback_attempts WHERE batch_id = 523;"

    # Cleanup trigger immediately after test
    Run-Sql "DROP TRIGGER IF EXISTS trg_force_rollback_delete ON public.offer_attribute_values;" | Out-Null
    Run-Sql "DROP FUNCTION IF EXISTS lm46_test.force_rollback_delete_failure();" | Out-Null

    if ($resR105 -eq "failed" -and $physR105 -eq "1" -and $attemptR105 -eq "failed") {
        Register-Result -Id "R105" -Status "PASS" -Detail "real technical failure via trigger"
    } else {
        Register-Result -Id "R105" -Status "FAIL" -Detail "res=$resR105 phys=$physR105 attempt=$attemptR105"
    }

    # R106: Rollback GET STACKED DIAGNOSTICS fields check — uses REAL attempt from R105
    $diagMessage = Run-Sql "SELECT message FROM public.migration_rollback_attempts WHERE batch_id = 523;"
    $diagDetail = Run-Sql "SELECT detail FROM public.migration_rollback_attempts WHERE batch_id = 523;"
    $diagHint = Run-Sql "SELECT hint FROM public.migration_rollback_attempts WHERE batch_id = 523;"
    $diagSqlstate = Run-Sql "SELECT sqlstate FROM public.migration_rollback_attempts WHERE batch_id = 523;"
    if ($diagMessage -like "*LM46_TEST_FORCED_ROLLBACK_FAILURE*" -and
        $diagDetail -like "*LM46_TEST_DETAIL*" -and
        $diagHint -like "*LM46_TEST_HINT*" -and
        $diagSqlstate -eq "P0001") {
        Register-Result -Id "R106" -Status "PASS" -Detail "GET STACKED DIAGNOSTICS from real failure"
    } else {
        Register-Result -Id "R106" -Status "FAIL" -Detail "msg=$diagMessage detail=$diagDetail hint=$diagHint sqlstate=$diagSqlstate"
    }

    # ==================================================================
    # R107–R114: REAL MULTI-SESSION CONCURRENCY
    # ==================================================================

    # Setup: Insert a dedicated source entry for offer 110 to use in concurrency tests
    $concurrencyHash = Run-Sql "SELECT migration_private.sha256_hex('v2:text:ConcurrencyTest');"
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (920, 'running', 'ConcurrencyBatch', 'TestRunner');" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (9080, 920, 110, 'conc_test', '{`"value`": `"ConcurrencyTest`"}'::jsonb, '$concurrencyHash', 'lm-source-v2', 1);" | Out-Null
    Run-Sql "INSERT INTO public.attribute_definitions (id, stable_key, data_type, is_active) VALUES (9, 'conc_test', 'text', true);" | Out-Null

    # R107: Concurrency Scenario A: Session A starts transaction and locks target offer
    Write-Host "Starting Session A to lock offer 110..."
    $sessionASql = "BEGIN; SELECT 'SESSION_A_PID:' || pg_backend_pid(); SELECT id FROM public.offers WHERE id = 110 FOR UPDATE; SELECT pg_sleep(5); COMMIT;"
    $tempSqlFile = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($tempSqlFile, $sessionASql, (New-Object System.Text.UTF8Encoding $false))

    $pgBinLocal  = $pgBin
    $dbPortLocal = $dbPort
    $dbUserLocal = $dbUser
    $dbNameLocal = $dbName
    $sessionAJob = Start-Job -ScriptBlock {
        param($bin, $port, $user, $db, $file)
        $env:PGPASSWORD = ''
        & "$bin\psql.exe" -h localhost -p $port -U $user -d $db -t -A -f $file 2>&1
    } -ArgumentList $pgBinLocal, $dbPortLocal, $dbUserLocal, $dbNameLocal, $tempSqlFile

    # Poll Receive-Job to capture Session A's PID
    $pidConfirmed = $null
    $timeoutSec = 10
    $elapsed = 0
    while ($null -eq $pidConfirmed -and $elapsed -lt $timeoutSec) {
        Start-Sleep -Milliseconds 500
        $elapsed += 0.5
        $jobOut = Receive-Job -Job $sessionAJob -Keep
        if ($jobOut) {
            $jobOutStr = ($jobOut | Out-String).Trim()
            if ($jobOutStr -match "SESSION_A_PID:(\d+)") {
                $pidConfirmed = [int]$Matches[1]
                Write-Host "Captured Session A PID: $pidConfirmed"
            }
        }
    }

    # Poll pg_locks to confirm Session A holds RowShareLock on public.offers
    $lockConfirmed = $false
    $elapsed = 0
    while ($elapsed -lt 10 -and $null -ne $pidConfirmed) {
        $lockCount = Run-Sql "
            SELECT count(*)
            FROM pg_locks
            WHERE pid = $pidConfirmed
              AND relation = 'public.offers'::regclass
              AND mode = 'RowShareLock'
              AND granted = true;
        "
        if ($lockCount -eq "1") {
            $lockConfirmed = $true
            break
        }
        Start-Sleep -Milliseconds 500
        $elapsed += 0.5
    }

    Assert-Value -Id "R107" -Actual $lockConfirmed -Expected $true -Detail "Session A active and holding RowShareLock on offer 110"

    # R108: Concurrency Scenario A: Session B process_source_entry blocks on locked offer
    # Source entry 9080 targets offer 110 which is locked by Session A
    # lock_timeout = 2s must trigger 55P03 before Session A releases after pg_sleep(5)
    $lockTimeoutSql = "SET lock_timeout = '2s'; SELECT migration_private.process_source_entry(920, 9080, NULL, NULL);"
    Assert-Sqlstate -Id "R108" -Sql $lockTimeoutSql -ExpectedState "55P03"

    # R109: Concurrency Scenario A: After Session A exits, lock is released
    # Wait for Session A job to finish (15 second timeout)
    $null = Wait-Job -Job $sessionAJob -Timeout 15
    $jobState = $sessionAJob.State
    $jobOutput = Receive-Job -Job $sessionAJob | Out-String
    Remove-Job -Job $sessionAJob -Force
    if (Test-Path $tempSqlFile) { Remove-Item $tempSqlFile -Force }

    $lockCountAfter = 0
    if ($null -ne $pidConfirmed) {
        $lockCountAfter = [int](Run-Sql "
            SELECT count(*)
            FROM pg_locks
            WHERE pid = $pidConfirmed
              AND relation = 'public.offers'::regclass
              AND mode = 'RowShareLock';
        ")
    }

    $sAExited = ($jobState -eq "Completed" -and $lockCountAfter -eq 0)
    Assert-Value -Id "R109" -Actual $sAExited -Expected $true -Detail "Session A finished successfully, lock released"

    # R110: Concurrency Scenario A: Session B can now process successfully (lock released)
    $resR110 = Run-Sql "SELECT migration_private.process_source_entry(920, 9080, NULL, NULL);"
    $targetCount = Run-Sql "SELECT count(*) FROM public.migration_oav_targets WHERE source_entry_id = 9080;"
    $physCount = Run-Sql "SELECT count(*) FROM public.offer_attribute_values WHERE offer_id = 110 AND attribute_id = 9;"
    $sBSuccess = ($resR110 -eq "migrated" -and $targetCount -eq "1" -and $physCount -eq "1")
    Assert-Value -Id "R110" -Actual $sBSuccess -Expected $true -Detail "Session B successfully processed after release"

    # Concurrency Scenario B Setup
    $oaovHashB = Run-Sql "SELECT migration_private.sha256_hex('v2:multi_enum:10,20');"
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (930, 'running', 'OAOV Concurrency Batch A', 'TestRunner');" | Out-Null
    Run-Sql "INSERT INTO public.migration_batches (id, status, source_description, created_by) VALUES (931, 'running', 'OAOV Concurrency Batch B', 'TestRunner');" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (9090, 930, 130, 'features', '{`"value`": [`"triplex`", `"duplex`"]}'::jsonb, '$oaovHashB', 'lm-source-v2', 2);" | Out-Null
    Run-Sql "INSERT INTO public.migration_source_entries (id, batch_id, source_offer_id, source_key, raw_value, source_hash, source_payload_version, expected_target_count) VALUES (9091, 931, 130, 'features', '{`"value`": [`"triplex`", `"duplex`"]}'::jsonb, '$oaovHashB', 'lm-source-v2', 2);" | Out-Null

    # R111: Concurrency Scenario B: Two sessions establish separate connection channels
    Write-Host "Starting Session A for OAOV concurrency on offer 130..."
    $sessionASqlB = "BEGIN; SELECT 'SESSION_B_PID:' || pg_backend_pid(); SELECT migration_private.process_source_entry(930, 9090, NULL, ARRAY[10,20]::bigint[]); SELECT pg_sleep(5); COMMIT;"
    $tempSqlFileB = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($tempSqlFileB, $sessionASqlB, (New-Object System.Text.UTF8Encoding $false))

    $sessionAJobB = Start-Job -ScriptBlock {
        param($bin, $port, $user, $db, $file)
        $env:PGPASSWORD = ''
        & "$bin\psql.exe" -h localhost -p $port -U $user -d $db -t -A -f $file 2>&1
    } -ArgumentList $pgBinLocal, $dbPortLocal, $dbUserLocal, $dbNameLocal, $tempSqlFileB

    # Poll to capture Session A B's PID
    $pidB = $null
    $elapsedB = 0
    while ($null -eq $pidB -and $elapsedB -lt 10) {
        Start-Sleep -Milliseconds 500
        $elapsedB += 0.5
        $jobOutB = Receive-Job -Job $sessionAJobB -Keep
        if ($jobOutB) {
            $jobOutStrB = ($jobOutB | Out-String).Trim()
            if ($jobOutStrB -match "SESSION_B_PID:(\d+)") {
                $pidB = [int]$Matches[1]
                Write-Host "Captured Session A B PID: $pidB"
            }
        }
    }

    # Assert distinct PIDs
    Assert-Test -Id "R111" -Sql "
        SELECT count(DISTINCT pid)
        FROM pg_stat_activity
        WHERE pid IN ($pidB, pg_backend_pid());
    " -Expected "2"

    # R112: Concurrency Scenario B: Session B waits for Session A
    $lockTimeoutSqlB = "SET lock_timeout = '2s'; SELECT migration_private.process_source_entry(931, 9091, NULL, ARRAY[10,20]::bigint[]);"
    Assert-Sqlstate -Id "R112" -Sql $lockTimeoutSqlB -ExpectedState "55P03"

    # Wait for Session A to finish
    $null = Wait-Job -Job $sessionAJobB -Timeout 15
    $jobStateB = $sessionAJobB.State
    $jobOutputB = Receive-Job -Job $sessionAJobB | Out-String
    Remove-Job -Job $sessionAJobB -Force
    if (Test-Path $tempSqlFileB) { Remove-Item $tempSqlFileB -Force }

    # R113: Concurrency Scenario B: Single target row insert
    Assert-Test -Id "R113" -Sql "
        SELECT array_to_string(array_agg(option_id ORDER BY option_id ASC), ',')
        FROM public.offer_attribute_option_values
        WHERE offer_id = 130 AND attribute_id = 3;
    " -Expected "10,20"

    # R114: Concurrency Scenario B: Manifest count validation
    Assert-Test -Id "R114" -Sql "
        SELECT concat(
            (SELECT count(*) FROM public.migration_oaov_targets WHERE batch_id = 930 AND target_offer_id = 130 AND source_entry_id = 9090 AND rollback_status = 'pending'),
            ',',
            (SELECT count(*) FROM public.migration_oaov_targets WHERE batch_id = 931 AND target_offer_id = 130 AND source_entry_id = 9091)
        );
    " -Expected "2,0"

    # ==================================================================
    # R115–R122: MAPPING AND DRY-RUN DETERMINISM
    # ==================================================================

    # R115: Dry-run execution zero exit code on valid manifest
    # Run the tsx script and capture exit code
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & npx.cmd --no-install tsx scripts/lm46-dry-run.ts 2>&1 | Out-Null
    $ErrorActionPreference = $prevEAP
    if ($LASTEXITCODE -eq 0) {
        Register-Result -Id "R115" -Status "PASS" -Detail "dry-run success"
    } else {
        Register-Result -Id "R115" -Status "FAIL" -Detail "dry-run failed with code: $LASTEXITCODE"
    }

    # R116: Dry-run non-zero exit code on invalid paths
    # We will trigger the catch block of lm46-dry-run.ts by temporarily renaming the sanitized json
    Rename-Item "scripts/sql/fixtures/lm46-technical-attributes-sanitized.json" "lm46-technical-attributes-sanitized.json.bak"
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & npx.cmd --no-install tsx scripts/lm46-dry-run.ts 2>&1 | Out-Null
    $ErrorActionPreference = $prevEAP
    $bakExit = $LASTEXITCODE
    Rename-Item "scripts/sql/fixtures/lm46-technical-attributes-sanitized.json.bak" "lm46-technical-attributes-sanitized.json"
    if ($bakExit -ne 0) {
        Register-Result -Id "R116" -Status "PASS" -Detail "failed as expected"
    } else {
        Register-Result -Id "R116" -Status "FAIL" -Detail "did not fail on missing file"
    }

    # Read the dry-run report content
    $report = Get-Content "scripts/lm46-dry-run-report.txt" -Raw

    # R117: Dry-run report contract version check
    if ($report -match "fixture contract version: lm46-sanitized-source-v1") {
        Register-Result -Id "R117" -Status "PASS" -Detail "contract version check"
    } else {
        Register-Result -Id "R117" -Status "FAIL" -Detail "No contract version match"
    }

    # R118: Dry-run report manifest version check
    if ($report -match "manifest version: lm-cat-filter-46-map-v1") {
        Register-Result -Id "R118" -Status "PASS" -Detail "manifest version check"
    } else {
        Register-Result -Id "R118" -Status "FAIL" -Detail "No manifest version match"
    }

    # R119: Dry-run report offer count
    if ($report -match "offer count: 9") {
        Register-Result -Id "R119" -Status "PASS" -Detail "offer count 9"
    } else {
        Register-Result -Id "R119" -Status "FAIL" -Detail "No offer count 9 match"
    }

    # R120: Dry-run report category count
    if ($report -match "category count: 6") {
        Register-Result -Id "R120" -Status "PASS" -Detail "category count 6"
    } else {
        Register-Result -Id "R120" -Status "FAIL" -Detail "No category count 6 match"
    }

    # R121: Dry-run report unique keys count
    if ($report -match "source-key count: 23") {
        Register-Result -Id "R121" -Status "PASS" -Detail "unique keys count 23"
    } else {
        Register-Result -Id "R121" -Status "FAIL" -Detail "No unique keys count 23 match"
    }

    # R122: Dry-run report manual review count
    if ($report -match "manual-review count: 23") {
        Register-Result -Id "R122" -Status "PASS" -Detail "manual review count 23"
    } else {
        Register-Result -Id "R122" -Status "FAIL" -Detail "No manual review count 23 match"
    }

    # ==================================================================
    # R123–R130: REGRESSION AND QUALITY GATES
    # ==================================================================

    # R123: Git clean working tree check — REAL immutability with baseline
    $gitStatusEnd = @(git status --porcelain=v1 --untracked-files=all)
    $gitDiffEnd = @(git diff --binary)
    $gitCachedEnd = @(git diff --cached --binary)

    $r123Pass = $true
    $r123Detail = ""

    # Compare status against baseline (no new tracked mutations allowed)
    $statusBaselineStr = $GitStatusBaseline -join "`n"
    $statusEndStr = $gitStatusEnd -join "`n"
    if ($statusBaselineStr -ne $statusEndStr) {
        $r123Pass = $false
        $r123Detail += "status changed vs baseline; "
    }

    # Compare diff against baseline
    $diffBaselineStr = $GitDiffBaseline -join "`n"
    $diffEndStr = $gitDiffEnd -join "`n"
    if ($diffBaselineStr -ne $diffEndStr) {
        $r123Pass = $false
        $r123Detail += "diff changed vs baseline; "
    }

    # Compare cached diff against baseline
    $cachedBaselineStr = $GitCachedBaseline -join "`n"
    $cachedEndStr = $gitCachedEnd -join "`n"
    if ($cachedBaselineStr -ne $cachedEndStr) {
        $r123Pass = $false
        $r123Detail += "cached diff changed vs baseline; "
    }

    # Check critical file hashes unchanged during test run (baseline vs end)
    $endHash0003 = git hash-object "drizzle/0003_wet_scarlet_spider.sql" 2>$null
    $endHashSchema = git hash-object "src/lib/schema.ts" 2>$null
    $endHash46 = git hash-object "scripts/verify-lm-cat-filter-46.ps1" 2>$null

    if ($BaselineHash0003 -ne $endHash0003) {
        $r123Pass = $false
        $r123Detail += "0003 hash changed during test; "
    }
    if ($BaselineHashSchema -ne $endHashSchema) {
        $r123Pass = $false
        $r123Detail += "schema hash changed during test; "
    }
    if ($BaselineHash46 -ne $endHash46) {
        $r123Pass = $false
        $r123Detail += "harness hash changed during test; "
    }

    if ($r123Pass) {
        Register-Result -Id "R123" -Status "PASS" -Detail "no tracked mutations vs baseline"
    } else {
        Register-Result -Id "R123" -Status "FAIL" -Detail $r123Detail
    }

    # R124: HEAD commit contains required Sprint 46 DDL migrations — EXACT HEAD tree proof
    git cat-file -e "HEAD:drizzle/0003_wet_scarlet_spider.sql" 2>$null
    $catFileExit = $LASTEXITCODE
    $trackedPath = git ls-tree -r --name-only HEAD -- "drizzle/0003_wet_scarlet_spider.sql" 2>$null
    $headBlob = git rev-parse "HEAD:drizzle/0003_wet_scarlet_spider.sql" 2>$null
    $workBlob = git hash-object "drizzle/0003_wet_scarlet_spider.sql" 2>$null

    if ($catFileExit -eq 0 -and $trackedPath -eq "drizzle/0003_wet_scarlet_spider.sql" -and $headBlob -eq $workBlob) {
        Register-Result -Id "R124" -Status "PASS" -Detail "exact HEAD tree match"
    } else {
        Register-Result -Id "R124" -Status "FAIL" -Detail "catFile=$catFileExit path=$trackedPath head=$headBlob work=$workBlob"
    }

    # R125: HEAD is descendant of Sprint 45 check
    git merge-base --is-ancestor 6666d3ce0d161969350eccb2dbd1954590c711ab HEAD 2>$null
    if ($LASTEXITCODE -eq 0) {
        Register-Result -Id "R125" -Status "PASS" -Detail "descendant verified"
    } else {
        Register-Result -Id "R125" -Status "FAIL" -Detail "not descendant"
    }

    # R126: npx drizzle-kit check check
    # Check that drizzle kit check returns exit code 0
    & npx.cmd --no-install drizzle-kit check 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Register-Result -Id "R126" -Status "PASS" -Detail "check success"
    } else {
        Register-Result -Id "R126" -Status "FAIL" -Detail "check failed"
    }

    # R127: TypeScript build compilation check
    Write-Host "Running Next.js production build check..."
    $oldDbUrl = $env:DATABASE_URL
    try {
        $env:DATABASE_URL = "postgres://postgres@localhost:$dbPort/$dbName"
        $prevEAP = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        & npm.cmd run build 2>&1 | Out-Null
        $ErrorActionPreference = $prevEAP
        $buildExit = $LASTEXITCODE
    } finally {
        if ($null -eq $oldDbUrl) {
            Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
        } else {
            $env:DATABASE_URL = $oldDbUrl
        }
    }
    Assert-Value -Id "R127" -Actual $buildExit -Expected 0 -Detail "Next.js build compilation exit code"

    # R128: Git diff check check
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & git diff --check 2>&1 | Out-Null
    $ErrorActionPreference = $prevEAP
    $diffCheckExit = $LASTEXITCODE
    Assert-Value -Id "R128" -Actual $diffCheckExit -Expected 0 -Detail "git diff check exit code"

    # R129: verify-lm-cat-filter-44-close.ps1 runs and passes completely
    Write-Host "Running Sprint 44 regression tests..."
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $s44Output = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts/verify-lm-cat-filter-44-close.ps1" 2>&1
    $ErrorActionPreference = $prevEAP
    $s44Exit = $LASTEXITCODE
    $s44Pass = $false
    if ($s44Exit -eq 0 -and $s44Output -match "ALL TESTS PASSED") {
        $s44Pass = $true
    }
    Assert-Value -Id "R129" -Actual $s44Pass -Expected $true -Detail "Sprint 44 regression run result (exit=$s44Exit)"

    # R130: verify-lm-cat-filter-45.ps1 runs and passes completely
    Write-Host "Running Sprint 45 regression tests with migration cutoff..."
    $cutoffGuid = [guid]::NewGuid().ToString("N")
    $cutoffDir = Join-Path $env:TEMP "lm45_cutoff_$cutoffGuid"
    $cutoffMeta = Join-Path $cutoffDir "meta"
    New-Item -ItemType Directory -Path $cutoffMeta -Force | Out-Null
    Copy-Item "drizzle/0000_*.sql" $cutoffDir
    Copy-Item "drizzle/0001_*.sql" $cutoffDir
    Copy-Item "drizzle/0002_*.sql" $cutoffDir
    $journalPath = "drizzle/meta/_journal.json"
    if (Test-Path $journalPath) {
        $journal = Get-Content $journalPath -Raw | ConvertFrom-Json
        $filteredEntries = $journal.entries | Where-Object { $_.idx -eq 0 -or $_.idx -eq 1 -or $_.idx -eq 2 }
        $isolatedJournal = @{
            version = $journal.version
            dialect = $journal.dialect
            entries = $filteredEntries
        } | ConvertTo-Json -Depth 10
        [System.IO.File]::WriteAllText((Join-Path $cutoffMeta "_journal.json"), $isolatedJournal, (New-Object System.Text.UTF8Encoding $false))
    }
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $env:LM44_MIGRATIONS_FOLDER = $cutoffDir
    $s45Output = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts/verify-lm-cat-filter-45.ps1" 2>&1
    $s45Exit = $LASTEXITCODE # Captured immediately!
    Remove-Item Env:\LM44_MIGRATIONS_FOLDER -ErrorAction SilentlyContinue
    $ErrorActionPreference = $prevEAP
    Remove-Item $cutoffDir -Recurse -Force -ErrorAction SilentlyContinue
    $s45Pass = $false
    if ($s45Exit -eq 0 -and $s45Output -match "ALL TESTS PASSED") {
        $s45Pass = $true
    }
    Assert-Value -Id "R130" -Actual $s45Pass -Expected $true -Detail "Sprint 45 regression run result (exit=$s45Exit)"

} finally {
    # Cleanup database instance
    Write-Host "Stopping and destroying temporary PostgreSQL instance..."
    try {
        & "$pgBin\pg_ctl.exe" -D $dbData stop -m immediate 2>&1 | Out-Null
    } catch {
        Write-Host "  (stop warning ignored)"
    }
    try {
        Remove-Item (Join-Path $env:TEMP "lm46_$guid") -Recurse -Force -ErrorAction SilentlyContinue | Out-Null
    } catch {
        Write-Host "  (cleanup warning ignored)"
    }
}

# Summary and test audit
Write-Host ""
Write-Host "=== TEST ID AUDIT ==="
$expectedIds = @()
$expectedAssertionIds = @()
$testMatrix = Get-Content "scripts/sql/fixtures/lm46-test-matrix-v1.json" -Raw | ConvertFrom-Json
foreach ($t in $testMatrix) {
    $expectedIds += $t.id
    $expectedAssertionIds += $t.assertionId
}

$actualIds = $testIds | Sort-Object
$expectedSet = New-Object System.Collections.Generic.HashSet[string]
foreach ($id in $expectedIds) { $expectedSet.Add($id) | Out-Null }
$actualSet = New-Object System.Collections.Generic.HashSet[string]
foreach ($id in $actualIds) { $actualSet.Add($id) | Out-Null }

$duplicateIds = $testIds | Group-Object | Where-Object { $_.Count -gt 1 } | ForEach-Object { $_.Name }
$duplicateAssertionIds = $expectedAssertionIds | Group-Object | Where-Object { $_.Count -gt 1 } | ForEach-Object { $_.Name }
$unknownIds = $actualSet | Where-Object { -not $expectedSet.Contains($_) }
$missingIds = $expectedSet | Where-Object { -not $actualSet.Contains($_) }

Write-Host "EXPECTED UNIQUE IDS: $($expectedIds.Count)"
Write-Host "ACTUAL UNIQUE IDS: $($actualSet.Count)"
Write-Host "DUPLICATE IDS: $(if ($duplicateIds) { $duplicateIds -join ', ' } else { '0' })"
Write-Host "DUPLICATE ASSERTION IDS: $(if ($duplicateAssertionIds) { $duplicateAssertionIds -join ', ' } else { '0' })"
Write-Host "UNKNOWN IDS: $(if ($unknownIds) { $unknownIds -join ', ' } else { '0' })"
Write-Host "MISSING IDS: $(if ($missingIds) { $missingIds -join ', ' } else { '0' })"

if ($duplicateIds -or $duplicateAssertionIds -or $unknownIds -or $missingIds -or $actualSet.Count -ne $expectedIds.Count) {
    Write-Host "TEST ID AUDIT FAILED"
    exit 1
}

# Static guard check
Write-Host ""
Write-Host "=== STATIC GUARD AUDIT ==="
$scriptPath = $MyInvocation.MyCommand.Path

$errors = $null
$tokens = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$tokens, [ref]$errors)

if ($errors) {
    Write-Host "STATIC GUARD FAILURE: Script parsing failed with errors: $errors"
    exit 1
}

$calls = $ast.FindAll({
    param($node)
    $node -is [System.Management.Automation.Language.CommandAst] -and
    $node.GetCommandName() -eq 'Register-Result'
}, $true)

$forbiddenPassIds = @('R101', 'R102', 'R107', 'R111', 'R113', 'R127', 'R128', 'R129', 'R130')
$staticGuardPassed = $true

foreach ($call in $calls) {
    foreach ($elem in $call.CommandElements) {
        if ($elem -is [System.Management.Automation.Language.StringConstantExpressionAst] -or
            $elem -is [System.Management.Automation.Language.ExpandableStringExpressionAst]) {
            if ($forbiddenPassIds -contains $elem.Value) {
                Write-Host "STATIC GUARD FAILURE: Direct Register-Result call found for ID: $($elem.Value)"
                $staticGuardPassed = $false
            }
        }
    }
}

if (-not $staticGuardPassed) {
    Write-Host "STATIC GUARD AUDIT FAILED"
    exit 1
}
Write-Host "STATIC GUARD AUDIT PASSED"

# Final summary
Write-Host ""
Write-Host "=== FINAL SUMMARY ==="
$passCount = @($results | Where-Object { $_ -match "\|PASS\|" }).Count
$failCount = @($results | Where-Object { $_ -match "\|FAIL\|" }).Count
$skipCount = @($results | Where-Object { $_ -match "\|SKIP\|" }).Count
$execCount = $results.Count

Write-Host "PASSED TEST COUNT: $passCount"
Write-Host "FAILED TEST COUNT: $failCount"
Write-Host "SKIPPED TEST COUNT: $skipCount"

# Print details for each test (mandatory output format)
Write-Host "=== TEST MATRIX RESULTS ==="
foreach ($res in $results) {
    $parts = $res.Split("|")
    $detailInfo = if ($parts[1] -eq "FAIL") { " - DETAIL: $($parts[2])" } else { "" }
    Write-Host "TEST ID: $($parts[0]), TEST FILE: scripts/verify-lm-cat-filter-46.ps1, TEST NAME: $($parts[0]), RESULT: $($parts[1])$detailInfo"
}

if ($failCount -eq 0 -and $execCount -eq 130) {
    Write-Host ""
    Write-Host "ALL TESTS PASSED successfully!"
    exit 0
} else {
    Write-Host ""
    Write-Host "SOME TESTS FAILED"
    exit 1
}
