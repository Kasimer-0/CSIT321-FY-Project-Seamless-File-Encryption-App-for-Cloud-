param(
    [switch]$Stop,
    [switch]$SkipBuild,
    [switch]$NonInteractive
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$composeFile = Join-Path $repoRoot "docker-compose.production.yml"
$environmentFile = Join-Path $repoRoot ".env.production"
$runDirectory = Join-Path $repoRoot ".stealthsync-run"
$logDirectory = Join-Path $runDirectory "logs"
$tunnelPidFile = Join-Path $runDirectory "devtunnel.pid"
$tunnelIdFile = Join-Path $runDirectory "devtunnel.id"
$preferredTunnelId = "stealthsync-fyp-kasimer-2026"
$tunnelId = $preferredTunnelId
$publicUrl = $null
$script:LastPublicValidationError = ""
$script:LastPublicValidationIsTransportError = $false

function Resolve-DockerCli {
    $command = Get-Command docker -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    $fallback = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
    if (Test-Path -LiteralPath $fallback) { return $fallback }
    throw "Docker CLI is not installed."
}

function Resolve-DevTunnelCli {
    $command = Get-Command devtunnel -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    $candidate = Get-ChildItem `
        "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Microsoft.devtunnel_*\devtunnel.exe" `
        -Force -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($candidate) { return $candidate.FullName }
    throw "Microsoft Dev Tunnels CLI is not installed."
}

function Test-LocalApplication {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:8080" -TimeoutSec 5
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Test-PublicApplication {
    $previousCertificateCallback = $null
    try {
        $script:LastPublicValidationError = ""
        $script:LastPublicValidationIsTransportError = $false
        $requestArguments = @{
            UseBasicParsing = $true
            Uri = $publicUrl
            TimeoutSec = 5
            Headers = @{ "X-Tunnel-Skip-AntiPhishing-Page" = "true" }
        }

        if ($PSVersionTable.PSVersion.Major -ge 6) {
            $requestArguments["SkipCertificateCheck"] = $true
        } else {
            $previousCertificateCallback = [System.Net.ServicePointManager]::ServerCertificateValidationCallback
            [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
        }

        $response = Invoke-WebRequest @requestArguments
        $isExpectedPage = $response.StatusCode -eq 200 -and
            $response.Content -match "STEALTHSYNC|StealthSync|encryption-app"
        if (-not $isExpectedPage) {
            $script:LastPublicValidationError = "The tunnel returned HTTP $($response.StatusCode), but the page content did not contain the expected StealthSync marker."
        }
        return $isExpectedPage
    } catch {
        $script:LastPublicValidationError = $_.Exception.Message
        $script:LastPublicValidationIsTransportError =
            $_.Exception -is [System.Net.WebException] -or
            $_.Exception.GetType().FullName -eq "System.Net.Http.HttpRequestException"

        # Windows PowerShell and Chromium can use different TLS/proxy stacks.
        # A curl fallback avoids reporting a false warning when the browser path
        # is healthy but Invoke-WebRequest rejects local HTTPS inspection.
        $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
        if ($curl) {
            $previousPreference = $ErrorActionPreference
            try {
                $ErrorActionPreference = "Continue"
                $curlContent = (& $curl.Source -k -sS -L --max-time 10 `
                    -H "X-Tunnel-Skip-AntiPhishing-Page: true" $publicUrl 2>$null | Out-String)
                if ($LASTEXITCODE -eq 0 -and
                    $curlContent -match "STEALTHSYNC|StealthSync|encryption-app") {
                    $script:LastPublicValidationError = ""
                    $script:LastPublicValidationIsTransportError = $false
                    return $true
                }
            } finally {
                $ErrorActionPreference = $previousPreference
            }
        }
        return $false
    } finally {
        if ($PSVersionTable.PSVersion.Major -lt 6) {
            [System.Net.ServicePointManager]::ServerCertificateValidationCallback = $previousCertificateCallback
        }
    }
}

function Get-DevTunnelLogSummary {
    $messages = @()
    foreach ($path in @(
        (Join-Path $logDirectory "devtunnel.err.log"),
        (Join-Path $logDirectory "devtunnel.out.log")
    )) {
        if (Test-Path -LiteralPath $path) {
            $rawContent = Get-Content -LiteralPath $path -Raw -ErrorAction SilentlyContinue
            if ($null -eq $rawContent) {
                continue
            }

            $content = $rawContent.Trim()
            if ($content) {
                $messages += $content
            }
        }
    }
    return ($messages -join "`n")
}

function Get-PublicValidationFailureMessage {
    $details = Get-DevTunnelLogSummary
    $guidance = @(
        "The local app is running on http://localhost:8080, but the public Dev Tunnel URL did not validate.",
        "Public URL: $publicUrl"
    )

    if ($details -match "Login token expired") {
        $guidance += "GitHub Dev Tunnels login has expired. The script should start device-code login automatically; sign in as Kasimer-0, then let the script continue."
    }

    if ($details -match "older version of the devtunnel CLI") {
        $guidance += "The Dev Tunnels CLI is outdated. Update it with 'winget upgrade Microsoft.devtunnel' or reinstall it."
    }

    if ($script:LastPublicValidationError -match "certificate|SSL|trust|authority|authentication|secure channel") {
        $guidance += "PowerShell could not trust the tunnel HTTPS certificate. If Edge shows NET::ERR_CERT_AUTHORITY_INVALID with Fortinet, install/trust the Fortinet inspection certificate or use a network without HTTPS inspection."
    }

    if ($script:LastPublicValidationError) {
        $guidance += "PowerShell validation error: $script:LastPublicValidationError"
    }

    if ($details) {
        $guidance += "Dev Tunnel log:`n$details"
    }

    return ($guidance -join "`n")
}

function Test-PublicValidationBlockedByLocalTls {
    return $script:LastPublicValidationIsTransportError -or
        $script:LastPublicValidationError -match (
        "certificate|SSL|trust|authority|secure channel|underlying connection|" +
        "request was aborted"
    )
}

function Test-DevTunnelLoggedIn {
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $output = (& $devTunnel user show 2>&1 | Out-String).Trim()
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }

    if ($output -match "Login token expired|not logged in|not logged-in|no user|login required") {
        $script:LastDevTunnelLoginStatus = $output
        return $false
    }

    if ($exitCode -ne 0) {
        $script:LastDevTunnelLoginStatus = $output
        return $false
    }

    if ($output -notmatch "using GitHub") {
        $script:LastDevTunnelLoginStatus =
            "$output`nThe persistent StealthSync tunnel is owned by GitHub account Kasimer-0."
        return $false
    }

    $script:LastDevTunnelLoginStatus = $output
    return $true
}

function Ensure-DevTunnelLogin {
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        if (Test-DevTunnelLoggedIn) {
            return
        }

        if ($NonInteractive) {
            throw "GitHub Dev Tunnels login is missing or expired. Run scripts/start-shared-test-deployment.ps1 interactively once to restore the Kasimer-0 login."
        }

        Write-Host "The required GitHub Dev Tunnels login is missing, expired, or not selected." -ForegroundColor Yellow
        if ($script:LastDevTunnelLoginStatus) {
            Write-Host $script:LastDevTunnelLoginStatus -ForegroundColor DarkYellow
        }
        Write-Host "Starting GitHub device-code login. Sign in as Kasimer-0; the script will continue automatically." -ForegroundColor Cyan

        & $devTunnel user login --github --use-device-code-auth

        if (Test-DevTunnelLoggedIn) {
            return
        }

        if ($attempt -lt 3) {
            Read-Host "If the GitHub login page is still open, finish it now, then press Enter to continue"
        }
    }

    throw "GitHub Dev Tunnels login is still not valid. Run 'devtunnel user login --github --use-device-code-auth', sign in as Kasimer-0, then run this script again."
}

function Invoke-DevTunnelCommand {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)

    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $output = (& $devTunnel @Arguments 2>&1 | Out-String).Trim()
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }

    return [PSCustomObject]@{
        Output = $output
        ExitCode = $exitCode
    }
}

function Ensure-DevTunnel {
    $script:tunnelId = $preferredTunnelId
    $showResult = Invoke-DevTunnelCommand -Arguments @("show", $tunnelId, "--json")
    if ($showResult.ExitCode -ne 0) {
        throw "The persistent tunnel '$tunnelId' is unavailable to the current login. Sign in as GitHub user Kasimer-0 and retry.`n$($showResult.Output)"
    }

    try {
        $tunnelState = $showResult.Output | ConvertFrom-Json
        $hasApplicationPort = @($tunnelState.tunnel.ports) |
            Where-Object { $_.portNumber -eq 8080 }
    } catch {
        throw "Dev Tunnel details were not valid JSON.`n$($showResult.Output)"
    }

    if (-not $hasApplicationPort) {
        $portResult = Invoke-DevTunnelCommand -Arguments @(
            "port", "create", $tunnelId, "--port-number", "8080", "--protocol", "http"
        )
        if ($portResult.ExitCode -ne 0) {
            throw "Unable to add port 8080 to Dev Tunnel '$tunnelId'.`n$($portResult.Output)"
        }
    }

    Set-Content -LiteralPath $tunnelIdFile -Value $tunnelId -Encoding ASCII
}

function Get-PublicUrlFromDevTunnelLogs {
    $details = Get-DevTunnelLogSummary
    if ($details -match "https://[a-zA-Z0-9-]+-8080\.[a-zA-Z0-9-]+\.devtunnels\.ms") {
        return $Matches[0]
    }
    return $null
}

function Start-DevTunnelHost {
    Stop-StaleDevTunnelProcess

    # Restart the tracked host on every run so a previous login or tunnel ID
    # cannot leave the script validating a stale public URL.
    if (Test-Path -LiteralPath $tunnelPidFile) {
        $existingPid = Get-Content -LiteralPath $tunnelPidFile -ErrorAction SilentlyContinue
        if ($existingPid) {
            Stop-Process -Id $existingPid -Force -ErrorAction SilentlyContinue
        }
        Remove-Item -LiteralPath $tunnelPidFile -Force -ErrorAction SilentlyContinue
    }

    Reset-DevTunnelLogs
    $stdout = Join-Path $logDirectory "devtunnel.out.log"
    $stderr = Join-Path $logDirectory "devtunnel.err.log"
    $process = Start-Process -FilePath $devTunnel `
        -ArgumentList @("host", $tunnelId) `
        -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    Set-Content -LiteralPath $tunnelPidFile -Value $process.Id -Encoding ASCII

    Write-Host "Waiting for the Dev Tunnel public URL..." -ForegroundColor Cyan
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        $detectedUrl = Get-PublicUrlFromDevTunnelLogs
        if ($detectedUrl) {
            $script:publicUrl = $detectedUrl
            return
        }
        if ($process -and $process.HasExited) {
            throw (Get-PublicValidationFailureMessage)
        }
        Start-Sleep -Seconds 1
    }

    throw (Get-PublicValidationFailureMessage)
}

function Update-DeploymentPublicUrl {
    $content = Get-Content -LiteralPath $environmentFile -Raw
    $settings = [ordered]@{
        STEALTHSYNC_FRONTEND_URL = $publicUrl
        STEALTHSYNC_ALLOWED_ORIGINS = $publicUrl
        GOOGLE_DRIVE_REDIRECT_URI = "$publicUrl/cloud-storage/google-drive/callback"
        DROPBOX_REDIRECT_URI = "$publicUrl/cloud-storage/dropbox/callback"
        ONEDRIVE_REDIRECT_URI = "$publicUrl/cloud-storage/onedrive/callback"
    }

    foreach ($setting in $settings.GetEnumerator()) {
        $pattern = "(?m)^$([regex]::Escape($setting.Key))=.*$"
        $line = "$($setting.Key)=$($setting.Value)"
        if ($content -match $pattern) {
            $content = [regex]::Replace($content, $pattern, $line)
        } else {
            $content = $content.TrimEnd() + [Environment]::NewLine + $line + [Environment]::NewLine
        }
    }

    Set-Content -LiteralPath $environmentFile -Value $content -NoNewline
}

function Reset-DevTunnelLogs {
    foreach ($path in @(
        (Join-Path $logDirectory "devtunnel.err.log"),
        (Join-Path $logDirectory "devtunnel.out.log")
    )) {
        if (Test-Path -LiteralPath $path) {
            Clear-Content -LiteralPath $path -ErrorAction SilentlyContinue
        }
    }
}

function Stop-StaleDevTunnelProcess {
    if (-not (Test-Path -LiteralPath $tunnelPidFile)) {
        return
    }

    $existingPid = Get-Content -LiteralPath $tunnelPidFile -ErrorAction SilentlyContinue
    if (-not $existingPid) {
        Remove-Item -LiteralPath $tunnelPidFile -Force -ErrorAction SilentlyContinue
        return
    }

    $existingProcess = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
    if (-not $existingProcess) {
        Remove-Item -LiteralPath $tunnelPidFile -Force -ErrorAction SilentlyContinue
    }
}

function Test-DockerEngine {
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        & $docker info *> $null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    } finally {
        $ErrorActionPreference = $previousPreference
    }
}

New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
$docker = Resolve-DockerCli
$devTunnel = Resolve-DevTunnelCli

if ($Stop) {
    if (Test-Path -LiteralPath $tunnelPidFile) {
        $tunnelPid = Get-Content -LiteralPath $tunnelPidFile -ErrorAction SilentlyContinue
        if ($tunnelPid) {
            Stop-Process -Id $tunnelPid -Force -ErrorAction SilentlyContinue
        }
        Remove-Item -LiteralPath $tunnelPidFile -Force -ErrorAction SilentlyContinue
    }
    & $docker compose -f $composeFile --env-file $environmentFile stop
    Write-Host "StealthSync shared test deployment stopped." -ForegroundColor Yellow
    exit 0
}

if (-not (Test-Path -LiteralPath $environmentFile)) {
    throw ".env.production is missing. Create it from .env.production.example without committing it."
}

Ensure-DevTunnelLogin
Ensure-DevTunnel
Start-DevTunnelHost
Update-DeploymentPublicUrl

if (-not (Test-DockerEngine)) {
    $desktop = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (-not (Test-Path -LiteralPath $desktop)) {
        throw "Docker Desktop is not installed."
    }
    Start-Process -FilePath $desktop -WindowStyle Hidden
    Write-Host "Waiting for Docker Desktop..." -ForegroundColor Cyan
    $dockerReady = $false
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        Start-Sleep -Seconds 2
        if (Test-DockerEngine) {
            $dockerReady = $true
            break
        }
    }
    if (-not $dockerReady) {
        throw "Docker Desktop did not become ready. Complete its first-run setup or restart Windows."
    }
}

