import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { showcaseDaysZ } from "@/lib/showcaseDurations";
import { getAppUrl } from "@/lib/appUrl";
import { createPaymentOrder } from "@/lib/payments";
import { getClientIpFromRequest } from "@/lib/requestIp";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";

const bodySchema = z.object({
  email: z.string().email(),
  amountTry: z.number().int().positive(),
  provider: z.enum(["manual", "iyzico", "paytr"]).default("manual"),
  reason: z.enum(["showcase"]).optional(),
  adId: z.string().min(4).optional(),
  days: showcaseDaysZ.optional(),
});

export async function POST(req: Request) {
  try {
    const data = bodySchema.parse(await req.json());
    const token = (await cookies()).get("session_token")?.value;
    const session = await verifySessionToken(token);

    if (!session) {
      return NextResponse.json({ error: "Giris gerekli." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      return NextResponse.json({ error: "Uye bulunamadi." }, { status: 404 });
    }

    if (data.provider === "manual" && !isStaffAdminRole(session.role)) {
      return NextResponse.json(
        { error: "Manual kredi yukleme yalnizca yoneticiye aciktir." },
        { status: 403 },
      );
    }

    if (data.provider !== "manual" && session.email !== data.email && !isStaffAdminRole(session.role)) {
      return NextResponse.json(
        { error: "Baska bir kullanici icin odeme baslatamazsiniz." },
        { status: 403 },
      );
    }

    if (data.provider !== "manual") {
      const callbackQuery =
        data.reason === "showcase" && data.adId && data.days
          ? { reason: "showcase", adId: data.adId, days: String(data.days) }
          : undefined;
      const userIp = data.provider === "paytr" ? getClientIpFromRequest(req) : undefined;
      const order = await createPaymentOrder({
        userId: user.id,
        provider: data.provider,
        amountTry: data.amountTry,
        callbackQuery,
        userIp,
      });
      let paymentUrl = order.paymentUrl;
      if (data.reason === "showcase" && data.adId && data.days) {
        const url = new URL(order.paymentUrl, `${getAppUrl()}/`);
        url.searchParams.set("reason", "showcase");
        url.searchParams.set("adId", data.adId);
        url.searchParams.set("days", String(data.days));
        paymentUrl = `${url.pathname}${url.search}`;
      }
      return NextResponse.json({
        ok: true,
        mode: "checkout",
        orderId: order.orderId,
        paymentUrl,
      });
    }

    const tx = await prisma.creditTransaction.create({
      data: {
        userId: user.id,
        type: "TOP_UP",
        amountTry: data.amountTry,
        description: `Kredi yukleme (${data.provider})`,
      },
    });

    return NextResponse.json({ ok: true, mode: "manual", transactionId: tx.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Kredi yuklenemedi." }, { status: 500 });
  }
}
