import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";
import {
  CREDIT_INVOICE_STALE_ERROR,
  getCreditInvoiceRequestDelegate,
  warnCreditInvoiceDelegateMissing,
} from "@/lib/prismaCreditInvoice";
import { memberToEInvoiceBuyer } from "@/lib/eInvoice/buyerSnapshot";
import { getResolvedSovosEInvoiceConfig } from "@/lib/eInvoice/resolveSovosConfig";
import { issueSovosCreditTopUpInvoice } from "@/lib/eInvoice/sovosIssue";

type Params = { params: Promise<{ id: string }> };

/** Yönetici onayı + Sovos (veya mock) kesim isteği. */
export async function POST(_req: Request, { params }: Params) {
  const session = await verifySessionToken((await cookies()).get("session_token")?.value);
  if (!session || !isStaffAdminRole(session.role)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const { id } = await params;

  const inv = getCreditInvoiceRequestDelegate();
  if (!inv) {
    warnCreditInvoiceDelegateMissing();
    return NextResponse.json({ error: CREDIT_INVOICE_STALE_ERROR }, { status: 503 });
  }

  const row = await inv.findUnique({
    where: { id },
    include: {
      paymentOrder: { select: { id: true, status: true, amountTry: true } },
      user: {
        select: {
          email: true,
          name: true,
          memberNumber: true,
          memberProfile: {
            select: {
              billingAccountType: true,
              billingTcKimlik: true,
              billingCompanyTitle: true,
              billingTaxOffice: true,
              billingVkn: true,
              billingAddressLine: true,
              billingPostalCode: true,
            },
          },
        },
      },
    },
  });

  if (!row) {
    return NextResponse.json({ error: "Kayit bulunamadi." }, { status: 404 });
  }

  if (row.status === "ISSUED") {
    return NextResponse.json({ error: "Bu kayit zaten kesildi." }, { status: 409 });
  }

  if (row.paymentOrder.status !== "PAID") {
    return NextResponse.json({ error: "Odeme PAID degil; fatura kesilemez." }, { status: 409 });
  }

  const buyer = memberToEInvoiceBuyer(row.user);
  const sovosCfg = await getResolvedSovosEInvoiceConfig();
  const result = await issueSovosCreditTopUpInvoice(
    {
      paymentOrderId: row.paymentOrderId,
      creditInvoiceRequestId: row.id,
      amountTry: row.amountTry,
      buyer,
    },
    sovosCfg,
  );

  if (!result.ok) {
    await inv.update({
      where: { id: row.id },
      data: {
        status: "FAILED",
        lastError: result.error,
        approvedByUserId: session.userId,
      },
    });
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }

  const updated = await inv.update({
    where: { id: row.id },
    data: {
      status: "ISSUED",
      approvedByUserId: session.userId,
      issuedAt: new Date(),
      ettn: result.ettn,
      providerDocumentId: result.providerDocumentId,
      documentUrl: result.documentUrl ?? null,
      lastError: null,
    },
    select: {
      id: true,
      status: true,
      ettn: true,
      providerDocumentId: true,
      documentUrl: true,
      issuedAt: true,
    },
  });

  return NextResponse.json({ ok: true, item: updated });
}
