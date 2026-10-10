# One-time setup for Price Checker on a Windows laptop. Run via Setup.bat (double-click).
# Installs a private copy of Node.js, the app's packages and the scraping browser,
# then makes the app start automatically with Windows and opens the dashboard.
param([switch]$NoShortcuts)   # -NoShortcuts: install/build only (used for testing)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # makes Invoke-WebRequest much faster
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$App = Join-Path $Root 'app'
$Runtime = Join-Path $Root 'runtime'
$NodeDir = Join-Path $Runtime 'node'
$Port = 3939

function Step($n, $text) { Write-Host ""; Write-Host "[$n/5] $text" -ForegroundColor Cyan }
function Check($what) { if ($LASTEXITCODE -ne 0) { throw "$what failed (exit code $LASTEXITCODE)" } }

try {
  Write-Host "=== Price Checker setup ===" -ForegroundColor Green
  Write-Host "Folder: $Root"

  # stop a running copy so files are not locked
  & (Join-Path $Root 'Stop.bat') | Out-Null

  Step 1 "Node.js"
  if (-not (Test-Path (Join-Path $NodeDir 'node.exe'))) {
    # Windows PowerShell 5.1 returns the JSON array as ONE object, so foreach over it explicitly
    $v = 'v22.23.3'   # known-good fallback
    try {
      $index = Invoke-RestMethod 'https://nodejs.org/dist/index.json'
      foreach ($rel in $index) { if ("$($rel.version)" -match '^v22\.\d+\.\d+$') { $v = $rel.version; break } }
    } catch { Write-Host "Could not read the Node.js version list, using $v" }
    Write-Host "Downloading Node.js $v ..."
    $zip = Join-Path $env:TEMP "node-$v-win-x64.zip"
    Invoke-WebRequest "https://nodejs.org/dist/$v/node-$v-win-x64.zip" -OutFile $zip -UseBasicParsing
    New-Item -ItemType Directory -Force $Runtime | Out-Null
    tar -xf $zip -C $Runtime; Check 'Extracting Node.js'
    if (Test-Path $NodeDir) { Remove-Item $NodeDir -Recurse -Force }   # leftover from an earlier failed attempt
    Rename-Item (Join-Path $Runtime "node-$v-win-x64") 'node'
    Remove-Item $zip -Force
  } else { Write-Host "Already installed." }
  $env:PATH = "$NodeDir;$env:PATH"
  $npm = Join-Path $NodeDir 'npm.cmd'
  $node = Join-Path $NodeDir 'node.exe'

  Push-Location $App
  Step 2 "App packages (a few minutes the first time)"
  & $npm ci --no-audit --no-fund; Check 'npm ci'

  Step 3 "Scraping browser (Chromium)"
  & $node node_modules\playwright\cli.js install chromium; Check 'Chromium install'

  Step 4 "Building the dashboard"
  & $npm run build; Check 'Build'
  Pop-Location

  if ($NoShortcuts) { Write-Host ""; Write-Host "Install + build OK (shortcuts and start skipped)." -ForegroundColor Green; exit 0 }
  Step 5 "Start with Windows + desktop shortcut"
  New-Item -ItemType Directory -Force (Join-Path $Root 'data') | Out-Null
  $vbs = Join-Path $Root 'Start Price Checker.vbs'
  $ws = New-Object -ComObject WScript.Shell
  $lnk = $ws.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Startup')) 'Price Checker.lnk'))
  $lnk.TargetPath = 'wscript.exe'
  $lnk.Arguments = "`"$vbs`""
  $lnk.WorkingDirectory = $Root
  $lnk.Save()
  Set-Content -Path (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Price Checker.url') -Value "[InternetShortcut]`r`nURL=http://localhost:$Port`r`n"

  Write-Host ""
  Write-Host "Starting Price Checker..." -ForegroundColor Green
  Start-Process wscript.exe "`"$vbs`""
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep 1
    try { (New-Object Net.Sockets.TcpClient('127.0.0.1', $Port)).Close(); break } catch {}
  }
  Start-Process "http://localhost:$Port"
  Write-Host ""
  Write-Host "Done! Dashboard: http://localhost:$Port   (login: admin / admin123 - change it in Settings)" -ForegroundColor Green
  Write-Host "A 'Price Checker' shortcut is on your Desktop. It starts automatically when Windows starts."
}
catch {
  Write-Host ""
  Write-Host "SETUP FAILED: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Check your internet connection and run Setup.bat again."
  exit 1
}
