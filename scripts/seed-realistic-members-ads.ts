/**
 * 250 gercekci uye (isim, sehir, meslek) + 600 ilan.
 * Ust/alt kategori yapisina DOKUNMAZ; yalnizca mevcut yaprak kategorileri kullanir.
 * Once ayni e-posta sonekiyle uretilmis uyeleri siler (@seed-gercek.local).
 *
 * Calistir: npx tsx scripts/seed-realistic-members-ads.ts
 * veya: npm run seed:gercek
 */
import "dotenv/config";
import type { PrismaClient } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/prisma";
import { syncDefaultProfessions } from "../src/lib/defaultProfessions";
import { nextMemberNumber } from "../src/lib/memberNumber";
import { createAdWithListingNumber } from "../src/lib/adListingNumber";
import { hashPassword } from "../src/lib/passwordHash";

const SEED_EMAIL_SUFFIX = "@seed-gercek.local";
const SEED_PASSWORD = "Seed2026!";
const MEMBER_COUNT = 250;
const AD_COUNT = 600;

const SAMPLE_PHOTO =
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80";

type Loc = { province: string; city: string; district: string; neighborhood: string };

/** 50 il x 5 ilce = 250 konum (uye kayit adresi ve ilan konumu) */
const CITY_BLOCKS: ReadonlyArray<{ province: string; city: string; districts: readonly string[] }> = [
  { province: "İstanbul", city: "İstanbul", districts: ["Kadıköy", "Beşiktaş", "Üsküdar", "Bakırköy", "Şişli"] },
  { province: "Ankara", city: "Ankara", districts: ["Çankaya", "Keçiören", "Mamak", "Yenimahalle", "Etimesgut"] },
  { province: "İzmir", city: "İzmir", districts: ["Konak", "Bornova", "Karşıyaka", "Buca", "Çiğli"] },
  { province: "Bursa", city: "Bursa", districts: ["Nilüfer", "Osmangazi", "Yıldırım", "Mudanya", "Gemlik"] },
  { province: "Antalya", city: "Antalya", districts: ["Muratpaşa", "Kepez", "Konyaaltı", "Alanya", "Manavgat"] },
  { province: "Adana", city: "Adana", districts: ["Seyhan", "Çukurova", "Yüreğir", "Sarıçam", "Ceyhan"] },
  { province: "Konya", city: "Konya", districts: ["Selçuklu", "Karatay", "Meram", "Akören", "Ereğli"] },
  { province: "Gaziantep", city: "Gaziantep", districts: ["Şahinbey", "Şehitkamil", "Nizip", "İslahiye", "Nurdağı"] },
  { province: "Kocaeli", city: "Kocaeli", districts: ["İzmit", "Gebze", "Darıca", "Körfez", "Gölcük"] },
  { province: "Mersin", city: "Mersin", districts: ["Yenişehir", "Toroslar", "Mezitli", "Tarsus", "Erdemli"] },
  { province: "Diyarbakır", city: "Diyarbakır", districts: ["Bağlar", "Kayapınar", "Sur", "Bismil", "Ergani"] },
  { province: "Hatay", city: "Hatay", districts: ["Antakya", "İskenderun", "Defne", "Arsuz", "Dörtyol"] },
  { province: "Manisa", city: "Manisa", districts: ["Şehzadeler", "Yunusemre", "Akhisar", "Salihli", "Turgutlu"] },
  { province: "Kayseri", city: "Kayseri", districts: ["Melikgazi", "Kocasinan", "Talas", "İncesu", "Develi"] },
  { province: "Samsun", city: "Samsun", districts: ["İlkadım", "Atakum", "Canik", "Bafra", "Çarşamba"] },
  { province: "Balıkesir", city: "Balıkesir", districts: ["Karesi", "Altıeylül", "Bandırma", "Edremit", "Ayvalık"] },
  { province: "Kahramanmaraş", city: "Kahramanmaraş", districts: ["Dulkadiroğlu", "Onikişubat", "Elbistan", "Afşin", "Pazarcık"] },
  { province: "Van", city: "Van", districts: ["İpekyolu", "Tuşba", "Edremit", "Erciş", "Çaldıran"] },
  { province: "Denizli", city: "Denizli", districts: ["Merkezefendi", "Pamukkale", "Acıpayam", "Çivril", "Tavas"] },
  { province: "Şanlıurfa", city: "Şanlıurfa", districts: ["Eyyübiye", "Haliliye", "Karaköprü", "Siverek", "Viranşehir"] },
  { province: "Tekirdağ", city: "Tekirdağ", districts: ["Süleymanpaşa", "Çorlu", "Çerkezköy", "Malkara", "Saray"] },
  { province: "Muğla", city: "Muğla", districts: ["Menteşe", "Bodrum", "Fethiye", "Marmaris", "Milas"] },
  { province: "Eskişehir", city: "Eskişehir", districts: ["Odunpazarı", "Tepebaşı", "Sivrihisar", "İnönü", "Alpu"] },
  { province: "Mardin", city: "Mardin", districts: ["Artuklu", "Kızıltepe", "Midyat", "Nusaybin", "Derik"] },
  { province: "Batman", city: "Batman", districts: ["Merkez", "Beşiri", "Gercüş", "Hasankeyf", "Kozluk"] },
  { province: "Elazığ", city: "Elazığ", districts: ["Merkez", "Kovancılar", "Karakoçan", "Maden", "Palu"] },
  { province: "Tokat", city: "Tokat", districts: ["Merkez", "Erbaa", "Niksar", "Turhal", "Zile"] },
  { province: "Kütahya", city: "Kütahya", districts: ["Merkez", "Tavşanlı", "Simav", "Gediz", "Domaniç"] },
  { province: "Trabzon", city: "Trabzon", districts: ["Ortahisar", "Akçaabat", "Araklı", "Of", "Yomra"] },
  { province: "Malatya", city: "Malatya", districts: ["Battalgazi", "Yeşilyurt", "Darende", "Hekimhan", "Pütürge"] },
  { province: "Ordu", city: "Ordu", districts: ["Altınordu", "Ünye", "Fatsa", "Perşembe", "Korgan"] },
  { province: "Aydın", city: "Aydın", districts: ["Efeler", "Nazilli", "Söke", "Kuşadası", "Didim"] },
  { province: "Erzurum", city: "Erzurum", districts: ["Yakutiye", "Palandöken", "Aziziye", "Pasinler", "Horasan"] },
  { province: "Afyonkarahisar", city: "Afyonkarahisar", districts: ["Merkez", "Sandıklı", "Dinar", "Bolvadin", "İhsaniye"] },
  { province: "Sivas", city: "Sivas", districts: ["Merkez", "Şarkışla", "Yıldızeli", "Suşehri", "Gemerek"] },
  { province: "Zonguldak", city: "Zonguldak", districts: ["Merkez", "Ereğli", "Çaycuma", "Devrek", "Alaplı"] },
  { province: "Kırıkkale", city: "Kırıkkale", districts: ["Merkez", "Yahşihan", "Keskin", "Delice", "Balışeyh"] },
  { province: "Osmaniye", city: "Osmaniye", districts: ["Merkez", "Kadirli", "Düziçi", "Toprakkale", "Bahçe"] },
  { province: "Çorum", city: "Çorum", districts: ["Merkez", "Sungurlu", "Osmancık", "İskilip", "Alaca"] },
  { province: "Edirne", city: "Edirne", districts: ["Merkez", "Keşan", "Uzunköprü", "Havsa", "İpsala"] },
  { province: "Çanakkale", city: "Çanakkale", districts: ["Merkez", "Biga", "Çan", "Gelibolu", "Ayvacık"] },
  { province: "Kırşehir", city: "Kırşehir", districts: ["Merkez", "Kaman", "Mucur", "Akpınar", "Boztepe"] },
  { province: "Uşak", city: "Uşak", districts: ["Merkez", "Banaz", "Eşme", "Karahallı", "Sivaslı"] },
  { province: "Isparta", city: "Isparta", districts: ["Merkez", "Yalvaç", "Eğirdir", "Atabey", "Gönen"] },
  { province: "Bolu", city: "Bolu", districts: ["Merkez", "Gerede", "Mudurnu", "Göynük", "Yeniçağa"] },
  { province: "Yalova", city: "Yalova", districts: ["Merkez", "Çınarcık", "Termal", "Altınova", "Armutlu"] },
  { province: "Karabük", city: "Karabük", districts: ["Merkez", "Safranbolu", "Eflani", "Eskipazar", "Ovacık"] },
  { province: "Nevşehir", city: "Nevşehir", districts: ["Merkez", "Ürgüp", "Avanos", "Gülşehir", "Derinkuyu"] },
  { province: "Düzce", city: "Düzce", districts: ["Merkez", "Akçakoca", "Yığılca", "Kaynaşlı", "Gölyaka"] },
  { province: "Burdur", city: "Burdur", districts: ["Merkez", "Bucak", "Gölhisar", "Tefenni", "Yeşilova"] },
  { province: "Aksaray", city: "Aksaray", districts: ["Merkez", "Ortaköy", "Eskil", "Gülağaç", "Güzelyurt"] },
  { province: "Çankırı", city: "Çankırı", districts: ["Merkez", "Çerkeş", "Ilgaz", "Kurşunlu", "Şabanözü"] },
];

