import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { copyCategorySubtreeFromRootToRoot } from "../src/lib/categories";
import { DEFAULT_MAIN_CATEGORY_NAMES } from "../src/lib/mainCategoryNames";

/** İNŞAAT YAPIM PROJELERİ altındaki ağacı İNŞAAT TADİLAT PROJELERİ altına kopyalar. */
async function main() {
  const fromName = DEFAULT_MAIN_CATEGORY_NAMES[2];
  const toName = DEFAULT_MAIN_CATEGORY_NAMES[3];
  const src = await prisma.category.findFirst({ where: { parentId: null, name: fromName } });
  const dst = await prisma.category.findFirst({ where: { parentId: null, name: toName } });
  if (!src) {
    console.error(`Kok bulunamadi: ${fromName}`);
    process.exit(1);
  }
  if (!dst) {
    console.error(`Kok bulunamadi: ${toName}`);
    process.exit(1);
  }
  const r = await copyCategorySubtreeFromRootToRoot(src.id, dst.id);
  console.log(`Tamam: ${r.created} yeni kategori eklendi (${fromName} -> ${toName} alt agaci).`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
