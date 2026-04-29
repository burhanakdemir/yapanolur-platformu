import type { Metadata } from "next";
import AdDetailPage from "./AdDetailClient";
import { prisma } from "@/lib/prisma";
import { absoluteAssetUrl, adDetailMetaStrings, siteName } from "@/lib/metadataHelpers";
import { getAppUrl } from "@/lib/appUrl";
import { getLang, type Lang } from "@/lib/i18n";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params;
  const sp = await searchParams;
  const lang: Lang = getLang(sp.lang);
  const site = siteName(lang);

  const ad = await prisma.ad.findUnique({
    where: { id },
    select: {
      title: true,
      description: true,
      province: true,
      district: true,
      status: true,
      listingNumber: true,
      category: {
        select: {
          name: true,
          parent: { select: { name: true } },
        },
      },
      photos: {
        take: 1,
        orderBy: { sortOrder: "asc" },
        select: { url: true },
      },
    },
  });

  const base = getAppUrl().replace(/\/+$/, "");
  const canonical = `${base}/ads/${id}${lang === "en" ? "?lang=en" : ""}`;

  if (!ad) {
    return {
      title: lang === "en" ? `Not found · ${site}` : `İlan bulunamadı · ${site}`,
      robots: { index: false, follow: false },
      alternates: { canonical },
    };
  }

  const publicAd = ad.status === "APPROVED";
  const { pageTitle, description } = adDetailMetaStrings(
    {
      title: ad.title,
      description: ad.description,
      province: ad.province,
      district: ad.district,
      listingNumber: ad.listingNumber,
      category: ad.category,
    },
    lang,
  );

  const title = `${pageTitle} | ${site}`;
  const ogImage = absoluteAssetUrl(ad.photos[0]?.url);

  return {
    title,
    description,
    robots: publicAd ? { index: true, follow: true } : { index: false, follow: false },
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: site,
      locale: lang === "en" ? "en_GB" : "tr_TR",
      type: "website",
      ...(ogImage ? { images: [{ url: ogImage, alt: pageTitle }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default function AdDetailRoutePage() {
  return <AdDetailPage />;
}
