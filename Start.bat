@echo off
rem Runs the Price Checker launcher. Normally started hidden by "Start Price Checker.vbs" (with argument "hidden").
rem Launcher exit codes: 42 = update installed, restart me
title Price Checker (keep this window open)
cd /d "%~dp0"
set "PATH=%~dp0runtime\node;%PATH%"
if not exist data mkdir data

rem Already running? (the running copy keeps the log file open, so check the port first)
netstat -ano | findstr /r /c:":3939 .*LISTENING" >nul
if not errorlevel 1 (
  if "%1"=="hidden" exit /b 0
  echo Price Checker is ALREADY RUNNING - opening the dashboard.
  start "" http://localhost:3939
  timeout /t 5 >nul
  exit /b 0
)

echo Starting Price Checker ...
echo Dashboard: http://localhost:3939    Logs: data\launcher.log
echo Closing this window stops it.
:loop
node "%~dp0app\scripts\launcher.mjs" >> data\launcher.log 2>&1
set CODE=%errorlevel%
if %CODE%==42 goto loop
if "%1"=="hidden" exit /b %CODE%
echo.
echo Price Checker stopped ^(code %CODE%^). Last lines of data\launcher.log:
echo ------------------------------------------------------------
powershell -NoProfile -Command "Get-Content 'data\launcher.log' -Tail 25"
echo ------------------------------------------------------------
echo Send data\launcher.log to the developer if this keeps happening.
pause
