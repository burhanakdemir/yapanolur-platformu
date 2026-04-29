/**
 * DHCP ile degisen LAN IP icin `.env` icindeki APP_URL ve NEXTAUTH_URL satirlarini
 * guncel birincil IPv4 ile esitler.
 *
 * Kullanim:
 *   node scripts/sync-lan-env.cjs              -> http://IP:PORT (dev:plain, dev:http, telefon)
 *   node scripts/sync-lan-env.cjs --https      -> https://IP:PORT (npm run dev mkcert)
 *   npm run env:lan
 */
const fs = require("node:fs");
const path = require("node:path");
const { networkInterfaces } = require("node:os");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

function listLanIPv4() {
  const nets = networkInterfaces();
  const out = [];
  for (const name of Object.keys(nets)) {
    for (const iface of nets[name] ?? []) {
      const fam = iface.family;
      const isV4 = fam === "IPv4" || fam === 4;
      if (isV4 && !iface.internal) out.push(iface.address);
    }
  }
  return [...new Set(out)];
}

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

function main() {
  const port = process.env.PORT || "3000";
  const ips = listLanIPv4();
  const primary = pickPrimaryLanIp(ips);

  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) {
    console.error("[HATA] .env bulunamadi. .env.example dosyasini kopyalayin.");
    process.exit(1);
  }

  if (!primary) {
    console.warn("[UYARI] Harici IPv4 yok (Wi-Fi kapali?). APP_URL guncellenmedi.");
    process.exit(0);
  }

  /** Varsayilan http: dev:plain / dev:http ile uyumlu. HTTPS icin: --https */
  const proto = process.argv.includes("--https") ? "https" : "http";
  const base = `${proto}://${primary}:${port}`;

  let raw = fs.readFileSync(envPath, "utf8");
  const lines = raw.split(/\r?\n/);
  let appSet = false;
  let nextauthSet = false;
  const out = lines.map((line) => {
    if (/^APP_URL=/.test(line)) {
      appSet = true;
      return `APP_URL="${base}"`;
    }
    if (/^NEXTAUTH_URL=/.test(line)) {
      nextauthSet = true;
      return `NEXTAUTH_URL="${base}"`;
    }
    return line;
  });

  if (!appSet) out.push(`APP_URL="${base}"`);
  if (!nextauthSet) out.push(`NEXTAUTH_URL="${base}"`);

  fs.writeFileSync(envPath, out.join("\n").replace(/\n+$/, "\n"), "utf8");
  console.log(`Tamam: APP_URL ve NEXTAUTH_URL -> ${base}`);
  if (proto === "https") {
    console.log("HTTPS modu: sunucu olarak `npm run dev` kullanin.");
  } else {
    console.log("HTTP modu: `npm run dev:plain` veya `npm run dev:http` ile uyumlu.");
  }
  console.log("Sunucuyu yeniden baslatin. Telefonda bu adresi acin.");
}

main();
