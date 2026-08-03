$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$runDirectory = Join-Path $repoRoot ".stealthsync-run"
$logDirectory = Join-Path $runDirectory "logs"
$logFile = Join-Path $logDirectory "autostart.log"
$startScript = Join-Path $PSScriptRoot "start-shared-test-deployment.ps1"

New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

try {
    "`n[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Scheduled startup requested." |
        Out-File -LiteralPath $logFile -Append -Encoding UTF8
    # Capture the child script as text before appending so Windows PowerShell
    # cannot mix UTF-16 native-command output into the UTF-8 operational log.
    $startupOutput = (& $startScript -SkipBuild -NonInteractive | Out-String)
    $startupOutput | Out-File -LiteralPath $logFile -Append -Encoding UTF8
    "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] Scheduled startup completed successfully." |
        Out-File -LiteralPath $logFile -Append -Encoding UTF8
}
catch {
    "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $($_.Exception.Message)" |
        Out-File -LiteralPath $logFile -Append -Encoding UTF8
    exit 1
}
