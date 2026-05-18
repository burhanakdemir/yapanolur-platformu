import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  findManyAuctionsShowcaseFirst,
  HOME_AUCTIONS_LIMIT,
  type HomeAuctionTab,
} from "@/lib/auctionListing";
import { serializeAuctionForHomeList } from "@/lib/serializeHomeAuction";
import { getDescendantIds } from "@/lib/categories";
import { buildAdServiceAreaFilter, getServiceArea } from "@/lib/serviceArea";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tab = url.searchParams.get("tab");
  const tabKind: HomeAuctionTab =
    tab === "upcoming" || tab === "expired" ? tab : "live";
  const categoryIdRaw = url.searchParams.get("categoryId") || undefined;
  const province = url.searchParams.get("province") || undefined;
  const district = url.searchParams.get("district") || undefined;
  const neighborhood = url.searchParams.get("neighborhood") || undefined;
  const now = new Date();

  const categoryFilter = categoryIdRaw
    ? { categoryId: { in: await getDescendantIds(categoryIdRaw) } }
    : {};

  const serviceArea = await getServiceArea(prisma);
  const serviceAreaFilter = buildAdServiceAreaFilter(serviceArea, {
    province: province || undefined,
    district: district || undefined,
  });
  const locationFilter: Prisma.AdWhereInput = {
    ...serviceAreaFilter,
    ...(neighborhood ? { neighborhood: { contains: neighborhood } } : {}),
  };

  const where: Prisma.AdWhereInput =
    tabKind === "upcoming"
      ? { status: "PENDING" as const, ...categoryFilter, ...locationFilter }
      : tabKind === "expired"
        ? { status: "APPROVED" as const, auctionEndsAt: { lte: now }, ...categoryFilter, ...locationFilter }
        : {
            status: "APPROVED" as const,
            ...categoryFilter,
            ...locationFilter,
            OR: [{ auctionEndsAt: null }, { auctionEndsAt: { gt: now } }],
          };

  const auctions = await findManyAuctionsShowcaseFirst(prisma, where, HOME_AUCTIONS_LIMIT, tabKind);

  return NextResponse.json(auctions.map((a) => serializeAuctionForHomeList(a)));
}