const MAHALLE = [
  "Cumhuriyet",
  "Fatih",
  "Yıldırım",
  "İnönü",
  "Bahçelievler",
  "Kültür",
  "Yenişehir",
  "Barbaros",
  "Zeytinburnu",
  "Yavuz Selim",
];

function buildLocations(): Loc[] {
  const out: Loc[] = [];
  let i = 0;
  for (const b of CITY_BLOCKS) {
    for (const d of b.districts) {
      out.push({
        province: b.province,
        city: b.city,
        district: d,
        neighborhood: `${MAHALLE[i % MAHALLE.length]} Mah.`,
      });
      i++;
    }
  }
  return out;
}

const FIRST_NAMES = [
  "Ahmet",
  "Mehmet",
  "Mustafa",
  "Ali",
  "Hüseyin",
  "Hasan",
  "İbrahim",
  "Osman",
  "Yusuf",
  "Murat",
  "Emre",
  "Burak",
  "Can",
  "Kerem",
  "Onur",
  "Ayşe",
  "Fatma",
  "Hatice",
  "Zeynep",
  "Elif",
  "Merve",
  "Seda",
  "Gizem",
  "Burcu",
  "Ceren",
  "Deniz",
  "Ebru",
  "Esra",
  "Hülya",
  "Şule",
];

