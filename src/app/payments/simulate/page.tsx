import { notFound } from "next/navigation";
import SimulateClient from "./simulate-client";
import { isPaymentSimulateAllowed } from "@/lib/paymentSimulate";

type Props = {
  searchParams: Promise<{ orderId?: string; provider?: string; reason?: string; adId?: string; days?: string }>;
};

export default async function SimulatePaymentPage({ searchParams }: Props) {
  if (!isPaymentSimulateAllowed()) {
    notFound();
  }
  const params = await searchParams;
  return (
    <SimulateClient
      orderId={params.orderId || ""}
      provider={params.provider || ""}
      reason={params.reason || ""}
      adId={params.adId || ""}
      days={Number(params.days || 0)}
    />
  );
}
