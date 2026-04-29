import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { deleteSubcategoriesUnderRootId } from "../src/lib/categories";
import { DEFAULT_MAIN_CATEGORY_NAMES } from "../src/lib/mainCategoryNames";

async function main() {
  let totalDeleted = 0;
  let totalAds = 0;
  for (const name of DEFAULT_MAIN_CATEGORY_NAMES) {
    const root = await prisma.category.findFirst({
      where: { parentId: null, name },
    });
    if (!root) {
      console.warn(`Atlandi (kok yok): ${name}`);
      continue;
    }
    const r = await deleteSubcategoriesUnderRootId(root.id);
    totalDeleted += r.deleted;
    totalAds += r.adsDetached;
    console.log(`${name}: silinen ${r.deleted}, ilan baglantisi kaldirilan ${r.adsDetached}`);
  }
  console.log(`Toplam: ${totalDeleted} alt kategori, ${totalAds} ilan guncellemesi.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
