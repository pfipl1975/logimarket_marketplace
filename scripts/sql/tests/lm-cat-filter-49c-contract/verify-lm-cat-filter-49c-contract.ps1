[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

function Assert-That {
  param([bool]$Condition, [string]$Message)

  if (-not $Condition) {
    throw $Message
  }
}

function Get-PostgresBin {
  $candidates = @(
    $env:LM_PG_BIN,
    "C:\tools\PostgreSQL17\pgsql\bin",
    "C:\Program Files\PostgreSQL\17\bin"
  ) | Where-Object { $_ }

  foreach ($candidate in $candidates) {
    if (Test-Path (Join-Path $candidate "initdb.exe")) {
      return $candidate
    }
  }

  throw "TEST ENVIRONMENT UNAVAILABLE: PostgreSQL initdb.exe was not found."
}

function Get-FreeLocalPort {
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
  $listener.Start()
  try {
    return ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
  } finally {
    $listener.Stop()
  }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")
$migration = Get-ChildItem -LiteralPath (Join-Path $repoRoot "drizzle") -Filter "0004_*.sql" | Select-Object -First 1
Assert-That ($null -ne $migration) "Migration 0004 was not found."

$fixture = Join-Path $PSScriptRoot "pre-0004-filter-contract.sql"
Assert-That (Test-Path $fixture) "Pre-0004 fixture was not found."

$pgBin = Get-PostgresBin
$initdb = Join-Path $pgBin "initdb.exe"
$pgCtl = Join-Path $pgBin "pg_ctl.exe"
$psql = Join-Path $pgBin "psql.exe"
$root = Join-Path $env:TEMP ("lm49c-contract-" + [guid]::NewGuid().ToString("N"))
$data = Join-Path $root "data"
$port = Get-FreeLocalPort
$results = [System.Collections.Generic.List[object]]::new()
$serverStarted = $false

function Invoke-Psql {
  param(
    [string]$Database,
    [string]$Sql,
    [string]$File,
    [bool]$ExpectSuccess = $true
  )

  $log = Join-Path $root ("psql-" + [guid]::NewGuid().ToString("N") + ".log")
  $psqlArgs = @("-X", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose", "-h", "127.0.0.1", "-p", "$port", "-U", "postgres", "-d", $Database)
  if ($File) {
    $psqlArgs += @("-f", $File)
  } else {
    $psqlArgs += @("-c", $Sql)
  }

  Write-Output "PSQL_START database=$Database file=$([bool]$File)"
  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    & $psql @psqlArgs *> $log
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  Write-Output "PSQL_END database=$Database exit=$exitCode"
  $output = if (Test-Path $log) { Get-Content -LiteralPath $log -Raw } else { "" }
  if ($ExpectSuccess -and $exitCode -ne 0) {
    throw "psql failed unexpectedly ($exitCode): $output"
  }
  if (-not $ExpectSuccess -and $exitCode -eq 0) {
    throw "psql succeeded unexpectedly: $Sql"
  }
  return [pscustomobject]@{ ExitCode = $exitCode; Output = $output }
}

function New-CaseDatabase {
  param([string]$Case)
  $db = ("lm49c_" + $Case.ToLowerInvariant() + "_" + [guid]::NewGuid().ToString("N").Substring(0, 8))
  Invoke-Psql -Database "postgres" -Sql "CREATE DATABASE $db" | Out-Null
  Invoke-Psql -Database $db -File $fixture | Out-Null
  return $db
}

function Seed-ValidData {
  param([string]$Database, [int]$OfferStart = 100)

  $sql = @"
INSERT INTO categories (id) VALUES (1);
INSERT INTO offers (id, category_id) VALUES ($OfferStart, 1), ($($OfferStart + 1), 1), ($($OfferStart + 2), 1), ($($OfferStart + 3), 1), ($($OfferStart + 4), 1), ($($OfferStart + 5), 1), ($($OfferStart + 6), 1), ($($OfferStart + 7), 1), ($($OfferStart + 8), 1), ($($OfferStart + 9), 1);
INSERT INTO attribute_definitions (id, stable_key, data_type) VALUES (1, 'enum-a', 'enum'), (2, 'enum-b', 'enum'), (3, 'weight', 'number');
INSERT INTO controlled_option_values (id, attribute_id, stable_key) VALUES (10, 1, 'a-10'), (20, 2, 'b-20');
SELECT setval(pg_get_serial_sequence('attribute_definitions', 'id'), 3, true);
SELECT setval(pg_get_serial_sequence('controlled_option_values', 'id'), 20, true);
"@
  Invoke-Psql -Database $Database -Sql $sql | Out-Null
}

function Apply-Migration {
  param([string]$Database, [bool]$ExpectSuccess = $true)
  return Invoke-Psql -Database $Database -File $migration.FullName -ExpectSuccess $ExpectSuccess
}

function Expect-SqlState {
  param([object]$Result, [string]$ExpectedSqlState, [string]$Case)
  $sqlStatePattern = "(?:SQL state:\s*|ERROR:\s*)" + [regex]::Escape($ExpectedSqlState) + "\b"
  Assert-That ($Result.Output -match $sqlStatePattern) "$Case expected SQLSTATE $ExpectedSqlState, got: $($Result.Output)"
}

function Add-Result {
  param([string]$Id, [string]$Description, [scriptblock]$Body)
  try {
    & $Body
    $results.Add([pscustomobject]@{ Id = $Id; Description = $Description; Result = "PASS" })
    Write-Output "$Id PASS - $Description"
  } catch {
    $results.Add([pscustomobject]@{ Id = $Id; Description = $Description; Result = "FAIL" })
    Write-Output "$Id FAIL - $Description - $($_.Exception.Message)"
    throw
  }
}

try {
  New-Item -ItemType Directory -Path $root -Force | Out-Null
  & $initdb "-D" $data "-A" "trust" "-U" "postgres" "--locale=C" "--encoding=UTF8"
  Assert-That ($LASTEXITCODE -eq 0) "initdb failed."
  & $pgCtl "-D" $data "-l" (Join-Path $root "postgres.log") "-o" "-h 127.0.0.1 -p $port" "-w" "start"
  Assert-That ($LASTEXITCODE -eq 0) "pg_ctl start failed."
  $serverStarted = $true
  Write-Output "POSTGRES_READY port=$port"

  Add-Result "A" "0004 succeeds on valid pre-0004 data" {
    $db = New-CaseDatabase "a"
    Seed-ValidData $db
    Invoke-Psql -Database $db -Sql "INSERT INTO offer_attribute_values (offer_id, attribute_id, option_id) VALUES (100, 1, 10); INSERT INTO offer_attribute_option_values (offer_id, attribute_id, option_id) VALUES (100, 1, 10);" | Out-Null
    Apply-Migration $db | Out-Null
  }

  Add-Result "B" "matching attribute/option pair is accepted in both value tables" {
    $db = New-CaseDatabase "b"
    Seed-ValidData $db
    Apply-Migration $db | Out-Null
    Invoke-Psql -Database $db -Sql "INSERT INTO offer_attribute_values (offer_id, attribute_id, option_id) VALUES (101, 1, 10); INSERT INTO offer_attribute_option_values (offer_id, attribute_id, option_id) VALUES (101, 1, 10);" | Out-Null
  }

  Add-Result "C" "option owned by another attribute is rejected in both value tables" {
    $db = New-CaseDatabase "c"
    Seed-ValidData $db
    Apply-Migration $db | Out-Null
    $oav = Invoke-Psql -Database $db -Sql "INSERT INTO offer_attribute_values (offer_id, attribute_id, option_id) VALUES (102, 1, 20);" -ExpectSuccess $false
    Expect-SqlState $oav "23503" "C/OAV"
    $oaov = Invoke-Psql -Database $db -Sql "INSERT INTO offer_attribute_option_values (offer_id, attribute_id, option_id) VALUES (102, 1, 20);" -ExpectSuccess $false
    Expect-SqlState $oaov "23503" "C/OAOV"
  }

  Add-Result "D" "nonexistent option is rejected by the existing option foreign keys" {
    $db = New-CaseDatabase "d"
    Seed-ValidData $db
    Apply-Migration $db | Out-Null
    $result = Invoke-Psql -Database $db -Sql "INSERT INTO offer_attribute_values (offer_id, attribute_id, option_id) VALUES (103, 1, 999);" -ExpectSuccess $false
    Expect-SqlState $result "23503" "D"
  }

  Add-Result "E" "nonexistent attribute is rejected by the existing attribute foreign keys" {
    $db = New-CaseDatabase "e"
    Seed-ValidData $db
    Apply-Migration $db | Out-Null
    $result = Invoke-Psql -Database $db -Sql "INSERT INTO offer_attribute_values (offer_id, attribute_id, option_id) VALUES (104, 999, 10);" -ExpectSuccess $false
    Expect-SqlState $result "23503" "E"
  }

  Add-Result "F" "scalar value with NULL option_id remains valid" {
    $db = New-CaseDatabase "f"
    Seed-ValidData $db
    Apply-Migration $db | Out-Null
    Invoke-Psql -Database $db -Sql "INSERT INTO offer_attribute_values (offer_id, attribute_id, value_number, option_id) VALUES (105, 3, 12.5, NULL);" | Out-Null
  }

  Add-Result "G" "value exclusivity retains zero, two and exactly-one behavior" {
    $db = New-CaseDatabase "g"
    Seed-ValidData $db
    Apply-Migration $db | Out-Null
    $zero = Invoke-Psql -Database $db -Sql "INSERT INTO offer_attribute_values (offer_id, attribute_id) VALUES (106, 3);" -ExpectSuccess $false
    Expect-SqlState $zero "23514" "G/zero"
    $two = Invoke-Psql -Database $db -Sql "INSERT INTO offer_attribute_values (offer_id, attribute_id, value_number, value_year) VALUES (107, 3, 1, 2024);" -ExpectSuccess $false
    Expect-SqlState $two "23514" "G/two"
    Invoke-Psql -Database $db -Sql "INSERT INTO offer_attribute_values (offer_id, attribute_id, value_number) VALUES (108, 3, 1);" | Out-Null
  }

  Add-Result "H" "pre-existing mismatched data aborts 0004 before any new constraint" {
    $db = New-CaseDatabase "h"
    Seed-ValidData $db
    Invoke-Psql -Database $db -Sql "INSERT INTO offer_attribute_values (offer_id, attribute_id, option_id) VALUES (109, 1, 20);" | Out-Null
    $result = Apply-Migration $db -ExpectSuccess $false
    Expect-SqlState $result "23514" "H"
    $count = Invoke-Psql -Database $db -Sql "SELECT count(*) FROM pg_constraint WHERE conname IN ('uq_cov_attribute_id_pair', 'fk_oav_attribute_option_pair', 'fk_oaov_attribute_option_pair');"
    Assert-That ($count.Output -match "\b0\b") "H found a partially-added composite constraint: $($count.Output)"
  }

  Add-Result "I" "valid pre-existing option rows migrate and constraints are validated" {
    $db = New-CaseDatabase "i"
    Seed-ValidData $db
    Invoke-Psql -Database $db -Sql "INSERT INTO offer_attribute_values (offer_id, attribute_id, option_id) VALUES (100, 1, 10); INSERT INTO offer_attribute_option_values (offer_id, attribute_id, option_id) VALUES (100, 1, 10);" | Out-Null
    Apply-Migration $db | Out-Null
    $validated = Invoke-Psql -Database $db -Sql "SELECT bool_and(convalidated) FROM pg_constraint WHERE conname IN ('uq_cov_attribute_id_pair', 'fk_oav_attribute_option_pair', 'fk_oaov_attribute_option_pair');"
    Assert-That ($validated.Output -match "t") "I expected all new constraints to be validated: $($validated.Output)"
  }

  Add-Result "J" "duplicate controlled option id/attribute pair remains rejected by the primary key" {
    $db = New-CaseDatabase "j"
    Seed-ValidData $db
    Apply-Migration $db | Out-Null
    $result = Invoke-Psql -Database $db -Sql "INSERT INTO controlled_option_values (id, attribute_id, stable_key) VALUES (10, 1, 'duplicate-id');" -ExpectSuccess $false
    Expect-SqlState $result "23505" "J"
  }

  Add-Result "K" "constraint names, columns, references and validation state match the contract" {
    $db = New-CaseDatabase "k"
    Seed-ValidData $db
    Apply-Migration $db | Out-Null
    $inspection = Invoke-Psql -Database $db -Sql @"
SELECT conname, contype, convalidated, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname IN ('uq_cov_attribute_id_pair', 'fk_oav_attribute_option_pair', 'fk_oaov_attribute_option_pair')
ORDER BY conname;
"@
    Assert-That ($inspection.Output -match "uq_cov_attribute_id_pair") "K missing composite unique."
    Assert-That ($inspection.Output -match "fk_oav_attribute_option_pair") "K missing OAV composite FK."
    Assert-That ($inspection.Output -match "fk_oaov_attribute_option_pair") "K missing OAOV composite FK."
    Assert-That ($inspection.Output -match "FOREIGN KEY \(attribute_id, option_id\) REFERENCES controlled_option_values\(attribute_id, id\)") "K found incorrect composite FK definition: $($inspection.Output)"
    Assert-That ([regex]::Matches($inspection.Output, "\|\s+t\s+\|").Count -eq 3) "K expected three validated constraints: $($inspection.Output)"
  }

  $failed = @($results | Where-Object Result -eq "FAIL").Count
  Write-Output "LM49C_CONTRACT_TESTS=$($results.Count)/11 PASS; FAILURES=$failed; CLEANUP=PENDING"
  if ($failed -ne 0) {
    exit 1
  }
} finally {
  if ($serverStarted) {
    & $pgCtl "-D" $data "-m" "fast" "-w" "stop"
  }
  $cleanup = "PASS"
  try {
    if (Test-Path $root) {
      Remove-Item -LiteralPath $root -Recurse -Force
    }
  } catch {
    $cleanup = "FAIL"
  }
  Write-Output "LM49C_CONTRACT_CLEANUP=$cleanup"
}
