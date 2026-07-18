[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$env:PGCLIENTENCODING = 'UTF-8'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Assert-That {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw $Message }
}

$root = Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')
$forward = Join-Path $root 'scripts/sql/production/lm-cat-filter-50ab-pilot-filter-configuration.sql'
$rollback = Join-Path $root 'scripts/sql/production/lm-cat-filter-50ab-rollback-pilot-filter-configuration.sql'
$schema49c = Join-Path $root 'scripts/sql/production/lm-cat-filter-49c-lean-runtime-schema.sql'
$fixture = Join-Path $root 'scripts/sql/tests/lm-cat-filter-49c/legacy-compatible.sql'
$contract = Join-Path $PSScriptRoot 'configuration-contract.sql'

$bin = @($env:LM_PG_BIN, 'C:\tools\PostgreSQL17\pgsql\bin') |
  Where-Object { $_ } |
  Where-Object { Test-Path (Join-Path $_ 'initdb.exe') } |
  Select-Object -First 1
Assert-That ($null -ne $bin) 'PostgreSQL initdb.exe unavailable'

$tmp = Join-Path $env:TEMP ('lm50ab-config-' + [guid]::NewGuid().ToString('N'))
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

  $oldPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $arguments = @(
      '-X', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose',
      '-h', '127.0.0.1', '-p', $port, '-U', 'postgres', '-d', $Database
    )
    if ($File) { $arguments += @('-f', $File) } else { $arguments += @('-c', $Sql) }
    $output = & (Join-Path $bin 'psql.exe') @arguments 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $oldPreference
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
  $database = 'lm50ab_' + $CaseId.ToLowerInvariant() + '_' + [guid]::NewGuid().ToString('N').Substring(0, 8)
  Invoke-Psql -Database 'postgres' -Sql "CREATE DATABASE $database" -File $null | Out-Null
  
  # Load legacy compatible fixture
  Invoke-Psql -Database $database -Sql $null -File $fixture | Out-Null
  
  # Insert categories matching production hierarchy for pilot
  $categorySetup = @"
INSERT INTO public.categories (id, name, slug, parent_id) VALUES
  (3, 'Wyposazenie magazynu', 'wyposazenie-magazynu', NULL),
  (13, 'Pojemniki i kuwety', 'pojemniki-i-kuwety', 3),
  (30, 'Pojemniki plastikowe Euro', 'pojemniki-plastikowe-euro', 13)
