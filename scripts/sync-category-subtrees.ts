import { disconnectScriptPrisma, prisma } from "./lib/prisma";
import { syncDefaultCategorySubtrees } from "../src/lib/defaultCategorySubtrees";

async function main() {
  await syncDefaultCategorySubtrees(prisma);
  const subs = await prisma.category.count({ where: { parentId: { not: null } } });
  console.log(`Alt kategori sayisi (toplam): ${subs}`);
  await disconnectScriptPrisma();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
