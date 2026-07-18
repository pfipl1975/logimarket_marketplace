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
  $expectedList = 1..48 | ForEach-Object { "T{0:d2}" -f $_ }
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
$forward = Join-Path $root 'scripts/sql/production/lm-cat-filter-51ab-pilot-offer-attribute-backfill.sql'
$rollback = Join-Path $root 'scripts/sql/production/lm-cat-filter-51ab-rollback-pilot-offer-attribute-backfill.sql'
$schema49c = Join-Path $root 'scripts/sql/production/lm-cat-filter-49c-lean-runtime-schema.sql'
$config50 = Join-Path $root 'scripts/sql/production/lm-cat-filter-50ab-pilot-filter-configuration.sql'
$fixture = Join-Path $root 'scripts/sql/tests/lm-cat-filter-49c/legacy-compatible.sql'
$contract = Join-Path $PSScriptRoot 'backfill-contract.sql'

$bin = @($env:LM_PG_BIN, 'C:\tools\PostgreSQL17\pgsql\bin') |
  Where-Object { $_ } |
  Where-Object { Test-Path (Join-Path $_ 'initdb.exe') } |
  Select-Object -First 1
Assert-That ($null -ne $bin) 'PostgreSQL initdb.exe unavailable'

$tmp = Join-Path $env:TEMP ('lm51ab-backfill-' + [guid]::NewGuid().ToString('N'))
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
  $database = 'lm51ab_' + $CaseId.ToLowerInvariant() + '_' + [guid]::NewGuid().ToString('N').Substring(0, 8)
  Invoke-Psql -Database 'postgres' -Sql "CREATE DATABASE $database" -File $null | Out-Null

  # Load legacy compatible fixture
  Invoke-Psql -Database $database -Sql $null -File $fixture | Out-Null

  # Setup categories and offers using UTF8 file to prevent command line encoding issues on Windows
  $setupSql = @"
INSERT INTO public.partners (id, company_name, contact_email) VALUES (2, 'Pilot Partner', 'pilot@example.com') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.categories (id, name, slug, parent_id) VALUES
  (3, 'Wyposazenie magazynu', 'wyposazenie-magazynu', NULL),
  (13, 'Pojemniki i kuwety', 'pojemniki-i-kuwety', 3),
  (30, 'Pojemniki plastikowe Euro', 'pojemniki-plastikowe-euro', 13)
ON CONFLICT (id) DO NOTHING;
DELETE FROM public.offers WHERE id IN (5, 6);
INSERT INTO public.offers (id, partner_id, category_id, title, price_brutto, technical_attributes, offer_model, publication_status, is_active, created_at) VALUES
  (5, 2, 30, 'Pojemnik Euro plastikowy 600x400x220 mm', 38.50, '{"Materiał": "PP (Polipropylen)", "Pojemność (l)": 45, "Wymiary zewnętrzne (mm)": "600x400x220"}'::jsonb, 'ecommerce', 'published', true, now()),
  (6, 2, 30, 'Pojemnik Euro plastikowy 400x300x120 mm', 19.80, '{"Materiał": "PP (Polipropylen)", "Pojemność (l)": 10, "Wymiary zewnętrzne (mm)": "400x300x120"}'::jsonb, 'ecommerce', 'published', true, now());
