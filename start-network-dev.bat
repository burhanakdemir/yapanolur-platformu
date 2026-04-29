@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>&1 || (
  echo [HATA] Node.js yuklu degil. https://nodejs.org — LTS kurun.
  pause
  exit /b 1
)

if not exist "node_modules\next\dist\bin\next" (
  echo [HATA] node_modules eksik. Bu klasorde bir kez calistirin: npm install
  echo (npm, Node ile birlikte gelir; PowerShell veya Cmd acip proje klasorunde.)
  pause
  exit /b 1
)

title ilan-platformu — gelistirme
echo.
echo Baslatiliyor... Asagida LAN IP ve .env ipuclari gorunecek.
echo.

node "%~dp0scripts\run-dev-lan.cjs"
echo.
if errorlevel 1 pause
