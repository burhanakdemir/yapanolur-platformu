/**
 * categoryId alani bos olan tum ilanlari, mevcut alt kategori (yaprak) id'lerinden
 * round-robin ile doldurur; alt yoksa kok kategorilere baglar.
 *
 * Calistirma: npm run db:backfill-ad-categories
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function getLeafCategoryIds(): Promise<string[]> {
  const leaves = await prisma.category.findMany({
    where: { parentId: { not: null } },
    select: { id: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  if (leaves.length > 0) {
    return leaves.map((c) => c.id);
  }
  const roots = await prisma.category.findMany({
    where: { parentId: null },
    select: { id: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return roots.map((c) => c.id);
}

async function main() {
  const leafIds = await getLeafCategoryIds();
  if (leafIds.length === 0) {
    console.error("Hic kategori yok; once kategori ekleyin.");
    process.exit(1);
  }

  const missing = await prisma.ad.findMany({
    where: { categoryId: null },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (missing.length === 0) {
    console.log("Guncellenecek ilan yok (categoryId bos).");
    await prisma.$disconnect();
    return;
  }

  let i = 0;
  for (const row of missing) {
    const catId = leafIds[i % leafIds.length]!;
    await prisma.ad.update({
      where: { id: row.id },
      data: { categoryId: catId },
    });
    i++;
  }

  console.log(`Tamam: ${missing.length} ilana kategori atandi (${leafIds.length} aday id, round-robin).`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
