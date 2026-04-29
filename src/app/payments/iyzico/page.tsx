import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type Props = {
  searchParams: Promise<{ orderId?: string }>;
};

export default async function IyzicoPaymentPage({ searchParams }: Props) {
  const params = await searchParams;
  const orderId = params.orderId;
  if (!orderId) {
    notFound();
  }

  const order = await prisma.paymentOrder.findUnique({ where: { id: orderId } });
  if (!order || order.provider !== "IYZICO" || !order.providerPayload) {
    notFound();
  }

  const payload = JSON.parse(order.providerPayload) as { checkoutFormContent?: string };
  if (!payload.checkoutFormContent) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-bold">iyzico Odeme</h1>
      <p className="text-sm text-gray-600">Siparis: {order.id}</p>
      <div
        className="rounded-xl border p-4 bg-white"
        dangerouslySetInnerHTML={{ __html: payload.checkoutFormContent }}
      />
    </main>
  );
}
