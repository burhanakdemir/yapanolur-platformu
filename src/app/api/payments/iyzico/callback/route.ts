import { NextResponse } from "next/server";
import { createRequestLogger, getRequestIdFromRequest, routeFromUrl } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { verifyIyzicoPayment } from "@/lib/payments";
import { activateShowcaseAfterPayment, parseShowcaseFromCallback } from "@/lib/paymentPostSuccess";
import { enqueueCreditInvoiceAfterTopUpPaid } from "@/lib/creditInvoiceQueue";

export async function POST(req: Request) {
  const route = routeFromUrl(req.url);
  const requestId = getRequestIdFromRequest(req);
  const log = createRequestLogger(requestId, route);

  const headers = new Headers();
  if (requestId) headers.set("x-request-id", requestId);

  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId");
    const reason = url.searchParams.get("reason");
    const adId = url.searchParams.get("adId");
    const days = Number(url.searchParams.get("days") || 0);
    if (!orderId) {
      return NextResponse.json({ error: "orderId eksik." }, { status: 400, headers });
    }

    const formData = await req.formData();
    const token = String(formData.get("token") || "");
    if (!token) {
      return NextResponse.json({ error: "token eksik." }, { status: 400, headers });
    }

    const order = await prisma.paymentOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      log.warn("iyzico_callback_order_not_found", { orderId });
      return NextResponse.json({ error: "Odeme kaydi bulunamadi." }, { status: 404, headers });
    }

    const verify = await verifyIyzicoPayment(token, order.externalRef || order.id);
    const paymentStatus = String(verify.paymentStatus || "");

    if (String(verify.status) === "success" && paymentStatus === "SUCCESS") {
      const sc = parseShowcaseFromCallback({ reason, adId, days: String(days) });
      if (order.status !== "PAID") {
        await prisma.$transaction(async (tx) => {
          await tx.paymentOrder.update({
            where: { id: order.id },
            data: {
              status: "PAID",
              paidAt: new Date(),
              providerPayload: JSON.stringify(verify),
            },
          });
          await tx.creditTransaction.create({
            data: {
              userId: order.userId,
              type: "TOP_UP",
              amountTry: order.amountTry,
              description: "iyzico odeme onayi",
              referenceId: order.id,
            },
          });
        });
        if (!sc.ok) {
          await enqueueCreditInvoiceAfterTopUpPaid({
            paymentOrderId: order.id,
            userId: order.userId,
            amountTry: order.amountTry,
          });
        }
      }
      if (sc.ok) {
        await activateShowcaseAfterPayment({ userId: order.userId, adId: sc.adId, days: sc.days });
      }
      log.info("iyzico_callback_success", { orderId: order.id, userId: order.userId });
      const okRes = NextResponse.redirect(new URL("/panel/user", req.url));
      if (requestId) okRes.headers.set("x-request-id", requestId);
      return okRes;
    }

    await prisma.paymentOrder.update({
      where: { id: order.id },
      data: {
        status: "FAILED",
        providerPayload: JSON.stringify(verify),
      },
    });
    log.warn("iyzico_callback_payment_failed", {
      orderId: order.id,
      verifyStatus: verify.status,
      paymentStatus,
    });
    const failRes = NextResponse.redirect(new URL("/panel/user/topup?status=failed", req.url));
    if (requestId) failRes.headers.set("x-request-id", requestId);
    return failRes;
  } catch (e) {
    log.error("iyzico_callback_unhandled", e, { kind: "payment" });
    return NextResponse.json(
      { error: "Odeme islemi sirasinda sunucu hatasi." },
      { status: 500, headers },
    );
  }
}
