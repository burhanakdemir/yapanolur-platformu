/**
 * Mevcut ust/alt kategorilerinizi DEGISTIRMEZ; yalnizca onlari kullanarak 250 onayli ornek ilan uretir.
 * Alt kategori varsa ilanlar alt kategorilere; yoksa kok kategorilere baglanir.
 * Calistir: npm run seed:demo
 *
 * Demo uyeler: uye0001@ornek-demo.local ... (varsayilan 100 kisi) / sifre: demo123
 * Onceki demo uyeler silinir (CASCADE ile onlarin ilanlari gider), sonra yeniden uretilir.
 */
import "dotenv/config";
import type { PrismaClient } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/prisma";
import { nextMemberNumber } from "../src/lib/memberNumber";
import { createAdWithListingNumber } from "../src/lib/adListingNumber";
import { hashPassword } from "../src/lib/passwordHash";

const DEMO_EMAIL_SUFFIX = "@ornek-demo.local";
const DEMO_PASSWORD = "demo123";
/** Ornek ilan sahipleri (250 ilan icin yeterli dagilim) */
const MEMBER_COUNT = 100;
const AD_COUNT = 250;

const LOCATIONS: ReadonlyArray<{
  province: string;
  city: string;
  district: string;
  neighborhood: string;
}> = [
  { province: "Istanbul", city: "Istanbul", district: "Kadikoy", neighborhood: "Moda" },
  { province: "Istanbul", city: "Istanbul", district: "Besiktas", neighborhood: "Levent" },
  { province: "Istanbul", city: "Istanbul", district: "Umraniye", neighborhood: "Atasehir" },
  { province: "Ankara", city: "Ankara", district: "Cankaya", neighborhood: "Kizilay" },
  { province: "Ankara", city: "Ankara", district: "Yenimahalle", neighborhood: "Batikent" },
  { province: "Izmir", city: "Izmir", district: "Konak", neighborhood: "Alsancak" },
  { province: "Izmir", city: "Izmir", district: "Bornova", neighborhood: "Evka 3" },
  { province: "Bursa", city: "Bursa", district: "Nilufer", neighborhood: "Gorukle" },
  { province: "Antalya", city: "Antalya", district: "Muratpasa", neighborhood: "Lara" },
  { province: "Adana", city: "Adana", district: "Seyhan", neighborhood: "Kurtulus" },
  { province: "Kocaeli", city: "Kocaeli", district: "Izmit", neighborhood: "Yahyakaptan" },
  { province: "Mersin", city: "Mersin", district: "Yenisehir", neighborhood: "Pozcu" },
  { province: "Konya", city: "Konya", district: "Selcuklu", neighborhood: "Sille" },
  { province: "Gaziantep", city: "Gaziantep", district: "Sahinbey", neighborhood: "Sehitkamil" },
  { province: "Eskisehir", city: "Eskisehir", district: "Odunpazari", neighborhood: "Arifiye" },
];

const TITLE_PREFIXES = [
  "Acil",
  "Kapsamli",
  "2026",
  "Kurumsal",
  "Belediye",
  "Ozel Sektör",
  "Karma Kullanim",
  "Yatirim",
  "Teknik",
  "Anahtar Teslim",
];

const TITLE_SUFFIXES = [
  "ihale projesi",
  "kesif ve metraj",
  "danismanlik hizmeti",
  "teknik sartname hazirligi",
  "uygulama projesi",
  "kontrolluk hizmeti",
  "teknik destek",
  "revizyon calismasi",
  "saha denetimi",
  "malzeme temini",
];

const SAMPLE_PHOTO =
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[randomInt(0, arr.length - 1)]!;
}

async function getLeafCategoryIds(prisma: PrismaClient): Promise<string[]> {
  const leaves = await prisma.category.findMany({
    where: { parentId: { not: null } },
    select: { id: true },
  });
  if (leaves.length > 0) {
    return leaves.map((c) => c.id);
  }
  const roots = await prisma.category.findMany({
    where: { parentId: null },
    select: { id: true },
  });
  return roots.map((c) => c.id);
}

