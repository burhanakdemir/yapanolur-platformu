import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/appUrl";
import { prisma } from "@/lib/prisma";
import { displayAdTitle } from "@/lib/adTitleDisplay";

export const revalidate = 600;

const MAX_ITEMS = 80;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const base = getAppUrl().replace(/\/+$/, "");
  let items: { id: string; title: string; updatedAt: Date; listingNumber: number }[] = [];
  try {
    items = await prisma.ad.findMany({
      where: { status: "APPROVED" },
      select: { id: true, title: true, updatedAt: true, listingNumber: true },
      orderBy: { updatedAt: "desc" },
      take: MAX_ITEMS,
    });
  } catch {
    items = [];
  }

  const channelTitle = "YapanOlur — yeni ilanlar";
  const channelLink = base;
  const description = "Onaylı ilanlar (RSS 2.0)";

  const itemXml = items
    .map((ad) => {
      const link = `${base}/ads/${ad.id}`;
      const title = escapeXml(displayAdTitle(ad.title));
      const pub = ad.updatedAt.toUTCString();
      const guid = ad.id;
      return (
        `<item>` +
        `<title>${title}</title>` +
        `<link>${escapeXml(link)}</link>` +
        `<guid isPermaLink="false">${escapeXml(guid)}</guid>` +
        `<pubDate>${pub}</pubDate>` +
        `<description>${escapeXml(`№${ad.listingNumber}`)}</description>` +
        `</item>`
      );
    })
    .join("");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<rss version="2.0">` +
    `<channel>` +
    `<title>${escapeXml(channelTitle)}</title>` +
    `<link>${escapeXml(channelLink)}</link>` +
    `<description>${escapeXml(description)}</description>` +
    `<language>tr-TR</language>` +
    itemXml +
    `</channel></rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=86400",
    },
  });
}
