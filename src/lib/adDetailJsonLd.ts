import { displayAdDescription, displayAdTitle } from "@/lib/adTitleDisplay";

type JsonLdAd = {
  id: string;
  title: string;
  description: string;
  startingPriceTry: number;
  auctionEndsAt: Date | null;
  status: string;
};

/**
 * İlan sayfası için Product + Offer şeması (sınıflı ilan / başlangıç fiyatı).
 * Google Rich Results: garanti değildir; yapılandırılmış veri doğrulayıcı ile test edin.
 */
export function buildAdListingJsonLd(ad: JsonLdAd, pageUrl: string, imageAbsolute?: string): Record<string, unknown> {
  const name = displayAdTitle(ad.title);
  const description = displayAdDescription(ad.description).slice(0, 8000);
  const now = new Date();
  const approved = ad.status === "APPROVED";
  const auctionEnd = ad.auctionEndsAt ? new Date(ad.auctionEndsAt) : null;
  const auctionEnded = Boolean(auctionEnd && auctionEnd <= now);
  const inactive = !approved || auctionEnded;

  const offer: Record<string, unknown> = {
    "@type": "Offer",
    price: String(Math.max(0, ad.startingPriceTry)),
    priceCurrency: "TRY",
    url: pageUrl,
    availability: inactive ? "https://schema.org/OutOfStock" : "https://schema.org/OnlineOnly",
  };
  if (auctionEnd && !Number.isNaN(auctionEnd.getTime())) {
    offer.priceValidUntil = auctionEnd.toISOString().slice(0, 10);
  }

  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    sku: ad.id,
    offers: offer,
  };
  if (imageAbsolute?.trim()) {
    base.image = [imageAbsolute.trim()];
  }
  return base;
}

export function listingPageUrls(base: string, id: string): { tr: string; en: string } {
  const clean = base.replace(/\/+$/, "");
  return {
    tr: `${clean}/ads/${id}`,
    en: `${clean}/ads/${id}?lang=en`,
  };
}

type BreadcrumbCategory = {
  id: string;
  name: string;
  parent: { id: string; name: string } | null;
} | null;

export function buildAdBreadcrumbJsonLd(
  base: string,
  pageUrl: string,
  adTitle: string,
  lang: "tr" | "en",
  category: BreadcrumbCategory,
): Record<string, unknown> {
  const root = base.replace(/\/+$/, "");
  const homeUrl = lang === "en" ? `${root}/?lang=en` : root;
  const homeName = lang === "en" ? "Home" : "Ana sayfa";
  const links: { name: string; item: string }[] = [{ name: homeName, item: homeUrl }];
  if (category?.parent) {
    const u = new URLSearchParams();
    u.set("categoryId", category.parent.id);
    if (lang === "en") u.set("lang", "en");
    links.push({ name: category.parent.name, item: `${root}/?${u.toString()}` });
  }
  if (category) {
    const u = new URLSearchParams();
    u.set("categoryId", category.id);
    if (lang === "en") u.set("lang", "en");
    links.push({ name: category.name, item: `${root}/?${u.toString()}` });
  }
  links.push({ name: adTitle, item: pageUrl });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: links.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.item,
    })),
  };
}
