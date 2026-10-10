@echo off
title Price Checker - Stop
rem Stops Price Checker (launcher, dashboard, any running price check and its browsers).
powershell -NoProfile -Command ^
  "$root = (Resolve-Path '%~dp0').Path.TrimEnd('\');" ^
  "$p = Get-CimInstance Win32_Process | Where-Object { ($_.ExecutablePath -and $_.ExecutablePath.StartsWith($root, 'OrdinalIgnoreCase')) -or ($_.Name -eq 'node.exe' -and $_.CommandLine -and $_.CommandLine.IndexOf($root, [StringComparison]::OrdinalIgnoreCase) -ge 0) -or ($_.CommandLine -and $_.CommandLine -like '*price-checker-*') -or ($_.Name -eq 'cmd.exe' -and $_.CommandLine -like '*Start.bat*') };" ^
  "$p | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue };" ^
  "if ($p) { Write-Output 'Price Checker stopped.' } else { Write-Output 'Price Checker was not running.' }"
echo.
echo Start it again with "Start Price Checker.vbs" (or restart the laptop).
timeout /t 6 >nul