ON CONFLICT (id) DO NOTHING;
"@
  Invoke-Psql -Database $database -Sql $categorySetup -File $null | Out-Null
  
  # Load base runtime schema from 49C
  Invoke-Psql -Database $database -Sql $null -File $schema49c | Out-Null
  
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

  # T01 — baseline runtime schema exists
  Invoke-Case 'T01' {
    $db = New-Database 'T01'
    $targetTablesCount = Get-Scalar $db "SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' AND relname IN ('attribute_definitions','controlled_option_values','offer_attribute_values','offer_attribute_option_values','attribute_definition_translations','category_attribute_assignments','controlled_option_value_translations')"
    Assert-That ($targetTablesCount -eq '7') "expected 7 runtime tables, got $targetTablesCount"
  }

  # T02 — legacy-compatible fixture loads
  Invoke-Case 'T02' {
    $db = New-Database 'T02'
    $categoriesCount = Get-Scalar $db "SELECT count(*) FROM public.categories"
    # 1 fixture category + 3 custom = 4
    Assert-That ($categoriesCount -eq '4') "expected 4 categories, got $categoriesCount"
  }

  # T03 to T17 — first forward execution & contract check
  Invoke-Case 'T03_T17' {
    $db = New-Database 'T03'
    
    # Save legacy table counts
    $beforeOffers = Get-Scalar $db "SELECT count(*) FROM public.offers"
    $beforeCategories = Get-Scalar $db "SELECT count(*) FROM public.categories"
    
    # Apply forward configuration
    Invoke-Psql -Database $db -Sql $null -File $forward | Out-Null
    
    # Run the contract assertions SQL file
    Invoke-Psql -Database $db -Sql $null -File $contract | Out-Null
    
    # Verify legacy row counts unchanged
    $afterOffers = Get-Scalar $db "SELECT count(*) FROM public.offers"
    $afterCategories = Get-Scalar $db "SELECT count(*) FROM public.categories"
    Assert-That ($beforeOffers -eq $afterOffers) "offers count changed: before=$beforeOffers, after=$afterOffers"
    Assert-That ($beforeCategories -eq $afterCategories) "categories count changed: before=$beforeCategories, after=$afterCategories"
  }

  # T18 to T20 — second execution idempotency check
  Invoke-Case 'T18_T20' {
    $db = New-Database 'T18'
    Invoke-Psql -Database $db -Sql $null -File $forward | Out-Null
    
    # Run second time
    Invoke-Psql -Database $db -Sql $null -File $forward | Out-Null
    
    # Verify counts remain correct
    Invoke-Psql -Database $db -Sql $null -File $contract | Out-Null
  }

  # T21 to T24 — rollback execution checks
  Invoke-Case 'T21_T24' {
    $db = New-Database 'T21'
    Invoke-Psql -Database $db -Sql $null -File $forward | Out-Null
    
    # Apply rollback
    Invoke-Psql -Database $db -Sql $null -File $rollback | Out-Null
    
    # Verify pilot attributes, translations, options, and assignments are gone
    $attrCount = Get-Scalar $db "SELECT count(*) FROM public.attribute_definitions WHERE stable_key = ANY(ARRAY['external_length', 'external_width', 'external_height', 'capacity', 'material', 'esd_protection', 'load_capacity', 'stackable'])"
    Assert-That ($attrCount -eq '0') "attributes remained after rollback: $attrCount"
    
    $assignCount = Get-Scalar $db "SELECT count(*) FROM public.category_attribute_assignments caa JOIN public.categories c ON c.id = caa.category_id WHERE c.slug = 'pojemniki-plastikowe-euro'"
    Assert-That ($assignCount -eq '0') "assignments remained after rollback: $assignCount"
    
    # Verify runtime tables still exist but are empty
    $targetTablesCount = Get-Scalar $db "SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' AND relname IN ('attribute_definitions','controlled_option_values','offer_attribute_values','offer_attribute_option_values','attribute_definition_translations','category_attribute_assignments','controlled_option_value_translations')"
    Assert-That ($targetTablesCount -eq '7') "runtime tables disappeared: $targetTablesCount"
    
    $recordsInRuntime = Get-Scalar $db "SELECT (SELECT count(*) FROM public.attribute_definitions) + (SELECT count(*) FROM public.category_attribute_assignments)"
    Assert-That ($recordsInRuntime -eq '0') "runtime tables are not empty: $recordsInRuntime"
  }

  # T25 — reapply after rollback
  Invoke-Case 'T25' {
    $db = New-Database 'T25'
    Invoke-Psql -Database $db -Sql $null -File $forward | Out-Null
    Invoke-Psql -Database $db -Sql $null -File $rollback | Out-Null
    
    # Reapply
    Invoke-Psql -Database $db -Sql $null -File $forward | Out-Null
    Invoke-Psql -Database $db -Sql $null -File $contract | Out-Null
  }

  # T26 to T27 — dependency block test
  Invoke-Case 'T26_T27' {
    $db = New-Database 'T26'
    Invoke-Psql -Database $db -Sql $null -File $forward | Out-Null
    
    # Simulate offer dependency by inserting values referencing a pilot attribute
    $attrId = Get-Scalar $db "SELECT id FROM public.attribute_definitions WHERE stable_key = 'external_length'"
    $offerId = Get-Scalar $db "SELECT min(id) FROM public.offers"
    
    Invoke-Psql -Database $db -Sql "INSERT INTO public.offer_attribute_values (offer_id, attribute_id, value_number) VALUES ($offerId, $attrId, 400)" -File $null | Out-Null
    
    # Rollback must FAIL now
    $res = Invoke-Psql -Database $db -Sql $null -File $rollback -ExpectSuccess $false
    Assert-That ($res.Output -match 'cannot rollback because offer_attribute_values exist') "unexpected rollback error message: $($res.Output)"
    
    # Cleanup dependency
    Invoke-Psql -Database $db -Sql "DELETE FROM public.offer_attribute_values WHERE attribute_id = $attrId" -File $null | Out-Null
    
    # Rollback should succeed now
    Invoke-Psql -Database $db -Sql $null -File $rollback | Out-Null
  }

  # T28 — semantic conflict blocks forward migration
  Invoke-Case 'T28' {
    $db = New-Database 'T28'
    
    # Pre-insert conflicting stable_key with different type
    Invoke-Psql -Database $db -Sql "INSERT INTO public.attribute_definitions (stable_key, data_type) VALUES ('external_length', 'boolean')" -File $null | Out-Null
    
    # Forward SQL must fail now
    $res = Invoke-Psql -Database $db -Sql $null -File $forward -ExpectSuccess $false
    Assert-That ($res.Output -match 'semantic conflict for attribute external_length') "unexpected forward error message: $($res.Output)"
  }

  Assert-That ($results.Count -eq 8) "expected 8 executed cases, got $($results.Count)"
  Write-Output "LM50AB_TESTS=$($results.Count)/8 PASS"
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
    Write-Output 'LM50AB_CLEANUP=PASS'
  } else {
    Write-Output 'LM50AB_CLEANUP=FAIL'
    throw ('LM50AB cleanup failed: ' + ($cleanupFailures -join '; '))
  }
}
