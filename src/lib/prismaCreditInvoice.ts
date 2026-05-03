import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const STALE_CLIENT_HINT =
  "[credit-invoice] Prisma semasi guncel degil veya migration uygulanmadi. Calistirin: npx prisma generate && npx prisma migrate dev";

type CreditInvoiceRequestDelegate = PrismaClient["creditInvoiceRequest"];

/**
 * Eski `node_modules` veya `prisma generate` calismamis ortamda delegate runtime'da yok olabilir.
 */
export function getCreditInvoiceRequestDelegate(): CreditInvoiceRequestDelegate | null {
  const d = (prisma as unknown as { creditInvoiceRequest?: CreditInvoiceRequestDelegate }).creditInvoiceRequest;
  if (!d) return null;
  if (typeof d.count !== "function") return null;
  if (typeof d.findUnique !== "function") return null;
  if (typeof d.findMany !== "function") return null;
  if (typeof d.create !== "function") return null;
  if (typeof d.update !== "function") return null;
  return d;
}

export function warnCreditInvoiceDelegateMissing(): void {
  if (process.env.NODE_ENV === "development") {
    console.warn(STALE_CLIENT_HINT);
  }
}

/** API yanıtlarında sabit metin (KVKK: loga detay yok). */
export const CREDIT_INVOICE_STALE_ERROR =
  "Fatura modulu veritabani/Prisma ile uyumsuz. Sunucuda prisma generate ve migrate calistirin.";

export async function countPendingCreditInvoiceRequests(): Promise<number> {
  const d = getCreditInvoiceRequestDelegate();
  if (!d) {
    warnCreditInvoiceDelegateMissing();
    return 0;
  }
  return d.count({ where: { status: "PENDING_APPROVAL" } });
}
