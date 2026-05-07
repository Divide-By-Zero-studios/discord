$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$startupScript = Join-Path $PSScriptRoot 'start-hermes-endpoint.ps1'
$taskName = 'HermesBotEndpoint'

function Test-Command {
  param([Parameter(Mandatory = $true)][string] $Name)
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Update-ProcessPath {
  $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = "$machinePath;$userPath"
}

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string] $Name,
    [Parameter(Mandatory = $true)][scriptblock] $Action
  )

  Write-Host "==> $Name"
  & $Action
}

function Ensure-Node {
  if ((Test-Command 'node.exe') -and (Test-Command 'npm.cmd') -and (Test-Command 'npx.cmd')) {
    Write-Host 'Node.js, npm, and npx are already installed.'
    return
  }

  if (-not (Test-Command 'winget.exe')) {
    throw 'Node.js is required, but winget.exe is not available to install it automatically. Install Node.js LTS from https://nodejs.org, then rerun this script.'
  }

  & winget.exe install --id OpenJS.NodeJS.LTS --exact --accept-package-agreements --accept-source-agreements
  Update-ProcessPath

  if (-not ((Test-Command 'node.exe') -and (Test-Command 'npm.cmd') -and (Test-Command 'npx.cmd'))) {
    throw 'Node.js installation finished, but node/npm/npx are not available on PATH yet. Open a new PowerShell window and rerun this script.'
  }
}

function Ensure-LocalTunnel {
  if ((Test-Command 'lt.cmd') -or (Test-Command 'lt')) {
    Write-Host 'localtunnel is already installed.'
    return
  }

  $npm = (Get-Command 'npm.cmd' -ErrorAction Stop).Source
  Write-Host 'Running: npm install -g localtunnel'
  & $npm install -g localtunnel
  Update-ProcessPath

  if (-not ((Test-Command 'lt.cmd') -or (Test-Command 'lt'))) {
    throw 'localtunnel installed, but lt is not available on PATH yet. Open a new PowerShell window and rerun this script.'
  }
}

function Ensure-ProjectDependencies {
  Push-Location $repoRoot
  try {
    $npm = (Get-Command 'npm.cmd' -ErrorAction Stop).Source
    if (Test-Path (Join-Path $repoRoot 'package-lock.json')) {
      & $npm ci
    } else {
      & $npm install
    }
  } finally {
    Pop-Location
  }
}

function Ensure-EnvFile {
  $envPath = Join-Path $repoRoot '.env'
  $examplePath = Join-Path $repoRoot '.env.example'

  if (Test-Path $envPath) {
    Write-Host '.env already exists; leaving it unchanged.'
    return
  }

  if (-not (Test-Path $examplePath)) {
    throw '.env.example is missing.'
  }

  Copy-Item -Path $examplePath -Destination $envPath
  Write-Host 'Created .env from .env.example. Fill in Discord secrets before using linked roles or interactions.'
}

function Register-HermesStartupTask {
  if (-not (Test-Path $startupScript)) {
    throw "Startup script not found: $startupScript"
  }

  $shell = Get-Command 'pwsh.exe' -ErrorAction SilentlyContinue
  if (-not $shell) {
    $shell = Get-Command 'powershell.exe' -ErrorAction Stop
  }

  $action = New-ScheduledTaskAction `
    -Execute $shell.Source `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$startupScript`""
  $trigger = New-ScheduledTaskTrigger -AtLogOn
  $settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1)

  Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description 'Starts Hermes Bot local Discord endpoint and HTTPS tunnel at logon.' `
    -Force | Out-Null
}

Invoke-Step 'Checking Node.js prerequisites' { Ensure-Node }
Invoke-Step 'Installing localtunnel if missing' { Ensure-LocalTunnel }
Invoke-Step 'Installing project dependencies' { Ensure-ProjectDependencies }
Invoke-Step 'Preparing .env' { Ensure-EnvFile }
Invoke-Step 'Registering Windows startup task' { Register-HermesStartupTask }

Write-Host ''
Write-Host 'Hermes endpoint setup complete.'
Write-Host "Startup task: $taskName"
Write-Host 'Run now with: powershell -ExecutionPolicy Bypass -File scripts\start-hermes-endpoint.ps1'
