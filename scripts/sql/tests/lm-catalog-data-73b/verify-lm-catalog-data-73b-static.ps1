$ErrorActionPreference = "Stop"

$sqlPath = ".\scripts\sql\production\lm-cat-filter-73b-verify-production-state.sql"
if (-not (Test-Path $sqlPath)) {
    Write-Host "File not found: $sqlPath"
    exit 1
}

$sqlContent = Get-Content $sqlPath -Raw
$sqlLines = Get-Content $sqlPath

# 6. Zabronione tokeny
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

# 9. Brak odwołań
$forbiddenRefs = @("partners", "rfq_leads", "cart_items", "orders", "order_items", "clicks")
foreach ($ref in $forbiddenRefs) {
    if ($sqlContent -match "(?i)\b$ref\b") {
        Write-Host "Forbidden reference found: $ref"
        exit 1
    }
}

# 2. 25 CHECK_ID
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
}

# 8. to_regclass dla provenance
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

# 4. Zaczyna się od WITH
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

# 7. psql meta-commands
foreach ($line in $sqlLines) {
    $trim = $line.Trim()
    if ($trim.StartsWith("\")) {
        Write-Host "psql meta-command found: $line"
        exit 1
    }
}

# 5. Dokładnie jedno polecenie końcowe
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

# 3. Sześć kolumn finalnego wyniku
if (-not ($sqlContent -match "(?i)SELECT\s+check_id,\s*scope,\s*status,\s*expected,\s*actual,\s*details\s+FROM")) {
    Write-Host "Final SELECT does not exactly select the 6 required columns in order."
    exit 1
}

Write-Host "LM73B_STATIC_TEST=PASS"
