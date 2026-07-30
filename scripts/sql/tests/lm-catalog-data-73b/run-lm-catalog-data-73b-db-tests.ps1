$ErrorActionPreference = "Stop"

if ($env:LM73B_ALLOW_DISPOSABLE_DB -ne "1") {
    Write-Host "LM73B_DB_TEST=BLOCKED"
    Write-Host "LM73B_BLOCK_REASON=ALLOW_FLAG_MISSING"
    exit 2
}

if ([string]::IsNullOrWhiteSpace($env:LM73B_TEST_ADMIN_URL)) {
    Write-Host "LM73B_DB_TEST=BLOCKED"
    Write-Host "LM73B_BLOCK_REASON=ADMIN_URL_MISSING"
    exit 2
}

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Host "LM73B_DB_TEST=BLOCKED"
    Write-Host "LM73B_BLOCK_REASON=PSQL_NOT_FOUND"
    exit 2
}

try {
    $uri = [System.Uri]$env:LM73B_TEST_ADMIN_URL
} catch {
    Write-Host "LM73B_DB_TEST=BLOCKED"
    Write-Host "LM73B_BLOCK_REASON=ADMIN_URL_INVALID"
    exit 2
}

if ($uri.Host -ne "localhost" -and $uri.Host -ne "127.0.0.1" -and $uri.Host -ne "::1") {
    Write-Host "LM73B_DB_TEST=BLOCKED"
    Write-Host "LM73B_BLOCK_REASON=ADMIN_URL_NOT_LOCAL"
    exit 2
}

$dbName = "lm73b_test_$([Guid]::NewGuid().ToString('N').Substring(0, 10))"
$testUrl = [UriBuilder]::new($uri)
$testUrl.Path = "/$dbName"
$testUrlStr = $testUrl.Uri.ToString()

$adminUrl = $env:LM73B_TEST_ADMIN_URL
$createDbArgs = @("-X", "-v", "ON_ERROR_STOP=1", "-d", $adminUrl, "-c", "CREATE DATABASE $dbName;")
$p = Start-Process psql -ArgumentList $createDbArgs -NoNewWindow -Wait -PassThru
if ($p.ExitCode -ne 0) {
    Write-Host "LM73B_DB_TEST=BLOCKED"
    Write-Host "LM73B_BLOCK_REASON=ADMIN_CONNECTION_FAILED"
    exit 2
}

Write-Host "DB_CREATED=YES"
$testsPassed = $false
$cleanupSuccess = $false

