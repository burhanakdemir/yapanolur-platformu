/**
 * Yerel/ag HTTP gelistirme: 0.0.0.0:3000 (PORT ile degistirilebilir)
 *
 * Windows'ta Turbopack, Prisma / `pg` gibi bagimliliklar icin junction olustururken
 * Unicode yol veya kilitli .next durumunda
 * hata verebilir; bu betik win32'de varsayilan olarak --webpack kullanir.
 * Zorla Turbopack: NEXT_DEV_TURBOPACK=1
 * Zorla Webpack: NEXT_DEV_WEBPACK=1 (run-dev-lan.cjs ile ayni anahtar)
 */
const { spawn } = require("node:child_process");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("./merge-next-dev-allowed-origins.cjs").mergeNextDevAllowedOriginsIntoEnv();

const root = path.join(__dirname, "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

const portRaw = String(process.env.PORT || "3000").trim();
const port = /^\d+$/.test(portRaw) ? portRaw : "3000";

const forceWebpack =
  process.env.NEXT_DEV_WEBPACK === "1" || process.env.NEXT_DEV_WEBPACK === "true";
const forceTurbopack =
  process.env.NEXT_DEV_TURBOPACK === "1" || process.env.NEXT_DEV_TURBOPACK === "true";

let useWebpack = process.platform === "win32";
if (forceWebpack) useWebpack = true;
if (forceTurbopack) useWebpack = false;

const nextArgs = ["dev", "-p", port, "-H", "0.0.0.0"];
if (useWebpack) nextArgs.push("--webpack");
else nextArgs.push("--turbopack");

const child = spawn(process.execPath, [nextBin, ...nextArgs], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
  shell: false,
});
child.on("exit", (code) => process.exit(code ?? 0));
