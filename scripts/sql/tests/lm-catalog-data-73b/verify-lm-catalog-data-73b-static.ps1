$ErrorActionPreference = "Stop"

$sqlPath = ".\scripts\sql\production\lm-cat-filter-73b-verify-production-state.sql"
if (-not (Test-Path $sqlPath)) {
    Write-Host "File not found: $sqlPath"
    exit 1
}

$sqlContent = Get-Content $sqlPath -Raw
$sqlLines = Get-Content $sqlPath

$forbiddenTokens = @(
    "\bDO\b", "\bCALL\b", "\bINSERT\b", "\bUPDATE\b", "\bDELETE\b", "\bMERGE\b", "\bTRUNCATE\b",
    "\bCREATE\b", "\bALTER\b", "\bDROP\b", "\bGRANT\b", "\bREVOKE\b", "\bLOCK\b",
    "\bBEGIN\b", "\bCOMMIT\b", "\bROLLBACK\b", "\bCOPY\b", "\bFOR UPDATE\b", "\bFOR SHARE\b"
)

foreach ($token in $forbiddenTokens) {
    if ($sqlContent -match "(?i)$token") {
        Write-Host "Forbidden token found: $token"
        exit 1
    }
}

$forbiddenRefs = @("partners", "rfq_leads", "cart_items", "orders", "order_items", "clicks")
foreach ($ref in $forbiddenRefs) {
    if ($sqlContent -match "(?i)\b$ref\b") {
        Write-Host "Forbidden reference found: $ref"
        exit 1
    }
}

$checkIds = @(
    "CATEGORY_PATH", "CATEGORY_PARENT_CHAIN", "ATTRIBUTE_DEFINITIONS", "EXACT_CATEGORY_ASSIGNMENTS",
    "ATTRIBUTE_UNITS", "ATTRIBUTE_FLAGS", "ATTRIBUTE_TRANSLATIONS", "CONTROLLED_OPTIONS",
    "CONTROLLED_OPTION_TRANSLATIONS", "CONTROLLED_OPTION_OWNERSHIP", "OFFER_5_SNAPSHOT",
    "OFFER_5_CONVERSION_TYPE", "OFFER_6_SNAPSHOT", "OFFER_6_CONVERSION_TYPE",
    "OAV_EXPECTED_ROWS", "OAV_MISSING_ROWS", "OAV_UNEXPECTED_ROWS", "OAV_DUPLICATES",
    "OAV_TYPED_SLOT_INTEGRITY", "OAOV_EXPECTED_ZERO", "ORPHAN_OPTION_IDS",
    "MIGRATION_PROVENANCE_TABLES", "PRODUCTION_CONFIGURATION_STATE", "PRODUCTION_VALUE_STATE",
    "PRODUCTION_FILTER_DATA_READY"
)
foreach ($checkId in $checkIds) {
    if (-not ($sqlContent -match "['""]$checkId['""]")) {
        Write-Host "Missing CHECK_ID: $checkId"
        exit 1
    }
    $matchCount = ([regex]::Matches($sqlContent, "['""]$checkId['""]::text AS check_id")).Count
    if ($matchCount -ne 1) {
        Write-Host "CHECK_ID $checkId must appear exactly once as a literal. Found $matchCount"
        exit 1
    }
}

$provenanceTables = @(
    "public.migration_batches", "public.migration_source_entries",
    "public.migration_oav_targets", "public.migration_oaov_targets",
    "public.migration_rollback_attempts"
)
foreach ($pt in $provenanceTables) {
    $escaped = [regex]::Escape($pt)
    if (-not ($sqlContent -match "to_regclass\('(?i)$escaped'\)")) {
        Write-Host "Missing to_regclass for: $pt"
        exit 1
    }
}

$firstExecutableLineFound = $false
foreach ($line in $sqlLines) {
    $trim = $line.Trim()
    if ($trim -eq "" -or $trim.StartsWith("--")) {
        continue
    }
    if (-not $trim.ToUpper().StartsWith("WITH ")) {
        Write-Host "SQL does not start with WITH clause. Found: $trim"
        exit 1
    }
    $firstExecutableLineFound = $true
    break
}
if (-not $firstExecutableLineFound) {
    Write-Host "No executable lines found."
    exit 1
}

