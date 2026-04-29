/**
 * Gelistirme sunucusu acikken LAN erisimini dogrular.
 * Calistirma: npm run test:lan  (once: npm run dev)
 */
const { networkInterfaces } = require("node:os");
const https = require("node:https");
const http = require("node:http");
const { execSync } = require("node:child_process");

const PORT = process.env.PORT || "3000";
const insecureHttps = new https.Agent({ rejectUnauthorized: false });

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

function requestOnce(url, agent) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.request(
      url,
      {
        method: "GET",
        timeout: 8000,
        agent: agent || false,
      },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
    req.end();
  });
}

function hasWindowsFirewallRule() {
  if (process.platform !== "win32") return null;
  try {
    const out = execSync(
      'netsh advfirewall firewall show rule name="ilan-platformu Next dev TCP 3000"',
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
    );
    return out.includes("Enabled") || out.includes("Etkin");
  } catch {
    return false;
  }
}

async function tryUrl(url, agent) {
  try {
    const code = await requestOnce(url, agent);
    return { ok: code === 200, code, err: null };
  } catch (e) {
    return { ok: false, code: null, err: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  const ips = listLanIPv4();
  const primary = pickPrimaryLanIp(ips);
  console.log("\n=== LAN test (ilan-platformu) ===\n");
  console.log("IPv4:", ips.length ? ips.join(", ") : "(yok)");

  let lanReachable = false;
  if (primary) {
    const httpsUrl = `https://${primary}:${PORT}/`;
    const httpUrl = `http://${primary}:${PORT}/`;
    let r = await tryUrl(httpsUrl, insecureHttps);
    if (r.ok) {
      console.log(`OK  ${httpsUrl}  -> HTTP ${r.code}`);
      lanReachable = true;
    } else {
      console.log(`--- ${httpsUrl}  -> ${r.err || `HTTP ${r.code}`}`);
      r = await tryUrl(httpUrl);
      if (r.ok) {
        console.log(`OK  ${httpUrl}  -> HTTP ${r.code}`);
        lanReachable = true;
      } else {
        console.log(`--- ${httpUrl}  -> ${r.err || `HTTP ${r.code}`}`);
      }
    }
  }

  const loopHttps = `https://127.0.0.1:${PORT}/`;
  const loopHttp = `http://127.0.0.1:${PORT}/`;
  let localReachable = false;
  let r = await tryUrl(loopHttps, insecureHttps);
  if (r.ok) {
    console.log(`OK  ${loopHttps}  -> HTTP ${r.code}`);
    localReachable = true;
  } else {
    console.log(`--- ${loopHttps}  -> ${r.err || `HTTP ${r.code}`}`);
    r = await tryUrl(loopHttp);
    if (r.ok) {
      console.log(`OK  ${loopHttp}  -> HTTP ${r.code}`);
      localReachable = true;
    } else {
      console.log(`--- ${loopHttp}  -> ${r.err || `HTTP ${r.code}`}`);
    }
  }

  if (!localReachable) {
    console.log("\n[HATA] Sunucu yanit vermiyor. Bu dizinde: npm run dev\n");
    process.exit(1);
  }

  if (primary && !lanReachable) {
    console.log(
      "\n[UYARI] Localhost calisiyor ama LAN IP'ye bu makineden bile ulasilamadi.",
    );
    console.log("Baska cihaz (telefon) icin genelde: Windows gucenlik duvari + ayni Wi-Fi gerekir.");
  }

  const fw = hasWindowsFirewallRule();
  if (fw === false) {
    console.log(
      "\n[UYARI] Windows gucenlik duvarinda 'ilan-platformu Next dev TCP 3000' kurali yok.",
    );
    console.log("Telefon / baska PC: PowerShell'i Yonetici olarak acip  npm run dev:firewall\n");
  } else if (fw === true) {
    console.log("\nTamam: Windows gucenlik duvari kurali (TCP 3000) gorunuyor.");
  }

  if (primary && lanReachable) {
    console.log(`\nLAN adresi: https://${primary}:${PORT}/  (self-signed: tarayicide guven / devam)`);
  }
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
