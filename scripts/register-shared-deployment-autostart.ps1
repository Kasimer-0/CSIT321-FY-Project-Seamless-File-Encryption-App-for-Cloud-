param(
    [switch]$Unregister
)

$ErrorActionPreference = "Stop"
$taskName = "StealthSync Shared Deployment"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$autostartScript = Join-Path $PSScriptRoot "start-shared-test-deployment-autostart.ps1"
$powerStateDirectory = Join-Path $repoRoot ".stealthsync-run"
$powerStateFile = Join-Path $powerStateDirectory "power-settings-before-autostart.txt"

if ($Unregister) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Removed scheduled task: $taskName" -ForegroundColor Yellow
    exit 0
}

New-Item -ItemType Directory -Path $powerStateDirectory -Force | Out-Null
if (-not (Test-Path -LiteralPath $powerStateFile)) {
    powercfg.exe /query SCHEME_CURRENT SUB_SLEEP STANDBYIDLE |
        Out-File -LiteralPath $powerStateFile -Encoding UTF8
}

# Keep the host available while plugged in. Battery sleep and display timeout remain unchanged.
powercfg.exe /change standby-timeout-ac 0
if ($LASTEXITCODE -ne 0) {
    throw "Unable to disable AC sleep for the shared deployment host."
}

$powerShell = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$action = New-ScheduledTaskAction -Execute $powerShell -Argument (
    "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$autostartScript`""
)
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $identity
$trigger.Delay = "PT1M"
$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -MultipleInstances IgnoreNew `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 2) `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

function Register-TaskForRunLevel([string]$RunLevel) {
    $principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel $RunLevel
    $task = New-ScheduledTask -Action $action -Trigger $trigger -Principal $principal -Settings $settings
    Register-ScheduledTask -TaskName $taskName -InputObject $task -Force -ErrorAction Stop | Out-Null
}

$registeredRunLevel = "Highest"
try {
    Register-TaskForRunLevel "Highest"
}
catch {
    # Docker Desktop and Dev Tunnels run in the signed-in user's session, so a
    # limited task remains functional when this setup script is not elevated.
    $registeredRunLevel = "Limited"
    Register-TaskForRunLevel "Limited"
}

Write-Host "Registered scheduled task: $taskName" -ForegroundColor Green
Write-Host "Trigger: current user logon with a 60-second delay"
Write-Host "Run level: $registeredRunLevel"
Write-Host "Log: $(Join-Path $repoRoot '.stealthsync-run\logs\autostart.log')"
