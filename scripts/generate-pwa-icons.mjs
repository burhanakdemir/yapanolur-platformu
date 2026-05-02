/**
 * PWA / mağaza ikonları: src/app/icon.svg → public/icons/*.png
 * SVG güncellendikten sonra: npm run icons:pwa
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgPath = path.join(root, "src", "app", "icon.svg");
const outDir = path.join(root, "public", "icons");

async function main() {
  const svg = fs.readFileSync(svgPath);
  fs.mkdirSync(outDir, { recursive: true });

  const sizes = [
    [192, "icon-192.png"],
    [512, "icon-512.png"],
    [180, "apple-touch-icon.png"],
  ];

  for (const [size, name] of sizes) {
    await sharp(svg).resize(size, size).png().toFile(path.join(outDir, name));
    console.log("wrote", path.join("public/icons", name));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
