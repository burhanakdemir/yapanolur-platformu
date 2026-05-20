import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";
import { sanitizePublicNextPath } from "@/lib/safeRedirectPath";

type Props = {
  searchParams: Promise<{ orderId?: string }>;
};

export default async function IyzicoPaymentPage({ searchParams }: Props) {
  const params = await searchParams;
  const orderId = params.orderId?.trim();
  if (!orderId) {
    notFound();
  }

  const token = (await cookies()).get("session_token")?.value;
  const session = await verifySessionToken(token);
  const returnPath = sanitizePublicNextPath(`/payments/iyzico?orderId=${encodeURIComponent(orderId)}`);

  if (!session) {
    redirect(`/login?next=${encodeURIComponent(returnPath)}`);
  }

  const order = await prisma.paymentOrder.findUnique({ where: { id: orderId } });
  if (!order || order.provider !== "IYZICO" || !order.providerPayload) {
    notFound();
  }
  if (order.userId !== session.userId) {
    notFound();
  }

  const payload = JSON.parse(order.providerPayload) as { checkoutFormContent?: string };
  if (!payload.checkoutFormContent) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">iyzico Odeme</h1>
      <p className="text-sm text-gray-600">Siparis: {order.id}</p>
      <div
        className="rounded-xl border bg-white p-4"
        dangerouslySetInnerHTML={{ __html: payload.checkoutFormContent }}
      />
    </main>
  );
}