const LAST_NAMES = [
  "Yılmaz",
  "Kaya",
  "Demir",
  "Şahin",
  "Çelik",
  "Yıldız",
  "Yıldırım",
  "Öztürk",
  "Aydın",
  "Özdemir",
  "Arslan",
  "Doğan",
  "Kılıç",
  "Aslan",
  "Çetin",
  "Kara",
  "Koç",
  "Kurt",
  "Özkan",
  "Erdoğan",
  "Şimşek",
  "Polat",
  "Güneş",
  "Bulut",
  "Türk",
  "Aktaş",
  "Tekin",
  "Kaplan",
  "Yavuz",
  "Işık",
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPhone(): string {
  return `05${randomInt(30, 99)} ${randomInt(100, 999)} ${randomInt(10, 99)} ${randomInt(10, 99)}`;
}

function fullNameForIndex(i: number): string {
  const fn = FIRST_NAMES[i % FIRST_NAMES.length]!;
  const ln = LAST_NAMES[(i * 17 + 7) % LAST_NAMES.length]!;
  return `${fn} ${ln}`;
}

function profScopeTr(profName: string): string {
  const p = profName.toLowerCase();
  if (p.includes("mimar")) return "mimari proje, aplikasyon ve şantiye koordinasyonu";
  if (p.includes("mühendis")) return "teknik danışmanlık, hesap ve şartname hazırlığı";
  if (p.includes("tekniker") || p.includes("teknik ressam")) return "metraj, çizim ve saha ölçüm desteği";
  if (p.includes("usta") || p.includes("işçi") || p.includes("operatör")) return "uygulama, tadilat ve işçilik hizmeti";
  if (p.includes("denetim") || p.includes("isg") || p.includes("sağlık")) return "denetim ve mevzuat uyumu";
  return "mesleki keşif, teklif ve uygulama desteği";
}

function buildTitleAndDescription(args: {
  index: number;
  professionName: string;
  categoryLabel: string;
  loc: Loc;
}): { title: string; description: string } {
  const scope = profScopeTr(args.professionName);
  const title = `${args.loc.district} / ${args.loc.city} — ${args.categoryLabel.slice(0, 80)} (${args.professionName}) #${args.index + 1}`;
  const description =
    `${args.loc.city}, ${args.loc.district} bölgesinde ${args.professionName} olarak ${scope} kapsamında talep edilmektedir. ` +
    `Konum: ${args.loc.neighborhood}. İlgili kategori: ${args.categoryLabel}. ` +
    `Teklifler değerlendirilecek; süre ve ödeme koşulları görüşme sonrası netleştirilecektir.`;

  return {
    title: title.slice(0, 200),
    description: description.slice(0, 4000),
  };
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

type MemberCtx = {
  userId: string;
  loc: Loc;
  profession: { id: string; name: string };
};

async function main() {
  await syncDefaultProfessions(prisma);
  const seedPasswordHash = await hashPassword(SEED_PASSWORD);

  const locations = buildLocations();
  if (locations.length < MEMBER_COUNT) {
    throw new Error(`Konum sayisi yetersiz: ${locations.length} < ${MEMBER_COUNT}`);
  }

  const leafIds = await getLeafCategoryIds(prisma);
  if (leafIds.length === 0) {
    throw new Error("Hic kategori yok; once npm run seed ile kok kategorileri olusturun.");
  }

  const professions = await prisma.profession.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
  if (professions.length === 0) {
    throw new Error("Meslek listesi bos.");
  }

  const prev = await prisma.user.count({
    where: { email: { endsWith: SEED_EMAIL_SUFFIX } },
  });
  if (prev > 0) {
    console.log(`Onceki seed uyeler siliniyor (${prev})...`);
    await prisma.user.deleteMany({
      where: { email: { endsWith: SEED_EMAIL_SUFFIX } },
    });
  }

  const categoryMeta = await prisma.category.findMany({
    where: { id: { in: leafIds } },
    select: { id: true, name: true, parent: { select: { name: true } } },
  });
  const metaById = new Map(categoryMeta.map((c) => [c.id, c]));

  console.log(`${MEMBER_COUNT} uye olusturuluyor...`);
  const members: MemberCtx[] = [];

  for (let i = 0; i < MEMBER_COUNT; i++) {
    const loc = locations[i]!;
    const prof = professions[i % professions.length]!;
    const email = `gercek.${String(i + 1).padStart(4, "0")}${SEED_EMAIL_SUFFIX}`;
    const name = fullNameForIndex(i);

    const u = await prisma.$transaction(async (tx) => {
      const n = await nextMemberNumber(tx);
      return tx.user.create({
        data: {
          email,
          name,
          password: seedPasswordHash,
          role: "MEMBER",
          memberNumber: n,
          isMemberApproved: true,
          memberProfile: {
            create: {
              phone: randomPhone(),
              province: loc.province,
              district: loc.district,
              professionId: prof.id,
              billingAccountType: "INDIVIDUAL",
              billingTcKimlik: "10000000146",
              billingAddressLine: `Seed Mah. No:${i + 1} Örnek Sok.`,
              billingPostalCode: "34000",
            },
          },
        },
        select: { id: true },
      });
    });

    members.push({ userId: u.id, loc, profession: prof });
    if ((i + 1) % 50 === 0) console.log(`  ... ${i + 1}/${MEMBER_COUNT}`);
  }

  console.log(`${AD_COUNT} ilan olusturuluyor...`);

  for (let i = 0; i < AD_COUNT; i++) {
    const m = members[i % members.length]!;
    const catId = leafIds[i % leafIds.length]!;
    const meta = metaById.get(catId);
    const catLabel = meta?.parent?.name
      ? `${meta.parent.name} / ${meta.name}`
      : meta?.name ?? "Genel";

    const { title, description } = buildTitleAndDescription({
      index: i,
      professionName: m.profession.name,
      categoryLabel: catLabel,
      loc: m.loc,
    });

    await createAdWithListingNumber(prisma, {
      owner: { connect: { id: m.userId } },
      category: { connect: { id: catId } },
      title,
      description,
      startingPriceTry: randomInt(35_000, 3_200_000),
      auctionEndsAt: new Date(Date.now() + randomInt(10, 60) * 24 * 60 * 60 * 1000),
      city: m.loc.city,
      province: m.loc.province,
      district: m.loc.district,
      neighborhood: m.loc.neighborhood,
      blockNo: String(randomInt(1, 320)),
      parcelNo: String(randomInt(1, 900)),
      status: "APPROVED",
      approvedAt: new Date(),
      photos: {
        create: [{ url: SAMPLE_PHOTO, sortOrder: 0 }],
      },
    });

    if ((i + 1) % 100 === 0) console.log(`  ... ${i + 1}/${AD_COUNT}`);
  }

  console.log("Tamam.");
  console.log(`Uyeler: ${MEMBER_COUNT} (${SEED_EMAIL_SUFFIX}, sifre: ${SEED_PASSWORD})`);
  console.log(`Ilanlar: ${AD_COUNT} (onayli, mevcut kategorilere bagli, uye il ve meslegiyle uyumlu)`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
