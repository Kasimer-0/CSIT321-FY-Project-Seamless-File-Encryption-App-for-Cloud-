param(
    [ValidateSet("all", "app-image", "exe")]
    [string]$PackageType = "all",

    [switch]$SkipTests,
    [string]$JdkHome = "C:\Users\Z\.jdks\openjdk-21.0.2",
    [string]$AppVersion = "1.3.0",
    [string]$ServiceUrl = $(if ($env:STEALTHSYNC_DESKTOP_URL) { $env:STEALTHSYNC_DESKTOP_URL } else { "https://tj867zgk-8080.asse.devtunnels.ms" }),
    [string]$UpgradeUuid = "8c96c4aa-8c5f-4ed0-a9f4-8dcb48c2b6b7"
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ClientDir = Join-Path $Root "Desktop-client"
$TargetDir = Join-Path $ClientDir "target"
$InputDir = Join-Path $TargetDir "jpackage-input"
$DesktopDist = Join-Path $Root "dist-desktop"
$StagingDir = Join-Path $DesktopDist ".staging-$AppVersion"
$ToolsDir = Join-Path $Root ".tools"
$WixDir = Join-Path $ToolsDir "wix314"
$WixArchive = Join-Path $ToolsDir "wix314-binaries.zip"
$WixUrl = "https://github.com/wixtoolset/wix3/releases/download/wix3141rtm/wix314-binaries.zip"
$WixSha256 = "6AC824E1642D6F7277D0ED7EA09411A508F6116BA6FAE0AA5F2C7DAA2FF43D31"
$MainJar = "stealthsync-desktop-client-$AppVersion.jar"
$MainClass = "com.stealthsync.desktop.DesktopClientMain"

function Require-File([string]$Path, [string]$Description) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "$Description was not found: $Path"
    }
    return (Resolve-Path -LiteralPath $Path).Path
}

function Invoke-Checked([scriptblock]$Command, [string]$Description) {
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Description failed with exit code $LASTEXITCODE."
    }
}

function Assert-ServiceUrl([string]$Url) {
    $uri = [Uri]$Url
    if (-not $uri.IsAbsoluteUri -or $uri.Scheme -ne "https" -or -not $uri.Host -or $uri.UserInfo) {
        throw "ServiceUrl must be an absolute HTTPS URL without embedded credentials."
    }
}

function Assert-AppImageNotRunning([string]$AppImagePath) {
    $running = Get-Process -Name "StealthSync" -ErrorAction SilentlyContinue | Where-Object {
        try { $_.Path -and $_.Path.StartsWith($AppImagePath, [System.StringComparison]::OrdinalIgnoreCase) }
        catch { $false }
    }
    if ($running) {
        throw "Close the existing dist-desktop StealthSync app before replacing its app image."
    }
}

function Resolve-PackagingJdk {
    $resolved = Resolve-Path -LiteralPath $JdkHome -ErrorAction SilentlyContinue
    if (-not $resolved) {
        throw "JDK 21.0.2 was not found: $JdkHome"
    }
    $java = Require-File (Join-Path $resolved.Path "bin\java.exe") "Java"
    $jpackage = Require-File (Join-Path $resolved.Path "bin\jpackage.exe") "jpackage"
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $version = (& $java -version 2>&1 | Out-String)
        $javaExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    if ($javaExitCode -ne 0) {
        throw "Unable to run the selected JDK: $JdkHome`n$version"
    }
    if ($version -notmatch 'version "21\.0\.2') {
        throw "Desktop packaging is pinned to OpenJDK 21.0.2. Selected runtime:`n$version"
    }
    return @{ Home = $resolved.Path; Jpackage = $jpackage }
}

function Install-PortableWix {
    New-Item -ItemType Directory -Path $ToolsDir -Force | Out-Null
    $needsDownload = -not (Test-Path -LiteralPath $WixArchive)
    if (-not $needsDownload) {
        $needsDownload = (Get-FileHash -Algorithm SHA256 -LiteralPath $WixArchive).Hash -ne $WixSha256
    }
    if ($needsDownload) {
        Write-Host "Downloading pinned WiX 3.14.1 portable binaries..."
        Invoke-WebRequest -UseBasicParsing -Uri $WixUrl -OutFile $WixArchive
    }
    $actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $WixArchive).Hash
    if ($actualHash -ne $WixSha256) {
        throw "WiX archive checksum mismatch. Expected $WixSha256 but received $actualHash."
    }
    if (-not (Test-Path -LiteralPath (Join-Path $WixDir "candle.exe"))) {
        if (Test-Path -LiteralPath $WixDir) {
            Remove-Item -LiteralPath $WixDir -Recurse -Force
        }
        Expand-Archive -LiteralPath $WixArchive -DestinationPath $WixDir
    }
    Require-File (Join-Path $WixDir "candle.exe") "WiX candle" | Out-Null
    Require-File (Join-Path $WixDir "light.exe") "WiX light" | Out-Null
    $env:PATH = "$WixDir;$env:PATH"
}

