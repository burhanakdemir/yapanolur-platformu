"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SimulateClient({
  orderId,
  provider,
  reason,
  adId,
  days,
}: {
  orderId: string;
  provider: string;
  reason: string;
  adId: string;
  days: number;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function confirm(success: boolean) {
    const res = await fetch("/api/payments/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        orderId,
        success,
        reason: reason || undefined,
        adId: adId || undefined,
        days: days > 0 ? days : undefined,
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? `Odeme sonucu: ${data.status}` : data.error || "Hata");
    if (res.ok && success) {
      setTimeout(() => router.push("/panel/user"), 800);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-2xl font-bold">Odeme Simulasyonu</h1>
      <p className="text-sm text-gray-600">
        Saglayici: {provider} | Siparis: {orderId}
      </p>
      <div className="flex gap-2">
        <button
          className="rounded bg-green-700 text-white px-4 py-2"
          onClick={() => void confirm(true)}
        >
          Odemeyi Basarili Tamamla
        </button>
        <button
          className="rounded bg-red-700 text-white px-4 py-2"
          onClick={() => void confirm(false)}
        >
          Odemeyi Basarisiz Yap
        </button>
      </div>
      {message && <p className="text-sm">{message}</p>}
    </main>
  );
}
