/**
 * yedek/category-export-from-sqlite.json içeriğini PostgreSQL'e aktarır.
 * Mevcut kategori ağacını (kökler tek tek silinir, CASCADE ile altlar gider) kaldırır;
 * ilanlardaki categoryId önce null yapılır (FK).
 *
 * Çalıştırma: npx tsx scripts/import-categories-from-sqlite-export.ts
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/lib/prisma";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const jsonPath = path.join(root, "yedek", "category-export-from-sqlite.json");

type Row = {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  imageUrl?: string | null;
};

async function main() {
  if (!fs.existsSync(jsonPath)) {
    console.error("Dosya yok:", jsonPath);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as Row[];
  if (!Array.isArray(raw) || raw.length === 0) {
    console.error("JSON boş veya geçersiz.");
    process.exit(1);
  }

  const byId = new Map(raw.map((r) => [r.id, r]));
  for (const r of raw) {
    if (r.parentId && !byId.has(r.parentId)) {
      console.error("Eksik ebeveyn id:", r.parentId, "satır:", r.name);
      process.exit(1);
    }
  }

  /** Önce kökler, sonra parentId eşlemesi olanlar (BFS). */
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
    console.error("Döngü veya kopuk parent var; sıralanamadı.");
    process.exit(1);
  }

  await prisma.$transaction(async (tx) => {
    await tx.ad.updateMany({
      where: { categoryId: { not: null } },
      data: { categoryId: null },
    });

    const existingRoots = await tx.category.findMany({
      where: { parentId: null },
      select: { id: true },
    });
    for (const { id } of existingRoots) {
      await tx.category.delete({ where: { id } });
    }

    for (const r of ordered) {
      await tx.category.create({
        data: {
          id: r.id,
          name: r.name,
          parentId: r.parentId,
          sortOrder: r.sortOrder,
          imageUrl: r.imageUrl?.trim() || null,
        },
      });
    }
  });

  console.log(`Tamam: ${ordered.length} kategori içe aktarıldı.`);
  console.log("Alt kategori görselleri için: npm run seed:category-images");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
