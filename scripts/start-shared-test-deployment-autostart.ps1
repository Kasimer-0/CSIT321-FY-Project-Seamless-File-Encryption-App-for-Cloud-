param(
    [ValidateRange(15, 3600)]
    [int]$IntervalSeconds = 60
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$runDirectory = Join-Path $repoRoot ".stealthsync-run"
$logDirectory = Join-Path $runDirectory "logs"
$logFile = Join-Path $logDirectory "autostart.log"
$disabledMarker = Join-Path $runDirectory "shared-deployment.disabled"
$tunnelPidFile = Join-Path $runDirectory "devtunnel.pid"
$startScript = Join-Path $PSScriptRoot "start-shared-test-deployment.ps1"
$composeFile = Join-Path $repoRoot "docker-compose.production.yml"
$environmentFile = Join-Path $repoRoot ".env.production"
$mutex = New-Object System.Threading.Mutex($false, "Local\StealthSyncSharedDeploymentSupervisor")

New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

function Rotate-Log {
    if ((Test-Path -LiteralPath $logFile) -and (Get-Item -LiteralPath $logFile).Length -ge 5MB) {
        $archive = Join-Path $logDirectory ("autostart-{0}.log" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
        Move-Item -LiteralPath $logFile -Destination $archive
    }
}

function Write-SupervisorLog([string]$Message) {
    Rotate-Log
    "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" |
        Out-File -LiteralPath $logFile -Append -Encoding UTF8
}

function Resolve-DockerCli {
    $command = Get-Command docker -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    $fallback = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
    if (Test-Path -LiteralPath $fallback) { return $fallback }
    return $null
}

function Test-DockerEngine {
    if (-not $script:docker) { return $false }
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        & $script:docker info *> $null
        return $LASTEXITCODE -eq 0
    }
    catch {
        return $false
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
}

function Get-ComposeContainerId([string]$Service) {
    if (-not $script:docker) { return $null }
    return (& $script:docker compose -f $composeFile --env-file $environmentFile ps -a -q $Service 2>$null |
        Out-String).Trim()
}

function Test-Containers {
    if (-not (Test-DockerEngine)) { return $false }
    $databaseContainer = Get-ComposeContainerId "database"
    $appContainer = Get-ComposeContainerId "app"
    if (-not $databaseContainer -or -not $appContainer) { return $false }

    $databaseState = (& $script:docker inspect -f `
        "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}" `
        $databaseContainer 2>$null | Out-String).Trim()
    $appState = (& $script:docker inspect -f "{{.State.Status}}" $appContainer 2>$null | Out-String).Trim()
    return $databaseState -eq "healthy" -and $appState -eq "running"
}

function Test-LocalApplication {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:8080" -TimeoutSec 5
        return $response.StatusCode -eq 200 -and $response.Content -match "STEALTHSYNC|StealthSync|encryption-app"
    }
    catch {
        return $false
    }
}

function Get-PublicUrl {
    if (-not (Test-Path -LiteralPath $environmentFile)) { return $null }
    $line = Get-Content -LiteralPath $environmentFile |
        Where-Object { $_ -match "^STEALTHSYNC_FRONTEND_URL=" } |
        Select-Object -Last 1
    if (-not $line) { return $null }
    return ($line -split "=", 2)[1].Trim()
}

function Test-PublicApplication {
    $publicUrl = Get-PublicUrl
    if (-not $publicUrl) { return $false }
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $publicUrl -TimeoutSec 10 `
            -Headers @{ "X-Tunnel-Skip-AntiPhishing-Page" = "true" }
        return $response.StatusCode -eq 200 -and $response.Content -match "STEALTHSYNC|StealthSync|encryption-app"
    }
    catch {
        $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
        if (-not $curl) { return $false }
        $previousPreference = $ErrorActionPreference
        try {
            $ErrorActionPreference = "Continue"
            $content = (& $curl.Source -k -sS -L --max-time 10 `
                -H "X-Tunnel-Skip-AntiPhishing-Page: true" $publicUrl 2>$null | Out-String)
            return $LASTEXITCODE -eq 0 -and $content -match "STEALTHSYNC|StealthSync|encryption-app"
        }
        finally {
            $ErrorActionPreference = $previousPreference
        }
    }
}

