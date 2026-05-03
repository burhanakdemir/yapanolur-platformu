import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/appUrl";
import { prisma } from "@/lib/prisma";
import { APPROVED_ADS_PER_SITEMAP_CHUNK } from "@/lib/sitemapAdsChunk";

export const revalidate = 3600;

function staticSitemapEntries(base: string, now: Date): MetadataRoute.Sitemap {
  const staticPaths: {
    path: string;
    priority: number;
    change: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  }[] = [
    { path: "", priority: 1, change: "daily" },
    { path: "/hakkimizda", priority: 0.85, change: "weekly" },
    { path: "/iletisim", priority: 0.85, change: "weekly" },
    { path: "/site-haritasi", priority: 0.7, change: "weekly" },
    { path: "/muhendis-ara", priority: 0.85, change: "weekly" },
    { path: "/members", priority: 0.75, change: "weekly" },
    { path: "/login", priority: 0.65, change: "weekly" },
    { path: "/kvkk", priority: 0.6, change: "weekly" },
    { path: "/cerez-politikasi", priority: 0.6, change: "weekly" },
    { path: "/rss.xml", priority: 0.55, change: "hourly" },
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
  return entries;
}

export async function generateSitemaps(): Promise<Array<{ id: number }>> {
  try {
    const count = await prisma.ad.count({ where: { status: "APPROVED" } });
    const adChunks = Math.ceil(count / APPROVED_ADS_PER_SITEMAP_CHUNK);
    const list: Array<{ id: number }> = [{ id: 0 }];
    for (let i = 1; i <= adChunks; i++) {
      list.push({ id: i });
    }
    return list;
  } catch {
    return [{ id: 0 }];
  }
}

export default async function sitemap(props?: { id?: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const base = getAppUrl().replace(/\/+$/, "");
  const now = new Date();
  const idRaw = props?.id ? await props.id : "0";
  const idNum = Number.parseInt(idRaw, 10);

  if (idNum === 0 || Number.isNaN(idNum)) {
    return staticSitemapEntries(base, now);
  }

  const skip = (idNum - 1) * APPROVED_ADS_PER_SITEMAP_CHUNK;
  try {
    const ads = await prisma.ad.findMany({
      where: { status: "APPROVED" },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      skip,
      take: APPROVED_ADS_PER_SITEMAP_CHUNK,
    });
    const entries: MetadataRoute.Sitemap = [];
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
    return entries;
  } catch {
    return [];
  }
}
