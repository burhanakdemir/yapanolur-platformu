/**
 * .next ve tsbuildinfo temizliği. Windows'ta kilitli dosyalar için maxRetries kullanır.
 */
const fs = require("fs");
const path = require("path");

const rmOpts = { recursive: true, force: true, maxRetries: 15, retryDelay: 150 };

function rm(p) {
  try {
    fs.rmSync(p, rmOpts);
    console.log(`silindi: ${p}`);
  } catch (e) {
    if (e && e.code === "ENOENT") return;
    throw e;
  }
}

const root = process.cwd();
rm(path.join(root, ".next"));
try {
  fs.rmSync(path.join(root, "tsconfig.tsbuildinfo"), { force: true, maxRetries: 10, retryDelay: 100 });
  console.log("silindi: tsconfig.tsbuildinfo");
} catch (e) {
  if (e && e.code !== "ENOENT") throw e;
}
