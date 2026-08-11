[CmdletBinding()]
param(
    [string]$EnvironmentFile = (Join-Path $PSScriptRoot "..\.env.production"),
    [string]$DatabaseContainer = "stealthsync-database-1",
    [string]$TemporaryDatabase = "stealthsync_render_validation",
    [string]$ImageName = "stealthsync-render-validation:local",
    [string]$ContainerName = "stealthsync-render-validation",
    [int]$HostPort = 18081
)

$ErrorActionPreference = "Stop"
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$environmentPath = (Resolve-Path $EnvironmentFile).Path
$databaseCreated = $false

function Invoke-Docker {
    param([Parameter(Mandatory)][string[]]$Arguments)

    & docker @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Docker command failed: docker $($Arguments -join ' ')"
    }
}

function Remove-ValidationContainer {
    [string]$existingContainer = & docker ps --all --filter "name=^/${ContainerName}$" --format "{{.Names}}"
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to inspect Docker validation containers."
    }
    if ($existingContainer -eq $ContainerName) {
        Invoke-Docker -Arguments @("rm", "--force", $ContainerName)
    }
}

try {
    [string]$databaseUser = & docker exec $DatabaseContainer printenv POSTGRES_USER
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($databaseUser)) {
        throw "Unable to read the PostgreSQL username from $DatabaseContainer."
    }

    [string]$networkName = & docker inspect --format "{{range `$key, `$value := .NetworkSettings.Networks}}{{`$key}}{{end}}" $DatabaseContainer
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($networkName)) {
        throw "Unable to determine the Docker network for $DatabaseContainer."
    }

    [string]$databaseExists = & docker exec $DatabaseContainer psql -U $databaseUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$TemporaryDatabase'"
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to inspect PostgreSQL databases."
    }
    if ($databaseExists -eq "1") {
        throw "Safety stop: temporary database '$TemporaryDatabase' already exists."
    }

    Invoke-Docker -Arguments @(
        "exec", $DatabaseContainer,
        "psql", "-U", $databaseUser, "-d", "postgres", "-v", "ON_ERROR_STOP=1",
        "-c", "CREATE DATABASE `"$TemporaryDatabase`""
    )
    $databaseCreated = $true

    Invoke-Docker -Arguments @(
        "build", "--file", (Join-Path $repositoryRoot "Back-end\Dockerfile"),
        "--tag", $ImageName,
        $repositoryRoot
    )

    Remove-ValidationContainer

    $secretBytes = New-Object byte[] 48
    $randomNumberGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $randomNumberGenerator.GetBytes($secretBytes)
    }
    finally {
        $randomNumberGenerator.Dispose()
    }
    $temporaryTokenSecret = [Convert]::ToBase64String($secretBytes)
    [string]$containerId = & docker run --rm --detach `
        --name $ContainerName `
        --network $networkName `
        --env-file $environmentPath `
        --env "SPRING_PROFILES_ACTIVE=prod" `
        --env "PORT=10000" `
        --env "DB_URL=jdbc:postgresql://${DatabaseContainer}:5432/$TemporaryDatabase" `
        --env "TOKEN_ENCRYPTION_SECRET=$temporaryTokenSecret" `
        --publish "127.0.0.1:${HostPort}:10000" `
        $ImageName
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($containerId)) {
        throw "Unable to start the hosted-profile validation container."
    }

    $healthUri = "http://127.0.0.1:$HostPort/actuator/health"
    $deadline = (Get-Date).AddMinutes(2)
    $health = $null
    do {
        Start-Sleep -Seconds 2
        try {
            $health = Invoke-RestMethod -Uri $healthUri -TimeoutSec 5
        }
        catch {
            if ((Get-Date) -ge $deadline) {
                & docker logs --tail 100 $ContainerName
                throw "Hosted production profile did not become healthy within two minutes."
            }
        }
    } while ($null -eq $health)

    if ($health.status -ne "UP") {
        throw "Unexpected health response: $($health | ConvertTo-Json -Compress)"
    }

    [string]$migrationCount = & docker exec $DatabaseContainer psql -U $databaseUser -d $TemporaryDatabase -tAc "SELECT COUNT(*) FROM flyway_schema_history WHERE success = true"
    if ($LASTEXITCODE -ne 0 -or [int]$migrationCount -lt 1) {
        throw "Flyway did not record a successful migration."
    }

    [string]$tableCount = & docker exec $DatabaseContainer psql -U $databaseUser -d $TemporaryDatabase -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"
    if ($LASTEXITCODE -ne 0 -or [int]$tableCount -lt 12) {
        throw "The temporary database does not contain the expected application and Flyway tables."
    }

    [string]$seededUserCount = & docker exec $DatabaseContainer psql -U $databaseUser -d $TemporaryDatabase -tAc "SELECT COUNT(*) FROM user_accounts"
    if ($LASTEXITCODE -ne 0 -or [int]$seededUserCount -ne 0) {
        throw "Hosted production unexpectedly seeded demo user accounts."
    }

    [string]$planCount = & docker exec $DatabaseContainer psql -U $databaseUser -d $TemporaryDatabase -tAc "SELECT COUNT(*) FROM plans"
    if ($LASTEXITCODE -ne 0 -or [int]$planCount -ne 2) {
        throw "Hosted production did not initialize the two formal plan reference rows."
    }

    Write-Host "Hosted production profile validation passed."
    Write-Host "Health: $healthUri -> UP"
    Write-Host "Successful Flyway migrations: $migrationCount"
    Write-Host "Public-schema tables: $tableCount"
    Write-Host "Demo users seeded: $seededUserCount"
    Write-Host "Plan reference rows: $planCount"
}
finally {
    try {
        Remove-ValidationContainer | Out-Null
    }
    catch {
        Write-Warning "Unable to remove validation container '$ContainerName': $($_.Exception.Message)"
    }
    if ($databaseCreated -and -not [string]::IsNullOrWhiteSpace($databaseUser)) {
        try {
            Invoke-Docker -Arguments @(
                "exec", $DatabaseContainer,
                "psql", "-U", $databaseUser, "-d", "postgres", "-v", "ON_ERROR_STOP=1",
                "-c", "DROP DATABASE `"$TemporaryDatabase`" WITH (FORCE)"
            ) | Out-Null
        }
        catch {
            Write-Warning "Unable to remove validation database '$TemporaryDatabase': $($_.Exception.Message)"
        }
    }
}
