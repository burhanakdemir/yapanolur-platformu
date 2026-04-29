import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; bidId: string }> };

/** Teklif sahibi kendi teklifini siler; varsa teklif ücreti iade edilir. */
export async function DELETE(_req: Request, ctx: Params) {
  try {
    const { id: adId, bidId } = await ctx.params;
    if (!adId || !bidId) {
      return NextResponse.json({ error: "Gecersiz istek." }, { status: 400 });
    }

    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
    }
    if (!isStaffAdminRole(session.role) && session.role !== "MEMBER") {
      return NextResponse.json({ error: "Bu islem icin uye hesabi gerekir." }, { status: 403 });
    }

    const bid = await prisma.bid.findFirst({
      where: {
        id: bidId,
        adId,
        ad: { status: "APPROVED" },
      },
      select: { id: true, bidderId: true },
    });
    if (!bid) {
      return NextResponse.json({ error: "Teklif bulunamadi." }, { status: 404 });
    }
    if (bid.bidderId !== session.userId) {
      return NextResponse.json({ error: "Bu teklifi silme yetkiniz yok." }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      const feeTx = await tx.creditTransaction.findFirst({
        where: {
          userId: session.userId,
          type: "BID_FEE",
          referenceId: bidId,
        },
        select: { id: true, amountTry: true },
      });

      await tx.bid.delete({ where: { id: bidId } });

      if (feeTx && feeTx.amountTry < 0) {
        await tx.creditTransaction.create({
          data: {
            userId: session.userId,
            type: "REFUND",
            amountTry: -feeTx.amountTry,
            description: `Teklif iptali iadesi — Ilan ${adId}`,
            referenceId: bidId,
          },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/ads/.../bids/...]", error);
    return NextResponse.json({ error: "Teklif silinemedi." }, { status: 500 });
  }
}
