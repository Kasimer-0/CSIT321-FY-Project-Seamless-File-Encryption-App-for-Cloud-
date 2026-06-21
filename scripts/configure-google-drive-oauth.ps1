$ErrorActionPreference = "Stop"

Write-Host "StealthSync Google Drive OAuth configuration" -ForegroundColor Cyan
Write-Host "Use a Google OAuth client of type: Web application"
Write-Host "Required redirect URI: http://localhost:8080/cloud-storage/oauth/google/callback"
Write-Host ""

$clientId = (Read-Host "Paste GOOGLE_DRIVE_CLIENT_ID").Trim()
if ($clientId -notmatch "\.apps\.googleusercontent\.com$") {
    throw "The client ID does not look like a Google OAuth client ID."
}

# Keep the secret out of console history and clear the temporary unmanaged copy
# immediately after saving it to the current user's environment.
$secureSecret = Read-Host "Paste GOOGLE_DRIVE_CLIENT_SECRET (input is hidden)" -AsSecureString
$secretPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureSecret)
try {
    $clientSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPtr)
    if ([string]::IsNullOrWhiteSpace($clientSecret)) {
        throw "The client secret cannot be empty."
    }

    [Environment]::SetEnvironmentVariable("GOOGLE_DRIVE_CLIENT_ID", $clientId, "User")
    [Environment]::SetEnvironmentVariable("GOOGLE_DRIVE_CLIENT_SECRET", $clientSecret, "User")
    [Environment]::SetEnvironmentVariable(
        "GOOGLE_DRIVE_REDIRECT_URI",
        "http://localhost:8080/cloud-storage/oauth/google/callback",
        "User"
    )
}
finally {
    if ($secretPtr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPtr)
    }
    $clientSecret = $null
    $secureSecret = $null
}

Write-Host ""
Write-Host "OAuth environment variables were saved for the current Windows user." -ForegroundColor Green
Write-Host "Completely close StealthSync, then launch it again before connecting Google Drive."
