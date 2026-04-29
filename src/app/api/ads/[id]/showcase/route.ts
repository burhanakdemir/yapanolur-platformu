import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";
import { z } from "zod";
import { showcaseDaysZ } from "@/lib/showcaseDurations";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: Request, { params }: Params) {
  try {
    const bodySchema = z.object({
      days: showcaseDaysZ.default(7),
    });
    const body = await _req.json().catch(() => ({}));
    const { days } = bodySchema.parse(body);
    const { id } = await params;
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
    }

    const ad = await prisma.ad.findUnique({
      where: { id },
      select: { id: true, ownerId: true, status: true, showcaseUntil: true },
    });
    if (!ad) {
      return NextResponse.json({ error: "Ilan bulunamadi." }, { status: 404 });
    }
    if (ad.ownerId !== session.userId && !isStaffAdminRole(session.role)) {
      return NextResponse.json({ error: "Bu ilan icin yetkiniz yok." }, { status: 403 });
    }
    if (ad.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Vitrin sadece onayli ilanlar icin aktiftir." },
        { status: 400 },
      );
    }

    const settings = await prisma.adminSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });
    let fee = settings.showcaseFeeAmountTry * days;
    try {
      const map = JSON.parse(settings.showcaseDailyPricingJson || "{}") as Record<string, number>;
      const mapped = map[String(days)];
      if (Number.isFinite(mapped)) fee = Number(mapped);
    } catch {}

    if (fee > 0) {
      const balanceAgg = await prisma.creditTransaction.aggregate({
        where: { userId: ad.ownerId },
        _sum: { amountTry: true },
      });
      const balance = Number(balanceAgg._sum.amountTry || 0);
      if (balance < fee) {
        return NextResponse.json(
          { error: `Vitrin icin yetersiz bakiye. Gerekli: ${fee} TL, Bakiye: ${balance} TL` },
          { status: 400 },
        );
      }

      await prisma.creditTransaction.create({
        data: {
          userId: ad.ownerId,
          type: "AD_FEE",
          amountTry: -fee,
          description: `Vitrin ucreti (${id})`,
          referenceId: id,
        },
      });
    }

    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const updated = await prisma.ad.update({
      where: { id },
      data: { showcaseUntil: until },
      select: { id: true, showcaseUntil: true },
    });

    return NextResponse.json({ ok: true, feeChargedTry: fee, days, ad: updated });
  } catch {
    return NextResponse.json({ error: "Vitrin aktivasyonu basarisiz." }, { status: 500 });
  }
}