function Test-TunnelHost {
    if (-not (Test-Path -LiteralPath $tunnelPidFile)) { return $false }
    $tunnelPid = Get-Content -LiteralPath $tunnelPidFile -ErrorAction SilentlyContinue
    return $tunnelPid -and $null -ne (Get-Process -Id $tunnelPid -ErrorAction SilentlyContinue)
}

function Reset-TunnelHost {
    if (-not (Test-Path -LiteralPath $tunnelPidFile)) { return }
    $tunnelPid = Get-Content -LiteralPath $tunnelPidFile -ErrorAction SilentlyContinue
    if ($tunnelPid) {
        Stop-Process -Id $tunnelPid -Force -ErrorAction SilentlyContinue
    }
    Remove-Item -LiteralPath $tunnelPidFile -Force -ErrorAction SilentlyContinue
}

function Invoke-DeploymentRecovery([string]$Reason) {
    Write-SupervisorLog "Recovery requested: $Reason"
    $startupOutput = (& $startScript -SkipBuild -NonInteractive | Out-String)
    if ($startupOutput.Trim()) {
        $startupOutput.TrimEnd() | Out-File -LiteralPath $logFile -Append -Encoding UTF8
    }
    Write-SupervisorLog "Recovery completed successfully."
}

$hasMutex = $false
try {
    $hasMutex = $mutex.WaitOne(0, $false)
    if (-not $hasMutex) {
        Write-SupervisorLog "Another health supervisor is already running; this instance is exiting."
        exit 0
    }

    Write-SupervisorLog "Shared deployment health supervisor started."
    $script:docker = Resolve-DockerCli
    $publicFailureCount = 0
    $lastHeartbeat = [DateTime]::MinValue

    while ($true) {
        if (Test-Path -LiteralPath $disabledMarker) {
            Write-SupervisorLog "Disabled marker detected; health supervisor stopped normally."
            break
        }

        $containersHealthy = Test-Containers
        $localHealthy = $containersHealthy -and (Test-LocalApplication)
        $tunnelHealthy = Test-TunnelHost
        $publicHealthy = $false
        if ($localHealthy -and $tunnelHealthy) {
            $publicHealthy = Test-PublicApplication
        }

        if ($publicHealthy) {
            $publicFailureCount = 0
        }
        elseif ($localHealthy -and $tunnelHealthy) {
            $publicFailureCount++
        }

        $reason = $null
        if (-not $containersHealthy) {
            $reason = "Docker containers are not healthy."
        }
        elseif (-not $localHealthy) {
            $reason = "The local application health check failed."
        }
        elseif (-not $tunnelHealthy) {
            $reason = "The Dev Tunnel host is not running."
        }
        elseif ($publicFailureCount -ge 3) {
            $reason = "The public HTTPS check failed three consecutive times."
            Reset-TunnelHost
        }

        if ($reason) {
            try {
                $script:docker = Resolve-DockerCli
                Invoke-DeploymentRecovery $reason
                $publicFailureCount = 0
            }
            catch {
                Write-SupervisorLog "Recovery failed: $($_.Exception.Message)"
            }
        }

        if (((Get-Date) - $lastHeartbeat).TotalMinutes -ge 15) {
            Write-SupervisorLog (
                "Heartbeat: containers={0}, local={1}, tunnel={2}, public={3}." -f `
                    $containersHealthy, $localHealthy, $tunnelHealthy, $publicHealthy
            )
            $lastHeartbeat = Get-Date
        }

        Start-Sleep -Seconds $IntervalSeconds
    }
}
catch {
    Write-SupervisorLog "Health supervisor terminated unexpectedly: $($_.Exception.Message)"
    exit 1
}
finally {
    if ($hasMutex) {
        $mutex.ReleaseMutex()
    }
    $mutex.Dispose()
}
