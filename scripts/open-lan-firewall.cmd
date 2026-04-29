@echo off
:: Sag tik -> Yonetici olarak calistir
:: TCP 3000 ve 3010 gelen baglantilara acar (telefon / diger PC)
netsh advfirewall firewall delete rule name="ilan-platformu Next dev TCP 3000" >nul 2>&1
netsh advfirewall firewall delete rule name="ilan-platformu Next dev TCP 3010" >nul 2>&1
netsh advfirewall firewall add rule name="ilan-platformu Next dev TCP 3000" dir=in action=allow protocol=TCP localport=3000 profile=any
netsh advfirewall firewall add rule name="ilan-platformu Next dev TCP 3010" dir=in action=allow protocol=TCP localport=3010 profile=any
echo Tamam. Simdi: npm run dev  sonra telefonda http://BILGISAYAR_IP:3000
pause
