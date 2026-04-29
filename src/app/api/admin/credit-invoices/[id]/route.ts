import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";
import {
  CREDIT_INVOICE_STALE_ERROR,
  getCreditInvoiceRequestDelegate,
  warnCreditInvoiceDelegateMissing,
} from "@/lib/prismaCreditInvoice";

const patchSchema = z.object({
  adminNote: z.string().max(4000).optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
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
      paymentOrder: { select: { id: true, provider: true, status: true, paidAt: true, amountTry: true } },
      user: {
        select: {
          id: true,
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
              province: true,
              district: true,
              phone: true,
            },
          },
        },
      },
      approvedBy: { select: { id: true, email: true, name: true } },
    },
  });

  if (!row) {
    return NextResponse.json({ error: "Kayit bulunamadi." }, { status: 404 });
  }

  return NextResponse.json({ item: row });
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const session = await verifySessionToken((await cookies()).get("session_token")?.value);
    if (!session || !isStaffAdminRole(session.role)) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
    }

    const { id } = await params;
    const body = patchSchema.parse(await req.json());

    const inv = getCreditInvoiceRequestDelegate();
    if (!inv) {
      warnCreditInvoiceDelegateMissing();
      return NextResponse.json({ error: CREDIT_INVOICE_STALE_ERROR }, { status: 503 });
    }

    const existing = await inv.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Kayit bulunamadi." }, { status: 404 });
    }
    if (existing.status === "ISSUED") {
      return NextResponse.json({ error: "Kesilmis fatura notu guncellenemez." }, { status: 409 });
    }

    const updated = await inv.update({
      where: { id },
      data: { adminNote: body.adminNote ?? null },
      select: { id: true, adminNote: true },
    });

    return NextResponse.json({ ok: true, item: updated });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues }, { status: 400 });
    }
    throw e;
  }
}
