[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$env:PGCLIENTENCODING = 'UTF-8'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Assert-That {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw $Message }
}

$script:RecordedTests = [System.Collections.Generic.List[string]]::new()
function Record-TestPass {
  param([string]$Id)

  # Validate format
  Assert-That ($Id -match '^T[0-9]{2}$') "invalid test ID format: $Id"

  # Check if expected
  $expectedList = 1..20 | ForEach-Object { "T{0:d2}" -f $_ }
  Assert-That ($Id -in $expectedList) "unknown test ID registered: $Id"

  # Check if duplicate
  if ($Id -in $script:RecordedTests) {
    Write-Output "DYNAMIC_PASS_ID=$Id"
    throw "duplicate test ID registered: $Id"
  }

  $script:RecordedTests.Add($Id)
  Write-Output "DYNAMIC_PASS_ID=$Id"
}

$root = Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')
$precheck = Join-Path $root 'scripts/sql/production/lm-cat-filter-54b-forklift-filter-precheck.sql'
$apply = Join-Path $root 'scripts/sql/production/lm-cat-filter-54b-forklift-filter-apply.sql'
$verifySql = Join-Path $root 'scripts/sql/production/lm-cat-filter-54b-forklift-filter-verify.sql'
$rollback = Join-Path $root 'scripts/sql/production/lm-cat-filter-54b-forklift-filter-rollback.sql'
$schema49c = Join-Path $root 'scripts/sql/production/lm-cat-filter-49c-lean-runtime-schema.sql'
$config50 = Join-Path $root 'scripts/sql/production/lm-cat-filter-50ab-pilot-filter-configuration.sql'
$fixture = Join-Path $root 'scripts/sql/tests/lm-cat-filter-49c/legacy-compatible.sql'
$contract = Join-Path $PSScriptRoot 'filter-contract.sql'

$bin = @($env:LM_PG_BIN, 'C:\tools\PostgreSQL17\pgsql\bin') |
  Where-Object { $_ } |
  Where-Object { Test-Path (Join-Path $_ 'initdb.exe') } |
  Select-Object -First 1
Assert-That ($null -ne $bin) 'PostgreSQL initdb.exe unavailable'

$tmp = Join-Path $env:TEMP ('lm54b-filter-' + [guid]::NewGuid().ToString('N'))
$data = Join-Path $tmp 'data'
$serverLog = Join-Path $tmp 'postgres.log'
$results = @()
$started = $false

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

  $tempFile = $null
  if ($Sql) {
    $tempFile = Join-Path $tmp ('temp-query-' + [guid]::NewGuid().ToString('N') + '.sql')
    [System.IO.File]::WriteAllText($tempFile, $Sql, [System.Text.Encoding]::UTF8)
    $File = $tempFile
  }

  $oldPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $arguments = @(
      '-X', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose',
      '-h', '127.0.0.1', '-p', $port, '-U', 'postgres', '-d', $Database
    )
    $arguments += @('-f', $File)
    $output = & (Join-Path $bin 'psql.exe') @arguments 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $oldPreference
    if ($tempFile -and (Test-Path $tempFile)) {
      Remove-Item $tempFile -Force
    }
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

function Get-Scalar {
  param([string]$Database, [string]$Sql)
  return (Invoke-Psql -Database $Database -Sql $Sql -File $null).Output.Trim()
}

