@echo off
title Price Checker - Setup
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0app\scripts\setup.ps1"
echo.
pause
