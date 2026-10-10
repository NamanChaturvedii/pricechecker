@echo off
rem FOR THE DEVELOPER: bumps the version and pushes to GitHub.
rem Every installed Price Checker picks the update up automatically (within a few hours,
rem or immediately via Settings > Check for updates).
cd /d "%~dp0"
set "PATH=%~dp0runtime\node;%PATH%"
for /f "delims=" %%v in ('node -e "const f='app/version.json';const j=require('./'+f);const p=j.version.split('.').map(Number);p[2]++;j.version=p.join('.');require('fs').writeFileSync(f,JSON.stringify(j)+'\n');console.log(j.version)"') do set VER=%%v
echo Publishing version %VER% ...
git add -A
git commit -m "Release v%VER%"
git push
echo.
echo Published v%VER%. Clients will update automatically.
pause
