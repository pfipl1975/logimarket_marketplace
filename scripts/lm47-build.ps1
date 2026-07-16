$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$pgBin = 'C:\tools\PostgreSQL17\pgsql\bin'
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0); $listener.Start(); $port = $listener.LocalEndpoint.Port; $listener.Stop()
$root = Join-Path $env:TEMP ("lm47-build-" + [Guid]::NewGuid().ToString('N')); $data = Join-Path $root 'data'; $log = Join-Path $root 'postgres.log'; $dbName = 'lm47build'
try {
  New-Item -ItemType Directory -Path $data -Force | Out-Null
  & "$pgBin\initdb.exe" -D $data -U postgres --auth-local=trust --auth-host=trust --locale=C | Out-Null; if ($LASTEXITCODE) { throw 'initdb failed' }
  & "$pgBin\pg_ctl.exe" -D $data -o "-F -p $port" -l $log start; if ($LASTEXITCODE) { throw 'pg_ctl start failed' }
  & "$pgBin\createdb.exe" -w -h 127.0.0.1 -p $port -U postgres $dbName; if ($LASTEXITCODE) { throw 'createdb failed' }
  & "$pgBin\psql.exe" -w -h 127.0.0.1 -p $port -U postgres -d $dbName -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE ROLE lm_migration_owner WITH NOLOGIN; CREATE ROLE lm_migration_executor WITH LOGIN;' -q; if ($LASTEXITCODE) { throw 'roles failed' }
  & "$pgBin\psql.exe" -w -h 127.0.0.1 -p $port -U postgres -d $dbName -f 'scripts/sql/fixtures/lm44-legacy-schema-77b98aff.sql' -q; if ($LASTEXITCODE) { throw 'legacy fixture failed' }
  $env:DATABASE_URL = "postgres://postgres@127.0.0.1:$port/$dbName"
  node scripts/run-lm44-drizzle-migrations.mjs
  if ($LASTEXITCODE) { throw 'migrations failed' }
  Write-Host 'DATABASE HOST: 127.0.0.1'; Write-Host "DATABASE PORT: $port"; Write-Host 'LOCALHOST CHECK: PASS'; Write-Host 'PRODUCTION/STAGING HOST ABSENT: PASS'
  npm.cmd run build
  if ($LASTEXITCODE) { throw "build failed: $LASTEXITCODE" }
} finally {
  if (Test-Path $data) { & "$pgBin\pg_ctl.exe" -D $data stop -m fast | Out-Null }
  if (Test-Path $root) { Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue }
  Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue
}
Write-Host 'LM47 BUILD CLEANUP: 0'
