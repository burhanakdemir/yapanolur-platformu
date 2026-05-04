import type { Metadata } from "next";
import AdDetailPage from "./AdDetailClient";
import { prisma } from "@/lib/prisma";
import {
  buildAdBreadcrumbJsonLd,
  buildAdListingJsonLd,
  listingPageUrls,
} from "@/lib/adDetailJsonLd";
import { displayAdTitle } from "@/lib/adTitleDisplay";
import { absoluteAssetUrl, adDetailMetaStrings, siteName } from "@/lib/metadataHelpers";
import { BRAND_LOGO_PATH } from "@/lib/brand";
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
      alternates: {
        canonical,
        languages: {
          "tr-TR": `${base}/ads/${id}`,
          "en-GB": `${base}/ads/${id}?lang=en`,
          "x-default": `${base}/ads/${id}`,
        },
      },
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
  const logoOg = `${base}${BRAND_LOGO_PATH}`;
  const ogImages = ogImage
    ? [{ url: ogImage, alt: pageTitle }]
    : [{ url: logoOg, width: 440, height: 113, alt: site }];

  return {
    title,
    description,
    robots: publicAd ? { index: true, follow: true } : { index: false, follow: false },
    alternates: {
      canonical,
      languages: {
        "tr-TR": `${base}/ads/${id}`,
        "en-GB": `${base}/ads/${id}?lang=en`,
        "x-default": `${base}/ads/${id}`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: site,
      locale: lang === "en" ? "en_GB" : "tr_TR",
      type: "website",
      images: ogImages,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : { images: [logoOg] }),
    },
  };
}

export default async function AdDetailRoutePage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const lang: Lang = getLang(sp.lang);

  const ad = await prisma.ad.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      listingNumber: true,
      province: true,
      district: true,
      neighborhood: true,
      startingPriceTry: true,
      auctionEndsAt: true,
      category: {
        select: {
          id: true,
          name: true,
          parent: { select: { id: true, name: true } },
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

  const imageAbs = absoluteAssetUrl(ad?.photos[0]?.url);
  const urls = listingPageUrls(base, id);
  const pageUrl = lang === "en" ? urls.en : urls.tr;

  const productJsonLd =
    ad?.status === "APPROVED"
      ? buildAdListingJsonLd(
          {
            id: ad.id,
            title: ad.title,
            description: ad.description,
            startingPriceTry: ad.startingPriceTry,
            auctionEndsAt: ad.auctionEndsAt,
            status: ad.status,
          },
          pageUrl,
          imageAbs,
        )
      : null;

  const breadcrumbJsonLd =
    ad?.status === "APPROVED"
      ? buildAdBreadcrumbJsonLd(
          base,
          pageUrl,
          displayAdTitle(ad.title),
          lang,
          ad.category
            ? {
                id: ad.category.id,
                name: ad.category.name,
                parent: ad.category.parent,
              }
            : null,
        )
      : null;

  return (
    <>
      {productJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      ) : null}
      {breadcrumbJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      ) : null}
      <AdDetailPage />
    </>
  );
}