try {
    Write-Host "Applying Fixture..."
    $fixturePath = ".\scripts\sql\tests\lm-catalog-data-73b\lm-catalog-data-73b-fixture.sql"
    $p = Start-Process psql -ArgumentList @("-X", "-v", "ON_ERROR_STOP=1", "-d", $testUrlStr, "-f", $fixturePath) -NoNewWindow -Wait -PassThru
    if ($p.ExitCode -ne 0) { throw "Failed to apply fixture" }

    $scriptPath = ".\scripts\sql\production\lm-cat-filter-73b-verify-production-state.sql"

    function Run-Scenario {
        param([string]$name, [string]$setupSql, [hashtable]$expectedChecks, [hashtable]$auxChecks)
        Write-Host "--- Running Scenario: $name ---"
        
        $resetSql = @"
TRUNCATE TABLE public.offer_attribute_option_values, public.offer_attribute_values,
public.controlled_option_value_translations, public.controlled_option_values,
public.attribute_definition_translations, public.category_attribute_assignments,
public.attribute_definitions, public.offers, public.categories RESTART IDENTITY CASCADE;

INSERT INTO public.categories (id, parent_id, slug) VALUES 
(1, NULL, 'wyposazenie-magazynu'),
(2, 1, 'pojemniki-i-kuwety'),
(3, 2, 'pojemniki-plastikowe-euro');

INSERT INTO public.offers (id, title, publication_status, is_active, offer_model, category_id, technical_attributes, conversion_type) VALUES 
(5, 'Pojemnik Euro plastikowy 600x400x220 mm', 'published', true, 'ecommerce', 3, '{"Wymiary zewnętrzne (mm)":"600x400x220","Pojemność (l)":45,"Materiał":"PP (Polipropylen)"}'::jsonb, 'basket'),
(6, 'Pojemnik Euro plastikowy 400x300x120 mm', 'published', true, 'ecommerce', 3, '{"Pojemność (l)":10,"Wymiary zewnętrzne (mm)":"400x300x120","Materiał":"PP (Polipropylen)"}'::jsonb, 'basket');

INSERT INTO public.attribute_definitions (id, stable_key, data_type, is_active) VALUES 
(1, 'external_length', 'number', true),
(2, 'external_width', 'number', true),
(3, 'external_height', 'number', true),
(4, 'capacity', 'number', true),
(5, 'material', 'enum', true),
(6, 'esd_protection', 'boolean', true),
(7, 'load_capacity', 'number', true),
(8, 'stackable', 'boolean', true);

INSERT INTO public.attribute_definition_translations (attribute_definition_id, locale)
SELECT id, loc FROM public.attribute_definitions CROSS JOIN (VALUES ('pl'),('en'),('de'),('fr'),('uk'),('es'),('zh')) AS t(loc);

INSERT INTO public.category_attribute_assignments (category_id, attribute_definition_id, sort_order, is_filterable, is_comparable, is_required, is_visible, unit_code) VALUES 
(3, 1, 10, true, true, true, true, 'mm'),
(3, 2, 20, true, true, true, true, 'mm'),
(3, 3, 30, true, true, true, true, 'mm'),
(3, 4, 40, true, true, true, true, 'l'),
(3, 5, 50, true, true, true, true, NULL),
(3, 6, 60, false, true, false, true, NULL),
(3, 7, 70, false, true, false, true, 'kg'),
(3, 8, 80, false, true, false, true, NULL);

INSERT INTO public.controlled_option_values (id, attribute_id, stable_key, is_active) VALUES 
(1, 5, 'pp', true),
(2, 5, 'hdpe', true);

INSERT INTO public.controlled_option_value_translations (controlled_option_value_id, locale)
SELECT id, loc FROM public.controlled_option_values CROSS JOIN (VALUES ('pl'),('en'),('de'),('fr'),('uk'),('es'),('zh')) AS t(loc);

INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, option_id, value_number, value_text, value_boolean, value_date, value_year) VALUES
(1, 5, 1, NULL, 600, NULL, NULL, NULL, NULL),
(2, 5, 2, NULL, 400, NULL, NULL, NULL, NULL),
(3, 5, 3, NULL, 220, NULL, NULL, NULL, NULL),
(4, 5, 4, NULL, 45, NULL, NULL, NULL, NULL),
(5, 5, 5, 1, NULL, NULL, NULL, NULL, NULL),
(6, 6, 1, NULL, 400, NULL, NULL, NULL, NULL),
(7, 6, 2, NULL, 300, NULL, NULL, NULL, NULL),
(8, 6, 3, NULL, 120, NULL, NULL, NULL, NULL),
(9, 6, 4, NULL, 10, NULL, NULL, NULL, NULL),
(10, 6, 5, 1, NULL, NULL, NULL, NULL, NULL);
"@

        $fullSql = $resetSql + "`n" + $setupSql
        $setupFile = [System.IO.Path]::GetTempFileName()
        Set-Content -Path $setupFile -Value $fullSql -Encoding UTF8
        
        $p = Start-Process psql -ArgumentList @("-X", "-v", "ON_ERROR_STOP=1", "-d", $testUrlStr, "-f", $setupFile) -NoNewWindow -Wait -PassThru
        Remove-Item $setupFile
        if ($p.ExitCode -ne 0) { throw "Setup failed for scenario $name" }

        if ($null -ne $auxChecks) {
            foreach ($key in $auxChecks.Keys) {
                $q = $auxChecks[$key]
                $outFileAux = [System.IO.Path]::GetTempFileName()
                $p = Start-Process psql -ArgumentList @("-X", "-v", "ON_ERROR_STOP=1", "-d", $testUrlStr, "-c", "COPY ($q) TO STDOUT WITH CSV;") -NoNewWindow -Wait -RedirectStandardOutput $outFileAux
                if ($p.ExitCode -ne 0) { throw "Aux check query failed for scenario $name" }
                $outVal = (Get-Content $outFileAux).Trim()
                Remove-Item $outFileAux
                if ($outVal -ne $key) { throw "Aux check failed in ${name}: expected $key, got $outVal" }
            }
        }

        $outFile = [System.IO.Path]::GetTempFileName()
        $p = Start-Process psql -ArgumentList @("-X", "-v", "ON_ERROR_STOP=1", "-P", "footer=off", "--csv", "-d", $testUrlStr, "-f", $scriptPath, "-o", $outFile) -NoNewWindow -Wait -PassThru
        if ($p.ExitCode -ne 0) { throw "Execution failed for scenario $name" }

        $csv = Import-Csv $outFile
        Remove-Item $outFile

        if ($csv.Count -ne 25) { throw "Expected 25 rows, got $($csv.Count)" }

        $checkIds = $csv | Select-Object -ExpandProperty check_id
        $uniqueChecks = $checkIds | Select-Object -Unique
        if ($uniqueChecks.Count -ne 25) { throw "Expected 25 unique CHECK_IDs, got $($uniqueChecks.Count)" }

        foreach ($key in $expectedChecks.Keys) {
            $expectedVal = $expectedChecks[$key]
            
            $parts = $key.Split('.')
            if ($parts.Length -eq 1) {
                $row = $csv | Where-Object { $_.check_id -eq $parts[0] }
                if ($row.status -ne $expectedVal) {
                    Write-Host "Mismatch in $name for $($parts[0]): expected $expectedVal, got $($row.status)"
                    exit 1
                }
            } else {
                $row = $csv | Where-Object { $_.check_id -eq $parts[0] }
                $prop = $parts[1]
                if ($row.$prop -ne $expectedVal) {
                    Write-Host "Mismatch in $name for $($parts[0]).${prop}: expected $expectedVal, got $($row.$prop)"
                    exit 1
                }
            }
        }
        Write-Host "Scenario $name PASSED"
    }

    # A. EXACT_STATE
    Run-Scenario -name "EXACT_STATE" -setupSql "" -expectedChecks @{
        "OFFER_5_SNAPSHOT" = "PASS"
        "OFFER_6_SNAPSHOT" = "PASS"
        "PRODUCTION_FILTER_DATA_READY.actual" = "YES"
        "PRODUCTION_CONFIGURATION_STATE.actual" = "EXACT"
        "PRODUCTION_VALUE_STATE.actual" = "EXACT"
    } -auxChecks $null

    # B. EMPTY_CONFIGURATION_AND_VALUES
    Run-Scenario -name "EMPTY_CONFIGURATION_AND_VALUES" -setupSql @"
