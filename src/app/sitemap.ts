import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/appUrl";
import { prisma } from "@/lib/prisma";

/** İlan listesi saatte bir yenilenebilir; çok büyük site haritası build süresini uzatmasın. */
export const revalidate = 3600;

const MAX_AD_URLS = 5000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getAppUrl().replace(/\/+$/, "");
  const now = new Date();

  const staticPaths: { path: string; priority: number; change: "daily" | "weekly" }[] = [
    { path: "", priority: 1, change: "daily" },
    { path: "/hakkimizda", priority: 0.85, change: "weekly" },
    { path: "/iletisim", priority: 0.85, change: "weekly" },
    { path: "/site-haritasi", priority: 0.7, change: "weekly" },
    { path: "/muhendis-ara", priority: 0.85, change: "weekly" },
    { path: "/members", priority: 0.75, change: "weekly" },
    { path: "/login", priority: 0.65, change: "weekly" },
    { path: "/kvkk", priority: 0.6, change: "weekly" },
    { path: "/cerez-politikasi", priority: 0.6, change: "weekly" },
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const { path, priority, change } of staticPaths) {
    const urlTr = path ? `${base}${path}` : base;
    const urlEn = path ? `${base}${path}?lang=en` : `${base}/?lang=en`;
    entries.push({
      url: urlTr,
      lastModified: now,
      changeFrequency: change,
      priority,
    });
    entries.push({
      url: urlEn,
      lastModified: now,
      changeFrequency: change,
      priority: Math.min(0.99, priority * 0.95),
    });
  }

  try {
    const ads = await prisma.ad.findMany({
      where: { status: "APPROVED" },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: MAX_AD_URLS,
    });
    for (const ad of ads) {
      entries.push({
        url: `${base}/ads/${ad.id}`,
        lastModified: ad.updatedAt,
        changeFrequency: "daily",
        priority: 0.75,
      });
      entries.push({
        url: `${base}/ads/${ad.id}?lang=en`,
        lastModified: ad.updatedAt,
        changeFrequency: "daily",
        priority: 0.72,
      });
    }
  } catch {
    /* Derleme veya DB geçici kapalı: yalnız statik URL’ler */
  }

  return entries;
}
