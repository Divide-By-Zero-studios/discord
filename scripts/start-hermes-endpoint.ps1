$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $repoRoot 'logs'
$subdomain = 'hermes-discord-divide-by-zero'

New-Item -ItemType Directory -Path $logDir -Force | Out-Null

function Test-PortListening {
  param([int] $Port)
  $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  return $null -ne $listener
}

function Stop-ExistingLocalTunnel {
  Get-CimInstance Win32_Process |
    Where-Object {
      $_.CommandLine -match 'localtunnel' -and
      $_.CommandLine -match $subdomain
    } |
    ForEach-Object {
      & cmd.exe /c "taskkill.exe /PID $($_.ProcessId) /T /F >NUL 2>NUL"
    }
}

Set-Location $repoRoot

if (-not (Test-PortListening -Port 3000)) {
  Start-Process `
    -FilePath 'npm.cmd' `
    -ArgumentList 'start' `
    -WorkingDirectory $repoRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDir 'hermes-server.out.log') `
    -RedirectStandardError (Join-Path $logDir 'hermes-server.err.log')

  Start-Sleep -Seconds 5
}

Stop-ExistingLocalTunnel

$localTunnel = Get-Command 'lt.cmd' -ErrorAction SilentlyContinue
if (-not $localTunnel) {
  $localTunnel = Get-Command 'lt' -ErrorAction SilentlyContinue
}

if ($localTunnel) {
  Start-Process `
    -FilePath $localTunnel.Source `
    -ArgumentList '--port', '3000', '--local-host', '127.0.0.1', '--subdomain', $subdomain `
    -WorkingDirectory $repoRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDir 'hermes-tunnel.out.log') `
    -RedirectStandardError (Join-Path $logDir 'hermes-tunnel.err.log')
} else {
  Start-Process `
    -FilePath 'npx.cmd' `
    -ArgumentList '--yes', 'localtunnel', '--port', '3000', '--local-host', '127.0.0.1', '--subdomain', $subdomain `
    -WorkingDirectory $repoRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDir 'hermes-tunnel.out.log') `
    -RedirectStandardError (Join-Path $logDir 'hermes-tunnel.err.log')
}
