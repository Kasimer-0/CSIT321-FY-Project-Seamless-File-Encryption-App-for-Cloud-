param(
    [ValidateSet("app-image", "exe", "msi")]
    [string]$PackageType = "app-image",

    [switch]$SkipTests,
    [switch]$WinConsole
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

function Resolve-Jpackage {
    if ($env:JAVA_HOME) {
        $FromJavaHome = Join-Path $env:JAVA_HOME "bin\jpackage.exe"
        if (Test-Path $FromJavaHome) {
            return $FromJavaHome
        }
    }

    return Require-Command "jpackage"
}

Write-Host "Building React frontend..."
Push-Location $FrontendDir
try {
    Require-Command "npm" | Out-Null
    npm run build
}
finally {
    Pop-Location
}

Write-Host "Copying frontend build into Spring Boot static resources..."
if (Test-Path $StaticDir) {
    Remove-Item -LiteralPath $StaticDir -Recurse -Force
}
New-Item -ItemType Directory -Path $StaticDir | Out-Null
Copy-Item -Path (Join-Path $FrontendDist "*") -Destination $StaticDir -Recurse -Force

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

$JarPath = Join-Path (Join-Path $BackendDir "target") $JarName
if (-not (Test-Path $JarPath)) {
    throw "Expected backend JAR was not found: $JarPath"
}

Write-Host "Creating Windows desktop package with jpackage..."
if (Test-Path $DesktopDist) {
    Remove-Item -LiteralPath $DesktopDist -Recurse -Force
}
New-Item -ItemType Directory -Path $DesktopDist | Out-Null

$Jpackage = Resolve-Jpackage
$JpackageArgs = @(
    "--type", $PackageType,
    "--name", "StealthSync",
    "--input", (Join-Path $BackendDir "target"),
    "--main-jar", $JarName,
    "--dest", $DesktopDist,
    "--java-options", "-Dserver.port=8080",
    "--java-options", "-Dspring.datasource.url=jdbc:postgresql://localhost:5432/CSIT321-FYP",
    "--java-options", "-Dspring.datasource.username=postgres",
    "--java-options", "-Dstealthsync.open-browser=true"
)

if ($WinConsole) {
    $JpackageArgs += "--win-console"
}

& $Jpackage @JpackageArgs

Write-Host "Desktop package created in: $DesktopDist"
if ($PackageType -eq "app-image") {
    Write-Host "Executable: $(Join-Path $DesktopDist 'StealthSync\StealthSync.exe')"
}
