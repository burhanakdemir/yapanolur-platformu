import { getAppUrl } from "@/lib/appUrl";
import { displayAdDescription, displayAdTitle } from "@/lib/adTitleDisplay";
import type { Lang } from "@/lib/i18n";

const SITE_NAME_TR = "İlan ve İhale Platformu";
const SITE_NAME_EN = "Listings & Auctions";

/** Open Graph / Twitter için kısa düz metin (HTML yok). */
export function truncateForMeta(text: string, max = 155): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

/** İlan detayında sunucu tarafı özet paragrafı (arama motorları / noscript). */
export function truncateForSeoPreview(text: string, max = 520): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

export function absoluteAssetUrl(url: string | null | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  const u = url.trim();
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  const base = getAppUrl().replace(/\/+$/, "");
  return u.startsWith("/") ? `${base}${u}` : `${base}/${u}`;
}

export function siteName(lang: "tr" | "en"): string {
  return lang === "en" ? SITE_NAME_EN : SITE_NAME_TR;
}

export function adDetailMetaStrings(
  ad: {
    title: string;
    description: string;
    province: string;
    district: string;
    listingNumber: number;
    category: { name: string; parent: { name: string } | null } | null;
  },
  lang: Lang,
) {
  const title = displayAdTitle(ad.title);
  const loc = [ad.province, ad.district].filter(Boolean).join(" / ");
  const locLabel = lang === "en" ? "Location" : "Konum";
  const noLabel = lang === "en" ? "Listing no." : "İlan no";
  const catLine = ad.category
    ? ad.category.parent
      ? `${ad.category.parent.name} › ${ad.category.name}`
      : ad.category.name
    : "";
  const pageTitle = catLine ? `${title} · ${catLine}` : title;
  const descRaw = displayAdDescription(ad.description);
  const desc = truncateForMeta(
    [descRaw, loc ? `${locLabel}: ${loc}` : "", `${noLabel} ${ad.listingNumber}`].filter(Boolean).join(" · "),
    160,
  );
  return { pageTitle, description: desc || `${noLabel} ${ad.listingNumber}` };
}

export type HomeTabMeta = "live" | "upcoming" | "expired";

/** Ana sayfa `?categoryId=` / `tab` / konum filtreleri için başlık ve açıklama. */
export function homeSearchMetaStrings(
  lang: Lang,
  tab: HomeTabMeta,
  siteTitle: string,
  siteDescription: string,
  category: { name: string; parent: { name: string } | null } | null,
  loc: { province?: string; district?: string; neighborhood?: string },
): { title: string; description: string } {
  const path = category
    ? category.parent
      ? `${category.parent.name} › ${category.name}`
      : category.name
    : "";

  const locParts = [loc.province, loc.district, loc.neighborhood].filter(Boolean);
  const locStr = locParts.join(", ");
  const locSuffix = locStr ? ` · ${locStr}` : "";

  const tabSeg =
    tab === "live"
      ? ""
      : lang === "en"
        ? tab === "upcoming"
          ? "Upcoming"
          : "Ended"
        : tab === "upcoming"
          ? "Yaklaşan"
          : "Süresi dolmuş";

  let title: string;
  if (category && tab === "live") {
    title =
      lang === "en" ? `${path}${locSuffix} · ${siteTitle}` : `${path} ilanları${locSuffix} · ${siteTitle}`;
  } else if (category) {
    title =
      lang === "en"
        ? `${tabSeg}: ${path}${locSuffix} · ${siteTitle}`
        : `${tabSeg}: ${path} ilanları${locSuffix} · ${siteTitle}`;
  } else if (tab !== "live") {
    title =
      lang === "en"
        ? `${tabSeg} listings${locSuffix} · ${siteTitle}`
        : `${tabSeg} ilanlar${locSuffix} · ${siteTitle}`;
  } else if (locStr) {
    title =
      lang === "en"
        ? `Listings · ${locStr} · ${siteTitle}`
        : `${locStr} · ilanlar · ${siteTitle}`;
  } else {
    title = siteTitle;
  }

  let description: string;
  if (category) {
    description =
      lang === "en"
        ? `Browse listings in ${path}.${locStr ? ` Location: ${locStr}.` : ""}`
        : `${path} kapsamındaki ilanları görüntüleyin.${locStr ? ` Konum: ${locStr}.` : ""}`;
  } else if (tab === "upcoming") {
    description =
      lang === "en"
        ? `Auctions and listings that have not started yet on ${siteTitle}.`
        : `${siteTitle} üzerinde henüz başlamamış açık artırma ve ilanlar.`;
  } else if (tab === "expired") {
    description =
      lang === "en"
        ? `Past auctions and listings on ${siteTitle}.`
        : `${siteTitle} üzerinde süresi dolmuş ilanlar ve açık artırmalar.`;
  } else if (locStr) {
    description =
      lang === "en"
        ? `Listings filtered by location on ${siteTitle}.`
        : `${siteTitle} üzerinde konuma göre filtrelenmiş ilanlar.`;
  } else {
    description = siteDescription;
  }

  return {
    title: truncateForMeta(title, 68),
    description: truncateForMeta(description, 160),
  };
}

export { SITE_NAME_TR, SITE_NAME_EN };
