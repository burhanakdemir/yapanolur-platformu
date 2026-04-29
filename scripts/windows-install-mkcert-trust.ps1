# mkcert yerel CA'yi Windows guven deposuna yukler (UAC ile yukseltilmis calisir).
# Sag tik > Yonetici olarak calistir  VEYA: npm run trust:dev-cert (yonetici terminal)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$mkcertRel = "node_modules\next\dist\lib\helpers\get-cache-directory.js"
if (-not (Test-Path (Join-Path $root $mkcertRel))) {
  Write-Host "[HATA] Proje kokunde node_modules yok. Once: npm install" -ForegroundColor Red
  exit 1
}

$mkcert = Join-Path $env:LOCALAPPDATA "mkcert\mkcert-v1.4.4-windows-amd64.exe"
if (-not (Test-Path $mkcert)) {
  Write-Host "[HATA] mkcert bulunamadi: $mkcert" -ForegroundColor Red
  Write-Host "Once bir kez: npm run dev  (mkcert indirilir)" -ForegroundColor Yellow
  exit 1
}

Write-Host "mkcert: $mkcert"
Write-Host "UAC ile guven deposu kurulumu basliyor...`n"

$p = Start-Process -FilePath $mkcert -ArgumentList "-install" -Verb RunAs -PassThru -Wait
if ($p.ExitCode -ne 0 -and $null -ne $p.ExitCode) {
  Write-Host "[HATA] mkcert -install cikis kodu: $($p.ExitCode)" -ForegroundColor Red
  exit $p.ExitCode
}

Write-Host "`nTamam. Chrome/Edge'i yeniden baslatip https://localhost:3000 veya LAN IP'nizi deneyin.`n"

$caroot = & $mkcert -CAROOT 2>$null
if ($caroot) {
  $pem = Join-Path $caroot.Trim() "rootCA.pem"
  if (Test-Path $pem) {
    Write-Host "Mobil cihaz icin CA dosyasi (kopyalayin):"
    Write-Host "  $pem`n"
  }
}
