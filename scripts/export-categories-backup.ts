/**
 * Mevcut veritabanındaki kategori ağacını JSON olarak yedekler.
 *
 * Çıktı:
 *   yedek/category-backup-latest.json       — import ile uyumlu düz dizi (kök + alt)
 *   yedek/category-backup-<timestamp>.json  — aynı içerik, tarihli kopya
 *   yedek/subcategories-backup-latest.json  — sadece alt kategoriler (+ üst adı, okuma için)
 *   yedek/category-backup-meta.json         — sayım ve tarih
 *
 * Geri yükleme: import-categories-from-sqlite-export.ts içinde `jsonPath` değişkenini
 *   `yedek/category-backup-latest.json` yoluna ayarlayın (veya dosyayı o isimle kopyalayın).
 *
 * Çalıştırma: npm run backup:categories
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/lib/prisma";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const yedekDir = path.join(root, "yedek");

type Row = {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  imageUrl?: string | null;
};

async function main() {
  if (!fs.existsSync(yedekDir)) {
    fs.mkdirSync(yedekDir, { recursive: true });
  }

  const list = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      parentId: true,
      sortOrder: true,
      imageUrl: true,
    },
  });

  const raw: Row[] = list.map((c) => ({
    id: c.id,
    name: c.name,
    parentId: c.parentId,
    sortOrder: c.sortOrder,
    imageUrl: c.imageUrl?.trim() || null,
  }));

  const byId = new Map(raw.map((r) => [r.id, r]));
  for (const r of raw) {
    if (r.parentId && !byId.has(r.parentId)) {
      console.warn("Uyarı: ebeveyn id veritabanında yok:", r.parentId, "satır:", r.name);
    }
  }

  /** import-categories ile aynı sıra (BFS). */
  const roots = raw.filter((r) => r.parentId == null);
  const ordered: Row[] = [...roots];
  const seen = new Set(ordered.map((r) => r.id));
  let added = true;
  while (added) {
    added = false;
    for (const r of raw) {
      if (seen.has(r.id)) continue;
      if (r.parentId && seen.has(r.parentId)) {
        ordered.push(r);
        seen.add(r.id);
        added = true;
      }
    }
  }
  if (ordered.length !== raw.length) {
    console.error("Kategori ağacı sıralanamadı (döngü veya kopuk parent).");
    process.exit(1);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const datedPath = path.join(yedekDir, `category-backup-${stamp}.json`);
  const latestPath = path.join(yedekDir, "category-backup-latest.json");

  const jsonPretty = JSON.stringify(ordered, null, 2);
  fs.writeFileSync(datedPath, jsonPretty, "utf8");
  fs.writeFileSync(latestPath, jsonPretty, "utf8");

  const subs = ordered.filter((r) => r.parentId != null);
  const parentNameById = new Map(raw.map((r) => [r.id, r.name]));
  const readableSubs = subs.map((r) => ({
    id: r.id,
    name: r.name,
    parentId: r.parentId,
    parentName: r.parentId ? (parentNameById.get(r.parentId) ?? "(bilinmiyor)") : null,
    sortOrder: r.sortOrder,
    imageUrl: r.imageUrl ?? null,
  }));

  const subPath = path.join(yedekDir, "subcategories-backup-latest.json");
  fs.writeFileSync(subPath, JSON.stringify(readableSubs, null, 2), "utf8");

  const meta = {
    exportedAt: new Date().toISOString(),
    totalCategories: ordered.length,
    rootCount: roots.length,
    subcategoryCount: subs.length,
    files: {
      fullImportCompatible: "yedek/category-backup-latest.json",
      datedCopy: path.relative(root, datedPath).replace(/\\/g, "/"),
      subcategoriesOnly: "yedek/subcategories-backup-latest.json",
    },
    importNote:
      "Tam geri yükleme: import-categories-from-sqlite-export.ts içinde jsonPath → yedek/category-backup-latest.json. Script kökleri siler ve JSON'u yazar; ilan categoryId önce null olur.",
  };
  fs.writeFileSync(path.join(yedekDir, "category-backup-meta.json"), JSON.stringify(meta, null, 2), "utf8");

  console.log("Yedek kaydedildi:");
  console.log(" ", latestPath);
  console.log(" ", datedPath);
  console.log(" ", subPath);
  console.log(`Özet: ${meta.rootCount} kök, ${meta.subcategoryCount} alt, toplam ${meta.totalCategories}.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