foreach ($line in $sqlLines) {
    $trim = $line.Trim()
    if ($trim.StartsWith("\")) {
        Write-Host "psql meta-command found: $line"
        exit 1
    }
}

$sqlWithoutComments = $sqlContent -replace "(?m)--.*", ""
$semicolonCount = ([regex]::Matches($sqlWithoutComments, ";")).Count
if ($semicolonCount -ne 1) {
    Write-Host "Expected exactly one semicolon in executable SQL, found $semicolonCount"
    exit 1
}
if (-not $sqlWithoutComments.Trim().EndsWith(";")) {
    Write-Host "Statement does not end with a semicolon."
    exit 1
}

if (-not ($sqlContent -match "(?i)SELECT\s+check_id,\s*scope,\s*status,\s*expected,\s*actual,\s*details\s+FROM")) {
    Write-Host "Final SELECT does not exactly select the 6 required columns in order."
    exit 1
}

$unionCount = ([regex]::Matches($sqlWithoutComments, "(?i)\bUNION ALL\b")).Count
if ($unionCount -ne 25) {
    Write-Host "Expected exactly 25 UNION ALL. Found $unionCount UNION ALL"
    exit 1
}

if ($sqlContent -match "(?i)max\(technical_attributes\)") {
    Write-Host "max(technical_attributes) is forbidden"
    exit 1
}
if ($sqlContent -match "(?i)min\(technical_attributes\)") {
    Write-Host "min(technical_attributes) is forbidden"
    exit 1
}
if ($sqlContent -match "technical_attributes::text") {
    Write-Host "technical_attributes::text is forbidden"
    exit 1
}

if (-not ($sqlContent -match "bool_and\(title.*Pojemnik Euro")) {
    Write-Host "Missing bool_and in snapshot"
    exit 1
}
if (-not ($sqlContent -match "bool_and\(technical_attributes.*::jsonb\)")) {
    Write-Host "Missing bool_and with ::jsonb direct comparison"
    exit 1
}

if (-not ($sqlContent -match "(?i)locale_manifest")) {
    Write-Host "locale_manifest is not used"
    exit 1
}

$requiredCTEs = @(
    "unexpected_target_category_assignments",
    "unexpected_material_options",
    "unexpected_oav",
    "missing_oav",
    "oav_value_drift"
)
foreach ($cte in $requiredCTEs) {
    if (-not ($sqlContent -match "(?i)\b$cte\b\s+AS\s+\(")) {
        Write-Host "Missing required CTE: $cte"
        exit 1
    }
}

if (-not ($sqlContent -match "(?i)num_nonnulls\(value_text,\s*value_number,\s*value_boolean,\s*value_date,\s*value_year,\s*option_id\)")) {
    Write-Host "Missing typed-slot check"
    exit 1
}

if (-not ($sqlContent -match "(?i)offer_attribute_values.*offer_attribute_option_values|offer_attribute_option_values.*offer_attribute_values")) {
    Write-Host "Missing OAV and OAOV references for orphans"
    exit 1
}

if ($sqlContent -match "(?i)count\(\*\)\s*>\s*10") {
    Write-Host "count(*) > 10 is forbidden"
    exit 1
}

if ($sqlContent -match "(?i)count\(\*\)\s*-\s*10") {
    Write-Host "count(*) - 10 is forbidden"
    exit 1
}

if ($sqlContent -match "NOT IN.*status") {
    Write-Host "summary MISSING uses NOT IN"
    exit 1
}

# --- Check Runner Requirements ---
$runnerPath = ".\scripts\sql\tests\lm-catalog-data-73b\run-lm-catalog-data-73b-db-tests.ps1"
$runnerContent = Get-Content $runnerPath -Raw

if ($runnerContent -match "(?i)\`$env:LM73B_ALLOW_DISPOSABLE_DB\s*=\s*") {
    Write-Host "Runner sets LM73B_ALLOW_DISPOSABLE_DB"
    exit 1
}

if ($runnerContent -match "(?i)\`$env:LM73B_TEST_ADMIN_URL\s*=\s*") {
    Write-Host "Runner sets LM73B_TEST_ADMIN_URL"
    exit 1
}

if ($runnerContent -match "(?i)postgresql://") {
    Write-Host "Runner contains hardcoded postgresql://"
    exit 1
}

if (-not ($runnerContent -match "\[System\.Uri\]")) {
    Write-Host "Runner does not use [System.Uri]"
    exit 1
}

if (-not ($runnerContent -match "uri\.Host")) {
    Write-Host "Runner does not check uri.Host"
    exit 1
}

$psqlCalls = ([regex]::Matches($runnerContent, '(?i)Start-Process\s+\$psqlExe')).Count
$onErrorStopCalls = ([regex]::Matches($runnerContent, "(?i)ON_ERROR_STOP=1")).Count
if ($psqlCalls -gt 0 -and $onErrorStopCalls -lt $psqlCalls) {
    Write-Host "Not all psql calls have ON_ERROR_STOP=1"
    exit 1
}

if (-not ($runnerContent -match "(?s)DB_DROPPED=YES.*LM73B_DB_TEST=PASS")) {
    Write-Host "PASS occurs before cleanup is verified"
    exit 1
}

if (-not ($runnerContent -match "(?is)DELETE FROM public\.category_attribute_assignments.*INSERT INTO public\.category_attribute_assignments")) {
    Write-Host "ASSIGNMENT_REPLACEMENT does not contain DELETE + INSERT"
    exit 1
}

if (-not ($runnerContent -match "(?is)DELETE FROM public\.offer_attribute_values.*INSERT INTO public\.offer_attribute_values")) {
    Write-Host "OAV_REPLACEMENT does not contain DELETE + INSERT"
    exit 1
}

if (-not ($runnerContent -match "(?is)'unrelated_attribute'.*'pp'")) {
    Write-Host "Runner does not add unrelated option pp"
    exit 1
}

if (-not ($runnerContent -match "(?is)EXACT_STATE.*CONTROLLED_OPTION_OWNERSHIP.*PASS")) {
    Write-Host "EXACT_STATE does not expect CONTROLLED_OPTION_OWNERSHIP=PASS"
    exit 1
}

if (-not ($runnerContent -match "(?is)OAV_REPLACEMENT.*value_boolean.*true")) {
    Write-Host "OAV_REPLACEMENT does not add esd_protection/value_boolean"
    exit 1
}

if ($runnerContent -match "(?is)OAV_REPLACEMENT.*capacity.*capacity") {
    Write-Host "OAV_REPLACEMENT adds second capacity"
    exit 1
}

if (-not ($runnerContent -match "(?is)OAV_REPLACEMENT.*OAV_DUPLICATES.*PASS")) {
    Write-Host "OAV_REPLACEMENT does not expect OAV_DUPLICATES=PASS"
    exit 1
}

# --- R4 Additional Checks ---
if ($sqlContent -match "'Evaluated'") {
    Write-Host "SQL contains forbidden literal 'Evaluated'"
    exit 1
}

if (-not ($sqlContent -match "(?is)OFFER_5_CONVERSION_TYPE.*max\(conversion_type\)") -or -not ($sqlContent -match "(?is)OFFER_6_CONVERSION_TYPE.*max\(conversion_type\)")) {
    Write-Host "Conversion type checks do not contain max(conversion_type)"
    exit 1
}

if ($sqlContent -match "(?is)ad\.stable_key\s*=\s*m\.attr_key.*ad\.stable_key\s*<>\s*m\.attr_key") {
    Write-Host "CONTROLLED_OPTION_OWNERSHIP contains impossible contract"
    exit 1
}

if (-not ($sqlContent -match "(?is)expected_option_ownership.*'material'.*'pp'.*'material'.*'hdpe'")) {
    Write-Host "Ownership does not check exact pairs material.pp and material.hdpe"
    exit 1
}

# Extract Run-Scenario body to verify exit/throw
if ($runnerContent -match "(?is)function Run-Scenario\s*\{.*?\}(?=\s*# A\.)") {
    $runScenarioBody = $Matches[0]
    if ($runScenarioBody -match "(?i)\bexit\s+1\b") {
        Write-Host "Runner uses exit 1 inside Run-Scenario"
        exit 1
    }
    if (-not ($runScenarioBody -match "(?i)\bthrow\b")) {
        Write-Host "Runner does not use throw for scenario errors"
        exit 1
    }
} else {
    Write-Host "Could not find Run-Scenario function body"
    exit 1
}

Write-Host "LM73B_STATIC_TEST=PASS"
