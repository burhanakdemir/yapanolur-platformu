/**
 * mkcert yerel CA sertifikasini Windows (ve macOS/Linux) guven deposuna yukler.
 * Windows: genelde YONETICI olarak calistirmaniz gerekir (UAC).
 *
 * Telefon/tablet: Bu komut PC'yi guvenilir yapar; mobilde ayrica rootCA.pem kurulumu gerekir (cikti yolu asagida).
 */
const path = require("node:path");
const fs = require("node:fs");
const { execSync } = require("node:child_process");

const root = path.join(__dirname, "..");

function getMkcertBinaryPath() {
  const { getCacheDirectory } = require(path.join(
    root,
    "node_modules",
    "next",
    "dist",
    "lib",
    "helpers",
    "get-cache-directory.js",
  ));
  const cacheDir = getCacheDirectory("mkcert");
  const MKCERT_VERSION = "v1.4.4";
  const arch = process.arch === "x64" ? "amd64" : process.arch;
  let platform;
  if (process.platform === "win32") platform = `windows-${arch}`;
  else if (process.platform === "darwin") platform = `darwin-${arch}`;
  else platform = `linux-${arch}`;
  const binaryName = `mkcert-${MKCERT_VERSION}-${platform}${process.platform === "win32" ? ".exe" : ""}`;
  return path.join(cacheDir, binaryName);
}

function main() {
  const mkcert = getMkcertBinaryPath();
  if (!fs.existsSync(mkcert)) {
    console.error(
      "\n[HATA] mkcert bulunamadi:\n  " + mkcert + "\n\nOnce bir kez proje klasorunde `npm run dev` calistirin (mkcert indirilir).\n",
    );
    process.exit(1);
  }

  console.log("\n=== mkcert guven deposu kurulumu ===\n");
  console.log("mkcert:", mkcert);

  try {
    execSync(`"${mkcert}" -install`, { stdio: "inherit", cwd: root, shell: process.platform === "win32" });
  } catch (e) {
    console.error("\n[HATA] -install basarisiz.");
    if (process.platform === "win32") {
      console.error(
        "Windows: PowerShell veya CMD'yi sag tik > Yonetici olarak calistir, sonra:\n" +
          "  cd \"" +
          root +
          "\"\n" +
          "  npm run trust:dev-cert\n\n" +
          "Alternatif: scripts\\\\windows-install-mkcert-trust.ps1 dosyasini Yonetici PowerShell ile calistir.\n",
      );
    } else {
      console.error("sudo ile tekrar deneyin veya terminalde hata mesajini okuyun.\n");
    }
    process.exit(1);
  }

  let caRoot = "";
  try {
    caRoot = execSync(`"${mkcert}" -CAROOT`, { encoding: "utf8" }).trim();
  } catch {
    /* ignore */
  }
  const rootCaPem = caRoot ? path.join(caRoot, "rootCA.pem") : "";

  console.log("\nTamam: Yerel CA guven deposuna yuklendi.");
  console.log("Chrome / Edge: Sayfayi yenileyin (gerekirse tarayiciyi kapatip acin).");
  console.log(
    "Firefox: Ayarlar > Gizlilik ve Guvenlik > Sertifikalar > Sertifikayi Goruntule > Yetkili > Ice Aktar > rootCA.pem",
  );
  console.log("  veya about:config: security.enterprise_roots.enabled = true (Windows CA deposunu kullanir).");
  if (fs.existsSync(rootCaPem)) {
    console.log("\n--- Telefon / tablet (ayri adim) ---");
    console.log("Bu dosyayi mobil cihaza kopyalayip kullanici CA olarak yukleyin:");
    console.log("  " + rootCaPem);
    console.log("Android: Ayarlar > Guvenlik > Sifreleme > Kimlik bilgisi yukle > CA sertifikasi");
    console.log("iOS: dosyayi acip profil kurulumu (gelistirme icin; kisitlar olabilir).\n");
  } else {
    console.log("\nrootCA.pem yolu alinamadi; mkcert -CAROOT ile kontrol edin.\n");
  }
}

main();
