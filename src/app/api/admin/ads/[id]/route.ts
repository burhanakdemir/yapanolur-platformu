import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notifyOnAdApproved } from "@/lib/newAdApprovedNotification";
import { showcaseDaysZ } from "@/lib/showcaseDurations";

const bodySchema = z.union([
  z.object({ action: z.enum(["approve", "reject", "cancel", "renew"]) }),
  z.object({
    action: z.literal("showcase_free"),
    days: showcaseDaysZ.optional().default(7),
  }),
]);

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const data = bodySchema.parse(await req.json());

    const ad = await prisma.ad.findUnique({ where: { id } });
    if (!ad) return NextResponse.json({ error: "Ilan bulunamadi." }, { status: 404 });

    if (data.action === "showcase_free") {
      if (ad.status !== "APPROVED") {
        return NextResponse.json(
          { error: "Ucretsiz vitrin yalnizca onayli ilanlar icin." },
          { status: 400 },
        );
      }
      const days = data.days ?? 7;
      const base =
        ad.showcaseUntil && ad.showcaseUntil > new Date() ? ad.showcaseUntil : new Date();
      const until = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
      const updated = await prisma.ad.update({
        where: { id },
        data: { showcaseUntil: until },
      });
      return NextResponse.json({ ok: true, ad: updated, showcaseFreeDays: days });
    }

    if (data.action === "approve") {
      if (ad.status === "APPROVED") {
        return NextResponse.json({ ok: true, ad, alreadyApproved: true });
      }
      const updated = await prisma.ad.update({
        where: { id },
        data: { status: "APPROVED", approvedAt: new Date() },
      });
      const withProf = await prisma.ad.findUnique({
        where: { id: updated.id },
        include: { profession: true },
      });
      if (withProf) {
        void notifyOnAdApproved(withProf).catch((e) => console.error("[admin ads approve] notify", e));
      }
      return NextResponse.json({ ok: true, ad: updated });
    }

    if (data.action === "reject") {
      const updated = await prisma.ad.update({ where: { id }, data: { status: "REJECTED" } });
      return NextResponse.json({ ok: true, ad: updated });
    }
    if (data.action === "cancel") {
      const updated = await prisma.ad.update({ where: { id }, data: { status: "REJECTED" } });
      return NextResponse.json({ ok: true, ad: updated });
    }
    if (data.action === "renew") {
      const base = ad.auctionEndsAt && ad.auctionEndsAt > new Date() ? ad.auctionEndsAt : new Date();
      const next = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);
      const updated = await prisma.ad.update({ where: { id }, data: { auctionEndsAt: next } });
      return NextResponse.json({ ok: true, ad: updated });
    }

    return NextResponse.json({ error: "Gecersiz islem." }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Islem gerceklesmedi." }, { status: 500 });
  }
}
