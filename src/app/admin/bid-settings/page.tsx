"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { apiErrorMessage } from "@/lib/apiErrorMessage";

type BidSettings = {
  bidFeeEnabled: boolean;
  bidFeeAmountTry: number;
  detailViewFeeEnabled: boolean;
  detailViewFeeAmountTry: number;
  bidAccessFeeEnabled: boolean;
  bidAccessFeeAmountTry: number;
  memberContactFeeEnabled: boolean;
  memberContactFeeAmountTry: number;
  memberCommentFeeEnabled: boolean;
  memberCommentFeeAmountTry: number;
};

export default function AdminBidSettingsPage() {
  const [settings, setSettings] = useState<BidSettings>({
    bidFeeEnabled: false,
    bidFeeAmountTry: 0,
    detailViewFeeEnabled: false,
    detailViewFeeAmountTry: 0,
    bidAccessFeeEnabled: false,
    bidAccessFeeAmountTry: 0,
    memberContactFeeEnabled: false,
    memberContactFeeAmountTry: 0,
    memberCommentFeeEnabled: false,
    memberCommentFeeAmountTry: 0,
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings({
          bidFeeEnabled: Boolean(data.bidFeeEnabled),
          bidFeeAmountTry: Number(data.bidFeeAmountTry || 0),
          detailViewFeeEnabled: Boolean(data.detailViewFeeEnabled),
          detailViewFeeAmountTry: Number(data.detailViewFeeAmountTry ?? 0),
          bidAccessFeeEnabled: Boolean(data.bidAccessFeeEnabled),
          bidAccessFeeAmountTry: Number(data.bidAccessFeeAmountTry ?? 0),
          memberContactFeeEnabled: Boolean(data.memberContactFeeEnabled),
          memberContactFeeAmountTry: Number(data.memberContactFeeAmountTry ?? 0),
          memberCommentFeeEnabled: Boolean(data.memberCommentFeeEnabled),
          memberCommentFeeAmountTry: Number(data.memberCommentFeeAmountTry ?? 0),
        });
      });
  }, []);

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bidFeeEnabled: settings.bidFeeEnabled,
        bidFeeAmountTry: settings.bidFeeAmountTry,
        detailViewFeeEnabled: settings.detailViewFeeEnabled,
        detailViewFeeAmountTry: settings.detailViewFeeAmountTry,
        bidAccessFeeEnabled: settings.bidAccessFeeEnabled,
        bidAccessFeeAmountTry: settings.bidAccessFeeAmountTry,
        memberContactFeeEnabled: settings.memberContactFeeEnabled,
        memberContactFeeAmountTry: settings.memberContactFeeAmountTry,
        memberCommentFeeEnabled: settings.memberCommentFeeEnabled,
        memberCommentFeeAmountTry: settings.memberCommentFeeAmountTry,
      }),
    });
    const data = await res.json();
    setMessage(
      res.ok ? "Teklif ayarlari kaydedildi." : apiErrorMessage(data.error, "Hata."),
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 p-4 md:p-6">
      <Link className="admin-back-link" href="/admin">
        ← Yonetici Ana Panel
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Teklif Ayarlari</h1>
      <p className="text-sm text-slate-600">
        Ilan detayi ve teklif erisim ucretleri ile teklif basina ucret kurallari (kredi bakiyesinden
        dusulur).
      </p>

      <form className="glass-card space-y-4 rounded-2xl p-5" onSubmit={onSave}>
        <div className="rounded-xl border border-orange-200 bg-white/80 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-orange-950">Detay goruntuleme</h2>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              checked={settings.detailViewFeeEnabled}
              onChange={(e) => setSettings((s) => ({ ...s, detailViewFeeEnabled: e.target.checked }))}
            />
            Detay icin ucret al
          </label>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Detay basina (TL)</label>
            <input
              className="w-full rounded-lg border border-orange-200 bg-white p-2 text-slate-900"
              type="number"
              min={0}
              value={settings.detailViewFeeAmountTry}
              onChange={(e) =>
                setSettings((s) => ({ ...s, detailViewFeeAmountTry: Number(e.target.value) }))
              }
            />
            <p className="mt-1 text-xs text-slate-500">
              Uye, ilan kartindan Detay&apos;a gecmeden once bu tutari oder (ilan basina bir kez).
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-violet-950">Meslek sahibi iletisim (rehber)</h2>
          <p className="text-xs text-slate-600">
            &quot;Meslek Sahibi Ara&quot; sonucunda bir uyenin telefon, e-posta, il ve ilce bilgisini
            gormek icin (detay goruntuleme gibi kredi bakiyesinden tek seferlik).
          </p>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              checked={settings.memberContactFeeEnabled}
              onChange={(e) =>
                setSettings((s) => ({ ...s, memberContactFeeEnabled: e.target.checked }))
              }
            />
            Iletisim bilgisi icin ucret al
          </label>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Uye basina (TL)</label>
            <input
              className="w-full rounded-lg border border-violet-200 bg-white p-2 text-slate-900"
              type="number"
              min={0}
              value={settings.memberContactFeeAmountTry}
              onChange={(e) =>
                setSettings((s) => ({ ...s, memberContactFeeAmountTry: Number(e.target.value) }))
              }
            />
            <p className="mt-1 text-xs text-slate-500">
              Ayni uyenin iletisimini tekrar acmak ucretsiz (bir kez odenir).
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <h2 className="text-sm font-semibold text-amber-950">Uye profili yorumu</h2>
          <p className="text-xs text-slate-600">
            Baska bir uyenin profil sayfasina yorum yazmak icin kredi bakiyesinden tek seferlik ucret
            (her yorum ayri ucret). Profil sahibi gelen yoruma cevap yazmak icin de ayni tutar
            (her cevap ayri ucret, uye panelinden).
          </p>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              checked={settings.memberCommentFeeEnabled}
              onChange={(e) =>
                setSettings((s) => ({ ...s, memberCommentFeeEnabled: e.target.checked }))
              }
            />
            Yorum yazmayi ucretlendir
          </label>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Yorum basina (TL)</label>
            <input
              className="w-full rounded-lg border border-amber-200 bg-white p-2 text-slate-900"
              type="number"
              min={0}
              value={settings.memberCommentFeeAmountTry}
              onChange={(e) =>
                setSettings((s) => ({ ...s, memberCommentFeeAmountTry: Number(e.target.value) }))
              }
            />
            <p className="mt-1 text-xs text-slate-500">
              Kapali iken yorum yazilamaz ve cevap verilemez. Acik iken yorum ve cevap icin ayni tutar
              bakiyeden dusulur.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-emerald-950">Teklif verme hakki</h2>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              checked={settings.bidAccessFeeEnabled}
              onChange={(e) => setSettings((s) => ({ ...s, bidAccessFeeEnabled: e.target.checked }))}
            />
            Teklif vermek icin ayri erisim ucreti al
          </label>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Teklif erisim (TL)</label>
            <input
              className="w-full rounded-lg border border-emerald-200 bg-white p-2 text-slate-900"
              type="number"
              min={0}
              value={settings.bidAccessFeeAmountTry}
              onChange={(e) =>
                setSettings((s) => ({ ...s, bidAccessFeeAmountTry: Number(e.target.value) }))
              }
            />
            <p className="mt-1 text-xs text-slate-500">
              Bu ilanda teklif formunu acmak icin tek seferlik ucret (asagidaki teklif basina ucretten
              bagimsiz).
            </p>
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
          <input
            type="checkbox"
            checked={settings.bidFeeEnabled}
            onChange={(e) => setSettings((s) => ({ ...s, bidFeeEnabled: e.target.checked }))}
          />
          Teklif verirken ucret al
        </label>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Teklif basina ucret (TL)</label>
          <input
            className="w-full rounded-lg border border-orange-200 bg-white p-2 text-slate-900"
            type="number"
            min={0}
            value={settings.bidFeeAmountTry}
            onChange={(e) => setSettings((s) => ({ ...s, bidFeeAmountTry: Number(e.target.value) }))}
            placeholder="0"
          />
          <p className="mt-1 text-xs text-slate-500">
            Acik oldugunda her teklif icin uyenin bakiyesinden bu tutar dusulur (BID_FEE).
          </p>
        </div>
        <button className="btn-primary" type="submit">
          Kaydet
        </button>
      </form>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
    </main>
  );
}
