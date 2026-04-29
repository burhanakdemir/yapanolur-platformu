import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { showcaseDaysZ } from "@/lib/showcaseDurations";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole, isSuperAdminRole } from "@/lib/adminRoles";
import { isPaymentSimulateAllowed } from "@/lib/paymentSimulate";
import { enqueueCreditInvoiceAfterTopUpPaid } from "@/lib/creditInvoiceQueue";
import { parseShowcaseFromCallback } from "@/lib/paymentPostSuccess";

const bodySchema = z.object({
  orderId: z.string().min(5),
  success: z.boolean().default(true),
  reason: z.enum(["showcase"]).optional(),
  adId: z.string().min(4).optional(),
  days: showcaseDaysZ.optional(),
});

export async function POST(req: Request) {
  try {
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
    }

    const data = bodySchema.parse(await req.json());
    const order = await prisma.paymentOrder.findUnique({ where: { id: data.orderId } });
    if (!order) {
      return NextResponse.json({ error: "Odeme kaydi bulunamadi." }, { status: 404 });
    }

    if (!isStaffAdminRole(session.role) && order.userId !== session.userId) {
      return NextResponse.json({ error: "Bu odemeye erisemezsiniz." }, { status: 403 });
    }

    if (!data.success) {
      await prisma.paymentOrder.update({
        where: { id: order.id },
        data: { status: "FAILED" },
      });
      return NextResponse.json({ ok: false, status: "FAILED" });
    }

    if (order.status === "PAID") {
      return NextResponse.json({ ok: true, status: "PAID" });
    }

    /** Üretimde PAID yalnızca süper yönetici (manuel) veya iyzico/PayTR callback; üye simülasyonu kapalı. */
    const superOk = isSuperAdminRole(session.role);
    const memberSimulateOk =
      isPaymentSimulateAllowed() && session.role === "MEMBER" && order.userId === session.userId;
    if (!superOk && !memberSimulateOk) {
      return NextResponse.json(
        {
          error:
            "Odeme onayi bu kanaldan yapilamaz. Kart odemesi tamamlandiktan sonra sistem otomatik onaylar; test icin gelistirme ortami veya ALLOW_PAYMENT_SIMULATE kullanin.",
        },
        { status: 403 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.paymentOrder.update({
        where: { id: order.id },
        data: { status: "PAID", paidAt: new Date() },
      });
      await tx.creditTransaction.create({
        data: {
          userId: order.userId,
          type: "TOP_UP",
          amountTry: order.amountTry,
          description: `Odeme onayi (${order.provider})`,
          referenceId: order.id,
        },
      });
    });

    const sc = parseShowcaseFromCallback({
      reason: data.reason ?? null,
      adId: data.adId ?? null,
      days: data.days != null ? String(data.days) : null,
    });
    if (!sc.ok) {
      await enqueueCreditInvoiceAfterTopUpPaid({
        paymentOrderId: order.id,
        userId: order.userId,
        amountTry: order.amountTry,
      });
    }

    if (sc.ok) {
      await activateShowcaseAfterPayment({
        userId: order.userId,
        adId: sc.adId,
        days: sc.days,
      });
    }

    return NextResponse.json({ ok: true, status: "PAID" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Odeme dogrulanamadi." }, { status: 500 });
  }
}

async function activateShowcaseAfterPayment(params: { userId: string; adId: string; days: number }) {
  const ad = await prisma.ad.findUnique({
    where: { id: params.adId },
    select: { id: true, ownerId: true },
  });
  if (!ad || ad.ownerId !== params.userId) return;

  const settings = await prisma.adminSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  let fee = settings.showcaseFeeAmountTry * params.days;
  try {
    const map = JSON.parse(settings.showcaseDailyPricingJson || "{}") as Record<string, number>;
    const mapped = map[String(params.days)];
    if (Number.isFinite(mapped)) fee = Number(mapped);
  } catch {}

  if (fee > 0) {
    await prisma.creditTransaction.create({
      data: {
        userId: params.userId,
        type: "AD_FEE",
        amountTry: -fee,
        description: `Vitrin ucreti (${params.adId})`,
        referenceId: params.adId,
      },
    });
  }

  await prisma.ad.update({
    where: { id: params.adId },
    data: {
      showcaseUntil: new Date(Date.now() + params.days * 24 * 60 * 60 * 1000),
    },
  });
}
