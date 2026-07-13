@echo off
setlocal
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-web-demo.ps1"
echo.
echo StealthSync web demo start command finished.
echo Close this window when you no longer need the startup output.
pause
