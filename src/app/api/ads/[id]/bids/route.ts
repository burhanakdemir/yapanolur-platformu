import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";
import { sumUserCreditTry } from "@/lib/userCredit";
import { hasPaidBidAccess } from "@/lib/adUserAccessPaid";

const bodySchema = z.object({
  amountTry: z.coerce.number().int().min(100).max(99_999_999),
  message: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : String(v)),
    z.string().max(500).optional(),
  ),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json(
        { error: "Teklif vermek için giriş yapın." },
        { status: 401 },
      );
    }
    const isAdmin = isStaffAdminRole(session.role);
    if (!isAdmin && session.role !== "MEMBER") {
      return NextResponse.json(
        { error: "Teklif vermek için üye hesabı gerekir." },
        { status: 403 },
      );
    }

    const data = bodySchema.parse(await req.json());

    const ad = await prisma.ad.findUnique({
      where: { id },
      select: { id: true, status: true, ownerId: true },
    });
    if (!ad) {
      return NextResponse.json({ error: "İlan bulunamadı." }, { status: 404 });
    }
    if (ad.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Sadece onaylı ilanlara teklif verilebilir." },
        { status: 400 },
      );
    }
    if (ad.ownerId === session.userId) {
      return NextResponse.json(
        { error: "Kendi ilanınıza teklif veremezsiniz." },
        { status: 400 },
      );
    }

    const bidder = await prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!bidder) {
      return NextResponse.json({ error: "Hesap bulunamadı." }, { status: 404 });
    }
    if (!isAdmin && !bidder.isMemberApproved) {
      return NextResponse.json(
        { error: "Üyeliğiniz henüz onaylanmadı. Yönetici onayı bekleyin." },
        { status: 403 },
      );
    }

    const settings = await prisma.adminSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });

    if (
      !isAdmin &&
      settings.bidAccessFeeEnabled &&
      (settings.bidAccessFeeAmountTry ?? 0) > 0
    ) {
      const access = await prisma.adUserAccess.findUnique({
        where: { userId_adId: { userId: bidder.id, adId: id } },
        select: { detailPaidAt: true, bidAccessPaidAt: true },
      });
      if (!hasPaidBidAccess(access ?? undefined)) {
        return NextResponse.json(
          {
            error:
              "Bu ilanda teklif vermek icin once teklif erisim ucreti odemelisiniz (Ilan erisim sayfasi).",
            code: "BID_ACCESS_REQUIRED",
          },
          { status: 403 },
        );
      }
    }

    const currentCredit = await sumUserCreditTry(bidder.id);

    if (
      !isAdmin &&
      settings.bidFeeEnabled &&
      currentCredit < settings.bidFeeAmountTry
    ) {
      return NextResponse.json(
        {
          error: `Yetersiz kredi. Gerekli: ${settings.bidFeeAmountTry} TL, mevcut: ${currentCredit} TL`,
        },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const bid = await tx.bid.create({
        data: {
          adId: id,
          bidderId: bidder.id,
          amountTry: data.amountTry,
          message: data.message ?? null,
        },
      });

      if (!isAdmin && settings.bidFeeEnabled && settings.bidFeeAmountTry > 0) {
        await tx.creditTransaction.create({
          data: {
            userId: bidder.id,
            type: "BID_FEE",
            amountTry: -settings.bidFeeAmountTry,
            description: `Teklif ücreti — İlan ${id}`,
            referenceId: bid.id,
          },
        });
      }

      return bid;
    });

    return NextResponse.json({ ok: true, bidId: result.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("[bids POST]", error);
    const devMsg = error instanceof Error ? error.message : "Teklif verilemedi.";
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? devMsg : "Teklif verilemedi." },
      { status: 500 },
    );
  }
}
