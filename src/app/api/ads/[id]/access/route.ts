import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";
import { sumUserCreditTry } from "@/lib/userCredit";
import {
  hasPaidBidAccess,
  hasPaidDetailView,
} from "@/lib/adUserAccessPaid";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Gecersiz ilan." }, { status: 400 });
    }

    const ad = await prisma.ad.findFirst({
      where: { id, status: "APPROVED" },
      select: {
        id: true,
        listingNumber: true,
        title: true,
        ownerId: true,
        province: true,
        district: true,
        category: {
          select: {
            name: true,
            parent: { select: { name: true } },
          },
        },
      },
    });
    if (!ad) {
      return NextResponse.json({ error: "Ilan bulunamadi." }, { status: 404 });
    }

    const settings = await prisma.adminSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });

    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);

    const isOwner = session?.userId === ad.ownerId;
    const isAdmin = isStaffAdminRole(session?.role);

    const accessRow = session?.userId
      ? await prisma.adUserAccess.findUnique({
          where: { userId_adId: { userId: session.userId, adId: id } },
          select: { detailPaidAt: true, bidAccessPaidAt: true },
        })
      : null;

    const balance = session?.userId ? await sumUserCreditTry(session.userId) : 0;

    /** Üst: parent yoksa tek düzey kategori adı; alt: yalnızca hiyerarşide alt düzey varsa. */
    const topCategoryName = ad.category?.parent?.name ?? ad.category?.name ?? null;
    const subCategoryName = ad.category?.parent ? ad.category.name : null;

    return NextResponse.json({
      ad: {
        id: ad.id,
        listingNumber: ad.listingNumber,
        title: ad.title,
        province: ad.province,
        district: ad.district,
        topCategoryName,
        subCategoryName,
      },
      settings: {
        detailViewFeeEnabled: Boolean(settings.detailViewFeeEnabled),
        detailViewFeeAmountTry: Number(settings.detailViewFeeAmountTry ?? 0),
        bidAccessFeeEnabled: Boolean(settings.bidAccessFeeEnabled),
        bidAccessFeeAmountTry: Number(settings.bidAccessFeeAmountTry ?? 0),
      },
      session: session
        ? { userId: session.userId, role: session.role, isOwner, isAdmin }
        : null,
      access: {
        hasDetailPaid: hasPaidDetailView(accessRow ?? undefined),
        hasBidAccessPaid: hasPaidBidAccess(accessRow ?? undefined),
      },
      balance,
      bypassPayment: isOwner || isAdmin,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[GET /api/ads/[id]/access]", e);
    return NextResponse.json(
      {
        error: "Erisim bilgisi alinamadi.",
        detail: process.env.NODE_ENV === "development" ? msg : undefined,
        hint:
          "Proje klasorunde: npx prisma db push && npx prisma generate — ardindan dev sunucuyu durdurup yeniden baslatin. DATABASE_URL dosya yolunun dogru oldugundan emin olun.",
      },
      { status: 500 },
    );
  }
}

const postSchema = z.object({
  action: z.enum(["detail", "bid"]),
});

export async function POST(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = postSchema.parse(await req.json());
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
    }
    if (session.role !== "MEMBER") {
      return NextResponse.json({ error: "Bu islem icin uye hesabi gerekir." }, { status: 403 });
    }

    const ad = await prisma.ad.findFirst({
      where: { id, status: "APPROVED" },
      select: { id: true, ownerId: true },
    });
    if (!ad) {
      return NextResponse.json({ error: "Ilan bulunamadi." }, { status: 404 });
    }
    if (ad.ownerId === session.userId) {
      return NextResponse.json({ error: "Ilan sahibi icin odeme gerekmez." }, { status: 400 });
    }

    const payer = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { isMemberApproved: true },
    });
    if (!payer?.isMemberApproved) {
      return NextResponse.json(
        { error: "Uye onayi bekleniyor; odeme icin onayli hesap gerekir." },
        { status: 403 },
      );
    }

    const settings = await prisma.adminSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });

    const balance = await sumUserCreditTry(session.userId);

    if (body.action === "detail") {
      if (!settings.detailViewFeeEnabled || settings.detailViewFeeAmountTry <= 0) {
        return NextResponse.json({ error: "Detay ucreti aktif degil." }, { status: 400 });
      }
      const existing = await prisma.adUserAccess.findUnique({
        where: { userId_adId: { userId: session.userId, adId: id } },
        select: { detailPaidAt: true, bidAccessPaidAt: true },
      });
      if (hasPaidDetailView(existing ?? undefined)) {
        return NextResponse.json({ ok: true, action: "detail", alreadyPaid: true });
      }
      const fee = settings.detailViewFeeAmountTry;
      if (balance < fee) {
        return NextResponse.json(
          { error: `Yetersiz bakiye. Gerekli: ${fee} TL, mevcut: ${balance} TL` },
          { status: 400 },
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.adUserAccess.upsert({
          where: { userId_adId: { userId: session.userId, adId: id } },
          create: {
            userId: session.userId,
            adId: id,
            detailPaidAt: new Date(),
          },
          update: { detailPaidAt: new Date() },
        });
        await tx.creditTransaction.create({
          data: {
            userId: session.userId,
            type: "DETAIL_VIEW_FEE",
            amountTry: -fee,
            description: `Ilan detay erisim (${id})`,
            referenceId: id,
          },
        });
      });

      return NextResponse.json({ ok: true, action: "detail" });
    }

    if (!settings.bidAccessFeeEnabled || settings.bidAccessFeeAmountTry <= 0) {
      return NextResponse.json({ error: "Teklif erisim ucreti aktif degil." }, { status: 400 });
    }
    const existingBid = await prisma.adUserAccess.findUnique({
      where: { userId_adId: { userId: session.userId, adId: id } },
      select: { detailPaidAt: true, bidAccessPaidAt: true },
    });
    if (hasPaidBidAccess(existingBid ?? undefined)) {
      return NextResponse.json({ ok: true, action: "bid", alreadyPaid: true });
    }
    const fee = settings.bidAccessFeeAmountTry;
    if (balance < fee) {
      return NextResponse.json(
        { error: `Yetersiz bakiye. Gerekli: ${fee} TL, mevcut: ${balance} TL` },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.adUserAccess.upsert({
        where: { userId_adId: { userId: session.userId, adId: id } },
        create: {
          userId: session.userId,
          adId: id,
          bidAccessPaidAt: new Date(),
        },
        update: { bidAccessPaidAt: new Date() },
      });
      await tx.creditTransaction.create({
        data: {
          userId: session.userId,
          type: "BID_ACCESS_FEE",
          amountTry: -fee,
          description: `Teklif verme hakki (${id})`,
          referenceId: id,
        },
      });
    });

    return NextResponse.json({ ok: true, action: "bid" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("[access POST]", error);
    return NextResponse.json({ error: "Islem gerceklesmedi." }, { status: 500 });
  }
}
