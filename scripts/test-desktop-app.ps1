param(
    [string]$AppPath = "dist-desktop\StealthSync\StealthSync.exe",
    [string]$ServiceUrl = $env:STEALTHSYNC_DESKTOP_URL,
    [int]$TimeoutSeconds = 90
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($ServiceUrl)) {
    throw "Provide -ServiceUrl https://<production-frontend-host> or set STEALTHSYNC_DESKTOP_URL."
}
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ResolvedApp = if ([System.IO.Path]::IsPathRooted($AppPath)) {
    (Resolve-Path -LiteralPath $AppPath).Path
} else {
    (Resolve-Path -LiteralPath (Join-Path $Root $AppPath)).Path
}
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$process = $null
$desktopProcessesBefore = @()

function Get-BackendJavaProcesses {
    @(Get-CimInstance Win32_Process -Filter "Name = 'java.exe' OR Name = 'javaw.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -match 'stealthsync-backend|spring\.profiles\.active=desktop|jdbc:h2' } |
        Select-Object -ExpandProperty ProcessId)
}

function Get-DesktopProcesses {
    @(Get-Process -Name "StealthSync" -ErrorAction SilentlyContinue |
        Where-Object { $_.Path -eq $ResolvedApp })
}

$backendBefore = Get-BackendJavaProcesses
$desktopProcessesBefore = @(Get-DesktopProcesses | Select-Object -ExpandProperty Id)
try {
    $status = (Invoke-WebRequest -UseBasicParsing -Uri $ServiceUrl -TimeoutSec 20).StatusCode
    if ($status -ne 200) { throw "Shared service returned HTTP $status." }

    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $ResolvedApp
    $startInfo.UseShellExecute = $false
    $startInfo.Environment["STEALTHSYNC_DESKTOP_URL"] = $ServiceUrl
    $process = [System.Diagnostics.Process]::Start($startInfo)

    $windowReady = $false
    do {
        Start-Sleep -Seconds 1
        $windowProcess = Get-DesktopProcesses |
            Where-Object { $_.Id -notin $desktopProcessesBefore -and $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -eq "StealthSync" } |
            Select-Object -First 1
        $windowReady = $null -ne $windowProcess
    } while (-not $windowReady -and (Get-Date) -lt $deadline)
    if (-not $windowReady) { throw "StealthSync window did not appear within $TimeoutSeconds seconds." }

    $duplicate = Start-Process -FilePath $ResolvedApp -PassThru -WindowStyle Hidden
    if (-not $duplicate.WaitForExit(8000)) {
        Stop-Process -Id $duplicate.Id -Force -ErrorAction SilentlyContinue
        throw "A second desktop launch did not exit after focusing the existing window."
    }

    $backendAfter = Get-BackendJavaProcesses
    $newBackendProcesses = @($backendAfter | Where-Object { $_ -notin $backendBefore })
    if ($newBackendProcesses.Count -gt 0) {
        throw "Desktop client started a forbidden local backend process: $($newBackendProcesses -join ', ')"
    }

    $newDesktopProcessIds = @(Get-DesktopProcesses |
        Where-Object { $_.Id -notin $desktopProcessesBefore } |
        Select-Object -ExpandProperty Id)
    $localListener = Get-NetTCPConnection -State Listen -LocalPort 8080 -ErrorAction SilentlyContinue |
        Where-Object { $_.OwningProcess -in $newDesktopProcessIds }
    if ($localListener) {
        throw "Desktop client unexpectedly opened a local port 8080 listener."
    }

    Write-Host "Desktop smoke test passed: native window, shared service, single instance, and no local backend/H2."
}
finally {
    Get-DesktopProcesses |
        Where-Object { $_.Id -notin $desktopProcessesBefore } |
        Stop-Process -Force -ErrorAction SilentlyContinue
}
