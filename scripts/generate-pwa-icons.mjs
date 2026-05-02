/**
 * PWA / mağaza ikonları → public/icons/*.png, src/app/icon.png, src/app/favicon.ico
 * Kaynak: `brand.json` → `iconSourceFilename` (kısa ikon, `public/`), yoksa `logoFilename`, yoksa Android foreground
 * npm run icons:pwa
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import toIco from "to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const brandConfigPath = path.join(root, "src", "config", "brand.json");

function readBrandPaths() {
  const raw = fs.readFileSync(brandConfigPath, "utf8");
  const cfg = JSON.parse(raw);
  if (typeof cfg.logoFilename !== "string" || !cfg.logoFilename.trim()) {
    throw new Error(`Invalid brand.json: set "logoFilename" in ${path.relative(root, brandConfigPath)}`);
  }
  const logoPath = path.join(root, "public", cfg.logoFilename.trim());
  const iconName =
    typeof cfg.iconSourceFilename === "string" ? cfg.iconSourceFilename.trim() : "";
  const iconPath = iconName ? path.join(root, "public", iconName) : null;
  return { logoPath, iconPath };
}
const androidForeground = path.join(
  root,
  "mobile",
  "android",
  "app",
  "src",
  "main",
  "res",
  "mipmap-xxxhdpi",
  "ic_launcher_foreground.png",
);
const outDir = path.join(root, "public", "icons");
const appIconPng = path.join(root, "src", "app", "icon.png");
const appFaviconIco = path.join(root, "src", "app", "favicon.ico");

/** `app/icon.png` — sekme favicon; 32×32 retina’da bulanık kalır, 192 net görünür */
const APP_ICON_SIZE = 192;

const WHITE_BG = { r: 255, g: 255, b: 255, alpha: 1 };

function readBrandConfig() {
  const raw = fs.readFileSync(brandConfigPath, "utf8");
  return JSON.parse(raw);
}

/** #RRGGBB → sharp rgba; geçersizse beyaz */
function parseHexBg(hex) {
  if (typeof hex !== "string") return WHITE_BG;
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return WHITE_BG;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, alpha: 1 };
}

/** Kısa ikon (iconSource): varsayılan beyaz tuval; `iconCanvasBackground` ile geçersiz kılınır */
function resolveCanvasBg(cfg, kind) {
  if (kind === "icon") {
    const hex =
      typeof cfg.iconCanvasBackground === "string" && cfg.iconCanvasBackground.trim()
        ? cfg.iconCanvasBackground.trim()
        : "#ffffff";
    return parseHexBg(hex);
  }
  return WHITE_BG;
}

function pickSource() {
  const { logoPath, iconPath } = readBrandPaths();
  if (iconPath && fs.existsSync(iconPath)) return { path: iconPath, kind: "icon" };
  if (fs.existsSync(logoPath)) return { path: logoPath, kind: "logo" };
  if (fs.existsSync(androidForeground))
    return { path: androidForeground, kind: "android" };
  throw new Error(
    `No icon/logo PNG: add files under public/ per src/config/brand.json (iconSourceFilename / logoFilename), or ensure ${path.relative(root, androidForeground)}`,
  );
}

function sharpFromSource(srcPath) {
  return sharp(srcPath);
}

async function writeSquarePng(srcPath, size, outPath, bg) {
  await sharpFromSource(srcPath)
    .flatten({ background: bg })
    .resize(size, size, { fit: "contain", background: bg })
    .png()
    .toFile(outPath);
}

/** Çok boyutlu .ico — sekme / yer imi isteği aynı logoyu alır */
async function writeFaviconIco(srcPath, outPath, bg) {
  const pngBuffer = (size) =>
    sharpFromSource(srcPath)
      .flatten({ background: bg })
      .resize(size, size, { fit: "contain", background: bg })
      .png()
      .toBuffer();
  const [b16, b32, b48] = await Promise.all([
    pngBuffer(16),
    pngBuffer(32),
    pngBuffer(48),
  ]);
  const ico = await toIco([b16, b32, b48]);
  fs.writeFileSync(outPath, ico);
}

async function main() {
  const cfg = readBrandConfig();
  const { path: srcPath, kind } = pickSource();
  const bg = resolveCanvasBg(cfg, kind);
  const label = path.relative(root, srcPath);
  fs.mkdirSync(outDir, { recursive: true });

  const sizes = [
    [192, "icon-192.png"],
    [512, "icon-512.png"],
    [180, "apple-touch-icon.png"],
  ];

  for (const [size, name] of sizes) {
    const out = path.join(outDir, name);
    await writeSquarePng(srcPath, size, out, bg);
    console.log("wrote", path.join("public/icons", name), `(from ${label})`);
  }

  await writeSquarePng(srcPath, APP_ICON_SIZE, appIconPng, bg);
  console.log(
    "wrote",
    path.relative(root, appIconPng),
    `(${APP_ICON_SIZE}×${APP_ICON_SIZE}, from ${label})`,
  );

  await writeFaviconIco(srcPath, appFaviconIco, bg);
  console.log("wrote", path.relative(root, appFaviconIco), `(16/32/48, from ${label})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