async function main() {
  const leafIds = await getLeafCategoryIds(prisma);
  if (leafIds.length === 0) {
    throw new Error("Hic kategori yok; once seed veya admin ile kategori ekleyin.");
  }
  const subCount = await prisma.category.count({ where: { parentId: { not: null } } });
  console.log(
    subCount > 0
      ? `Ilanlar mevcut ${subCount} alt kategoriden rastgele secilerek atanacak.`
      : `Alt kategori yok; ilanlar ${leafIds.length} kok kategoriye baglanacak.`,
  );

  const demoUserCount = await prisma.user.count({
    where: { email: { endsWith: DEMO_EMAIL_SUFFIX } },
  });
  if (demoUserCount > 0) {
    console.log(`Onceki demo uyeler siliniyor (${demoUserCount})...`);
    await prisma.user.deleteMany({
      where: { email: { endsWith: DEMO_EMAIL_SUFFIX } },
    });
  }

  const demoPasswordHash = await hashPassword(DEMO_PASSWORD);

  console.log(`${MEMBER_COUNT} ornek uye olusturuluyor...`);
  const userIds: string[] = [];

  for (let i = 1; i <= MEMBER_COUNT; i++) {
    const email = `uye${String(i).padStart(4, "0")}${DEMO_EMAIL_SUFFIX}`;
    const u = await prisma.$transaction(async (tx) => {
      const n = await nextMemberNumber(tx);
      return tx.user.create({
        data: {
          email,
          name: `Ornek Uye ${i}`,
          password: demoPasswordHash,
          role: "MEMBER",
          memberNumber: n,
          isMemberApproved: true,
        },
      });
    });
    userIds.push(u.id);
    if (i % 50 === 0) console.log(`  ... ${i}/${MEMBER_COUNT}`);
  }

  console.log(`${AD_COUNT} ornek ilan olusturuluyor...`);
  const categoryMeta = await prisma.category.findMany({
    where: { id: { in: leafIds } },
    select: { id: true, name: true, parent: { select: { name: true } } },
  });
  const metaById = new Map(categoryMeta.map((c) => [c.id, c]));

  for (let i = 0; i < AD_COUNT; i++) {
    const ownerId = pick(userIds);
    const catId = pick(leafIds);
    const meta = metaById.get(catId);
    const catLabel = meta?.parent?.name ? `${meta.parent.name} / ${meta.name}` : meta?.name ?? "Genel";
    const loc = pick(LOCATIONS);
    const title = `${pick(TITLE_PREFIXES)} ${catLabel} — ${pick(TITLE_SUFFIXES)} #${i + 1}`;
    const description =
      `${catLabel} kapsaminda ornek ilan. Teknik detaylar, sure ve odeme kosullari teklif sonrasi paylasilir. ` +
      `Konum: ${loc.district}, ${loc.city}. Ilan numarasi otomatik atanir.`;

    await createAdWithListingNumber(prisma, {
      owner: { connect: { id: ownerId } },
      category: { connect: { id: catId } },
      title: title.slice(0, 200),
      description: description.slice(0, 4000),
      startingPriceTry: randomInt(25_000, 2_500_000),
      auctionEndsAt: new Date(Date.now() + randomInt(7, 45) * 24 * 60 * 60 * 1000),
      city: loc.city,
      province: loc.province,
      district: loc.district,
      neighborhood: loc.neighborhood,
      blockNo: String(randomInt(1, 400)),
      parcelNo: String(randomInt(1, 800)),
      status: "APPROVED",
      approvedAt: new Date(),
      photos: {
        create: [{ url: SAMPLE_PHOTO, sortOrder: 0 }],
      },
    });

    if ((i + 1) % 50 === 0) console.log(`  ... ${i + 1}/${AD_COUNT}`);
  }

  console.log("Tamam.");
  console.log(`Uyeler: ${MEMBER_COUNT} (${DEMO_EMAIL_SUFFIX}, sifre: ${DEMO_PASSWORD})`);
  console.log(`Ilanlar: ${AD_COUNT} (onayli, mevcut kategorilere bagli)`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
