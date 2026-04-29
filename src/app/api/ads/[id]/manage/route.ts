import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("extend"), days: z.number().int().min(1).max(90) }),
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("complete") }),
]);

export async function POST(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
    }

    const raw = await req.json().catch(() => ({}));
    const body = bodySchema.parse(raw);

    const ad = await prisma.ad.findUnique({
      where: { id },
      select: {
        id: true,
        ownerId: true,
        status: true,
        auctionEndsAt: true,
        showcaseUntil: true,
      },
    });
    if (!ad) {
      return NextResponse.json({ error: "Ilan bulunamadi." }, { status: 404 });
    }
    if (ad.ownerId !== session.userId && !isStaffAdminRole(session.role)) {
      return NextResponse.json({ error: "Bu ilan icin yetkiniz yok." }, { status: 403 });
    }

    const now = new Date();

    if (body.action === "cancel") {
      if (ad.status === "CANCELLED" || ad.status === "COMPLETED") {
        return NextResponse.json({ error: "Bu ilan zaten kapatilmis." }, { status: 400 });
      }
      if (ad.status !== "PENDING" && ad.status !== "APPROVED") {
        return NextResponse.json({ error: "Bu ilan iptal edilemez." }, { status: 400 });
      }
      const updated = await prisma.ad.update({
        where: { id },
        data: { status: "CANCELLED", showcaseUntil: null },
        select: { id: true, status: true, auctionEndsAt: true, showcaseUntil: true },
      });
      return NextResponse.json({ ok: true, ad: updated });
    }

    if (body.action === "complete") {
      if (ad.status !== "APPROVED") {
        return NextResponse.json({ error: "Sonuclandirma yalnizca onayli ilanlar icindir." }, { status: 400 });
      }
      const updated = await prisma.ad.update({
        where: { id },
        data: {
          status: "COMPLETED",
          auctionEndsAt: now,
          showcaseUntil: null,
        },
        select: { id: true, status: true, auctionEndsAt: true, showcaseUntil: true },
      });
      return NextResponse.json({ ok: true, ad: updated });
    }

    /** extend */
    if (ad.status !== "APPROVED") {
      return NextResponse.json({ error: "Sure uzatma yalnizca onayli ilanlar icindir." }, { status: 400 });
    }
    const ms = body.days * 24 * 60 * 60 * 1000;
    const base =
      ad.auctionEndsAt && ad.auctionEndsAt > now ? ad.auctionEndsAt.getTime() : now.getTime();
    const newEnd = new Date(base + ms);
    const updated = await prisma.ad.update({
      where: { id },
      data: { auctionEndsAt: newEnd },
      select: { id: true, status: true, auctionEndsAt: true },
    });
    return NextResponse.json({ ok: true, ad: updated, daysAdded: body.days });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error("[POST /api/ads/:id/manage]", e);
    return NextResponse.json({ error: "Islem basarisiz." }, { status: 500 });
  }
}