function New-BrandIcon([string]$Destination) {
    Add-Type -AssemblyName System.Drawing
    $bitmap = [System.Drawing.Bitmap]::new(256, 256)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $accent = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(6, 182, 212))
        $ink = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(5, 5, 5))
        $tile = [System.Drawing.Drawing2D.GraphicsPath]::new()
        try {
            # This is the same compact S// mark used in Website.html, rebuilt as
            # geometry so Windows shortcuts remain crisp without requiring a font.
            $tile.AddArc(10, 10, 82, 82, 180, 90)
            $tile.AddArc(164, 10, 82, 82, 270, 90)
            $tile.AddArc(164, 164, 82, 82, 0, 90)
            $tile.AddArc(10, 164, 82, 82, 90, 90)
            $tile.CloseFigure()
            $graphics.FillPath($accent, $tile)

            $graphics.FillRectangle($ink, 51, 64, 82, 23)
            $graphics.FillRectangle($ink, 51, 116, 82, 24)
            $graphics.FillRectangle($ink, 51, 169, 82, 23)
            $graphics.FillRectangle($ink, 51, 64, 23, 76)
            $graphics.FillRectangle($ink, 110, 116, 23, 76)

            $leftSlash = [System.Drawing.Point[]]@(
                [System.Drawing.Point]::new(160, 64),
                [System.Drawing.Point]::new(178, 64),
                [System.Drawing.Point]::new(155, 192),
                [System.Drawing.Point]::new(137, 192)
            )
            $rightSlash = [System.Drawing.Point[]]@(
                [System.Drawing.Point]::new(193, 64),
                [System.Drawing.Point]::new(211, 64),
                [System.Drawing.Point]::new(188, 192),
                [System.Drawing.Point]::new(170, 192)
            )
            $graphics.FillPolygon($ink, $leftSlash)
            $graphics.FillPolygon($ink, $rightSlash)
        }
        finally {
            $tile.Dispose()
            $accent.Dispose()
            $ink.Dispose()
        }
        $icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
        $stream = [System.IO.File]::Open($Destination, [System.IO.FileMode]::Create)
        try { $icon.Save($stream) } finally { $stream.Dispose(); $icon.Dispose() }
    }
    finally {
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

Assert-ServiceUrl $ServiceUrl
$jdk = Resolve-PackagingJdk
$maven = (Get-Command mvn -ErrorAction Stop).Source

Write-Host "Building thin desktop client..."
Push-Location $ClientDir
try {
    if ($SkipTests) {
        Invoke-Checked { & $maven clean package -DskipTests } "Desktop client build"
    }
    else {
        Invoke-Checked { & $maven clean package } "Desktop client tests and build"
    }
}
finally {
    Pop-Location
}

New-Item -ItemType Directory -Path $InputDir -Force | Out-Null
$builtJar = Require-File (Join-Path $TargetDir $MainJar) "Desktop client JAR"
Copy-Item -LiteralPath $builtJar -Destination (Join-Path $InputDir $MainJar) -Force

if (Test-Path -LiteralPath $StagingDir) {
    Remove-Item -LiteralPath $StagingDir -Recurse -Force
}
New-Item -ItemType Directory -Path $StagingDir -Force | Out-Null
$iconPath = Join-Path $TargetDir "StealthSync.ico"
New-BrandIcon $iconPath

$commonArgs = @(
    "--name", "StealthSync",
    "--app-version", $AppVersion,
    "--vendor", "CSIT321 FYP Team",
    "--description", "Encrypted cloud storage client for Google Drive, Dropbox, and OneDrive",
    "--input", $InputDir,
    "--main-jar", $MainJar,
    "--main-class", $MainClass,
    "--dest", $StagingDir,
    "--icon", $iconPath,
    # JavaFX WebView uses java.net.http for requests and jdk.unsupported for its
    # rendering pipeline; list them explicitly because jpackage builds a trimmed runtime.
    "--add-modules", "java.desktop,java.net.http,jdk.jsobject,jdk.crypto.ec,jdk.crypto.mscapi,jdk.unsupported",
    "--java-options", "-Dstealthsync.desktop.url=$ServiceUrl",
    # Use the Windows trust store so the desktop shell follows the same enterprise
    # certificate policy as Edge and Chrome without disabling TLS verification.
    "--java-options", "-Djavax.net.ssl.trustStore=NONE",
    "--java-options", "-Djavax.net.ssl.trustStoreType=Windows-ROOT",
    "--java-options", "-Dfile.encoding=UTF-8"
)

$types = if ($PackageType -eq "all") { @("app-image", "exe") } else { @($PackageType) }
foreach ($type in $types) {
    if ($type -eq "exe") {
        Install-PortableWix
    }
    Write-Host "Creating StealthSync $type package..."
    $args = @("--type", $type) + $commonArgs
    if ($type -eq "exe") {
        $args += @(
            "--win-menu",
            "--win-menu-group", "StealthSync",
            "--win-shortcut",
            "--win-dir-chooser",
            "--win-per-user-install",
            "--win-upgrade-uuid", $UpgradeUuid
        )
    }
    & $jdk.Jpackage @args
    if ($LASTEXITCODE -ne 0) {
        throw "jpackage $type failed with exit code $LASTEXITCODE. Existing desktop artifacts were retained."
    }
}

$stagedApp = Join-Path $StagingDir "StealthSync"
$stagedInstaller = Get-ChildItem -LiteralPath $StagingDir -Filter "*.exe" -File |
    Where-Object { $_.Name -ne "StealthSync.exe" } |
    Select-Object -First 1
if ($PackageType -in @("all", "app-image")) {
    Require-File (Join-Path $stagedApp "StealthSync.exe") "Staged desktop executable" | Out-Null
}
if ($PackageType -in @("all", "exe") -and -not $stagedInstaller) {
    throw "The staged Windows installer was not generated. Existing desktop artifacts were retained."
}

New-Item -ItemType Directory -Path $DesktopDist -Force | Out-Null
if ($PackageType -in @("all", "app-image")) {
    $finalApp = Join-Path $DesktopDist "StealthSync"
    Assert-AppImageNotRunning $finalApp
    if (Test-Path -LiteralPath $finalApp) {
        Remove-Item -LiteralPath $finalApp -Recurse -Force
    }
    Move-Item -LiteralPath $stagedApp -Destination $finalApp
}
if ($PackageType -in @("all", "exe")) {
    Get-ChildItem -LiteralPath $DesktopDist -Filter "StealthSync-Setup-*.exe" -File -ErrorAction SilentlyContinue |
        Remove-Item -Force
    Get-ChildItem -LiteralPath $DesktopDist -Filter "StealthSync-1.2.1*.exe" -File -ErrorAction SilentlyContinue |
        Remove-Item -Force
    Move-Item -LiteralPath $stagedInstaller.FullName -Destination (Join-Path $DesktopDist "StealthSync-Setup-$AppVersion.exe")
}
Remove-Item -LiteralPath $StagingDir -Recurse -Force

$checksumTargets = @()
if (Test-Path -LiteralPath (Join-Path $DesktopDist "StealthSync\StealthSync.exe")) {
    $checksumTargets += Get-Item (Join-Path $DesktopDist "StealthSync\StealthSync.exe")
}
if (Test-Path -LiteralPath (Join-Path $DesktopDist "StealthSync-Setup-$AppVersion.exe")) {
    $checksumTargets += Get-Item (Join-Path $DesktopDist "StealthSync-Setup-$AppVersion.exe")
}
$checksumLines = $checksumTargets | ForEach-Object {
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash.ToLowerInvariant()
    "$hash  $($_.Name)"
}
[System.IO.File]::WriteAllLines((Join-Path $DesktopDist "SHA256SUMS.txt"), $checksumLines, [System.Text.UTF8Encoding]::new($false))

Write-Host "StealthSync $AppVersion desktop artifacts are ready:"
$checksumTargets | ForEach-Object { Write-Host " - $($_.FullName)" }
Write-Host " - $(Join-Path $DesktopDist 'SHA256SUMS.txt')"
Write-Host "Service URL: $ServiceUrl"
Write-Host "Packaging JDK: $($jdk.Home)"
