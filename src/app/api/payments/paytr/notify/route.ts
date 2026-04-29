import { NextResponse } from "next/server";
import { createRequestLogger, getRequestIdFromRequest, routeFromUrl } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getResolvedPaytrConfig } from "@/lib/paymentConfig";
import { verifyPaytrCallbackHash } from "@/lib/paytrClient";
import { activateShowcaseAfterPayment, parseShowcaseFromCallback } from "@/lib/paymentPostSuccess";
import { enqueueCreditInvoiceAfterTopUpPaid } from "@/lib/creditInvoiceQueue";

/**
 * PayTR iFrame BİLDİRİM (Callback) — mağaza panelinde bu URL açıkça tanımlanmalıdır.
 * Yanıt: yalnızca düz metin `OK` (PayTR tekrar dener, idempotent olmalı).
 */
export async function POST(req: Request) {
  const route = routeFromUrl(req.url);
  const requestId = getRequestIdFromRequest(req);
  const log = createRequestLogger(requestId, route);

  const ok = () => new NextResponse("OK", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });

  try {
    const form = await req.formData();
    const merchant_oid = String(form.get("merchant_oid") || "");
    const status = String(form.get("status") || "");
    const total_amount = String(form.get("total_amount") || "");
    const hash = String(form.get("hash") || "");

    if (!merchant_oid || !status || !total_amount || !hash) {
      return await ok();
    }

    const cfg = await getResolvedPaytrConfig();
    const match = verifyPaytrCallbackHash(cfg.merchantKey, cfg.merchantSalt, {
      merchant_oid,
      status,
      total_amount,
      hash,
    });
    if (!match) {
      log.warn("paytr_notify_hash_mismatch", { merchant_oid });
      return new NextResponse("HASH_FAIL", { status: 400, headers: { "Content-Type": "text/plain" } });
    }

    const order = await prisma.paymentOrder.findUnique({
      where: { id: merchant_oid },
    });
    if (!order) {
      log.warn("paytr_notify_order_not_found", { merchant_oid });
      return await ok();
    }
    if (order.provider !== "PAYTR") {
      log.warn("paytr_notify_wrong_provider", { merchant_oid });
      return await ok();
    }

    if (status !== "success") {
      if (order.status === "PENDING") {
        await prisma.paymentOrder.update({
          where: { id: order.id },
          data: { status: "FAILED" },
        });
      }
      return await ok();
    }

    if (order.status === "PAID") {
      return await ok();
    }

    const expectedKurus = order.amountTry * 100;
    const got = Number.parseInt(total_amount, 10);
    if (!Number.isFinite(got) || got !== expectedKurus) {
      log.warn("paytr_notify_amount_mismatch", { orderId: order.id, expectedKurus, got });
      if (order.status === "PENDING") {
        await prisma.paymentOrder.update({
          where: { id: order.id },
          data: { status: "FAILED" },
        });
      }
      return await ok();
    }

    let callbackQuery: Record<string, string> | undefined;
    try {
      const p = order.providerPayload ? (JSON.parse(order.providerPayload) as { callbackQuery?: Record<string, string> }) : {};
      callbackQuery = p.callbackQuery;
    } catch {
      /* ignore */
    }

    const sc = parseShowcaseFromCallback(callbackQuery);

    await prisma.$transaction(async (tx) => {
      await tx.paymentOrder.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
      });
      await tx.creditTransaction.create({
        data: {
          userId: order.userId,
          type: "TOP_UP",
          amountTry: order.amountTry,
          description: "PayTR odeme onayi",
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

    if (sc.ok) {
      await activateShowcaseAfterPayment({ userId: order.userId, adId: sc.adId, days: sc.days });
    }

    log.info("paytr_notify_success", { orderId: order.id, userId: order.userId });
    return await ok();
  } catch (e) {
    log.error("paytr_notify_unhandled", e, { kind: "payment" });
    return await ok();
  }
}