TRUNCATE TABLE public.offer_attribute_values, public.category_attribute_assignments,
public.attribute_definition_translations, public.controlled_option_value_translations,
public.controlled_option_values, public.attribute_definitions,
public.offer_attribute_option_values CASCADE;
"@ -expectedChecks @{
        "ATTRIBUTE_DEFINITIONS" = "MISSING"
        "EXACT_CATEGORY_ASSIGNMENTS" = "MISSING"
        "CONTROLLED_OPTIONS" = "MISSING"
        "PRODUCTION_CONFIGURATION_STATE.actual" = "MISSING"
        "PRODUCTION_VALUE_STATE.actual" = "MISSING"
        "PRODUCTION_FILTER_DATA_READY.actual" = "NO"
    } -auxChecks $null

    # C. ASSIGNMENT_REPLACEMENT
    Run-Scenario -name "ASSIGNMENT_REPLACEMENT" -setupSql @"
DELETE FROM public.category_attribute_assignments WHERE attribute_definition_id = 8;
INSERT INTO public.attribute_definitions (id, stable_key, data_type, is_active) VALUES (9, 'fake_attr', 'text', true);
INSERT INTO public.category_attribute_assignments (category_id, attribute_definition_id) VALUES (3, 9);
"@ -expectedChecks @{
        "EXACT_CATEGORY_ASSIGNMENTS" = "UNEXPECTED"
        "PRODUCTION_CONFIGURATION_STATE.actual" = "DRIFT"
        "PRODUCTION_FILTER_DATA_READY.actual" = "NO"
    } -auxChecks @{ "8" = "SELECT count(*) FROM public.category_attribute_assignments" }

    # D. OAV_REPLACEMENT
    Run-Scenario -name "OAV_REPLACEMENT" -setupSql @"
