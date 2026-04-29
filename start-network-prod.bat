@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>&1 || (
  echo [HATA] Node.js yuklu degil.
  pause
  exit /b 1
)

if not exist "node_modules\next\dist\bin\next" (
  echo Once: npm install ^(bu klasorde^)
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [HATA] npm bulunamadi; ilk kurulum icin npm gerekir. Node.js LTS kurun.
  pause
  exit /b 1
)

if not exist ".next\BUILD_ID" (
  echo Ilk kez derleniyor: npm run build ...
  call npm run build
  if errorlevel 1 ( echo Build basarisiz. & pause & exit /b 1 )
)

title ilan-platformu — uretim
node "%~dp0scripts\run-start-lan.cjs"
echo.
if errorlevel 1 pause
