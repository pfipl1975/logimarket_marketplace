[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')
$runRoot = Join-Path $env:TEMP ('lm50ab-all-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $runRoot -Force | Out-Null

function Invoke-Harness {
  param(
    [string]$Name,
    [string]$ScriptPath,
    [string[]]$RequiredLines
  )

  $stdout = Join-Path $runRoot "$Name.stdout.log"
  $stderr = Join-Path $runRoot "$Name.stderr.log"
  $process = Start-Process `
    -FilePath 'pwsh.exe' `
    -ArgumentList @('-NoProfile', '-File', $ScriptPath) `
    -WorkingDirectory $repoRoot.Path `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr `
    -Wait `
    -PassThru

  if ($process.ExitCode -ne 0) {
    throw "$Name failed with exit code $($process.ExitCode). Stdout: $stdout; stderr: $stderr"
  }

  $outputLines = @(
    Get-Content -LiteralPath $stdout
    Get-Content -LiteralPath $stderr
  )

  foreach ($requiredLine in $RequiredLines) {
    if ($outputLines -cnotcontains $requiredLine) {
      throw "$Name exited 0 but did not emit required evidence: $requiredLine. Stdout: $stdout; stderr: $stderr"
    }
  }

  foreach ($requiredLine in $RequiredLines) {
    Write-Output $requiredLine
  }

  Write-Output "$Name VERIFIED"
}

try {
  Invoke-Harness -Name 'PILOT_CONFIG' `
    -ScriptPath (Join-Path $PSScriptRoot 'verify-lm-cat-filter-50ab.ps1') `
    -RequiredLines @('LM50AB_TESTS=8/8 PASS', 'LM50AB_CLEANUP=PASS')

  Write-Output 'LM50AB_ALL_TESTS=PASS'
} catch {
  Write-Error $_
  exit 1
} finally {
  if (Test-Path $runRoot) {
    Remove-Item -LiteralPath $runRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
