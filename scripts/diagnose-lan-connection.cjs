/**
 * Telefon / LAN baglantisi sorunlarini tarar: IP, port dinleme, gucenlik duvari.
 * Calistirma: npm run lan:diagnose
 * Not: Sunucu calisiyorsa netstat daha anlamli olur.
 */
const { networkInterfaces } = require("node:os");
const { execSync } = require("node:child_process");

const PORT = String(process.env.PORT || "3000").trim();

function listLanIPv4() {
  const nets = networkInterfaces();
  const out = [];
  for (const name of Object.keys(nets)) {
    for (const iface of nets[name] ?? []) {
      const fam = iface.family;
      const isV4 = fam === "IPv4" || fam === 4;
      if (isV4 && !iface.internal) out.push({ name, address: iface.address });
    }
  }
  return out;
}

function netstatPort3000() {
  if (process.platform !== "win32") {
    try {
      return execSync(`sh -c 'command -v ss >/dev/null && ss -tlnp | grep ":${PORT}" || netstat -tlnp 2>/dev/null | grep ":${PORT}"'`, {
        encoding: "utf8",
      });
    } catch {
      return "(ss/netstat calistirilamadi)";
    }
  }
  try {
    return execSync(`netstat -ano | findstr ":${PORT}"`, { encoding: "utf8" });
  } catch {
    return "";
  }
}

function hasFirewallRule3000() {
  if (process.platform !== "win32") return null;
  try {
    const out = execSync(
      'netsh advfirewall firewall show rule name="ilan-platformu Next dev TCP 3000"',
      { encoding: "utf8" },
    );
    return out.includes("Enabled") || out.includes("Etkin");
  } catch {
    return false;
  }
}

function main() {
  console.log("\n=== LAN baglanti tani (ilan-platformu) ===\n");
  console.log("Port:", PORT, "\n");

  const ifaces = listLanIPv4();
  console.log("Bu PC IPv4 (Wi-Fi / Ethernet):");
  if (!ifaces.length) {
    console.log("  (harici IPv4 bulunamadi — kablosuz kapali veya baglanti yok)\n");
  } else {
    for (const i of ifaces) {
      console.log(`  ${i.address}  (${i.name})`);
    }
    console.log("");
    console.log("Telefonda adres: http://BURAYA_YAZIN:" + PORT + "  veya https://... (sunucu moduna gore)");
    console.log("NOT: IP degisirse (DHCP) ipconfig ile tekrar bakin.\n");
  }

  const ns = netstatPort3000();
  console.log("--- netstat (:" + PORT + ") ---");
  console.log(ns.trim() || "(bu portta dinleyen yok — sunucu kapali veya farkli port)");
  console.log("");

  const lines = ns.split(/\r?\n/).filter(Boolean);
  const listenAll = lines.some((l) => l.includes("LISTENING") && l.includes("0.0.0.0:" + PORT));
  const listenLocal = lines.some((l) => l.includes("LISTENING") && l.includes("127.0.0.1:" + PORT));
  if (lines.length && !listenAll && listenLocal) {
    console.log(
      "[UYARI] Sadece 127.0.0.1 dinleniyor gibi; agdan erisim icin sunucu 0.0.0.0 dinlemeli.\n" +
        "       Baslatma: npm run dev (run-dev-lan.cjs -H 0.0.0.0 kullanir).\n",
    );
  } else if (listenAll) {
    console.log("Tamam: 0.0.0.0:" + PORT + " LISTENING — agdan baglanti kabul edilir.\n");
  }

  const fw = hasFirewallRule3000();
  if (fw === false) {
    console.log("[UYARI] Gucenlik duvarinda 'ilan-platformu Next dev TCP " + PORT + "' kurali yok.");
    console.log("        Cozum: PowerShell'i YONETICI acin →  npm run dev:firewall");
    console.log("        veya: scripts\\open-lan-firewall.cmd  (sag tik Yonetici)\n");
  } else if (fw === true) {
    console.log("Tamam: Windows gucenlik duvari kurali (TCP " + PORT + ") gorunuyor.\n");
  }

  console.log("Kontrol listesi:");
  console.log("  1) Telefon ve PC ayni Wi-Fi (misafir ag / cihaz izolasyonu kapali olsun)");
  console.log("  2) Telefonda mobil veri kapali deneyin");
  console.log("  3) PC'de VPN kapali deneyin");
  console.log("  4) Sunucu acikken baska terminalde: npm run test:lan");
  console.log("");
}

main();
