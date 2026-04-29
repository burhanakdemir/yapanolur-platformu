"use client";

import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { displayAdTitle } from "@/lib/adTitleDisplay";
import { SHOWCASE_DAY_OPTIONS } from "@/lib/showcaseDurations";
import { useState } from "react";

type AdItem = {
  id: string;
  title: string;
  status: string;
  showcaseUntil: string | null;
};

export default function UserShowcaseList({
  initialAds,
  showcaseFeeAmountTry,
  showcaseDailyPricing,
  embedded = false,
}: {
  initialAds: AdItem[];
  showcaseFeeAmountTry: number;
  showcaseDailyPricing: Record<string, number>;
  /** Üst başlık ve kart çerçevesi dışarıda (ör. PanelCollapsibleSection) */
  embedded?: boolean;
}) {
  const [nowMs] = useState(() => Date.now());
  const [ads, setAds] = useState<AdItem[]>(initialAds);
  const [message, setMessage] = useState("");
  const [selectedDays, setSelectedDays] = useState<Record<string, number>>({});

  async function activateShowcase(adId: string, days: number) {
    setMessage("");
    const res = await fetch(`/api/ads/${adId}/showcase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(apiErrorMessage(data.error, "Vitrin aktivasyonu basarisiz."));
      return;
    }
    setAds((prev) =>
      prev.map((ad) => (ad.id === adId ? { ...ad, showcaseUntil: data.ad?.showcaseUntil || ad.showcaseUntil } : ad)),
    );
    setMessage(`Vitrin aktif edildi (${data.days} gun). Ucret: ${data.feeChargedTry} TL`);
  }

  const listBlock = (
    <div className="space-y-1.5">
      {ads.length === 0 && <p className="text-sm">Ilan bulunamadi.</p>}
      {ads.map((ad) => {
        const active = ad.showcaseUntil ? new Date(ad.showcaseUntil).getTime() > nowMs : false;
        const days = selectedDays[ad.id] || 7;
        const fee = Number(showcaseDailyPricing[String(days)] ?? showcaseFeeAmountTry * days);
        return (
          <div key={ad.id} className="flex items-center justify-between gap-2 rounded-xl border bg-white p-3">
            <div>
              <p className="font-medium">{displayAdTitle(ad.title)}</p>
              <p className="text-xs text-slate-500">
                Durum: {ad.status} | Vitrin: {active ? "Aktif" : "Pasif"}
              </p>
              <p className="text-xs text-slate-500">Secili sure: {days} gun | Ucret: {fee} TL</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="rounded-md border bg-white p-1 text-sm"
                value={days}
                onChange={(e) => setSelectedDays((prev) => ({ ...prev, [ad.id]: Number(e.target.value) }))}
              >
                {SHOWCASE_DAY_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                className="chip"
                type="button"
                disabled={ad.status !== "APPROVED"}
                onClick={() => void activateShowcase(ad.id, days)}
              >
                Vitrine Al
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-2">
        {listBlock}
        {message ? <p className="text-sm">{message}</p> : null}
      </div>
    );
  }

  return (
    <section className="glass-card space-y-2 rounded-2xl p-4 sm:p-5">
      <h2 className="font-semibold">Vitrin Ilanlari</h2>
      <p className="text-xs text-slate-600">
        Gunluk birim fiyat (referans): {showcaseFeeAmountTry} TL — sure secenekleri: 3 / 5 / 7 / 15 / 30 gun
      </p>
      {listBlock}
      {message && <p className="text-sm">{message}</p>}
    </section>
  );
}
