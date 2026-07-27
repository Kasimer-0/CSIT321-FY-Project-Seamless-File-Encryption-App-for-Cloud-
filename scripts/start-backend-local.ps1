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

# Environment variables saved at User scope are not added to terminals that
# were already open when the OAuth setup scripts ran. Import only missing
# values so an explicit process-level override still takes precedence.
$userEnvironmentNames = @(
    "GOOGLE_DRIVE_CLIENT_ID",
    "GOOGLE_DRIVE_CLIENT_SECRET",
    "GOOGLE_DRIVE_REDIRECT_URI",
    "DROPBOX_CLIENT_ID",
    "DROPBOX_CLIENT_SECRET",
    "DROPBOX_REDIRECT_URI",
    "ONEDRIVE_CLIENT_ID",
    "ONEDRIVE_CLIENT_SECRET",
    "ONEDRIVE_REDIRECT_URI",
    "ONEDRIVE_TENANT"
)
foreach ($name in $userEnvironmentNames) {
    $processValue = [Environment]::GetEnvironmentVariable($name, "Process")
    if ([string]::IsNullOrWhiteSpace($processValue)) {
        $userValue = [Environment]::GetEnvironmentVariable($name, "User")
        if (-not [string]::IsNullOrWhiteSpace($userValue)) {
            [Environment]::SetEnvironmentVariable($name, $userValue, "Process")
        }
    }
}

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
