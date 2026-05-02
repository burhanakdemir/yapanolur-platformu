/**
 * PWA / mağaza ikonları → public/icons/*.png, src/app/icon.png, src/app/favicon.ico
 * Logo dosyası: `src/config/brand.json` → `logoFilename` (`public/` altında)
 * Yedek kaynak: Android `ic_launcher_foreground` (logo yoksa)
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
function readLogoPngPath() {
  const raw = fs.readFileSync(brandConfigPath, "utf8");
  const { logoFilename } = JSON.parse(raw);
  if (typeof logoFilename !== "string" || !logoFilename.trim()) {
    throw new Error(`Invalid brand.json: set "logoFilename" in ${path.relative(root, brandConfigPath)}`);
  }
  return path.join(root, "public", logoFilename);
}
const logoPng = readLogoPngPath();
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

/** PWA / favicon kare alanı: logo dışındaki padding (beyaz) */
const BG = { r: 255, g: 255, b: 255, alpha: 1 };

function pickSource() {
  if (fs.existsSync(logoPng)) return { path: logoPng };
  if (fs.existsSync(androidForeground)) return { path: androidForeground };
  throw new Error(
    `No logo PNG: place file named in src/config/brand.json under public/, or ensure ${path.relative(root, androidForeground)} exists`,
  );
}

function sharpFromSource(srcPath) {
  return sharp(srcPath);
}

async function writeSquarePng(src, size, outPath) {
  await sharpFromSource(src)
    .flatten({ background: BG })
    .resize(size, size, { fit: "contain", background: BG })
    .png()
    .toFile(outPath);
}

/** Çok boyutlu .ico — sekme / yer imi isteği aynı logoyu alır */
async function writeFaviconIco(srcPath, outPath) {
  const pngBuffer = (size) =>
    sharpFromSource(srcPath)
      .flatten({ background: BG })
      .resize(size, size, { fit: "contain", background: BG })
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
  const { path: srcPath } = pickSource();
  const label = path.relative(root, srcPath);
  fs.mkdirSync(outDir, { recursive: true });

  const sizes = [
    [192, "icon-192.png"],
    [512, "icon-512.png"],
    [180, "apple-touch-icon.png"],
  ];

  for (const [size, name] of sizes) {
    const out = path.join(outDir, name);
    await writeSquarePng(srcPath, size, out);
    console.log("wrote", path.join("public/icons", name), `(from ${label})`);
  }

  await writeSquarePng(srcPath, APP_ICON_SIZE, appIconPng);
  console.log(
    "wrote",
    path.relative(root, appIconPng),
    `(${APP_ICON_SIZE}×${APP_ICON_SIZE}, from ${label})`,
  );

  await writeFaviconIco(srcPath, appFaviconIco);
  console.log("wrote", path.relative(root, appFaviconIco), `(16/32/48, from ${label})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
