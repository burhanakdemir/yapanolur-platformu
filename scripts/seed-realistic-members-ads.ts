/**
 * Gercekci ornek uye + ilan (hizmet bolgesine uygun konumlar).
 * Once @seed-gercek.local uyeleri silinir, sonra yeniden uretilir.
 *
 * npm run seed:gercek
 */
import type { PrismaClient } from "../src/generated/prisma/client";
import { syncDefaultProfessions } from "../src/lib/defaultProfessions";
import { nextMemberNumber } from "../src/lib/memberNumber";
import { createAdWithListingNumber } from "../src/lib/adListingNumber";
import { hashPassword } from "../src/lib/passwordHash";
import { locationNamesEqual } from "../src/lib/serviceArea";
import { buildSeedLocationsForServiceArea, type SeedLoc } from "./lib/buildSeedLocations";
import { disconnectScriptPrisma, prisma } from "./lib/prisma";

const SEED_EMAIL_SUFFIX = "@seed-gercek.local";
const SEED_PASSWORD = "Seed2026!";
const MEMBER_COUNT = 250;
const AD_COUNT = 600;

const SAMPLE_PHOTO =
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80";

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
  loc: SeedLoc;
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

async function getLeafCategoryIds(client: PrismaClient): Promise<string[]> {
  const leaves = await client.category.findMany({
    where: { parentId: { not: null } },
    select: { id: true },
  });
  if (leaves.length > 0) {
    return leaves.map((c) => c.id);
  }
  const roots = await client.category.findMany({
    where: { parentId: null },
    select: { id: true },
  });
  return roots.map((c) => c.id);
}

type MemberCtx = {
  userId: string;
  loc: SeedLoc;
  profession: { id: string; name: string };
};

async function main() {
  await syncDefaultProfessions(prisma);
  const seedPasswordHash = await hashPassword(SEED_PASSWORD);

  const { locations, area } = await buildSeedLocationsForServiceArea(prisma, MEMBER_COUNT);
  const districtSummary = area.provinces
    .map((p) => {
      const key = Object.keys(area.districtsByProvince).find((k) => locationNamesEqual(k, p));
      const allowed = key ? area.districtsByProvince[key] : undefined;
      if (!allowed?.length) return `${p} (tum ilceler)`;
      return `${p} (${allowed.length} ilce)`;
    })
    .join(", ");
  console.log(`Hizmet bolgesi: ${districtSummary}`);

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

  console.log(`${MEMBER_COUNT} uye olusturuluyor (${locations.length} konum dongusu)...`);
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
              billingPostalCode: "07000",
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
  console.log(`Ilanlar: ${AD_COUNT} (onayli, hizmet bolgesi: ${area.provinces.join(", ")})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => disconnectScriptPrisma());
