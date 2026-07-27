param(
    [string]$DbName = "CSIT321-FYP",
    [string]$DbUser = "postgres",
    [int]$DbPort = 5432,
    [string]$DbHost = "localhost",
    [int]$BackendPort = 8080,
    [int]$FrontendPort = 5173,
    [switch]$SkipBrowser,
    [switch]$CheckOnly,
    [switch]$Stop
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backendDir = Join-Path $repoRoot "Back-end"
$frontendDir = Join-Path $repoRoot "Front-end"
$runDir = Join-Path $repoRoot ".stealthsync-run"
$logDir = Join-Path $runDir "logs"
$backendPidFile = Join-Path $runDir "backend.pid"
$frontendPidFile = Join-Path $runDir "frontend.pid"

# OAuth setup scripts save credentials at User scope, but a terminal opened
# before setup does not automatically receive them. Import only missing values
# for the child backend process and never print their contents.
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

function Test-Port {
    param([int]$Port)
    $client = New-Object Net.Sockets.TcpClient
    try {
        $result = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
        if (-not $result.AsyncWaitHandle.WaitOne(500)) {
            return $false
        }
        $client.EndConnect($result)
        return $true
    }
    catch {
        return $false
    }
    finally {
        $client.Close()
    }
}

function Wait-Port {
    param(
        [int]$Port,
        [string]$Name,
        [int]$TimeoutSeconds = 90
    )
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-Port $Port) {
            Write-Host "$Name is ready on port $Port."
            return
        }
        Start-Sleep -Seconds 2
    }
    throw "$Name did not become ready on port $Port within $TimeoutSeconds seconds. Check logs in $logDir."
}

function Stop-RecordedProcess {
    param(
        [string]$Name,
        [string]$PidFile
    )
    if (-not (Test-Path $PidFile)) {
        Write-Host "$Name PID file not found; nothing to stop."
        return
    }

    $pidText = (Get-Content -Raw $PidFile).Trim()
    if ($pidText -match "^\d+$") {
        $process = Get-Process -Id ([int]$pidText) -ErrorAction SilentlyContinue
        if ($process) {
            Stop-Process -Id $process.Id -Force
            Write-Host "Stopped $Name process $pidText."
        }
    }
    Remove-Item -LiteralPath $PidFile -Force
}

function Resolve-NodeExe {
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    if ($nodeCommand) {
        return $nodeCommand.Source
    }

    $bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
    if (Test-Path $bundledNode) {
        return $bundledNode
    }

    throw "Node.js was not found. Install Node.js or run this from an environment that has the Codex bundled Node runtime."
}

function Resolve-JavaExe {
    $javaCommand = Get-Command java -ErrorAction SilentlyContinue
    if ($javaCommand) {
        return $javaCommand.Source
    }

    $candidates = @()
    if (-not [string]::IsNullOrWhiteSpace($env:JAVA_HOME)) {
        $candidates += (Join-Path $env:JAVA_HOME "bin\java.exe")
    }
    $candidates += Get-ChildItem -Path (Join-Path $env:USERPROFILE ".jdks\*\bin\java.exe") -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        ForEach-Object { $_.FullName }
    $candidates += Get-ChildItem -Path "C:\Program Files\Java\*\bin\java.exe" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        ForEach-Object { $_.FullName }

    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path $candidate)) {
            return $candidate
        }
    }

    throw "Java was not found. Install JDK 21 or set JAVA_HOME before starting StealthSync."
}

function Resolve-MavenCmd {
    $mavenCommand = Get-Command mvn.cmd -ErrorAction SilentlyContinue
    if (-not $mavenCommand) {
        $mavenCommand = Get-Command mvn -ErrorAction SilentlyContinue
    }
    if ($mavenCommand) {
        return $mavenCommand.Source
    }

    $candidates = @()
    if (-not [string]::IsNullOrWhiteSpace($env:MAVEN_HOME)) {
        $candidates += (Join-Path $env:MAVEN_HOME "bin\mvn.cmd")
    }
    $candidates += Get-ChildItem -Path (Join-Path $env:USERPROFILE ".maven\maven-*\bin\mvn.cmd") -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        ForEach-Object { $_.FullName }
    $candidates += Get-ChildItem -Path "$env:USERPROFILE\scoop\apps\maven\current\bin\mvn.cmd" -ErrorAction SilentlyContinue |
        ForEach-Object { $_.FullName }
    $candidates += Get-ChildItem -Path "C:\Program Files\Apache*\maven-*\bin\mvn.cmd" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        ForEach-Object { $_.FullName }
    $candidates += "C:\ProgramData\chocolatey\bin\mvn.exe"

    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path $candidate)) {
            return $candidate
        }
    }

    return $null
}

function Quote-PowerShellLiteral {
    param([string]$Value)
    return "'" + $Value.Replace("'", "''") + "'"
}

function Resolve-BackendLaunch {
    $javaExe = Resolve-JavaExe
    $mavenCmd = Resolve-MavenCmd
    if ($mavenCmd) {
        return [pscustomobject]@{
            Mode = "maven"
            JavaExe = $javaExe
            MavenCmd = $mavenCmd
            JarPath = $null
        }
    }

    $jar = Get-ChildItem -Path (Join-Path $backendDir "target\*.jar") -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notlike "*sources*" -and $_.Name -notlike "*javadoc*" -and $_.Name -notlike "original-*" } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if ($jar) {
        return [pscustomobject]@{
            Mode = "jar"
            JavaExe = $javaExe
            MavenCmd = $null
            JarPath = $jar.FullName
        }
    }

    throw "Maven was not found and no backend JAR exists in Back-end\target. Install Maven or run a backend build once."
}

