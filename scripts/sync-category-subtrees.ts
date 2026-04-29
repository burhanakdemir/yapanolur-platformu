import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { syncDefaultCategorySubtrees } from "../src/lib/defaultCategorySubtrees";

async function main() {
  await syncDefaultCategorySubtrees(prisma);
  const subs = await prisma.category.count({ where: { parentId: { not: null } } });
  console.log(`Alt kategori sayisi (toplam): ${subs}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