function New-Database {
  param([string]$CaseId)
  $database = 'lm54b_' + $CaseId.ToLowerInvariant() + '_' + [guid]::NewGuid().ToString('N').Substring(0, 8)
  Invoke-Psql -Database 'postgres' -Sql "CREATE DATABASE $database" -File $null | Out-Null

  # Load legacy compatible fixture (partner 1, category 1, offers 1-10)
  Invoke-Psql -Database $database -Sql $null -File $fixture | Out-Null

  # Setup the 54B environment using a UTF-8 file to prevent command line encoding issues on Windows.
  # Categories 21 and 25 match the production slugs; offers 1 and 8 are replaced with rows
  # matching the verified production snapshot.
  $setupSql = @"
INSERT INTO public.categories (id, name, slug, parent_id) VALUES
  (3, 'Wyposazenie magazynu', 'wyposazenie-magazynu', NULL),
  (13, 'Pojemniki i kuwety', 'pojemniki-i-kuwety', 3),
  (30, 'Pojemniki plastikowe Euro', 'pojemniki-plastikowe-euro', 13),
  (8, 'Wózki widłowe', 'wozki-widlowe', NULL),
  (10, 'Wózki paletowe', 'wozki-paletowe', NULL),
  (21, 'Wózki widłowe elektryczne', 'wozki-widlowe-elektryczne', 8),
  (25, 'Elektryczne wózki paletowe', 'elektryczne-wozki-paletowe', 10)
ON CONFLICT (id) DO NOTHING;
DELETE FROM public.offers WHERE id IN (1, 8);
INSERT INTO public.offers (id, partner_id, category_id, title, price_on_request, conversion_type, offer_model, publication_status, is_active, technical_attributes, created_at) VALUES
  (1, 1, 21, 'Elektryczny wózek widłowy 1.5t LogiTrans ET-15', true, 'rfq', 'rfq', 'published', true, '{"Udźwig (kg)": "1500", "Wysokość podnoszenia (mm)": "4500", "Napęd": "Elektryczny", "Typ masztu": "Triplex"}'::jsonb, now()),
  (8, 1, 25, 'Elektryczny wózek paletowy LogiTrans L-18', true, 'rfq', 'rfq', 'published', true, '{}'::jsonb, now());
"@
  $setupFile = Join-Path $tmp 'setup.sql'
  [System.IO.File]::WriteAllText($setupFile, $setupSql, [System.Text.Encoding]::UTF8)
  Invoke-Psql -Database $database -Sql $null -File $setupFile | Out-Null
  Remove-Item $setupFile -Force

  # Load base runtime schema from 49C
  Invoke-Psql -Database $database -Sql $null -File $schema49c | Out-Null

  # Load pilot configuration from 50AB (delivers the shared load_capacity definition)
  Invoke-Psql -Database $database -Sql $null -File $config50 | Out-Null

  return $database
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

  # T01 — precheck PASS + fresh apply succeeds
  Invoke-Case 'T01' {
    $db = New-Database 'T01'
    $pre = Invoke-Psql -Database $db -Sql $null -File $precheck
    Assert-That ($pre.Output -match 'PASS') "precheck did not return PASS: $($pre.Output)"
    Invoke-Psql -Database $db -Sql $null -File $apply | Out-Null
    Record-TestPass -Id 'T01'
  }

  # T02 — second apply is a NOOP (no duplicates, OAV sequence last_value unchanged)
  Invoke-Case 'T02' {
    $db = New-Database 'T02'
    Invoke-Psql -Database $db -Sql $null -File $apply | Out-Null

    $seqBefore = Get-Scalar $db "SELECT COALESCE(last_value, 0) FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'offer_attribute_values_id_seq'"
    $rowsBefore = Get-Scalar $db "SELECT jsonb_agg(oav ORDER BY id) FROM public.offer_attribute_values oav WHERE offer_id = 1"

    # Run second time
    Invoke-Psql -Database $db -Sql $null -File $apply | Out-Null

    $seqAfter = Get-Scalar $db "SELECT COALESCE(last_value, 0) FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'offer_attribute_values_id_seq'"
    $rowsAfter = Get-Scalar $db "SELECT jsonb_agg(oav ORDER BY id) FROM public.offer_attribute_values oav WHERE offer_id = 1"

    $oavCount = Get-Scalar $db "SELECT count(*) FROM public.offer_attribute_values WHERE offer_id = 1"
    Assert-That ($oavCount -eq '4') "expected 4 OAV rows after idempotency run, got $oavCount"
    Assert-That ($rowsBefore -eq $rowsAfter) "second apply mutated OAV row state"
    Assert-That ($seqBefore -eq $seqAfter) "idempotency run advanced OAV sequence: $seqBefore -> $seqAfter"
    Record-TestPass -Id 'T02'
  }

  # T03 — verify after apply returns PASS
  Invoke-Case 'T03' {
    $db = New-Database 'T03'
    Invoke-Psql -Database $db -Sql $null -File $apply | Out-Null
    $ver = Invoke-Psql -Database $db -Sql $null -File $verifySql
    Assert-That ($ver.Output -match 'PASS') "verify did not return PASS: $($ver.Output)"
    Record-TestPass -Id 'T03'
  }

  # T04 — rollback restores the exact pre-apply state, shared load_capacity definition survives
  Invoke-Case 'T04' {
    $db = New-Database 'T04'
    Invoke-Psql -Database $db -Sql $null -File $apply | Out-Null
    Invoke-Psql -Database $db -Sql $null -File $rollback | Out-Null

    $ad = Get-Scalar $db "SELECT count(*) FROM public.attribute_definitions"
    $adt = Get-Scalar $db "SELECT count(*) FROM public.attribute_definition_translations"
    $cov = Get-Scalar $db "SELECT count(*) FROM public.controlled_option_values"
    $covt = Get-Scalar $db "SELECT count(*) FROM public.controlled_option_value_translations"
    $caa = Get-Scalar $db "SELECT count(*) FROM public.category_attribute_assignments"
    $oav = Get-Scalar $db "SELECT count(*) FROM public.offer_attribute_values"
    $oaov = Get-Scalar $db "SELECT count(*) FROM public.offer_attribute_option_values"
    Assert-That ($ad -eq '8' -and $adt -eq '56' -and $cov -eq '2' -and $covt -eq '14' -and $caa -eq '8' -and $oav -eq '0' -and $oaov -eq '0') "state not restored to post-50AB baseline: ad=$ad adt=$adt cov=$cov covt=$covt caa=$caa oav=$oav oaov=$oaov"

    $lc = Get-Scalar $db "SELECT count(*) FROM public.attribute_definitions WHERE stable_key = 'load_capacity' AND data_type = 'number' AND is_active = true"
    Assert-That ($lc -eq '1') "shared load_capacity definition lost after rollback"
    Record-TestPass -Id 'T04'
  }

  # T05 — second rollback is a NOOP (0 deletions, NOTICE, no error)
  Invoke-Case 'T05' {
    $db = New-Database 'T05'
    Invoke-Psql -Database $db -Sql $null -File $apply | Out-Null
    Invoke-Psql -Database $db -Sql $null -File $rollback | Out-Null

    $res = Invoke-Psql -Database $db -Sql $null -File $rollback
    Assert-That ($res.Output -match 'NOOP') "second rollback did not emit NOOP notice: $($res.Output)"

    $ad = Get-Scalar $db "SELECT count(*) FROM public.attribute_definitions"
    $caa = Get-Scalar $db "SELECT count(*) FROM public.category_attribute_assignments"
    $oav = Get-Scalar $db "SELECT count(*) FROM public.offer_attribute_values"
    Assert-That ($ad -eq '8' -and $caa -eq '8' -and $oav -eq '0') "second rollback mutated state: ad=$ad caa=$caa oav=$oav"
    Record-TestPass -Id 'T05'
  }

  # T06 — apply after rollback succeeds and restores the full final state
  Invoke-Case 'T06' {
    $db = New-Database 'T06'
    Invoke-Psql -Database $db -Sql $null -File $apply | Out-Null
    Invoke-Psql -Database $db -Sql $null -File $rollback | Out-Null
    Invoke-Psql -Database $db -Sql $null -File $apply | Out-Null
    Invoke-Psql -Database $db -Sql $null -File $contract | Out-Null

    $oavCount = Get-Scalar $db "SELECT count(*) FROM public.offer_attribute_values WHERE offer_id = 1"
    Assert-That ($oavCount -eq '4') "expected 4 OAV rows on reapply, got $oavCount"
    Record-TestPass -Id 'T06'
  }

  # T07 — missing offer 1 blocks apply
  Invoke-Case 'T07' {
    $db = New-Database 'T07'
    Invoke-Psql -Database $db -Sql "DELETE FROM public.offers WHERE id = 1" -File $null | Out-Null

    $res = Invoke-Psql -Database $db -Sql $null -File $apply -ExpectSuccess $false
    Assert-That ($res.Output -match 'LM54B') "unexpected error: $($res.Output)"
    Record-TestPass -Id 'T07'
  }

  # T08 — missing category 21 blocks apply
  Invoke-Case 'T08' {
    $db = New-Database 'T08'
    Invoke-Psql -Database $db -Sql "DELETE FROM public.offers WHERE id = 1" -File $null | Out-Null
    Invoke-Psql -Database $db -Sql "DELETE FROM public.categories WHERE id = 21" -File $null | Out-Null

    $res = Invoke-Psql -Database $db -Sql $null -File $apply -ExpectSuccess $false
    Assert-That ($res.Output -match 'LM54B') "unexpected error: $($res.Output)"
    Record-TestPass -Id 'T08'
  }

  # T09 — offer 8 in category 21 blocks apply (offer 8 must stay in category 25)
  Invoke-Case 'T09' {
    $db = New-Database 'T09'
    Invoke-Psql -Database $db -Sql "UPDATE public.offers SET category_id = 21 WHERE id = 8" -File $null | Out-Null

    $res = Invoke-Psql -Database $db -Sql $null -File $apply -ExpectSuccess $false
    Assert-That ($res.Output -match 'offer 8') "unexpected error: $($res.Output)"
    Record-TestPass -Id 'T09'
  }

  # T10 — attribute code conflict (lifting_height as text) blocks apply
  Invoke-Case 'T10' {
    $db = New-Database 'T10'
    Invoke-Psql -Database $db -Sql "INSERT INTO public.attribute_definitions (stable_key, data_type, is_active) VALUES ('lifting_height', 'text', true)" -File $null | Out-Null

    $res = Invoke-Psql -Database $db -Sql $null -File $apply -ExpectSuccess $false
    Assert-That ($res.Output -match 'semantic conflict') "unexpected error: $($res.Output)"
    Record-TestPass -Id 'T10'
  }

  # T11 — enum option conflict ('electric' under a different attribute) blocks apply
  Invoke-Case 'T11' {
    $db = New-Database 'T11'
    Invoke-Psql -Database $db -Sql "INSERT INTO public.attribute_definitions (stable_key, data_type, is_active) VALUES ('other_drive', 'enum', true)" -File $null | Out-Null
    $otherId = Get-Scalar $db "SELECT id FROM public.attribute_definitions WHERE stable_key = 'other_drive'"
    Invoke-Psql -Database $db -Sql "INSERT INTO public.controlled_option_values (attribute_id, stable_key, is_active) VALUES ($otherId, 'electric', true)" -File $null | Out-Null

    $res = Invoke-Psql -Database $db -Sql $null -File $apply -ExpectSuccess $false
    Assert-That ($res.Output -match 'different attribute') "unexpected error: $($res.Output)"
    Record-TestPass -Id 'T11'
  }

  # T12 — partial pre-existing compatible configuration: apply succeeds, final state exact
  Invoke-Case 'T12' {
    $db = New-Database 'T12'
    Invoke-Psql -Database $db -Sql "INSERT INTO public.attribute_definitions (stable_key, data_type, is_active) VALUES ('lifting_height', 'number', true)" -File $null | Out-Null
    $attrId = Get-Scalar $db "SELECT id FROM public.attribute_definitions WHERE stable_key = 'lifting_height'"
    Invoke-Psql -Database $db -Sql "INSERT INTO public.category_attribute_assignments (category_id, attribute_definition_id, sort_order, is_filterable, is_comparable, is_required, is_visible, unit_code) VALUES (21, $attrId, 20, true, true, true, true, 'mm')" -File $null | Out-Null

    Invoke-Psql -Database $db -Sql $null -File $apply | Out-Null
    Invoke-Psql -Database $db -Sql $null -File $contract | Out-Null

    $caaCount = Get-Scalar $db "SELECT count(*) FROM public.category_attribute_assignments WHERE category_id = 21"
    Assert-That ($caaCount -eq '4') "expected exactly 4 assignments for category 21, got $caaCount"
    Record-TestPass -Id 'T12'
  }

  # T13 — drift of an existing OAV value (load_capacity = 1600) blocks apply
  Invoke-Case 'T13' {
    $db = New-Database 'T13'
    $attrId = Get-Scalar $db "SELECT id FROM public.attribute_definitions WHERE stable_key = 'load_capacity'"
    Invoke-Psql -Database $db -Sql "INSERT INTO public.offer_attribute_values (offer_id, attribute_id, value_number) VALUES (1, $attrId, 1600)" -File $null | Out-Null

    $res = Invoke-Psql -Database $db -Sql $null -File $apply -ExpectSuccess $false
    Assert-That ($res.Output -match 'conflict with existing offer attribute values') "unexpected error: $($res.Output)"
    Record-TestPass -Id 'T13'
  }

  # T14 — row-count mismatch (partial state) blocks rollback
  Invoke-Case 'T14' {
    $db = New-Database 'T14'
    Invoke-Psql -Database $db -Sql $null -File $apply | Out-Null
    Invoke-Psql -Database $db -Sql "DELETE FROM public.offer_attribute_values WHERE offer_id = 1 AND attribute_id = (SELECT id FROM public.attribute_definitions WHERE stable_key = 'mast_type')" -File $null | Out-Null

    $res = Invoke-Psql -Database $db -Sql $null -File $rollback -ExpectSuccess $false
    Assert-That ($res.Output -match 'intermediate state') "unexpected error: $($res.Output)"
    Record-TestPass -Id 'T14'
  }

  # T15 — assignment filter/visibility assertions hold regardless of offer count in category 21
  Invoke-Case 'T15' {
    $db = New-Database 'T15'
    Invoke-Psql -Database $db -Sql $null -File $apply | Out-Null

    # Simulate zero offers in category 21 (move offer 1 out after apply)
    Invoke-Psql -Database $db -Sql "UPDATE public.offers SET category_id = 1 WHERE id = 1" -File $null | Out-Null
    $offerCount = Get-Scalar $db "SELECT count(*) FROM public.offers WHERE category_id = 21"
    Assert-That ($offerCount -eq '0') "expected 0 offers in category 21, got $offerCount"

    $flagCount = Get-Scalar $db "SELECT count(*) FROM public.category_attribute_assignments WHERE category_id = 21 AND is_visible = true AND is_filterable = true"
    Assert-That ($flagCount -eq '4') "expected 4 visible+filterable assignments, got $flagCount"
    Record-TestPass -Id 'T15'
  }

  # T16 — one offer in category 21: configuration available and contract holds
  Invoke-Case 'T16' {
    $db = New-Database 'T16'
    Invoke-Psql -Database $db -Sql $null -File $apply | Out-Null

    $offerCount = Get-Scalar $db "SELECT count(*) FROM public.offers WHERE category_id = 21"
    Assert-That ($offerCount -eq '1') "expected exactly 1 offer in category 21, got $offerCount"

    $filterableCount = Get-Scalar $db "SELECT count(*) FROM public.category_attribute_assignments WHERE category_id = 21 AND is_filterable = true"
    Assert-That ($filterableCount -eq '4') "expected 4 filterable assignments, got $filterableCount"

    Invoke-Psql -Database $db -Sql $null -File $contract | Out-Null
    Record-TestPass -Id 'T16'
  }

  # T17 — precheck fails closed when offer 1 lacks the complete 4 source TA values
  Invoke-Case 'T17' {
    $db = New-Database 'T17'
    Invoke-Psql -Database $db -Sql "UPDATE public.offers SET technical_attributes = '{}'::jsonb WHERE id = 1" -File $null | Out-Null

    $res = Invoke-Psql -Database $db -Sql $null -File $precheck -ExpectSuccess $false
    Assert-That ($res.Output -match 'technical_attributes drift') "unexpected error: $($res.Output)"
    Record-TestPass -Id 'T17'
  }

  # T18 — partial source TA (missing 'Typ masztu') blocks apply with zero partial writes
  Invoke-Case 'T18' {
    $db = New-Database 'T18'
    Invoke-Psql -Database $db -Sql "UPDATE public.offers SET technical_attributes = technical_attributes - 'Typ masztu' WHERE id = 1" -File $null | Out-Null

    $res = Invoke-Psql -Database $db -Sql $null -File $apply -ExpectSuccess $false
    Assert-That ($res.Output -match 'technical_attributes drift') "unexpected error: $($res.Output)"

    $oavCount = Get-Scalar $db "SELECT count(*) FROM public.offer_attribute_values"
    Assert-That ($oavCount -eq '0') "partial OAV writes leaked after failed apply: $oavCount"
    $adCount = Get-Scalar $db "SELECT count(*) FROM public.attribute_definitions"
    Assert-That ($adCount -eq '8') "partial definition writes leaked after failed apply: $adCount"
    Record-TestPass -Id 'T18'
  }

  # T19 — filter contract passes after apply (full final-state assertions)
  Invoke-Case 'T19' {
    $db = New-Database 'T19'
    Invoke-Psql -Database $db -Sql $null -File $apply | Out-Null
    Invoke-Psql -Database $db -Sql $null -File $contract | Out-Null
    Record-TestPass -Id 'T19'
  }

  # T20 — rollback contract: exact pre-apply state (row counts in all 7 runtime tables)
  Invoke-Case 'T20' {
    $db = New-Database 'T20'

    $countSql = "SELECT (SELECT count(*) FROM public.attribute_definitions) || ',' || (SELECT count(*) FROM public.attribute_definition_translations) || ',' || (SELECT count(*) FROM public.controlled_option_values) || ',' || (SELECT count(*) FROM public.controlled_option_value_translations) || ',' || (SELECT count(*) FROM public.category_attribute_assignments) || ',' || (SELECT count(*) FROM public.offer_attribute_values) || ',' || (SELECT count(*) FROM public.offer_attribute_option_values)"
    $beforeCounts = Get-Scalar $db $countSql
    Assert-That ($beforeCounts -eq '8,56,2,14,8,0,0') "unexpected post-50AB baseline counts: $beforeCounts"

    Invoke-Psql -Database $db -Sql $null -File $apply | Out-Null
    Invoke-Psql -Database $db -Sql $null -File $rollback | Out-Null

    $afterCounts = Get-Scalar $db $countSql
    Assert-That ($beforeCounts -eq $afterCounts) "runtime table counts differ after rollback: before=$beforeCounts after=$afterCounts"
    Record-TestPass -Id 'T20'
  }

  Assert-That ($results.Count -eq 20) "expected 20 executed cases, got $($results.Count)"

  Write-Output "LM54B_TESTS=PASS"
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
    Write-Output 'LM54B_CLEANUP=PASS'
  } else {
    Write-Output 'LM54B_CLEANUP=FAIL'
    throw ('LM54B cleanup failed: ' + ($cleanupFailures -join '; '))
  }
}
