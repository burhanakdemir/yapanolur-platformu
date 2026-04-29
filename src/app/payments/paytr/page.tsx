import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PaytrIframeClient from "./paytr-iframe-client";
import type { PaytrProviderPayload } from "@/lib/payments";

type Props = {
  searchParams: Promise<{ orderId?: string }>;
};

export default async function PaytrPaymentPage({ searchParams }: Props) {
  const params = await searchParams;
  const orderId = params.orderId;
  if (!orderId) {
    notFound();
  }

  const order = await prisma.paymentOrder.findUnique({ where: { id: orderId } });
  if (!order || order.provider !== "PAYTR" || !order.providerPayload) {
    notFound();
  }

  let payload: PaytrProviderPayload;
  try {
    payload = JSON.parse(order.providerPayload) as PaytrProviderPayload;
  } catch {
    notFound();
  }
  if (payload.kind !== "paytr" || !payload.iframeToken) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-bold text-slate-900">PayTR ile odeme</h1>
      <p className="text-sm text-slate-600">Siparis: {order.id}</p>
      <PaytrIframeClient token={payload.iframeToken} />
    </main>
  );
}
