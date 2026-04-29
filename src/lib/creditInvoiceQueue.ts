import { getCreditInvoiceRequestDelegate, warnCreditInvoiceDelegateMissing } from "@/lib/prismaCreditInvoice";

/**
 * Kredi yükleme ödemesi PAID olduktan sonra tek seferlik fatura kuyruğu kaydı.
 * Idempotent: aynı paymentOrder için ikinci çağrı no-op.
 */
export async function enqueueCreditInvoiceAfterTopUpPaid(params: {
  paymentOrderId: string;
  userId: string;
  amountTry: number;
}): Promise<void> {
  const inv = getCreditInvoiceRequestDelegate();
  if (!inv) {
    warnCreditInvoiceDelegateMissing();
    return;
  }

  const exists = await inv.findUnique({
    where: { paymentOrderId: params.paymentOrderId },
    select: { id: true },
  });
  if (exists) return;

  await inv.create({
    data: {
      paymentOrderId: params.paymentOrderId,
      userId: params.userId,
      amountTry: params.amountTry,
      status: "PENDING_APPROVAL",
    },
  });
}
