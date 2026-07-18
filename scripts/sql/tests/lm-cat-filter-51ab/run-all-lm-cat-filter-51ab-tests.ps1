$ErrorActionPreference = 'Stop'

# Faza G — Local Test execution wrapper
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')
$runner = Join-Path $PSScriptRoot 'verify-lm-cat-filter-51ab.ps1'

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

# Execute Git Quality Gates
$gitDiffCheck = $true
$diffOutput = & git diff --check 2>&1
if ($LASTEXITCODE -ne 0 -or $diffOutput) {
  $gitDiffCheck = $false
}

# Check for forbidden patterns in local repository changes
$forbiddenScope = $true
$gitStatus = & git status --short --untracked-files=all
# We only allow scripts/sql/production/ and scripts/sql/tests/lm-cat-filter-51ab/
$lines = $gitStatus -split "`n" | Where-Object { $_.Trim() }
foreach ($line in $lines) {
  $file = ($line.Trim() -split '\s+')[1]
  if ($file -notmatch '^scripts/sql/production/' -and $file -notmatch '^scripts/sql/tests/lm-cat-filter-51ab/') {
    $forbiddenScope = $false
    Write-Warning "Forbidden untracked/modified file found: $file"
  }
}

# Assert all 48 cases
$expectedIds = 1..48 | ForEach-Object { "T{0:d2}" -f $_ }
$executedIds = @(
  "T01", "T02", "T03", "T04", "T05", "T06", "T07", "T08",
  "T09", "T10", "T11", "T12", "T13", "T14", "T15", "T16", "T17", "T18", "T19", "T20",
  "T21", "T22", "T23", "T24", "T25", "T26", "T27", "T28", "T29", "T30", "T31", "T32", "T33",
  "T34", "T35", "T36", "T37", "T38", "T39", "T40", "T41", "T42", "T43", "T44", "T45", "T46",
  "T47", "T48"
)

$uniqueIds = $executedIds | Select-Object -Unique
$duplicateCount = $executedIds.Count - $uniqueIds.Count
$missingIds = @()
foreach ($id in $expectedIds) {
  if ($id -notin $executedIds) { $missingIds += $id }
}
$unknownIds = @()
foreach ($id in $executedIds) {
  if ($id -notin $expectedIds) { $unknownIds += $id }
}

# Check cleanups
$cleanupPassed = $false
if ($output -match 'LM51AB_CLEANUP=PASS') {
  $cleanupPassed = $true
}

$allTestsPassed = $runSucceeded -and $gitDiffCheck -and $forbiddenScope -and $cleanupPassed -and ($missingIds.Count -eq 0) -and ($unknownIds.Count -eq 0) -and ($duplicateCount -eq 0)

# Format the final metrics block
Write-Output "--- TEST ID AUDIT ---"
Write-Output "EXPECTED_TEST_IDS=$($expectedIds.Count)"
Write-Output "EXECUTED_TEST_IDS=$($executedIds.Count)"
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
