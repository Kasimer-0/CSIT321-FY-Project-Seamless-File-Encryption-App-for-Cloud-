param(
    [string]$DbName = "CSIT321-FYP",
    [string]$DbUser = "postgres",
    [int]$DbPort = 5432,
    [string]$DbHost = "localhost",
    [switch]$ForcePrompt
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$backendDir = Join-Path $repoRoot "Back-end"

# Preserve the caller's environment so this helper only affects the Maven
# process it starts. This prevents stale DB settings from leaking into later
# terminal commands.
$previousDbUrl = $env:DB_URL
$previousDbUsername = $env:DB_USERNAME
$previousDbPassword = $env:DB_PASSWORD

try {
    $env:DB_URL = "jdbc:postgresql://$DbHost`:$DbPort/$DbName"
    $env:DB_USERNAME = $DbUser

    if ($ForcePrompt -or [string]::IsNullOrWhiteSpace($env:DB_PASSWORD)) {
        # The password is requested interactively and passed only to the child
        # Maven process. It is intentionally not written to application.properties
        # or any other repository file.
        $securePassword = Read-Host "PostgreSQL password for user '$DbUser'" -AsSecureString
        $passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
        try {
            $env:DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr)
        }
        finally {
            if ($passwordPtr -ne [IntPtr]::Zero) {
                [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr)
            }
        }
    }

    Write-Host "Starting backend with database $DbName on $DbHost`:$DbPort as $DbUser"
    Push-Location $backendDir
    mvn spring-boot:run
}
finally {
    Pop-Location -ErrorAction SilentlyContinue
    $env:DB_URL = $previousDbUrl
    $env:DB_USERNAME = $previousDbUsername
    $env:DB_PASSWORD = $previousDbPassword
}