function Start-HiddenPowerShell {
    param(
        [string]$Name,
        [string]$Command,
        [string]$PidFile
    )
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null

    $stdout = Join-Path $logDir "$Name.out.log"
    $stderr = Join-Path $logDir "$Name.err.log"
    $process = Start-Process `
        -FilePath "powershell.exe" `
        -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $Command) `
        -RedirectStandardOutput $stdout `
        -RedirectStandardError $stderr `
        -WindowStyle Hidden `
        -PassThru

    Set-Content -Path $PidFile -Value $process.Id
    Write-Host "Started $Name process $($process.Id). Logs: $stdout / $stderr"
}

if ($Stop) {
    Stop-RecordedProcess -Name "frontend" -PidFile $frontendPidFile
    Stop-RecordedProcess -Name "backend" -PidFile $backendPidFile
    return
}

New-Item -ItemType Directory -Force -Path $runDir | Out-Null
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$backendLaunch = Resolve-BackendLaunch
$nodeExeForCheck = Resolve-NodeExe

if ($CheckOnly) {
    Write-Host "Repository: $repoRoot"
    Write-Host "Backend launch mode: $($backendLaunch.Mode)"
    Write-Host "Java: $($backendLaunch.JavaExe)"
    if ($backendLaunch.MavenCmd) {
        Write-Host "Maven: $($backendLaunch.MavenCmd)"
    }
    if ($backendLaunch.JarPath) {
        Write-Host "Backend JAR: $($backendLaunch.JarPath)"
    }
    Write-Host "Node: $nodeExeForCheck"
    Write-Host "DB_PASSWORD set: $(-not [string]::IsNullOrWhiteSpace($env:DB_PASSWORD))"
    Write-Host "Backend port $BackendPort busy: $(Test-Port $BackendPort)"
    Write-Host "Frontend port $FrontendPort busy: $(Test-Port $FrontendPort)"
    return
}

$previousDbUrl = $env:DB_URL
$previousDbUsername = $env:DB_USERNAME
$previousDbPassword = $env:DB_PASSWORD

if ([string]::IsNullOrWhiteSpace($env:DB_PASSWORD)) {
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

try {
    $env:DB_URL = "jdbc:postgresql://$DbHost`:$DbPort/$DbName"
    $env:DB_USERNAME = $DbUser

    if (Test-Port $BackendPort) {
        Write-Host "Backend port $BackendPort is already in use; assuming backend is already running."
    }
    else {
        $javaExe = $backendLaunch.JavaExe
        $javaBin = Split-Path $javaExe -Parent
        $javaHome = Split-Path $javaBin -Parent
        if ($backendLaunch.Mode -eq "maven") {
            $mavenCmd = $backendLaunch.MavenCmd
            $mavenBin = Split-Path $mavenCmd -Parent
            $backendCommand = "`$env:JAVA_HOME = $(Quote-PowerShellLiteral $javaHome); `$env:PATH = $(Quote-PowerShellLiteral "$javaBin;$mavenBin;") + `$env:PATH; Set-Location -LiteralPath $(Quote-PowerShellLiteral $backendDir); & $(Quote-PowerShellLiteral $mavenCmd) spring-boot:run"
        }
        else {
            $backendCommand = "`$env:JAVA_HOME = $(Quote-PowerShellLiteral $javaHome); `$env:PATH = $(Quote-PowerShellLiteral "$javaBin;") + `$env:PATH; Set-Location -LiteralPath $(Quote-PowerShellLiteral $backendDir); & $(Quote-PowerShellLiteral $javaExe) -jar $(Quote-PowerShellLiteral $backendLaunch.JarPath)"
        }
        Start-HiddenPowerShell -Name "backend" -Command $backendCommand -PidFile $backendPidFile
    }
}
finally {
    $env:DB_URL = $previousDbUrl
    $env:DB_USERNAME = $previousDbUsername
    $env:DB_PASSWORD = $previousDbPassword
}

if (Test-Port $FrontendPort) {
    Write-Host "Frontend port $FrontendPort is already in use; assuming frontend is already running."
}
else {
    $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
    if ($npmCommand) {
        $frontendCommand = "Set-Location -LiteralPath '$frontendDir'; npm run dev -- --host 127.0.0.1 --port $FrontendPort"
    }
    else {
        $nodeExe = Resolve-NodeExe
        $frontendCommand = "Set-Location -LiteralPath '$frontendDir'; & '$nodeExe' '.\node_modules\vite\bin\vite.js' --host 127.0.0.1 --port $FrontendPort"
    }
    Start-HiddenPowerShell -Name "frontend" -Command $frontendCommand -PidFile $frontendPidFile
}

Wait-Port -Port $BackendPort -Name "Backend"
Wait-Port -Port $FrontendPort -Name "Frontend"

$url = "http://localhost:$FrontendPort"
Write-Host "StealthSync web demo is ready: $url"
Write-Host "Stop later with: powershell -ExecutionPolicy Bypass -File scripts\start-web-demo.ps1 -Stop"

if (-not $SkipBrowser) {
    Start-Process $url
}
