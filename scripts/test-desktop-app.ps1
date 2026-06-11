param(
    [string]$AppPath = "dist-desktop\StealthSync\StealthSync.exe",
    [int]$Port = 18080,
    [int]$TimeoutSeconds = 90
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
$TestHome = Join-Path $Root "Back-end\target\desktop-smoke-home"

if (Test-Path -LiteralPath $TestHome) {
    Remove-Item -LiteralPath $TestHome -Recurse -Force
}
New-Item -ItemType Directory -Path $TestHome | Out-Null

function Test-Login($Username, $Password, $ExpectedRole) {
    $Body = @{
        usernameOrEmail = $Username
        password = $Password
    } | ConvertTo-Json
    $Response = Invoke-RestMethod `
        -Uri "http://127.0.0.1:$Port/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $Body `
        -TimeoutSec 5
    return $Response.user.role -eq $ExpectedRole
}

try {
    Write-Host "Starting desktop smoke test: $ResolvedApp"
    $StartInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $StartInfo.FileName = $ResolvedApp.Path
    $StartInfo.UseShellExecute = $false
    $StartInfo.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Normal
    $StartInfo.Environment["JAVA_TOOL_OPTIONS"] = "-Duser.home=$TestHome"
    $Process = [System.Diagnostics.Process]::Start($StartInfo)

    $ServiceReady = $false
    $WindowReady = $false
    $CredentialsReady = $false

    do {
        Start-Sleep -Seconds 1
        if ($Process.HasExited) {
            throw "Desktop application exited before becoming ready. Exit code: $($Process.ExitCode)"
        }

        try {
            $Response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/" -UseBasicParsing -TimeoutSec 2
            if ($Response.StatusCode -eq 200) {
                $ServiceReady = $true
            }
        }
        catch {
            # The service may still be starting.
        }

        $DesktopProcesses = Get-Process -Name "StealthSync" -ErrorAction SilentlyContinue
        $WindowReady = [bool]($DesktopProcesses | Where-Object {
            $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -eq "StealthSync"
        })

        if ($ServiceReady -and -not $CredentialsReady) {
            try {
                $AdminLoginWorks = Test-Login "admin" "Admin@123" "admin"
                $CustomerLoginWorks = Test-Login "testuser" "User@123" "customer"
                $CredentialsReady = $AdminLoginWorks -and $CustomerLoginWorks
            }
            catch {
                # Data seeding may still be completing.
            }
        }

        if ($ServiceReady -and $WindowReady -and $CredentialsReady) {
                Write-Host "Desktop smoke test passed: service, native window, and test credentials are ready."
                exit 0
        }
    } while ((Get-Date) -lt $Deadline)

    throw "Desktop application did not pass all checks within $TimeoutSeconds seconds. ServiceReady=$ServiceReady WindowReady=$WindowReady CredentialsReady=$CredentialsReady"
}
finally {
    if ($Process -and -not $Process.HasExited) {
        Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
    }
    Get-Process -Name "StealthSync" -ErrorAction SilentlyContinue |
        Where-Object { $_.Path -eq $ResolvedApp.Path } |
        Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
    if (Test-Path -LiteralPath $TestHome) {
        Remove-Item -LiteralPath $TestHome -Recurse -Force -ErrorAction SilentlyContinue
    }
}
