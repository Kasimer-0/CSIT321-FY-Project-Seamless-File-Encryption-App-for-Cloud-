@echo off
setlocal
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-web-demo.ps1" -Stop
echo.
echo StealthSync web demo stop command finished.
pause