DELETE FROM public.offer_attribute_values WHERE id = 10;
INSERT INTO public.offer_attribute_values (id, offer_id, attribute_id, value_number) VALUES (11, 5, 4, 999);
"@ -expectedChecks @{
        "OAV_MISSING_ROWS" = "PARTIAL"
        "OAV_UNEXPECTED_ROWS" = "UNEXPECTED"
        "PRODUCTION_VALUE_STATE.actual" = "DRIFT"
        "PRODUCTION_FILTER_DATA_READY.actual" = "NO"
    } -auxChecks @{ "10" = "SELECT count(*) FROM public.offer_attribute_values WHERE offer_id IN (5,6)" }

    # E. EXTRA_MATERIAL_OPTION
    Run-Scenario -name "EXTRA_MATERIAL_OPTION" -setupSql @"
INSERT INTO public.controlled_option_values (id, attribute_id, stable_key, is_active) VALUES (3, 5, 'pvc', true);
"@ -expectedChecks @{
        "CONTROLLED_OPTIONS" = "UNEXPECTED"
        "PRODUCTION_CONFIGURATION_STATE.actual" = "DRIFT"
    } -auxChecks $null

    # F. MISSING_CATEGORY
    Run-Scenario -name "MISSING_CATEGORY" -setupSql @"
DELETE FROM public.categories WHERE id = 3;
"@ -expectedChecks @{
        "CATEGORY_PATH" = "MISSING"
        "OFFER_5_SNAPSHOT" = "BLOCKED"
        "PRODUCTION_CONFIGURATION_STATE.actual" = "MISSING"
        "PRODUCTION_FILTER_DATA_READY.actual" = "NO"
    } -auxChecks $null

    # G. TYPED_SLOT_VIOLATION
    Run-Scenario -name "TYPED_SLOT_VIOLATION" -setupSql @"
UPDATE public.offer_attribute_values SET value_text = 'bad' WHERE id = 1;
"@ -expectedChecks @{
        "OAV_TYPED_SLOT_INTEGRITY" = "DRIFT"
        "PRODUCTION_VALUE_STATE.actual" = "DRIFT"
    } -auxChecks $null

    # H. OAV_ORPHAN_OR_WRONG_OWNER
    Run-Scenario -name "OAV_ORPHAN_OR_WRONG_OWNER" -setupSql @"
UPDATE public.offer_attribute_values SET option_id = 999 WHERE id = 10;
"@ -expectedChecks @{
        "ORPHAN_OPTION_IDS" = "DRIFT"
        "PRODUCTION_VALUE_STATE.actual" = "DRIFT"
    } -auxChecks $null

    # I. OAOV_UNEXPECTED
    Run-Scenario -name "OAOV_UNEXPECTED" -setupSql @"
INSERT INTO public.offer_attribute_option_values (offer_id, attribute_id, option_id) VALUES (5, 5, 1);
"@ -expectedChecks @{
        "OAOV_EXPECTED_ZERO" = "UNEXPECTED"
        "PRODUCTION_VALUE_STATE.actual" = "DRIFT"
    } -auxChecks $null

    # J. OAV_VALUE_DRIFT
    Run-Scenario -name "OAV_VALUE_DRIFT" -setupSql @"
UPDATE public.offer_attribute_values SET value_number = 999 WHERE id = 1;
"@ -expectedChecks @{
        "OAV_EXPECTED_ROWS" = "DRIFT"
        "PRODUCTION_VALUE_STATE.actual" = "DRIFT"
    } -auxChecks $null

    $testsPassed = $true
} finally {
    Write-Host "Dropping DB: $dbName"
    $dropDbArgs = @("-X", "-v", "ON_ERROR_STOP=1", "-d", $adminUrl, "-c", "DROP DATABASE IF EXISTS $dbName;")
    $p = Start-Process psql -ArgumentList $dropDbArgs -NoNewWindow -Wait -PassThru
    if ($p.ExitCode -eq 0) {
        $cleanupSuccess = $true
        Write-Host "DB_DROPPED=YES"
    } else {
        Write-Host "LM73B_DB_TEST=FAIL"
        Write-Host "LM73B_CLEANUP=FAIL"
        exit 1
    }

    if ($testsPassed -and $cleanupSuccess) {
        Write-Host "LM73B_DB_TESTS=10/10 PASS"
        Write-Host "LM73B_CLEANUP=PASS"
        Write-Host "LM73B_DB_TEST=PASS"
    } else {
        Write-Host "LM73B_DB_TEST=FAIL"
        exit 1
    }
}
