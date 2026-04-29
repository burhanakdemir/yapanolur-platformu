import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";
import {
  effectiveBidAccessAt,
  hasPaidDetailView,
} from "@/lib/adUserAccessPaid";
import { categoryParentSelectDepth, resolveCategoryImageUrl } from "@/lib/categoryImage";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const tokenEarly = (await cookies()).get("session_token")?.value;
  const sessionEarly = await verifySessionToken(tokenEarly);
  const ad = await prisma.ad.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          parent: categoryParentSelectDepth(8),
        },
      },
      owner: {
        select: {
          id: true,
          email: true,
          name: true,
          memberNumber: true,
          profilePhotoUrl: true,
        },
      },
      bids: {
        include: {
          bidder: {
            select: {
              id: true,
              email: true,
              name: true,
              memberNumber: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      photos: { orderBy: { sortOrder: "asc" } },
      _count: { select: { watchers: true } },
    },
  });

  if (!ad) {
    return NextResponse.json({ error: "Ilan bulunamadi." }, { status: 404 });
  }

  const isPrivileged =
    isStaffAdminRole(sessionEarly?.role) || sessionEarly?.userId === ad.ownerId;
  if (ad.status !== "APPROVED" && !isPrivileged) {
    return NextResponse.json({ error: "Ilan bulunamadi." }, { status: 404 });
  }

  const settingsRow = await prisma.adminSettings.findUnique({
    where: { id: "singleton" },
    select: {
      detailViewFeeEnabled: true,
      detailViewFeeAmountTry: true,
      bidAccessFeeEnabled: true,
      bidAccessFeeAmountTry: true,
    },
  });
  const settings = {
    detailViewFeeEnabled: settingsRow?.detailViewFeeEnabled ?? false,
    detailViewFeeAmountTry: settingsRow?.detailViewFeeAmountTry ?? 0,
    bidAccessFeeEnabled: settingsRow?.bidAccessFeeEnabled ?? false,
    bidAccessFeeAmountTry: settingsRow?.bidAccessFeeAmountTry ?? 0,
  };

  const token = (await cookies()).get("session_token")?.value;
  const session = await verifySessionToken(token);

  const detailRequired =
    settings.detailViewFeeEnabled && (settings.detailViewFeeAmountTry ?? 0) > 0;

  let bidAccessPaidAt: Date | null | undefined;

  if (detailRequired) {
    if (isStaffAdminRole(session?.role) || session?.userId === ad.ownerId) {
      bidAccessPaidAt = await loadBidAccessPaid(session?.userId, id);
      return respond(ad, settings, session, bidAccessPaidAt);
    }
    if (!session) {
      return NextResponse.json(
        { error: "Detay icin giris gerekli.", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }
    const row = await prisma.adUserAccess.findUnique({
      where: { userId_adId: { userId: session.userId, adId: id } },
      select: { detailPaidAt: true, bidAccessPaidAt: true },
    });
    if (!hasPaidDetailView(row ?? undefined)) {
      return NextResponse.json(
        { error: "Detay icin odeme gerekli.", code: "DETAIL_PAYMENT_REQUIRED" },
        { status: 403 },
      );
    }
    bidAccessPaidAt = effectiveBidAccessAt(row ?? undefined);
    return respond(ad, settings, session, bidAccessPaidAt);
  }

  bidAccessPaidAt = await loadBidAccessPaid(session?.userId, id);
  return respond(ad, settings, session, bidAccessPaidAt);
}

async function loadBidAccessPaid(userId: string | undefined, adId: string) {
  if (!userId) return null;
  const row = await prisma.adUserAccess.findUnique({
    where: { userId_adId: { userId, adId } },
    select: { detailPaidAt: true, bidAccessPaidAt: true },
  });
  return effectiveBidAccessAt(row ?? undefined);
}

type BidRow = { bidder: { id: string } };

function respond(
  ad: {
    ownerId: string;
    id: string;
    status?: string;
    bids: BidRow[];
  } & Record<string, unknown>,
  settings: {
    bidAccessFeeEnabled: boolean;
    bidAccessFeeAmountTry: number;
  },
  session: Awaited<ReturnType<typeof verifySessionToken>>,
  bidAccessPaidAt: Date | null | undefined,
) {
  const bidAccessRequired =
    settings.bidAccessFeeEnabled && (settings.bidAccessFeeAmountTry ?? 0) > 0;

  let canBid = false;
  if (ad.status && ad.status !== "APPROVED") {
    canBid = false;
  } else if (session?.userId === ad.ownerId) {
    canBid = false;
  } else if (isStaffAdminRole(session?.role)) {
    canBid = true;
  } else if (session?.role === "MEMBER") {
    canBid = !bidAccessRequired || Boolean(bidAccessPaidAt);
  }

  const isOwner = session?.userId === ad.ownerId;
  const { bids: allBids, category: categoryWithParents, ...adRest } = ad as typeof ad & {
    category: Parameters<typeof resolveCategoryImageUrl>[0] & {
      id: string;
      name: string;
      imageUrl: string | null;
    } | null;
  };
  const categoryImageUrl = resolveCategoryImageUrl(categoryWithParents);
  const category =
    categoryWithParents && typeof categoryWithParents === "object" && "id" in categoryWithParents
      ? {
          id: categoryWithParents.id,
          name: categoryWithParents.name,
          imageUrl: categoryWithParents.imageUrl,
        }
      : null;
  const bidderCount = new Set(allBids.map((b) => b.bidder.id)).size;

  /** İlan sahibi tüm teklifleri; teklif veren üye yalnızca kendi teklif(ler)ini görür. */
  let bids: BidRow[];
  if (isOwner) {
    bids = allBids;
  } else if (session?.userId) {
    bids = allBids.filter((b) => b.bidder.id === session.userId);
  } else {
    bids = [];
  }

  return NextResponse.json({
    ...adRest,
    category,
    categoryImageUrl,
    bids,
    bidderCount,
    viewer: {
      canBid,
      bidAccessRequired,
      /** Tüm teklif satırları (yalnızca ilan sahibi için anlamlı; boş liste mesajı vb.) */
      canViewBidderSummary: isOwner,
    },
  });
}
