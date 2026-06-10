param(
    [ValidateSet("app-image", "exe", "msi")]
    [string]$PackageType = "app-image",

    [switch]$SkipTests,
    [switch]$SkipFrontendBuild,
    [switch]$SkipBackendBuild,
    [switch]$WinConsole,

    [string]$JdkHome,
    [string]$AppVersion = "1.0.1",
    [string]$UpgradeUuid = "8c96c4aa-8c5f-4ed0-a9f4-8dcb48c2b6b7",
    [int]$ServerPort = 8080,
    [bool]$OpenBrowser = $true
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$FrontendDir = Join-Path $Root "Front-end"
$BackendDir = Join-Path $Root "Back-end"
$StaticDir = Join-Path $BackendDir "src\main\resources\static"
$FrontendDist = Join-Path $FrontendDir "dist"
$DesktopDist = Join-Path $Root "dist-desktop"
$JarName = "stealthsync-backend-0.0.1-SNAPSHOT.jar"

function Require-Command($Name) {
    $Command = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $Command) {
        throw "Required command '$Name' was not found on PATH."
    }
    return $Command.Source
}

function Resolve-JdkHome {
    $Candidates = @($JdkHome, $env:JAVA_HOME) | Where-Object { $_ -and $_.Trim() }
    foreach ($Candidate in $Candidates) {
        $Resolved = Resolve-Path $Candidate -ErrorAction SilentlyContinue
        if ($Resolved -and (Test-Path (Join-Path $Resolved "bin\jpackage.exe"))) {
            return $Resolved.Path
        }
    }

    $JpackageCommand = Require-Command "jpackage"
    return Split-Path (Split-Path $JpackageCommand -Parent) -Parent
}

function Assert-PackagingJdk($ResolvedJdkHome) {
    $Java = Join-Path $ResolvedJdkHome "bin\java.exe"
    $Jpackage = Join-Path $ResolvedJdkHome "bin\jpackage.exe"
    $PreviousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $VersionOutput = (& $Java -version 2>&1 | Out-String)
        $JavaExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $PreviousErrorActionPreference
    }

    if ($JavaExitCode -ne 0) {
        throw "Unable to run Java from the selected JDK: $ResolvedJdkHome`n$VersionOutput"
    }

    if ($VersionOutput -notmatch 'version "21\.') {
        throw "Desktop packaging requires a standard JDK 21. Selected JDK: $ResolvedJdkHome`n$VersionOutput"
    }

    $JvmConfig = Join-Path $ResolvedJdkHome "lib\jvm.cfg"
    if ((Test-Path $JvmConfig) -and (Select-String -Path $JvmConfig -Pattern '^-client\s+KNOWN' -Quiet)) {
        throw "The selected JDK enables both client and server JVMs, which produces a broken jpackage launcher on Windows. Use a standard Temurin/OpenJDK 21 distribution instead of a Full/JavaFX JDK: $ResolvedJdkHome"
    }

    return $Jpackage
}

if (-not $SkipFrontendBuild) {
    Write-Host "Building React frontend..."
    Push-Location $FrontendDir
    try {
        Require-Command "npm" | Out-Null
        npm run build
    }
    finally {
        Pop-Location
    }
}

if (-not (Test-Path $FrontendDist)) {
    throw "Frontend build output was not found: $FrontendDist"
}

Write-Host "Copying frontend build into Spring Boot static resources..."
if (Test-Path $StaticDir) {
    Remove-Item -LiteralPath $StaticDir -Recurse -Force
}
New-Item -ItemType Directory -Path $StaticDir | Out-Null
Copy-Item -Path (Join-Path $FrontendDist "*") -Destination $StaticDir -Recurse -Force

if (-not $SkipBackendBuild) {
    Write-Host "Packaging Spring Boot backend..."
    Push-Location $BackendDir
    try {
        Require-Command "mvn" | Out-Null
        if ($SkipTests) {
            mvn clean package -DskipTests
        }
        else {
            mvn clean package
        }
    }
    finally {
        Pop-Location
    }
}

$JarPath = Join-Path (Join-Path $BackendDir "target") $JarName
if (-not (Test-Path $JarPath)) {
    throw "Expected backend JAR was not found: $JarPath"
}

Write-Host "Creating Windows desktop package with jpackage..."
New-Item -ItemType Directory -Path $DesktopDist -Force | Out-Null

$PackageOutput = if ($PackageType -eq "app-image") {
    Join-Path $DesktopDist "StealthSync"
}
else {
    Join-Path $DesktopDist "StealthSync-$AppVersion.$PackageType"
}
if (Test-Path $PackageOutput) {
    Remove-Item -LiteralPath $PackageOutput -Recurse -Force
}

$ResolvedJdkHome = Resolve-JdkHome
$Jpackage = Assert-PackagingJdk $ResolvedJdkHome
$JpackageInput = Join-Path (Join-Path $BackendDir "target") "jpackage-input"
if (Test-Path $JpackageInput) {
    Remove-Item -LiteralPath $JpackageInput -Recurse -Force
}
New-Item -ItemType Directory -Path $JpackageInput | Out-Null
Copy-Item -LiteralPath $JarPath -Destination (Join-Path $JpackageInput $JarName)

$OpenBrowserValue = $OpenBrowser.ToString().ToLowerInvariant()
$JpackageArgs = @(
    "--verbose",
    "--type", $PackageType,
    "--name", "StealthSync",
    "--app-version", $AppVersion,
    "--vendor", "CSIT321 FYP Team",
    "--description", "Seamless file encryption for cloud storage workflows",
    "--input", $JpackageInput,
    "--main-jar", $JarName,
    "--dest", $DesktopDist,
    "--java-options", "-Dspring.profiles.active=desktop",
    "--java-options", "-Dserver.port=$ServerPort",
    "--java-options", "-Dstealthsync.open-browser=$OpenBrowserValue",
    "--java-options", "-Dfile.encoding=UTF-8"
)

if ($WinConsole) {
    $JpackageArgs += "--win-console"
}

if ($PackageType -in @("exe", "msi")) {
    $JpackageArgs += @(
        "--win-menu",
        "--win-menu-group", "StealthSync",
        "--win-shortcut",
        "--win-dir-chooser",
        "--win-per-user-install",
        "--win-upgrade-uuid", $UpgradeUuid
    )
}

& $Jpackage @JpackageArgs
if ($LASTEXITCODE -ne 0) {
    throw "jpackage failed with exit code $LASTEXITCODE."
}

Write-Host "Desktop package created in: $DesktopDist"
Write-Host "Packaging JDK: $ResolvedJdkHome"
if ($PackageType -eq "app-image") {
    Write-Host "Executable: $(Join-Path $DesktopDist 'StealthSync\StealthSync.exe')"
}
