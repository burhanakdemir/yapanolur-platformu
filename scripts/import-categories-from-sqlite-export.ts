/**
 * yedek/category-export-from-sqlite.json içeriğini PostgreSQL'e aktarır.
 * Incremental/korumali mod:
 * - Mevcut kategori ağacını silmez.
 * - Önce dis kaynak id (row.id), bulunamazsa slug (ayni parent altinda) ile esler.
 * - Yeni kayıtları ekler; mevcutları güvenli şekilde günceller.
 * - imageUrl alanını varsayılan olarak overwrite etmez (sadece boşsa yazar).
 *
 * Çalıştırma: npx tsx scripts/import-categories-from-sqlite-export.ts
 * Opsiyonlar:
 *   --force-image-update  => imageUrl dolu olsa da importtaki degerle gunceller
 *   --dry-run             => veritabanina yazmadan plan/ozet raporlar
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
  overwriteImage?: boolean;
};

type ExistingCategory = {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  imageUrl: string | null;
};

type Counters = {
  created: number;
  updated: number;
  skipped: number;
};

function normalizeName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("tr-TR")
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseFlags() {
  const args = new Set(process.argv.slice(2));
  const forceImageUpdate =
    args.has("--force-image-update") ||
    process.env.IMPORT_CATEGORIES_FORCE_IMAGE_UPDATE === "1";
  const dryRun = args.has("--dry-run") || process.env.IMPORT_CATEGORIES_DRY_RUN === "1";
  return { forceImageUpdate, dryRun };
}

async function main() {
  const flags = parseFlags();
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

  /** Once kokler, sonra parentId eslesmesi olanlar (BFS). */
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
    console.error("Dongu veya kopuk parent var; siralanamadi.");
    process.exit(1);
  }

  const counters: Counters = { created: 0, updated: 0, skipped: 0 };
  const skippedReasons = new Map<string, number>();

  function incReason(reason: string) {
    skippedReasons.set(reason, (skippedReasons.get(reason) ?? 0) + 1);
    counters.skipped += 1;
  }

  const action = async (write: boolean) =>
    prisma.$transaction(async (tx) => {
      const existing = await tx.category.findMany({
        select: {
          id: true,
          name: true,
          parentId: true,
          sortOrder: true,
          imageUrl: true,
        },
      });

      const byExistingId = new Map<string, ExistingCategory>();
      const byParentAndSlug = new Map<string, ExistingCategory>();
      for (const c of existing) {
        byExistingId.set(c.id, c);
        byParentAndSlug.set(`${c.parentId ?? "ROOT"}::${normalizeName(c.name)}`, c);
      }

      /**
       * Import içindeki id -> DB id eşleşmesi.
       * Ebeveyn bağı için bunu kullanırız; orphan üretmeyiz.
       */
      const importIdToDbId = new Map<string, string>();

      for (const row of ordered) {
        const parentDbId = row.parentId ? importIdToDbId.get(row.parentId) ?? null : null;
        if (row.parentId && !parentDbId) {
          incReason(`parent-not-mapped:${row.parentId}`);
          continue;
        }

        const byIdMatch = byExistingId.get(row.id);
        const slugKey = `${parentDbId ?? "ROOT"}::${normalizeName(row.name)}`;
        const bySlugMatch = byParentAndSlug.get(slugKey);
        const matched = byIdMatch ?? bySlugMatch ?? null;

        const incomingImage = row.imageUrl?.trim() || null;

        if (matched) {
          importIdToDbId.set(row.id, matched.id);

          const nextName = row.name;
          const nextSortOrder = row.sortOrder;
          const shouldOverwriteImage =
            flags.forceImageUpdate || row.overwriteImage === true;
          const nextImageUrl =
            shouldOverwriteImage
              ? incomingImage
              : matched.imageUrl?.trim()
                ? matched.imageUrl
                : incomingImage;

          const hasChanges =
            matched.name !== nextName ||
            matched.parentId !== parentDbId ||
            matched.sortOrder !== nextSortOrder ||
            (matched.imageUrl ?? null) !== (nextImageUrl ?? null);

          if (!hasChanges) {
            incReason("no-change");
            continue;
          }

          if (write) {
            await tx.category.update({
              where: { id: matched.id },
              data: {
                name: nextName,
                parentId: parentDbId,
                sortOrder: nextSortOrder,
                imageUrl: nextImageUrl,
              },
            });
          }
          counters.updated += 1;

          const refreshed: ExistingCategory = {
            ...matched,
            name: nextName,
            parentId: parentDbId,
            sortOrder: nextSortOrder,
            imageUrl: nextImageUrl,
          };
          byExistingId.set(matched.id, refreshed);
          byParentAndSlug.set(`${parentDbId ?? "ROOT"}::${normalizeName(nextName)}`, refreshed);
          continue;
        }

        const created: ExistingCategory = write
          ? await tx.category.create({
              data: {
                id: row.id,
                name: row.name,
                parentId: parentDbId,
                sortOrder: row.sortOrder,
                imageUrl: incomingImage,
              },
              select: {
                id: true,
                name: true,
                parentId: true,
                sortOrder: true,
                imageUrl: true,
              },
            })
          : {
              id: row.id,
              name: row.name,
              parentId: parentDbId,
              sortOrder: row.sortOrder,
              imageUrl: incomingImage,
            };
        counters.created += 1;
        importIdToDbId.set(row.id, created.id);
        byExistingId.set(created.id, created);
        byParentAndSlug.set(
          `${created.parentId ?? "ROOT"}::${normalizeName(created.name)}`,
          created,
        );
      }
    });

  await action(!flags.dryRun);
  if (flags.dryRun) {
    console.log("[DRY-RUN] Yazma islemi yapilmadi.");
    console.log(
      `[DRY-RUN] Plan: create=${counters.created} update=${counters.updated} skip=${counters.skipped}`,
    );
  }

  console.log(
    `Tamam: create=${counters.created} update=${counters.updated} skip=${counters.skipped}`,
  );
  if (skippedReasons.size > 0) {
    console.log("Atlananlar (neden:sayi):");
    for (const [reason, count] of skippedReasons) {
      console.log(` - ${reason}: ${count}`);
    }
  }
  console.log(
    "Not: imageUrl varsayilan olarak korunur. Zorlamak icin --force-image-update kullanin.",
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
