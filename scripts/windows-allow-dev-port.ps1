# Yonetici PowerShell: telefon / agdan gelen baglantilar icin TCP 3000 (ve 3010) acar.
# Calistirma: sag tik > Yonetici olarak calistir VEYA: npm run dev:firewall
$ErrorActionPreference = "Stop"
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Host "[UYARI] Yonetici yetkisi yok; kural olusturulamadi. PowerShell'i 'Yonetici olarak calistir' ile acip tekrar deneyin."
  exit 1
}
$ports = @(3000, 3010)
foreach ($p in $ports) {
  $name = "ilan-platformu Next dev TCP $p"
  $existing = Get-NetFirewallRule -DisplayName $name -ErrorAction SilentlyContinue
  if (-not $existing) {
    # Public: bazen Wi-Fi 'Ozel ag' degil; telefon erisimi icin tum profiller
    New-NetFirewallRule -DisplayName $name -Direction Inbound -LocalPort $p -Protocol TCP -Action Allow -Profile Domain, Private, Public | Out-Null
    Write-Host "Tamam: $name"
  } else {
    Write-Host "Zaten var: $name"
  }
}
Write-Host "Bitti. npm run dev ile sunucuyu baslatin."
