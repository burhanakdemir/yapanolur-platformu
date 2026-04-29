import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Inşaat ve yapı isleri: mühendislik, mimarlık, teknik, usta ve saha meslekleri.
 * sortOrder: gruplar halinde (10–99 mühendislik, 100–199 mimarlık, 200–299 teknik, 300+ ustalar).
 */
export const DEFAULT_ENGINEERING_PROFESSIONS: ReadonlyArray<{ name: string; sortOrder: number }> = [
  // — Mühendislik (inşaat ve altyapı) —
  { name: "Harita Mühendisi", sortOrder: 10 },
  { name: "İnşaat Mühendisi", sortOrder: 15 },
  { name: "Yapı Mühendisi", sortOrder: 18 },
  { name: "Geoteknik Mühendisi", sortOrder: 20 },
  { name: "Ulaştırma Mühendisi", sortOrder: 22 },
  { name: "Hidrolik Mühendisi", sortOrder: 24 },
  { name: "İmar ve Şehir Planlama Mühendisi", sortOrder: 26 },
  { name: "Makine Mühendisi", sortOrder: 30 },
  { name: "Mekanik Tesisat Mühendisi", sortOrder: 32 },
  { name: "Elektrik Mühendisi", sortOrder: 34 },
  { name: "Elektronik Mühendisi", sortOrder: 36 },
  { name: "Jeoloji Mühendisi", sortOrder: 38 },
  { name: "Jeofizik Mühendisi", sortOrder: 40 },
  { name: "Madencilik Mühendisi", sortOrder: 42 },
  { name: "Metalurji ve Malzeme Mühendisi", sortOrder: 44 },
  { name: "Kimya Mühendisi", sortOrder: 46 },
  { name: "Endüstri Mühendisi", sortOrder: 48 },
  { name: "Çevre Mühendisi", sortOrder: 50 },
  { name: "Enerji Mühendisi", sortOrder: 52 },
  { name: "Bilgisayar Mühendisi", sortOrder: 54 },
  { name: "Yazılım Mühendisi", sortOrder: 56 },
  { name: "Ziraat Mühendisi", sortOrder: 58 },
  // — Mimarlık ve tasarım —
  { name: "Mimar", sortOrder: 100 },
  { name: "İç Mimar", sortOrder: 105 },
  { name: "Peyzaj Mimarı", sortOrder: 110 },
  // — Teknik personel ve belgeli meslekler —
  { name: "Harita Teknikeri", sortOrder: 200 },
  { name: "İnşaat Teknikeri", sortOrder: 205 },
  { name: "Makine Teknikeri", sortOrder: 210 },
  { name: "Elektrik-Elektronik Teknikeri", sortOrder: 215 },
  { name: "Mimari Ressam / Teknik Ressam", sortOrder: 220 },
  { name: "Yapı Denetimcisi", sortOrder: 225 },
  { name: "İş Sağlığı ve Güvenliği (İSG) Uzmanı", sortOrder: 230 },
  { name: "İş Makinesi Operatörü", sortOrder: 235 },
  { name: "Vinç Operatörü", sortOrder: 240 },
  { name: "Sondaj Teknisyeni", sortOrder: 245 },
  // — Ustalar ve zanaatkarlar (inşaat / yapı) —
  { name: "Şantiye Şefi / Kalfa", sortOrder: 300 },
  { name: "Kalıpçı Ustası", sortOrder: 305 },
  { name: "Demir-Beton Ustası (Donatıcı)", sortOrder: 310 },
  { name: "Duvar Ustası", sortOrder: 315 },
  { name: "Sıva Ustası", sortOrder: 320 },
  { name: "Şap ve Şap Altı Ustası", sortOrder: 325 },
  { name: "Seramik ve Fayans Ustası", sortOrder: 330 },
  { name: "Boya ve Dekorasyon Ustası", sortOrder: 335 },
  { name: "Marangoz ve Doğramacı Ustası", sortOrder: 340 },
  { name: "Parke ve Döşeme Ustası", sortOrder: 345 },
  { name: "Kaynakçı", sortOrder: 350 },
  { name: "Tesisatçı (Su ve Kanalizasyon)", sortOrder: 355 },
  { name: "Sıhhi Tesisat Ustası", sortOrder: 360 },
  { name: "Isıtma ve Klima Tesisatçısı", sortOrder: 365 },
  { name: "Elektrikçi Ustası", sortOrder: 370 },
  { name: "Çatı Ustası", sortOrder: 375 },
  { name: "İzolasyon ve Yalıtım Ustası", sortOrder: 380 },
  { name: "Alçıpan ve Asma Tavan Ustası", sortOrder: 385 },
  { name: "Camcı", sortOrder: 390 },
  { name: "İskele Kurulum Ustası", sortOrder: 395 },
  { name: "Peyzaj ve Bahçe Ustası", sortOrder: 400 },
  { name: "Asfalt ve Yol Ustası", sortOrder: 405 },
  { name: "Restorasyon ve Taş İşçiliği Ustası", sortOrder: 410 },
  { name: "İnşaat İşçisi / Yardımcı", sortOrder: 415 },
];

/** Liste veya upsert mantığı degistiginde artirin; boylece yeni meslekler DB’ye eklenir. */
const PROFESSION_DEFAULTS_VERSION = 2;

const g = globalThis as unknown as { __professionDefaultsSyncedVersion?: number };

/** Tum varsayilan meslekleri upsert eder (yeni eklenen isimler mevcut DB’ye de gelir). */
export async function syncDefaultProfessions(db: PrismaClient): Promise<void> {
  const delegate = db.profession;
  if (!delegate || typeof delegate.upsert !== "function") {
    return;
  }
  if (g.__professionDefaultsSyncedVersion === PROFESSION_DEFAULTS_VERSION) {
    return;
  }
  await db.$transaction(
    DEFAULT_ENGINEERING_PROFESSIONS.map((p) =>
      delegate.upsert({
        where: { name: p.name },
        create: { name: p.name, sortOrder: p.sortOrder },
        update: { sortOrder: p.sortOrder },
      }),
    ),
  );
  g.__professionDefaultsSyncedVersion = PROFESSION_DEFAULTS_VERSION;
}

/** Ilk kurulum: liste bossa toplu ekleme (hizli). */
export async function ensureDefaultProfessionsIfEmpty(db: PrismaClient): Promise<void> {
  const delegate = db.profession;
  if (!delegate || typeof delegate.count !== "function") {
    return;
  }
  const n = await delegate.count();
  if (n === 0) {
    await delegate.createMany({
      data: DEFAULT_ENGINEERING_PROFESSIONS.map((p) => ({ name: p.name, sortOrder: p.sortOrder })),
    });
  }
  await syncDefaultProfessions(db);
}
