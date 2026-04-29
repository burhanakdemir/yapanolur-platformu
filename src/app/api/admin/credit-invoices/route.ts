import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { isStaffAdminRole } from "@/lib/adminRoles";
import {
  CREDIT_INVOICE_STALE_ERROR,
  getCreditInvoiceRequestDelegate,
  warnCreditInvoiceDelegateMissing,
} from "@/lib/prismaCreditInvoice";

/** Liste: bekleyen ve son kesilenler (yönetici paneli). */
export async function GET(req: Request) {
  const session = await verifySessionToken((await cookies()).get("session_token")?.value);
  if (!session || !isStaffAdminRole(session.role)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const take = Math.min(100, Math.max(1, Number(url.searchParams.get("take") || 40)));

  const where =
    status === "PENDING_APPROVAL" || status === "ISSUED" || status === "FAILED"
      ? { status: status as "PENDING_APPROVAL" | "ISSUED" | "FAILED" }
      : {};

  const inv = getCreditInvoiceRequestDelegate();
  if (!inv) {
    warnCreditInvoiceDelegateMissing();
    return NextResponse.json({ error: CREDIT_INVOICE_STALE_ERROR }, { status: 503 });
  }

  const rows = await inv.findMany({
    where,
    take,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      amountTry: true,
      createdAt: true,
      paymentOrderId: true,
      user: {
        select: { id: true, email: true, name: true, memberNumber: true },
      },
    },
  });

  return NextResponse.json({ items: rows });
}
