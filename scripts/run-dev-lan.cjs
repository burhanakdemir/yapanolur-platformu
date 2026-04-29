/**
 * LAN gelistirme: 0.0.0.0, dogru IPv4 onceligi, Next.js dev.
 *
 * Varsayilan (LAN IP varken): HTTPS + mkcert — ogle saatindeki gibi https://IP:PORT
 * mkcert basarisizsa otomatik HTTP (kesinti olmasin).
 * Zorunlu HTTP: npm run dev:http veya DEV_USE_HTTP=1
 */
const { spawn, execSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const { mergeNextDevAllowedOriginsIntoEnv } = require("./merge-next-dev-allowed-origins.cjs");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const root = path.join(__dirname, "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

function scoreLanIp(ip) {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return 0;
  const [a, b] = p;
  if (a === 192 && b === 168) return 1000;
  if (a === 10) return 900;
  if (a === 172 && b >= 16 && b <= 31) return 800;
  if (a === 100) return 400;
  if (a === 169 && b === 254) return 50;
  return 200;
}

function pickPrimaryLanIp(ips) {
  if (!ips.length) return undefined;
  return [...ips].sort((x, y) => scoreLanIp(y) - scoreLanIp(x))[0];
}

function getMkcertBinaryPath() {
  const { getCacheDirectory } = require(path.join(root, "node_modules", "next", "dist", "lib", "helpers", "get-cache-directory.js"));
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

function regenerateMkcertAllLanHosts(binaryPath, keyFile, certFile, ipv4List) {
  const hosts = ["localhost", "127.0.0.1", "::1", ...ipv4List];
  const cmd = `"${binaryPath}" -install -key-file "${keyFile}" -cert-file "${certFile}" ${hosts.join(" ")}`;
  execSync(cmd, { stdio: "inherit", cwd: root, shell: process.platform === "win32" });
}

/**
 * @returns {{ mode: "keycert" | "experimental" | "http", keyFile?: string, certFile?: string }}
 */
async function prepareHttpsOrFallback(primary, ips) {
  const keyFile = path.join(root, "certificates", "localhost-key.pem");
  const certFile = path.join(root, "certificates", "localhost.pem");

  if (!primary) {
    return { mode: "experimental" };
  }

  const prevCwd = process.cwd();
  try {
    process.chdir(root);
    const mkcertPath = path.join(root, "node_modules", "next", "dist", "lib", "mkcert.js");
    const { createSelfSignedCertificate } = require(mkcertPath);
    const result = await createSelfSignedCertificate(primary);
    if (!result || !fs.existsSync(keyFile) || !fs.existsSync(certFile)) {
      throw new Error("Sertifika dosyalari olusmadi.");
    }
    if (ips.length > 1) {
      const bin = getMkcertBinaryPath();
      if (fs.existsSync(bin)) {
        console.log("Sertifikaya tum LAN IPv4 adresleri ekleniyor: " + ips.join(", "));
        try {
          regenerateMkcertAllLanHosts(bin, keyFile, certFile, ips);
        } catch (e) {
          console.warn("[UYARI] Coklu IP sertifika yenilemesi atlandi:", e instanceof Error ? e.message : e);
        }
      }
    }
    return { mode: "keycert", keyFile, certFile };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("[UYARI] HTTPS (mkcert) basarisiz, HTTP ile devam:", msg);
    return { mode: "http" };
  } finally {
    try {
      process.chdir(prevCwd);
    } catch {
      /* ignore */
    }
  }
}

async function main() {
  if (!fs.existsSync(nextBin)) {
    console.error("[HATA] node_modules bulunamadi. Once: npm install");
    process.exit(1);
  }

  const port = process.env.PORT || "3000";
  const { ips, ip6 } = mergeNextDevAllowedOriginsIntoEnv();
  const primary = pickPrimaryLanIp(ips);

  const forceHttp =
    process.env.DEV_USE_HTTP === "1" ||
    process.env.DEV_USE_HTTP === "true" ||
    String(process.env.DEV_USE_HTTP || "").toLowerCase() === "yes";
  const forceHttps =
    process.env.DEV_USE_HTTPS === "1" || process.env.DEV_USE_HTTPS === "true";

  /**
   * Hedef mod: LAN IP varsa ve HTTP zorlanmadiysa HTTPS (ogle davranisi).
   * Sadece localhost / LAN yok: HTTP daha sorunsuz.
   */
  let wantHttps = false;
  if (forceHttp) wantHttps = false;
  else if (forceHttps) wantHttps = true;
  else wantHttps = Boolean(primary);

  let httpsPrep = { mode: "http" };
  if (wantHttps) {
    httpsPrep = await prepareHttpsOrFallback(primary, ips);
    if (httpsPrep.mode === "http") {
      wantHttps = false;
    }
  }

  const usePlainHttp = !wantHttps;
  const proto = usePlainHttp ? "http" : "https";

  /** run-dev-plain.cjs ile aynı: Windows'ta varsayılan Webpack (Turbopack panik/HMR). */
  const forceWebpack =
    process.env.NEXT_DEV_WEBPACK === "1" || process.env.NEXT_DEV_WEBPACK === "true";
  const forceTurbopack =
    process.env.NEXT_DEV_TURBOPACK === "1" || process.env.NEXT_DEV_TURBOPACK === "true";
  let useWebpack = process.platform === "win32";
  if (forceWebpack) useWebpack = true;
  if (forceTurbopack) useWebpack = false;

  console.log("\n========== ilan-platformu (gelistirme / LAN) ==========");
  if (!usePlainHttp) {
    console.log("Mod: HTTPS — tarayicida https://IP:" + port + " kullanin.");
    console.log("     Sadece HTTP icin: npm run dev:http veya DEV_USE_HTTP=1");
  } else {
    console.log("Mod: HTTP — tarayicida http://IP:" + port + " kullanin.");
    if (primary) {
      console.log("     (HTTPS icin LAN IP gerekli; mkcert basarisiz olmus veya DEV_USE_HTTP=1)");
    }
    console.log("     HTTPS zorlamak: npm run dev:https veya DEV_USE_HTTPS=1");
  }
  if (useWebpack) {
    console.log(
      "Bundler: webpack" +
        (process.platform === "win32" && !forceWebpack && !forceTurbopack
          ? " (Windows varsayilan)"
          : ""),
    );
  } else {
    console.log(
      "Bundler: turbopack" +
        (process.platform === "win32" ? " (NEXT_DEV_TURBOPACK=1 ile acildi)" : " (macOS/Linux varsayilan)"),
    );
  }
  console.log("IPv4:", ips.length ? ips.join(", ") : "(yok)");
  if (ip6.length) console.log("IPv6 (dev allowlist):", ip6.join(", "));
  if (primary) console.log("Onerilen host: " + primary);
  console.log("");
  console.log("Ag baglantisi (Windows): npm run dev:firewall veya scripts/open-lan-firewall.cmd (yonetici)");
  console.log("Port kilitliyse: npm run dev:free");
  if (!usePlainHttp) {
    console.log("");
    console.log('"Baglanti guvenli degil" / sertifika uyarisi (PC tarayici): Yonetici terminalde bir kez:');
    console.log("  npm run trust:dev-cert");
    console.log("  Windows: npm run trust:dev-cert:uac  (UAC ile mkcert -install)");
    console.log("Telefon: ciktida gosterilen rootCA.pem dosyasini cihaza CA olarak yukleyin.");
  }
  console.log("");

  if (primary) {
    const base = proto + "://" + primary + ":" + port;
    console.log("Diger cihaz adresi: " + base);
    console.log(".env ornegi:");
    console.log('  APP_URL="' + base + '"');
    console.log('  NEXTAUTH_URL="' + base + '"');
    const appUrl = (process.env.APP_URL || "").toLowerCase();
    if (appUrl.includes("localhost") && !appUrl.includes(primary)) {
      console.log("");
      console.log("[UYARI] APP_URL hala localhost; ag icin yukaridaki IP tabanini kullanin.");
    }
    if (appUrl && usePlainHttp && appUrl.startsWith("https://") && appUrl.includes(primary)) {
      console.log("");
      console.log("[UYARI] Sunucu HTTP; https:// yerine http:// kullanin veya HTTPS ile yeniden baslatin.");
    }
    if (appUrl && !usePlainHttp && appUrl.startsWith("http://") && appUrl.includes(primary)) {
      console.log("");
      console.log("[UYARI] Sunucu HTTPS; APP_URL icin https:// kullanin.");
    }
  }
  console.log("Ctrl+C ile durdur.");
  console.log("========================================================\n");

  try {
    console.log("[dev] Prisma istemcisi senkronize ediliyor (prisma generate)…");
    execSync("npx prisma generate", {
      cwd: root,
      stdio: "inherit",
      env: process.env,
      shell: true,
    });
  } catch (e) {
    console.error("[dev] prisma generate basarisiz. Cozum: npm ci veya npx prisma generate");
    process.exit(1);
  }

  const nextArgs = ["dev", "-p", port, "-H", "0.0.0.0"];
  if (useWebpack) nextArgs.push("--webpack");
  else nextArgs.push("--turbopack");

  if (!usePlainHttp) {
    if (httpsPrep.mode === "keycert" && httpsPrep.keyFile && httpsPrep.certFile) {
      nextArgs.push(
        "--experimental-https",
        "--experimental-https-key",
        httpsPrep.keyFile,
        "--experimental-https-cert",
        httpsPrep.certFile,
      );
    } else if (httpsPrep.mode === "experimental") {
      nextArgs.push("--experimental-https");
    }
  }

  const child = spawn(process.execPath, [nextBin, ...nextArgs], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: false,
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
