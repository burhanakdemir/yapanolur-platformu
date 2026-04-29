/**
 * Tum ilanlari (Ad) ve MEMBER rolundeki tum kullanicilari kalici olarak siler.
 * ADMIN kullanicilara dokunulmaz. Profesyon, kategori ve site ayarlari kalir.
 *
 * Calistirma: npx tsx scripts/wipe-members-and-ads.ts --yes
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const yes = process.argv.includes("--yes");
  if (!yes) {
    console.error(
      "UYARI: Tum ilanlar ve tum uye (MEMBER) hesaplari silinir; ADMIN kalir.\n" +
        "Devam icin: npx tsx scripts/wipe-members-and-ads.ts --yes",
    );
    process.exit(1);
  }

  try {
    const beforeAds = await prisma.ad.count();
    const beforeMembers = await prisma.user.count({ where: { role: "MEMBER" } });

    const result = await prisma.$transaction(async (tx) => {
      const ads = await tx.ad.deleteMany({});
      const members = await tx.user.deleteMany({ where: { role: "MEMBER" } });
      return { ads: ads.count, members: members.count };
    });

    console.log(`Once: ${beforeAds} ilan, ${beforeMembers} uye (MEMBER)`);
    console.log(`Silinen ilan: ${result.ads}`);
    console.log(`Silinen uye: ${result.members}`);
    console.log("Tamam.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
