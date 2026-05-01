"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { apiErrorMessage } from "@/lib/apiErrorMessage";

/** Boş gövde / HTML hata sayfası → `res.json()` SyntaxError vermesin */
async function readApiJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) {
    return {
      error: `Sunucu boş yanıt döndü (${res.status}). Oturum süresi dolmuş veya ağ/proxy hatası olabilir; sayfayı yenileyin.`,
    };
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {
      error: `Geçersiz yanıt (${res.status}). Giriş yapıp tekrar deneyin.`,
    };
  }
}

export default function SponsorHeroClient() {
  const [feeTry, setFeeTry] = useState(0);
  const [periodDays, setPeriodDays] = useState(30);
  const [memberNumber, setMemberNumber] = useState("");
  const [pricingMsg, setPricingMsg] = useState("");
  const [assignMsg, setAssignMsg] = useState("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    fetch("/api/admin/settings", { credentials: "include" })
      .then(async (r) => readApiJson(r))
      .then((data) => {
        setFeeTry(Number(data.sponsorHeroFeeAmountTry ?? 0));
        setPeriodDays(Number(data.sponsorHeroPeriodDays ?? 30));
      })
      .catch(() => {})
      .finally(() => setLoadingSettings(false));
  }, []);

  async function onSavePricing(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPricingMsg("");
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        sponsorHeroFeeAmountTry: feeTry,
        sponsorHeroPeriodDays: periodDays,
      }),
    });
    const data = await readApiJson(res);
    setPricingMsg(res.ok ? "Ücretlendirme kaydedildi." : apiErrorMessage(data.error, "Kaydedilemedi."));
  }

  async function onAssign(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (assignSubmitting) return;
    setAssignMsg("");
    const n = Number.parseInt(memberNumber.trim(), 10);
    if (!Number.isFinite(n) || n < 1) {
      setAssignMsg("Geçerli üye numarası girin.");
      return;
    }
    setAssignSubmitting(true);
    try {
      const res = await fetch("/api/admin/sponsor-hero/from-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ memberNumber: n }),
      });
      const data = await readApiJson(res);
      if (!res.ok) {
        setAssignMsg(apiErrorMessage(data.error, "Eklenemedi."));
        return;
      }
      const mn = data.memberNumber;
      setAssignMsg(
        typeof mn === "number"
          ? `Üye №${mn} için tek Türkçe (TR) sponsor slaytı oluşturuldu; aynı üyeye ait önceki sponsor kaydı silindi.`
          : "Sponsor slaytı oluşturuldu.",
      );
      setMemberNumber("");
    } finally {
      setAssignSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-4 md:p-6">
      <Link className="admin-back-link" href="/admin">
        ← Yönetici ana panel
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-amber-950">Ana sayfa sponsorluğu</h1>
        <p className="mt-1 text-sm text-slate-600">
          Süper yönetici: sponsorluk ücreti ve yayın süresi; üye numarasıyla ana sayfa şeridine sponsor satırı eklenmesi
          (üye adı + meslek / il, profil bağlantısı).
        </p>
      </div>

      <form className="glass-card space-y-4 rounded-2xl border border-amber-200/80 p-5" onSubmit={onSavePricing}>
        <h2 className="text-sm font-semibold text-amber-950">Ücretlendirme</h2>
        <p className="text-xs text-slate-600">
          Üyeler panelde gösterilen tutarı görür; tahsilat için bakiye / ödeme süreçleri platform politikasına bağlıdır.
        </p>
        <label className="block text-sm font-medium text-slate-700">
          Dönem başına ücret (TL)
          <input
            type="number"
            min={0}
            step={1}
            className="mt-1 w-full rounded-lg border border-orange-200 bg-white p-2"
            value={feeTry}
            disabled={loadingSettings}
            onChange={(e) => setFeeTry(Number(e.target.value))}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Varsayılan yayın süresi (gün)
          <input
            type="number"
            min={1}
            max={3650}
            step={1}
            className="mt-1 w-full rounded-lg border border-orange-200 bg-white p-2"
            value={periodDays}
            disabled={loadingSettings}
            onChange={(e) => setPeriodDays(Number(e.target.value))}
          />
        </label>
        <button type="submit" className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold">
          Ücretlendirmeyi kaydet
        </button>
        {pricingMsg ? <p className="text-sm text-slate-700">{pricingMsg}</p> : null}
      </form>

      <form className="glass-card space-y-4 rounded-2xl border border-amber-300/90 p-5" onSubmit={onAssign}>
        <h2 className="text-sm font-semibold text-amber-950">Üye numarasıyla sponsor ekle</h2>
        <p className="text-xs text-slate-600">
          Kayıtlı üyenin adı (veya “Üye №”), meslek ve il bilgisi alt satırda kullanılır. Tek bir Türkçe (TR) sponsor
          satırı eklenir. Aynı üye için tekrar eklerseniz önceki sponsor kaydı silinip yenisi yazılır. İngilizce ana sayfa
          için ayrıca Hero slayt sayfasından EN slayt ekleyebilirsiniz.
        </p>
        <label className="block text-sm font-medium text-slate-700">
          Üye numarası
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded-lg border border-orange-200 bg-white p-2"
            value={memberNumber}
            onChange={(e) => setMemberNumber(e.target.value)}
            placeholder="örn. 1245"
          />
        </label>
        <button
          type="submit"
          disabled={assignSubmitting}
          className="rounded-xl bg-amber-900 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-amber-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {assignSubmitting ? "Ekleniyor…" : "Türkçe sponsor slaytını oluştur"}
        </button>
        {assignMsg ? <p className="text-sm text-slate-700">{assignMsg}</p> : null}
      </form>

      <p className="text-xs text-slate-500">
        Görsel ve özel metin için{" "}
        <Link href="/admin/home-hero-slides" className="font-semibold text-orange-800 underline-offset-2 hover:underline">
          Hero slayt
        </Link>{" "}
        sayfasını kullanabilirsiniz.
      </p>
    </main>
  );
}
