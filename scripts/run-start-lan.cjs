/**
 * Uretim sunucusu: npm PATH sart degil. Once `npm run build` gerekir.
 */
const { networkInterfaces } = require("node:os");
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

const root = path.join(__dirname, "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const buildId = path.join(root, ".next", "BUILD_ID");

function listLanIPv4() {
  const nets = networkInterfaces();
  const out = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      const fam = net.family;
      const isV4 = fam === "IPv4" || fam === 4;
      if (isV4 && !net.internal) out.push(net.address);
    }
  }
  return [...new Set(out)];
}

function main() {
  if (!fs.existsSync(nextBin)) {
    console.error("[HATA] node_modules yok. Once: npm install");
    process.exit(1);
  }
  if (!fs.existsSync(buildId)) {
    console.error("[HATA] Derleme yok. Once: npm run build");
    process.exit(1);
  }

  const ips = listLanIPv4();
  const first = ips[0];
  console.log("\n========== ilan-platformu (uretim) ==========");
  console.log("Ag IPv4:", ips.length ? ips.join(", ") : "(yok)");
  if (first) {
    console.log("Ornek URL: http://" + first + ":3000");
    console.log(".env APP_URL / NEXTAUTH_URL bu tabanla uyumlu olmali.");
  }
  console.log("=============================================\n");

  const child = spawn(
    process.execPath,
    [nextBin, "start", "-H", "0.0.0.0", "-p", "3000"],
    { cwd: root, stdio: "inherit", env: process.env, shell: false },
  );
  child.on("exit", (code) => process.exit(code ?? 0));
}

main();
