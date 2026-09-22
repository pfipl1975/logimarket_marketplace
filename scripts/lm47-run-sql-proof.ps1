$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$pgBin = 'C:\tools\PostgreSQL17\pgsql\bin'
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$listener.Start(); $port = $listener.LocalEndpoint.Port; $listener.Stop()
$root = Join-Path $env:TEMP ("lm47-proof-" + [Guid]::NewGuid().ToString('N'))
$data = Join-Path $root 'data'; $log = Join-Path $root 'postgres.log'; $dbName = 'lm47proof'
$cleanupErrors = [System.Collections.Generic.List[string]]::new()
try {
  New-Item -ItemType Directory -Path $data -Force | Out-Null
  & "$pgBin\initdb.exe" -D $data -U postgres --auth-local=trust --auth-host=trust --locale=C | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "initdb failed: $LASTEXITCODE" }
  & "$pgBin\pg_ctl.exe" -D $data -o "-F -p $port" -l $log start
  if ($LASTEXITCODE -ne 0) { throw "pg_ctl start failed: $LASTEXITCODE" }
  & "$pgBin\createdb.exe" -w -h 127.0.0.1 -p $port -U postgres $dbName
  if ($LASTEXITCODE -ne 0) { throw "createdb failed: $LASTEXITCODE" }
  $env:DATABASE_URL = "postgres://postgres@127.0.0.1:$port/$dbName"
  npx.cmd --no-install tsx scripts/lm47-sql-proof.ts
  if ($LASTEXITCODE -ne 0) { throw "sql proof failed: $LASTEXITCODE" }
  Write-Host "LM47_SQL_PROOF_HOST=127.0.0.1 PORT=$port"
} finally {
  if (Test-Path $data) {
    & "$pgBin\pg_ctl.exe" -D $data stop -m fast | Out-Null
    if ($LASTEXITCODE -ne 0) { $cleanupErrors.Add("pg_ctl stop failed") }
  }
  if (Test-Path $root) { Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue }
  Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
}
if ($cleanupErrors.Count -gt 0) { throw "Cleanup errors: $($cleanupErrors -join '; ')" }
Write-Host 'LM47_SQL_PROOF_CLEANUP=0'
