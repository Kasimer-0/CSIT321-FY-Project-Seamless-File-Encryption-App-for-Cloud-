param(
    [string]$AppPath = "dist-desktop\StealthSync\StealthSync.exe",
    [int]$Port = 18080,
    [int]$TimeoutSeconds = 60
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$ResolvedApp = if ([System.IO.Path]::IsPathRooted($AppPath)) {
    Resolve-Path $AppPath
}
else {
    Resolve-Path (Join-Path $Root $AppPath)
}
$Deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$Process = $null

try {
    Write-Host "Starting desktop smoke test: $ResolvedApp"
    $StartInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $StartInfo.FileName = $ResolvedApp.Path
    $StartInfo.UseShellExecute = $true
    $StartInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
    $Process = [System.Diagnostics.Process]::Start($StartInfo)

    do {
        Start-Sleep -Seconds 1
        if ($Process.HasExited) {
            throw "Desktop application exited before becoming ready. Exit code: $($Process.ExitCode)"
        }

        try {
            $Response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/" -UseBasicParsing -TimeoutSec 2
            if ($Response.StatusCode -eq 200) {
                Write-Host "Desktop smoke test passed on port $Port."
                exit 0
            }
        }
        catch {
            # The service may still be starting.
        }
    } while ((Get-Date) -lt $Deadline)

    throw "Desktop application did not become ready within $TimeoutSeconds seconds."
}
finally {
    if ($Process -and -not $Process.HasExited) {
        Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
    }
    Get-Process -Name "StealthSync" -ErrorAction SilentlyContinue |
        Where-Object { $_.Path -eq $ResolvedApp.Path } |
        Stop-Process -Force -ErrorAction SilentlyContinue
}
