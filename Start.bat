@echo off
rem Runs the Price Checker launcher. Exit code 42 = "update installed, restart me".
cd /d "%~dp0"
set "PATH=%~dp0runtime\node;%PATH%"
if not exist data mkdir data
:loop
node "%~dp0app\scripts\launcher.mjs" >> data\launcher.log 2>&1
if %errorlevel%==42 goto loop