$composeArguments = @("compose", "-f", $composeFile, "--env-file", $environmentFile, "up", "-d")
if (-not $SkipBuild) {
    $composeArguments += "--build"
}
& $docker @composeArguments
if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose failed to start StealthSync."
}

Write-Host "Waiting for StealthSync on localhost:8080..." -ForegroundColor Cyan
$localReady = $false
for ($attempt = 0; $attempt -lt 60; $attempt++) {
    if (Test-LocalApplication) {
        $localReady = $true
        break
    }
    Start-Sleep -Seconds 2
}
if (-not $localReady) {
    & $docker compose -f $composeFile --env-file $environmentFile logs --tail 100 app
    throw "StealthSync did not become ready on localhost:8080."
}

Write-Host "Waiting for the public HTTPS tunnel..." -ForegroundColor Cyan
$publicReady = $false
for ($attempt = 0; $attempt -lt 5; $attempt++) {
    if (Test-PublicApplication) {
        $publicReady = $true
        break
    }
    Start-Sleep -Seconds 2
}
if (-not $publicReady) {
    if (Test-PublicValidationBlockedByLocalTls) {
        Write-Warning "The tunnel is hosting correctly, but this computer's HTTPS inspection blocked the public-page check: $script:LastPublicValidationError"
        Write-Warning "The deployment remains running. Use a device or network where devtunnels.ms is not blocked, or ask the network administrator to allow it."
    } else {
        throw (Get-PublicValidationFailureMessage)
    }
}

Write-Host ""
Write-Host "StealthSync shared test deployment is ready." -ForegroundColor Green
Write-Host "Public URL: $publicUrl"
Write-Host "Google callback: $publicUrl/cloud-storage/google-drive/callback"
Write-Host "Dropbox callback: $publicUrl/cloud-storage/dropbox/callback"
Write-Host "OneDrive callback: $publicUrl/cloud-storage/onedrive/callback"
Write-Host ""
Write-Host "The first browser visit may show a Microsoft anti-phishing page. Click Continue once." -ForegroundColor Yellow
