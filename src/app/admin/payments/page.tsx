"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { SHOWCASE_DAY_VALUES } from "@/lib/showcaseDurations";

type Settings = {
  showcaseFeeAmountTry: number;
  showcaseDailyPricing: Record<string, number>;
};

function defaultShowcasePricing(): Record<string, number> {
  return Object.fromEntries(SHOWCASE_DAY_VALUES.map((d) => [String(d), d * 250]));
}

export default function AdminPaymentsPage() {
  const [settings, setSettings] = useState<Settings>({
    showcaseFeeAmountTry: 250,
    showcaseDailyPricing: defaultShowcasePricing(),
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        let parsed: Record<string, number> = {};
        try {
          parsed = JSON.parse(String(data.showcaseDailyPricingJson || "{}"));
        } catch {}
        setSettings({
          showcaseFeeAmountTry: Number(data.showcaseFeeAmountTry || 250),
          showcaseDailyPricing: Object.fromEntries(
            SHOWCASE_DAY_VALUES.map((d) => [String(d), Number(parsed[String(d)] ?? d * 250)]),
          ),
        });
      });
  }, []);

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    setMessage(res.ok ? "Vitrin ayarlari kaydedildi." : data.error || "Hata.");
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
      <Link className="admin-back-link" href="/admin">
        ← Yonetici Ana Panel
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Vitrin Ayarlari</h1>
      <form className="glass-card rounded-2xl p-5 space-y-3" onSubmit={onSave}>
        <p className="text-sm text-slate-600">
          Teklif ucreti ayarlari{" "}
          <Link href="/admin/bid-settings" className="font-medium text-orange-900 underline">
            Teklif Ayarlari
          </Link>{" "}
          sayfasindadir.
        </p>
        <input
          className="w-full border rounded-lg p-2 bg-white"
          type="number"
          min={0}
          value={settings.showcaseFeeAmountTry}
          onChange={(e) => setSettings((s) => ({ ...s, showcaseFeeAmountTry: Number(e.target.value) }))}
          placeholder="Vitrin temel ucreti (TL)"
        />
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
          <p className="mb-2 text-sm font-semibold">Vitrin paket fiyatlari (3 / 5 / 7 / 15 / 30 gun)</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {SHOWCASE_DAY_VALUES.map((day) => (
              <label key={day} className="text-xs text-orange-800">
                {day === 7 ? "1 hafta (7)" : day === 30 ? "1 ay (30)" : `${day} gun`}
                <input
                  className="mt-1 w-full border rounded-md p-1 text-sm"
                  type="number"
                  min={0}
                  value={settings.showcaseDailyPricing[String(day)] ?? 0}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      showcaseDailyPricing: { ...s.showcaseDailyPricing, [String(day)]: Number(e.target.value || 0) },
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </div>
        <button className="btn-primary" type="submit">Kaydet</button>
      </form>
      {message && <p className="text-sm">{message}</p>}
    </main>
  );
}
