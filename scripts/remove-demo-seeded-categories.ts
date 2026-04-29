/**
 * Demo tohumunun ekledigi ust (ve CASCADE ile alt) kategorileri siler.
 * npx tsx scripts/remove-demo-seeded-categories.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { DEMO_SEEDED_PARENT_CATEGORY_NAMES } from "./demoSeededCategoryNames";

async function main() {
  const found = await prisma.category.findMany({
    where: {
      parentId: null,
      name: { in: [...DEMO_SEEDED_PARENT_CATEGORY_NAMES] },
    },
    select: { id: true, name: true },
  });

  if (found.length === 0) {
    console.log("Silinecek demo ust kategori yok (zaten temiz veya adlar eslesmedi).");
    await prisma.$disconnect();
    return;
  }

  const res = await prisma.category.deleteMany({
    where: {
      parentId: null,
      name: { in: [...DEMO_SEEDED_PARENT_CATEGORY_NAMES] },
    },
  });

  console.log(`Silinen demo ust kategori: ${res.count} (alt kategoriler CASCADE ile gitti).`);
  console.log(
    "Bu kategorilere bagli ilanlarin categoryId alani null olur (Ad onDelete: SetNull).",
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
