param(
    [string]$OutputRoot
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$composeFile = Join-Path $repoRoot "docker-compose.production.yml"
$environmentFile = Join-Path $repoRoot ".env.production"
$dateFolder = Get-Date -Format "yyyy-MM-dd"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

if (-not $OutputRoot) {
    $OutputRoot = Join-Path $repoRoot "outputs\release-backups\$dateFolder"
}
$backupDirectory = Join-Path $OutputRoot $timestamp

function Resolve-DockerCli {
    $command = Get-Command docker -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    $fallback = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
    if (Test-Path -LiteralPath $fallback) { return $fallback }
    throw "Docker CLI is not installed."
}

function Read-EnvironmentSetting([string]$Name, [string]$DefaultValue) {
    $line = Get-Content -LiteralPath $environmentFile |
        Where-Object { $_ -match "^$([regex]::Escape($Name))=" } |
        Select-Object -Last 1
    if (-not $line) { return $DefaultValue }
    return ($line -split "=", 2)[1]
}

function Invoke-Compose([string[]]$Arguments) {
    & $docker compose -f $composeFile --env-file $environmentFile @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Compose command failed: $($Arguments -join ' ')"
    }
}

if (-not (Test-Path -LiteralPath $environmentFile)) {
    throw ".env.production is missing."
}

$docker = Resolve-DockerCli
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null

$databaseName = Read-EnvironmentSetting "POSTGRES_DB" "stealthsync"
$databaseUser = Read-EnvironmentSetting "DB_USERNAME" ""
if ([string]::IsNullOrWhiteSpace($databaseUser)) {
    throw "DB_USERNAME is missing from .env.production."
}

$databaseContainer = (& $docker compose -f $composeFile --env-file $environmentFile ps -q database).Trim()
$appContainer = (& $docker compose -f $composeFile --env-file $environmentFile ps -q app).Trim()
if (-not $databaseContainer -or -not $appContainer) {
    throw "The shared app and database containers must exist before a release backup is created."
}

$appWasRunning = ((& $docker inspect -f "{{.State.Running}}" $appContainer).Trim() -eq "true")
$remoteDump = "/tmp/stealthsync-release-$timestamp.dump"
$databaseDump = Join-Path $backupDirectory "postgres.dump"
$vaultStaging = Join-Path $backupDirectory "vault"
$vaultArchive = Join-Path $backupDirectory "vault.zip"
$encryptedEnvironment = Join-Path $backupDirectory "environment.dpapi"

try {
    if ($appWasRunning) {
        Write-Host "Pausing the application while the paired database and vault backup is created..." -ForegroundColor Cyan
        Invoke-Compose -Arguments @("stop", "app")
    }

    & $docker exec $databaseContainer pg_dump -U $databaseUser -d $databaseName -Fc -f $remoteDump
    if ($LASTEXITCODE -ne 0) { throw "PostgreSQL dump failed." }

    $restoreList = (& $docker exec $databaseContainer pg_restore --list $remoteDump 2>&1 | Out-String)
    if ($LASTEXITCODE -ne 0 -or $restoreList -notmatch "TABLE DATA") {
        throw "PostgreSQL dump validation failed."
    }
    & $docker cp "${databaseContainer}:$remoteDump" $databaseDump
    if ($LASTEXITCODE -ne 0) { throw "Unable to copy the PostgreSQL dump to the backup directory." }

    New-Item -ItemType Directory -Path $vaultStaging | Out-Null
    & $docker cp "${appContainer}:/app/vault/." $vaultStaging
    if ($LASTEXITCODE -ne 0) { throw "Unable to copy the Vault volume to the backup directory." }

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory(
        $vaultStaging,
        $vaultArchive,
        [System.IO.Compression.CompressionLevel]::Optimal,
        $false
    )
    Remove-Item -LiteralPath $vaultStaging -Recurse -Force

    Add-Type -AssemblyName System.Security
    $environmentBytes = [System.IO.File]::ReadAllBytes($environmentFile)
    $entropy = [System.Text.Encoding]::UTF8.GetBytes("StealthSync production environment backup v1")
    $protectedBytes = [System.Security.Cryptography.ProtectedData]::Protect(
        $environmentBytes,
        $entropy,
        [System.Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    [System.IO.File]::WriteAllBytes($encryptedEnvironment, $protectedBytes)

    $archive = [System.IO.Compression.ZipFile]::OpenRead($vaultArchive)
    try {
        $vaultEntryCount = $archive.Entries.Count
    }
    finally {
        $archive.Dispose()
    }

    $readme = @"
StealthSync shared deployment backup
Created: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss K")

Files:
- postgres.dump: PostgreSQL custom-format dump validated with pg_restore --list.
- vault.zip: Files from the Docker Vault volume (entries at backup time: $vaultEntryCount).
- environment.dpapi: .env.production encrypted for the current Windows user with DPAPI.
- SHA256SUMS.txt: Integrity hashes for all three backup payloads.

Restore notes:
1. Restore environment.dpapi only as the same Windows user on this computer.
2. Restore postgres.dump into an empty PostgreSQL database with pg_restore.
3. Restore vault.zip into the Compose Vault volume before starting the app.
4. Never commit or share this directory because it contains recoverable deployment secrets.
"@
    Set-Content -LiteralPath (Join-Path $backupDirectory "RESTORE-README.txt") -Value $readme -Encoding UTF8

    $payloads = @($databaseDump, $vaultArchive, $encryptedEnvironment)
    $hashLines = foreach ($path in $payloads) {
        $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $path
        "$($hash.Hash.ToLowerInvariant())  $([System.IO.Path]::GetFileName($path))"
    }
    Set-Content -LiteralPath (Join-Path $backupDirectory "SHA256SUMS.txt") -Value $hashLines -Encoding ASCII
}
finally {
    & $docker exec $databaseContainer rm -f $remoteDump 2>$null | Out-Null
    if ($appWasRunning) {
        Invoke-Compose -Arguments @("up", "-d", "app")
    }
}

Write-Host "Verified shared deployment backup: $backupDirectory" -ForegroundColor Green
