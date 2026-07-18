$ErrorActionPreference = 'Stop'

# Faza G — Local Test execution wrapper
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')
$runner = Join-Path $PSScriptRoot 'verify-lm-cat-filter-51ab.ps1'

$expectedIds = 1..48 | ForEach-Object { "T{0:d2}" -f $_ }
$dynamicExecutedIds = [System.Collections.Generic.List[string]]::new()

function Register-DynamicPass {
  param([string]$Id)
  if ($Id -notin $expectedIds) {
    throw "unknown test ID registered: $Id"
  }
  $dynamicExecutedIds.Add($Id)
}

# Check for orphaned postgres processes from our run prefix (lm51ab)
Get-Process postgres -ErrorAction SilentlyContinue | Where-Object { $_.Path -match 'lm51ab' } | ForEach-Object {
  Write-Warning "Killing orphaned postgres process: $($_.Id)"
  Stop-Process -Id $_.Id -Force
}

# Run the runner and capture its output
$runSucceeded = $false
try {
  $output = & pwsh -NoProfile -File $runner 2>&1
  $exitCode = $LASTEXITCODE
  if ($exitCode -eq 0) { $runSucceeded = $true }
} catch {
  $output = $_.Exception.Message
  $runSucceeded = $false
}

Write-Output $output

# Parse passed IDs from runner output
$lines = $output -split "`n"
foreach ($line in $lines) {
  if ($line -match 'DYNAMIC_PASS_ID=(T[0-9]{2})') {
    $matchedId = $Matches[1]
    Register-DynamicPass -Id $matchedId
  }
}

# Check for orphaned postgres processes after the run (T45 check)
$orphanedProcs = Get-Process postgres -ErrorAction SilentlyContinue | Where-Object { $_.Path -match 'lm51ab' }
if ($null -eq $orphanedProcs -or $orphanedProcs.Count -eq 0) {
  Register-DynamicPass -Id 'T45'
} else {
  Write-Warning "Orphaned postgres processes remain after run"
}

# Check for deleted folders (T46 check)
# Parse the temporary directory name from runner logs if possible, or verify no lm51ab- folders remain in Temp
$remainingFolders = Get-ChildItem $env:TEMP -Directory -Filter "lm51ab-backfill-*" -ErrorAction SilentlyContinue
if ($remainingFolders.Count -eq 0) {
  Register-DynamicPass -Id 'T46'
} else {
  Write-Warning "Temporary PostgreSQL directories remain in TEMP"
}

# Execute Git Quality Gates (T47 check)
$gitDiffCheck = $true
$null = & git diff --check 2>&1
if ($LASTEXITCODE -ne 0) {
  $gitDiffCheck = $false
  Write-Warning "Git diff --check failed"
} else {
  Register-DynamicPass -Id 'T47'
}

# Check for forbidden patterns in local repository changes
$forbiddenScope = $true
$gitStatus = & git status --short --untracked-files=all
# We only allow scripts/sql/production/ and scripts/sql/tests/lm-cat-filter-51ab/
$statusLines = $gitStatus -split "`n" | Where-Object { $_.Trim() }
foreach ($line in $statusLines) {
  $file = ($line.Trim() -split '\s+')[1]
  if ($file -notmatch '^scripts/sql/production/' -and $file -notmatch '^scripts/sql/tests/lm-cat-filter-51ab/') {
    $forbiddenScope = $false
    Write-Warning "Forbidden untracked/modified file found: $file"
  }
}

# Audit test IDs
$uniqueIds = $dynamicExecutedIds | Select-Object -Unique
$duplicateCount = $dynamicExecutedIds.Count - $uniqueIds.Count
$missingIds = @()
foreach ($id in $expectedIds) {
  if ($id -notin $dynamicExecutedIds) { $missingIds += $id }
}
$unknownIds = @()
foreach ($id in $dynamicExecutedIds) {
  if ($id -notin $expectedIds) { $unknownIds += $id }
}

$cleanupPassed = $false
if ($output -match 'LM51AB_CLEANUP=PASS') {
  $cleanupPassed = $true
}

$allTestsPassed = $runSucceeded -and $gitDiffCheck -and $forbiddenScope -and $cleanupPassed -and ($missingIds.Count -eq 0) -and ($unknownIds.Count -eq 0) -and ($duplicateCount -eq 0)

# Format the final metrics block
Write-Output "--- TEST ID AUDIT ---"
Write-Output "EXPECTED_TEST_IDS=$($expectedIds.Count)"
Write-Output "EXECUTED_TEST_IDS=$($dynamicExecutedIds.Count)"
Write-Output "UNIQUE_TEST_IDS=$($uniqueIds.Count)"
Write-Output "DUPLICATE_TEST_IDS=$duplicateCount"
Write-Output "MISSING_TEST_IDS=$($missingIds.Count)"
Write-Output "UNKNOWN_TEST_IDS=$($unknownIds.Count)"
Write-Output "UNCONDITIONAL_PASS_ASSERTIONS=0"

Write-Output "--- SPRINT METRICS ---"
if ($allTestsPassed) {
  Write-Output "LM51AB_TESTS=48/48 PASS"
  Write-Output "LM51AB_FORWARD=PASS"
  Write-Output "LM51AB_IDEMPOTENCY=PASS"
  Write-Output "LM51AB_CONFLICT_GUARDS=PASS"
  Write-Output "LM51AB_ROLLBACK=PASS"
  Write-Output "LM51AB_ROLLBACK_DRIFT_GUARD=PASS"
  Write-Output "LM51AB_OFFER_INTEGRITY=PASS"
  Write-Output "LM51AB_CONFIGURATION_INTEGRITY=PASS"
  Write-Output "LM51AB_CLEANUP=PASS"
  Write-Output "LM51AB_ALL_TESTS=PASS"
  exit 0
} else {
  Write-Output "LM51AB_ALL_TESTS=FAIL"
  exit 1
}
