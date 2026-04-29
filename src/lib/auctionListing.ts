import type { Prisma } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import { categoryIncludeWithParentChain } from "@/lib/categoryInclude";

/** Ana sayfa kartları teklif listesi kullanmaz; `bids: true` büyük ilanlarda gereksiz yük oluşturur. */
const auctionInclude = {
  /** Kök kategori adı ve görsel zinciri için yeterli üst kategori derinliği. */
  category: categoryIncludeWithParentChain(14),
  photos: { orderBy: { sortOrder: "asc" as const }, take: 1 },
} satisfies Prisma.AdInclude;

/** Ana sayfa ve /api/auctions varsayılan ilan adedi (5 sütun × 20 satır) */
export const HOME_AUCTIONS_LIMIT = 100;

export type HomeAuctionTab = "live" | "upcoming" | "expired";

/**
 * Ana sayfa / API listesi.
 * - **live**: Önce aktif vitrin (`showcaseUntil` > şimdi), vitrin içinde `showcaseUntil` artan (vitrin bitişi en yakın olan üstte).
 *   Sonra vitrin dışı ilanlar: önce `auctionEndsAt` artan (en yakın müzayede bitişi üstte), en sonda bitiş tarihi olmayanlar `listingNumber` azalan.
 * - **expired**: `auctionEndsAt` azalan (en yeni bitenler üstte).
 * - **upcoming**: `createdAt` azalan.
 */
export async function findManyAuctionsShowcaseFirst(
  db: PrismaClient,
  baseWhere: Prisma.AdWhereInput,
  take = HOME_AUCTIONS_LIMIT,
  tab: HomeAuctionTab = "live",
) {
  const now = new Date();

  if (tab === "expired") {
    return db.ad.findMany({
      where: baseWhere,
      include: auctionInclude,
      orderBy: { auctionEndsAt: "desc" },
      take,
    });
  }

  if (tab === "upcoming") {
    return db.ad.findMany({
      where: baseWhere,
      include: auctionInclude,
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  const notInActiveShowcase: Prisma.AdWhereInput = {
    OR: [{ showcaseUntil: null }, { showcaseUntil: { lte: now } }],
  };

  /** Aktif vitrin: vitrin bitiş tarihine göre (en yakın vitrin sonu üstte) */
  const showcaseRows = await db.ad.findMany({
    where: {
      AND: [baseWhere, { showcaseUntil: { gt: now } }],
    },
    include: auctionInclude,
    orderBy: { showcaseUntil: "asc" },
    take,
  });
  if (showcaseRows.length >= take) return showcaseRows;

  const remaining = take - showcaseRows.length;

  /** Vitrin dışı: müzayede bitişi olanlar — önce en yakın bitiş */
  const withEndDate = await db.ad.findMany({
    where: {
      AND: [baseWhere, notInActiveShowcase, { auctionEndsAt: { gt: now } }],
    },
    include: auctionInclude,
    orderBy: { auctionEndsAt: "asc" },
    take: remaining,
  });

  if (showcaseRows.length + withEndDate.length >= take) {
    return [...showcaseRows, ...withEndDate];
  }

  const rest = take - showcaseRows.length - withEndDate.length;

  const withoutEndDate = await db.ad.findMany({
    where: {
      AND: [baseWhere, notInActiveShowcase, { auctionEndsAt: null }],
    },
    include: auctionInclude,
    orderBy: { listingNumber: "desc" },
    take: rest,
  });

  return [...showcaseRows, ...withEndDate, ...withoutEndDate];
}