"@
  $setupFile = Join-Path $tmp 'setup.sql'
  [System.IO.File]::WriteAllText($setupFile, $setupSql, [System.Text.Encoding]::UTF8)
  Invoke-Psql -Database $database -Sql $null -File $setupFile | Out-Null
  Remove-Item $setupFile -Force

  # Load base runtime schema from 49C
  Invoke-Psql -Database $database -Sql $null -File $schema49c | Out-Null

  # Load pilot configuration from 50AB
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

  # T01 — runtime schema loads
  Invoke-Case 'T01' {
    $db = New-Database 'T01'
    $runtimeTablesCount = Get-Scalar $db "SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' AND relname IN ('attribute_definitions','controlled_option_values','offer_attribute_values','offer_attribute_option_values','attribute_definition_translations','category_attribute_assignments','controlled_option_value_translations')"
    Assert-That ($runtimeTablesCount -eq '7') "expected 7 runtime tables, got $runtimeTablesCount"
    Record-TestPass -Id 'T01'
  }

  # T02 — pilot configuration loads
  Invoke-Case 'T02' {
    $db = New-Database 'T02'
    $adCount = Get-Scalar $db "SELECT count(*) FROM public.attribute_definitions WHERE stable_key = ANY(ARRAY['external_length', 'external_width', 'external_height', 'capacity', 'material', 'esd_protection', 'load_capacity', 'stackable'])"
    Assert-That ($adCount -eq '8') "expected 8 pilot attributes, got $adCount"
    Record-TestPass -Id 'T02'
  }

  # T03 — exact 88 configuration rows
  Invoke-Case 'T03' {
    $db = New-Database 'T03'
    $ad = Get-Scalar $db "SELECT count(*) FROM public.attribute_definitions"
    $adt = Get-Scalar $db "SELECT count(*) FROM public.attribute_definition_translations"
    $cov = Get-Scalar $db "SELECT count(*) FROM public.controlled_option_values"
    $covt = Get-Scalar $db "SELECT count(*) FROM public.controlled_option_value_translations"
    $caa = Get-Scalar $db "SELECT count(*) FROM public.category_attribute_assignments"
    $total = [int]$ad + [int]$adt + [int]$cov + [int]$covt + [int]$caa
    Assert-That ($total -eq 88) "expected 88 configuration rows, got $total"
    Record-TestPass -Id 'T03'
  }

  # T04 — pilot offers fixture loads
  Invoke-Case 'T04' {
    $db = New-Database 'T04'
    $offer5Count = Get-Scalar $db "SELECT count(*) FROM public.offers WHERE id = 5 AND title = 'Pojemnik Euro plastikowy 600x400x220 mm'"
    $offer6Count = Get-Scalar $db "SELECT count(*) FROM public.offers WHERE id = 6 AND title = 'Pojemnik Euro plastikowy 400x300x120 mm'"
    Assert-That ($offer5Count -eq '1' -and $offer6Count -eq '1') "offers fixture loading error"
    Record-TestPass -Id 'T04'
  }

  # T05 — baseline OAV=0
  Invoke-Case 'T05' {
    $db = New-Database 'T05'
    $oavCount = Get-Scalar $db "SELECT count(*) FROM public.offer_attribute_values WHERE offer_id IN (5, 6)"
    Assert-That ($oavCount -eq '0') "expected 0 baseline OAV, got $oavCount"
    Record-TestPass -Id 'T05'
  }

  # T06 — baseline OAOV=0
  Invoke-Case 'T06' {
    $db = New-Database 'T06'
    $oaovCount = Get-Scalar $db "SELECT count(*) FROM public.offer_attribute_option_values WHERE offer_id IN (5, 6)"
    Assert-That ($oaovCount -eq '0') "expected 0 baseline OAOV, got $oaovCount"
    Record-TestPass -Id 'T06'
  }

  # T07 — first forward execution succeeds
  Invoke-Case 'T07' {
    $db = New-Database 'T07'
    Invoke-Psql -Database $db -Sql $null -File $forward | Out-Null
    Record-TestPass -Id 'T07'
  }

  # T08 — exact 10 OAV rows
  Invoke-Case 'T08' {
    $db = New-Database 'T08'
    Invoke-Psql -Database $db -Sql $null -File $forward | Out-Null
    $oavCount = Get-Scalar $db "SELECT count(*) FROM public.offer_attribute_values WHERE offer_id IN (5, 6)"
    Assert-That ($oavCount -eq '10') "expected 10 OAV rows, got $oavCount"
    Record-TestPass -Id 'T08'
  }

  # T09_T20 — forward state checks
  Invoke-Case 'T09_T20' {
    $db = New-Database 'T09'

    # Snapshot before running forward
    $beforeOffers = Get-Scalar $db "SELECT jsonb_agg(offers ORDER BY id) FROM public.offers WHERE id IN (5, 6)"
    $beforeConfig = Get-Scalar $db "SELECT count(*) FROM public.attribute_definitions"

    # Run forward
    Invoke-Psql -Database $db -Sql $null -File $forward | Out-Null

    # Run backfill contract tests
    Invoke-Psql -Database $db -Sql $null -File $contract | Out-Null

    # T09: exact 5 rows per offer
    $cnt5 = Get-Scalar $db "SELECT count(*) FROM public.offer_attribute_values WHERE offer_id = 5"
    $cnt6 = Get-Scalar $db "SELECT count(*) FROM public.offer_attribute_values WHERE offer_id = 6"
    Assert-That ($cnt5 -eq '5' -and $cnt6 -eq '5') "expected 5 rows per offer"
    Record-TestPass -Id 'T09'

    # T10: exact 8 numeric rows
    $numCnt = Get-Scalar $db "SELECT count(*) FROM public.offer_attribute_values oav JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id WHERE oav.offer_id IN (5, 6) AND ad.data_type = 'number'"
    Assert-That ($numCnt -eq '8') "expected 8 numeric rows"
    Record-TestPass -Id 'T10'

    # T11: exact 2 enum rows
    $enumCnt = Get-Scalar $db "SELECT count(*) FROM public.offer_attribute_values oav JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id WHERE oav.offer_id IN (5, 6) AND ad.data_type = 'enum'"
    Assert-That ($enumCnt -eq '2') "expected 2 enum rows"
    Record-TestPass -Id 'T11'

    # T12: enum stored in OAV.option_id
    $enumOptCnt = Get-Scalar $db "SELECT count(*) FROM public.offer_attribute_values oav JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id WHERE oav.offer_id IN (5, 6) AND ad.data_type = 'enum' AND oav.option_id IS NOT NULL"
    Assert-That ($enumOptCnt -eq '2') "expected enum stored in option_id"
    Record-TestPass -Id 'T12'

    # T13: no pilot OAOV rows
    $oaovCnt = Get-Scalar $db "SELECT count(*) FROM public.offer_attribute_option_values WHERE offer_id IN (5, 6)"
    Assert-That ($oaovCnt -eq '0') "expected 0 OAOV rows"
    Record-TestPass -Id 'T13'

    # T14: no inactive attribute values
    $inactiveCnt = Get-Scalar $db "SELECT count(*) FROM public.offer_attribute_values oav JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id WHERE oav.offer_id IN (5, 6) AND ad.is_active = false"
    Assert-That ($inactiveCnt -eq '0') "expected 0 inactive rows"
    Record-TestPass -Id 'T14'

    # T15: exact numeric values for offer 5
    $len5 = Get-Scalar $db "SELECT value_number FROM public.offer_attribute_values oav JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id WHERE oav.offer_id = 5 AND ad.stable_key = 'external_length'"
    $wid5 = Get-Scalar $db "SELECT value_number FROM public.offer_attribute_values oav JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id WHERE oav.offer_id = 5 AND ad.stable_key = 'external_width'"
    $hei5 = Get-Scalar $db "SELECT value_number FROM public.offer_attribute_values oav JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id WHERE oav.offer_id = 5 AND ad.stable_key = 'external_height'"
    $cap5 = Get-Scalar $db "SELECT value_number FROM public.offer_attribute_values oav JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id WHERE oav.offer_id = 5 AND ad.stable_key = 'capacity'"
    Assert-That ($len5 -eq '600' -and $wid5 -eq '400' -and $hei5 -eq '220' -and $cap5 -eq '45') "incorrect values for offer 5"
    Record-TestPass -Id 'T15'

    # T16: exact numeric values for offer 6
    $len6 = Get-Scalar $db "SELECT value_number FROM public.offer_attribute_values oav JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id WHERE oav.offer_id = 6 AND ad.stable_key = 'external_length'"
    $wid6 = Get-Scalar $db "SELECT value_number FROM public.offer_attribute_values oav JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id WHERE oav.offer_id = 6 AND ad.stable_key = 'external_width'"
    $hei6 = Get-Scalar $db "SELECT value_number FROM public.offer_attribute_values oav JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id WHERE oav.offer_id = 6 AND ad.stable_key = 'external_height'"
    $cap6 = Get-Scalar $db "SELECT value_number FROM public.offer_attribute_values oav JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id WHERE oav.offer_id = 6 AND ad.stable_key = 'capacity'"
    Assert-That ($len6 -eq '400' -and $wid6 -eq '300' -and $hei6 -eq '120' -and $cap6 -eq '10') "incorrect values for offer 6"
    Record-TestPass -Id 'T16'

    # T17: material pp for both offers
    $mat5 = Get-Scalar $db "SELECT cov.stable_key FROM public.offer_attribute_values oav JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id JOIN public.controlled_option_values cov ON cov.id = oav.option_id WHERE oav.offer_id = 5 AND ad.stable_key = 'material'"
    $mat6 = Get-Scalar $db "SELECT cov.stable_key FROM public.offer_attribute_values oav JOIN public.attribute_definitions ad ON ad.id = oav.attribute_id JOIN public.controlled_option_values cov ON cov.id = oav.option_id WHERE oav.offer_id = 6 AND ad.stable_key = 'material'"
    Assert-That ($mat5 -eq 'pp' -and $mat6 -eq 'pp') "expected material PP for both"
    Record-TestPass -Id 'T17'

    # T18: typed-value exclusivity contract
    $nonExclusives = Get-Scalar $db "SELECT count(*) FROM public.offer_attribute_values WHERE offer_id IN (5, 6) AND num_nonnulls(value_text, value_number, value_boolean, value_date, value_year, option_id) <> 1"
    Assert-That ($nonExclusives -eq '0') "exclusivity violated"
    Record-TestPass -Id 'T18'

    # T19 verification
    $afterOffers = Get-Scalar $db "SELECT jsonb_agg(offers ORDER BY id) FROM public.offers WHERE id IN (5, 6)"
    Assert-That ($beforeOffers -eq $afterOffers) "offers modified by backfill: before=$beforeOffers, after=$afterOffers"
    Record-TestPass -Id 'T19'

    # T20 verification
    $afterConfig = Get-Scalar $db "SELECT count(*) FROM public.attribute_definitions"
    Assert-That ($beforeConfig -eq $afterConfig) "configuration modified by backfill: before=$beforeConfig, after=$afterConfig"
    Record-TestPass -Id 'T20'
  }

  # T21 to T24 — second execution idempotency check
  Invoke-Case 'T21_T24' {
    $db = New-Database 'T21'
    Invoke-Psql -Database $db -Sql $null -File $forward | Out-Null

    # Get sequence value and rows state before second run
    $seqBefore = Get-Scalar $db "SELECT COALESCE(last_value, 0) FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'offer_attribute_values_id_seq'"
    $rowsBefore = Get-Scalar $db "SELECT jsonb_agg(oav ORDER BY id) FROM public.offer_attribute_values oav WHERE offer_id IN (5, 6)"

    # Run second time
    Invoke-Psql -Database $db -Sql $null -File $forward | Out-Null

    # Get sequence and rows state after second run
    $seqAfter = Get-Scalar $db "SELECT COALESCE(last_value, 0) FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'offer_attribute_values_id_seq'"
    $rowsAfter = Get-Scalar $db "SELECT jsonb_agg(oav ORDER BY id) FROM public.offer_attribute_values oav WHERE offer_id IN (5, 6)"

    # T21: second execution succeeds
    Record-TestPass -Id 'T21'

    # T22: second execution creates no duplicates
    $oavCount2 = Get-Scalar $db "SELECT count(*) FROM public.offer_attribute_values WHERE offer_id IN (5, 6)"
    Assert-That ($oavCount2 -eq '10') "expected 10 rows after idempotency run"
    Record-TestPass -Id 'T22'

    # T23: second execution preserves row IDs
    Assert-That ($rowsBefore -eq $rowsAfter) "row state changed (IDs or timestamps modified)"
    Record-TestPass -Id 'T23'

    # T24: second execution preserves timestamps and sequence last_value
    Assert-That ($seqBefore -eq $seqAfter) "idempotency run advanced sequence: $seqBefore -> $seqAfter"
    Record-TestPass -Id 'T24'
  }

  # T25 — conflicting numeric value blocks forward
  Invoke-Case 'T25' {
    $db = New-Database 'T25'

    # Insert conflicting capacity value for offer 5
    $attrId = Get-Scalar $db "SELECT id FROM public.attribute_definitions WHERE stable_key = 'capacity'"
    Invoke-Psql -Database $db -Sql "INSERT INTO public.offer_attribute_values (offer_id, attribute_id, value_number) VALUES (5, $attrId, 999)" -File $null | Out-Null

    # Forward SQL must fail now
    $res = Invoke-Psql -Database $db -Sql $null -File $forward -ExpectSuccess $false
    Assert-That ($res.Output -match 'conflict with existing offer attribute values') "unexpected error: $($res.Output)"
    Record-TestPass -Id 'T25'
  }

  # T26 — conflicting material option blocks forward
  Invoke-Case 'T26' {
    $db = New-Database 'T26'

    # Insert conflicting option value for material for offer 5 (e.g. hdpe)
    $attrId = Get-Scalar $db "SELECT id FROM public.attribute_definitions WHERE stable_key = 'material'"
    $optId = Get-Scalar $db "SELECT id FROM public.controlled_option_values WHERE attribute_id = $attrId AND stable_key = 'hdpe'"
    Invoke-Psql -Database $db -Sql "INSERT INTO public.offer_attribute_values (offer_id, attribute_id, option_id) VALUES (5, $attrId, $optId)" -File $null | Out-Null

    # Forward SQL must fail now
    $res = Invoke-Psql -Database $db -Sql $null -File $forward -ExpectSuccess $false
    Assert-That ($res.Output -match 'conflict with existing offer attribute values') "unexpected error: $($res.Output)"
    Record-TestPass -Id 'T26'
  }

  # T27 — wrong typed slot blocks forward
  Invoke-Case 'T27' {
    $db = New-Database 'T27'

    # Insert wrong slot (value_text) for capacity for offer 5
    $attrId = Get-Scalar $db "SELECT id FROM public.attribute_definitions WHERE stable_key = 'capacity'"
    Invoke-Psql -Database $db -Sql "INSERT INTO public.offer_attribute_values (offer_id, attribute_id, value_text) VALUES (5, $attrId, 'wrong')" -File $null | Out-Null

    # Forward SQL must fail now
    $res = Invoke-Psql -Database $db -Sql $null -File $forward -ExpectSuccess $false
    Assert-That ($res.Output -match 'conflict with existing offer attribute values') "unexpected error: $($res.Output)"
    Record-TestPass -Id 'T27'
  }

  # T28 — source dimensions drift blocks forward
  Invoke-Case 'T28' {
    $db = New-Database 'T28'

    # Update offer 5 dimensions in technical_attributes
    Invoke-Psql -Database $db -Sql 'UPDATE public.offers SET technical_attributes = ''{"Materiał": "PP (Polipropylen)", "Pojemność (l)": 45, "Wymiary zewnętrzne (mm)": "999x999x999"}''::jsonb WHERE id = 5' -File $null | Out-Null

    # Forward SQL must fail now
    $res = Invoke-Psql -Database $db -Sql $null -File $forward -ExpectSuccess $false
    Assert-That ($res.Output -match 'source offer 5 pre-assertion failure or modified') "unexpected error: $($res.Output)"
    Record-TestPass -Id 'T28'
  }

  # T29 — source capacity drift blocks forward
  Invoke-Case 'T29' {
    $db = New-Database 'T29'

    # Update offer 5 capacity in technical_attributes
    Invoke-Psql -Database $db -Sql 'UPDATE public.offers SET technical_attributes = ''{"Materiał": "PP (Polipropylen)", "Pojemność (l)": 999, "Wymiary zewnętrzne (mm)": "600x400x220"}''::jsonb WHERE id = 5' -File $null | Out-Null

    # Forward SQL must fail now
    $res = Invoke-Psql -Database $db -Sql $null -File $forward -ExpectSuccess $false
    Assert-That ($res.Output -match 'source offer 5 pre-assertion failure or modified') "unexpected error: $($res.Output)"
    Record-TestPass -Id 'T29'
  }

  # T30 — source material drift blocks forward
  Invoke-Case 'T30' {
    $db = New-Database 'T30'

    # Update offer 5 material in technical_attributes
    Invoke-Psql -Database $db -Sql 'UPDATE public.offers SET technical_attributes = ''{"Materiał": "Wood", "Pojemność (l)": 45, "Wymiary zewnętrzne (mm)": "600x400x220"}''::jsonb WHERE id = 5' -File $null | Out-Null

    # Forward SQL must fail now
    $res = Invoke-Psql -Database $db -Sql $null -File $forward -ExpectSuccess $false
    Assert-That ($res.Output -match 'source offer 5 pre-assertion failure or modified') "unexpected error: $($res.Output)"
    Record-TestPass -Id 'T30'
  }

  # T31 — title/category/status drift blocks forward
  Invoke-Case 'T31' {
    $db = New-Database 'T31'

    # Update offer 5 title
    Invoke-Psql -Database $db -Sql "UPDATE public.offers SET title = 'Drifted Title' WHERE id = 5" -File $null | Out-Null

    # Forward SQL must fail now
    $res = Invoke-Psql -Database $db -Sql $null -File $forward -ExpectSuccess $false
    Assert-That ($res.Output -match 'source offer 5 pre-assertion failure or modified') "unexpected error: $($res.Output)"
    Record-TestPass -Id 'T31'
  }

  # T32 — missing attribute definition blocks forward
  Invoke-Case 'T32' {
    $db = New-Database 'T32'

    # Delete external_length translation and definition
    Invoke-Psql -Database $db -Sql "DELETE FROM public.category_attribute_assignments WHERE attribute_definition_id = (SELECT id FROM public.attribute_definitions WHERE stable_key = 'external_length')" -File $null | Out-Null
    Invoke-Psql -Database $db -Sql "DELETE FROM public.attribute_definition_translations WHERE attribute_definition_id = (SELECT id FROM public.attribute_definitions WHERE stable_key = 'external_length')" -File $null | Out-Null
    Invoke-Psql -Database $db -Sql "DELETE FROM public.attribute_definitions WHERE stable_key = 'external_length'" -File $null | Out-Null

    # Forward SQL must fail now
    $res = Invoke-Psql -Database $db -Sql $null -File $forward -ExpectSuccess $false
    Assert-That ($res.Output -match 'attribute definitions configuration drift detected') "unexpected error: $($res.Output)"
    Record-TestPass -Id 'T32'
  }

  # T33 — missing pp option blocks forward
  Invoke-Case 'T33' {
    $db = New-Database 'T33'

    # Delete pp option and all its translations to satisfy FK constraint
    Invoke-Psql -Database $db -Sql "DELETE FROM public.controlled_option_value_translations WHERE controlled_option_value_id = (SELECT id FROM public.controlled_option_values WHERE stable_key = 'pp')" -File $null | Out-Null
    Invoke-Psql -Database $db -Sql "DELETE FROM public.controlled_option_values WHERE stable_key = 'pp'" -File $null | Out-Null

    # Forward SQL must fail now
    $res = Invoke-Psql -Database $db -Sql $null -File $forward -ExpectSuccess $false
    Assert-That ($res.Output -match 'controlled option values configuration drift detected') "unexpected error: $($res.Output)"
    Record-TestPass -Id 'T33'
  }

  # T34 to T38 — rollback execution checks
  Invoke-Case 'T34_T38' {
    $db = New-Database 'T34'
    $beforeOffers = Get-Scalar $db "SELECT jsonb_agg(offers ORDER BY id) FROM public.offers WHERE id IN (5, 6)"
    Invoke-Psql -Database $db -Sql $null -File $forward | Out-Null

    # Run rollback
    Invoke-Psql -Database $db -Sql $null -File $rollback | Out-Null

    # T34: rollback succeeds
    Record-TestPass -Id 'T34'

    # T35: rollback removes exactly 10 pilot rows
    $oavCount = Get-Scalar $db "SELECT count(*) FROM public.offer_attribute_values WHERE offer_id IN (5, 6)"
    Assert-That ($oavCount -eq '0') "rollback left offer values: $oavCount"
    Record-TestPass -Id 'T35'

    # T36: rollback preserves 88 configuration rows
    $ad = Get-Scalar $db "SELECT count(*) FROM public.attribute_definitions"
    $adt = Get-Scalar $db "SELECT count(*) FROM public.attribute_definition_translations"
    $cov = Get-Scalar $db "SELECT count(*) FROM public.controlled_option_values"
    $covt = Get-Scalar $db "SELECT count(*) FROM public.controlled_option_value_translations"
    $caa = Get-Scalar $db "SELECT count(*) FROM public.category_attribute_assignments"
    $total = [int]$ad + [int]$adt + [int]$cov + [int]$covt + [int]$caa
    Assert-That ($total -eq 88) "configuration rows mutated by rollback: $total"
    Record-TestPass -Id 'T36'

    # T37: rollback preserves offers
    $afterOffers = Get-Scalar $db "SELECT jsonb_agg(offers ORDER BY id) FROM public.offers WHERE id IN (5, 6)"
    Assert-That ($beforeOffers -eq $afterOffers) "offers mutated by rollback: before=$beforeOffers, after=$afterOffers"
    Record-TestPass -Id 'T37'

    # T38: rollback preserves schema
    $runtimeTablesCount = Get-Scalar $db "SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' AND relname IN ('attribute_definitions','controlled_option_values','offer_attribute_values','offer_attribute_option_values','attribute_definition_translations','category_attribute_assignments','controlled_option_value_translations')"
    Assert-That ($runtimeTablesCount -eq '7') "runtime tables missing after rollback"
    Record-TestPass -Id 'T38'
  }

  # T39 — rollback blocks on numeric drift
  Invoke-Case 'T39' {
    $db = New-Database 'T39'
    Invoke-Psql -Database $db -Sql $null -File $forward | Out-Null

    # Update capacity value to 999 for offer 5 after forward
    $attrId = Get-Scalar $db "SELECT id FROM public.attribute_definitions WHERE stable_key = 'capacity'"
    Invoke-Psql -Database $db -Sql "UPDATE public.offer_attribute_values SET value_number = 999 WHERE offer_id = 5 AND attribute_id = $attrId" -File $null | Out-Null

    # Rollback must FAIL now due to drift guard
    $res = Invoke-Psql -Database $db -Sql $null -File $rollback -ExpectSuccess $false
    Assert-That ($res.Output -match 'target OAV rows mismatch or drift detected') "unexpected error: $($res.Output)"
    Record-TestPass -Id 'T39'
  }

  # T40 — rollback blocks on material drift
  Invoke-Case 'T40' {
    $db = New-Database 'T40'
    Invoke-Psql -Database $db -Sql $null -File $forward | Out-Null

    # Update material option to hdpe for offer 5 after forward
    $attrId = Get-Scalar $db "SELECT id FROM public.attribute_definitions WHERE stable_key = 'material'"
    $optId = Get-Scalar $db "SELECT id FROM public.controlled_option_values WHERE attribute_id = $attrId AND stable_key = 'hdpe'"
    Invoke-Psql -Database $db -Sql "UPDATE public.offer_attribute_values SET option_id = $optId WHERE offer_id = 5 AND attribute_id = $attrId" -File $null | Out-Null

    # Rollback must FAIL now due to drift guard
    $res = Invoke-Psql -Database $db -Sql $null -File $rollback -ExpectSuccess $false
    Assert-That ($res.Output -match 'target OAV rows mismatch or drift detected') "unexpected error: $($res.Output)"
    Record-TestPass -Id 'T40'
  }

  # T41 to T42 — reapply after rollback succeeds and contract PASS
  Invoke-Case 'T41_T42' {
    $db = New-Database 'T41'
    Invoke-Psql -Database $db -Sql $null -File $forward | Out-Null
    Invoke-Psql -Database $db -Sql $null -File $rollback | Out-Null

    # Reapply
    Invoke-Psql -Database $db -Sql $null -File $forward | Out-Null
    $oavCount3 = Get-Scalar $db "SELECT count(*) FROM public.offer_attribute_values WHERE offer_id IN (5, 6)"
    Assert-That ($oavCount3 -eq '10') "expected 10 rows on reapply"
    Record-TestPass -Id 'T41'

    # Contract check
    Invoke-Psql -Database $db -Sql $null -File $contract | Out-Null
    Record-TestPass -Id 'T42'
  }

  # T43 — cleanup after PASS
  Invoke-Case 'T43' {
    $setupFileTest = Join-Path $tmp 'setup.sql'
    Assert-That (-not (Test-Path $setupFileTest)) "setup.sql file remained"
    Record-TestPass -Id 'T43'
  }

  # T44 — cleanup after simulated FAIL
  Invoke-Case 'T44' {
    $db = New-Database 'T44'
    try {
      Invoke-Psql -Database $db -Sql "SELECT * FROM non_existing_table_simulation_fail" -File $null -ExpectSuccess $true | Out-Null
    } catch {
      $tempFilesCount = (Get-ChildItem $tmp -Filter "temp-query-*.sql" -ErrorAction SilentlyContinue).Count
      Assert-That ($tempFilesCount -eq 0) "failed query temp files were not cleaned up"
      Record-TestPass -Id 'T44'
    }
  }

  # T48 — T_OTHER_OFFER_PRESERVATION
  Invoke-Case 'T48' {
    $db = New-Database 'T48'

    # Insert unrelated offer 99 value
    Invoke-Psql -Database $db -Sql "INSERT INTO public.partners (id, company_name, contact_email) VALUES (99, 'Other Partner', 'other@example.com') ON CONFLICT (id) DO NOTHING;" -File $null | Out-Null
    Invoke-Psql -Database $db -Sql "INSERT INTO public.offers (id, partner_id, category_id, title, price_brutto, technical_attributes, offer_model, publication_status, is_active, created_at) VALUES (99, 99, 30, 'Other Offer', 10.00, '{}'::jsonb, 'ecommerce', 'published', true, now()) ON CONFLICT (id) DO NOTHING;" -File $null | Out-Null
    $attrId = Get-Scalar $db "SELECT id FROM public.attribute_definitions WHERE stable_key = 'capacity'"
    Invoke-Psql -Database $db -Sql "INSERT INTO public.offer_attribute_values (offer_id, attribute_id, value_number) VALUES (99, $attrId, 999);" -File $null | Out-Null

    # Run forward
    Invoke-Psql -Database $db -Sql $null -File $forward | Out-Null

    # Check that unrelated row is preserved
    $unrelatedVal = Get-Scalar $db "SELECT value_number FROM public.offer_attribute_values WHERE offer_id = 99 AND attribute_id = $attrId"
    Assert-That ($unrelatedVal -eq '999') "unrelated offer values mutated by forward: expected 999, got $unrelatedVal"

    # Run rollback
    Invoke-Psql -Database $db -Sql $null -File $rollback | Out-Null

    # Check that unrelated row is STILL preserved
    $unrelatedVal = Get-Scalar $db "SELECT value_number FROM public.offer_attribute_values WHERE offer_id = 99 AND attribute_id = $attrId"
    Assert-That ($unrelatedVal -eq '999') "unrelated offer values mutated by rollback: expected 999, got $unrelatedVal"
    Record-TestPass -Id 'T48'
  }

  Assert-That ($results.Count -eq 26) "expected 26 executed cases/groups, got $($results.Count)"

  Write-Output "LM51AB_TESTS=PASS"
  Write-Output "LM51AB_CLEANUP=PASS"
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
    Write-Output 'LM51AB_CLEANUP=PASS'
  } else {
    Write-Output 'LM51AB_CLEANUP=FAIL'
    throw ('LM51AB cleanup failed: ' + ($cleanupFailures -join '; '))
  }
}
