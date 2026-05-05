"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { adminUrl } from "@/lib/adminUrls";

export default function MemberApprovalClient() {
  const [autoApprove, setAutoApprove] = useState(false);
  const [welcomeBonusEnabled, setWelcomeBonusEnabled] = useState(true);
  const [welcomeBonusAmountTry, setWelcomeBonusAmountTry] = useState(500);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/settings", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.memberSignupAutoApprove === "boolean") {
          setAutoApprove(data.memberSignupAutoApprove);
        }
        if (typeof data.welcomeBonusEnabled === "boolean") {
          setWelcomeBonusEnabled(data.welcomeBonusEnabled);
        }
        if (typeof data.welcomeBonusAmountTry === "number") {
          setWelcomeBonusAmountTry(Math.max(0, Math.trunc(data.welcomeBonusAmountTry)));
        }
      })
      .catch(() => setMessage("Ayarlar yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        memberSignupAutoApprove: autoApprove,
        welcomeBonusEnabled,
        welcomeBonusAmountTry: Math.max(0, Math.trunc(welcomeBonusAmountTry || 0)),
      }),
    });
    const data = await res.json();
    setMessage(
      res.ok
        ? "Üye onayı ayarı kaydedildi."
        : typeof data.error === "string"
          ? data.error
          : "Kayıt başarısız.",
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 p-4 md:p-6">
      <Link className="admin-back-link" href={adminUrl()}>
        ← Yönetici ana panel
      </Link>
      <h1 className="text-3xl font-bold tracking-tight text-orange-950">Üye onayı politikası</h1>
      <p className="text-sm leading-relaxed text-slate-700">
        Yeni üye kaydı tamamlandığında hesabın yayına alınması nasıl olsun? Otomatik seçilirse kayıt anında
        üye <strong className="font-semibold text-slate-900">onaylı</strong> sayılır. Manuel seçilirse üye{" "}
        <strong className="font-semibold text-slate-900">Üyeler</strong> ekranından belge ve bilgileri
        inceleyerek onaylanır (varsayılan).
      </p>

      {loading ? (
        <p className="text-sm text-slate-600">Yükleniyor…</p>
      ) : (
        <form className="glass-card space-y-4 rounded-2xl p-5" onSubmit={onSave}>
          <fieldset className="space-y-3">
            <legend className="sr-only">Üye onayı modu</legend>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 has-[:checked]:border-orange-300 has-[:checked]:ring-1 has-[:checked]:ring-orange-200">
              <input
                type="radio"
                name="approvalMode"
                className="mt-1 h-4 w-4 shrink-0"
                checked={!autoApprove}
                onChange={() => setAutoApprove(false)}
              />
              <span>
                <span className="font-medium text-slate-900">Yönetici incelemesi (önerilen)</span>
                <span className="mt-1 block text-sm text-slate-600">
                  Kayıt sonrası üye bekleyen durumda kalır; süper yönetici / yönetici ekibi belgeleri ve bilgileri
                  kontrol edip <strong className="font-medium text-slate-800">Üyeler</strong> sayfasından onaylar.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 has-[:checked]:border-orange-300 has-[:checked]:ring-1 has-[:checked]:ring-orange-200">
              <input
                type="radio"
                name="approvalMode"
                className="mt-1 h-4 w-4 shrink-0"
                checked={autoApprove}
                onChange={() => setAutoApprove(true)}
              />
              <span>
                <span className="font-medium text-slate-900">Otomatik onay</span>
                <span className="mt-1 block text-sm text-slate-600">
                  Kayıt tamamlanan hesap hemen onaylı üye olur; ek onay adımı beklenmez. Yüksek hacim veya güven
                  kontrollerinin tamamen başka kanallarda yapıldığı senaryolar için uygundur.
                </span>
              </span>
            </label>
          </fieldset>

          <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <h2 className="text-sm font-semibold text-emerald-950">Yeni üye hoşgeldin bakiyesi</h2>
            <p className="text-sm text-slate-700">
              Hoşgeldin bakiyesi tek seferlik yazılır. Otomatik onay modunda kayıt anında, manuel onay
              modunda ise yönetici <strong className="font-medium text-slate-900">onay</strong> verdiğinde
              eklenir.
            </p>
            <p className="text-xs text-slate-600">
              Varsayılan değer <strong className="font-medium text-slate-800">500 TL</strong> olarak gelir;
              isterseniz bu tutarı burada değiştirebilirsiniz.
            </p>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={welcomeBonusEnabled}
                onChange={(e) => setWelcomeBonusEnabled(e.target.checked)}
              />
              Hoşgeldin bakiyesini etkinleştir
            </label>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Hoşgeldin bakiyesi (TL)</label>
              <input
                className="w-full rounded-lg border border-emerald-200 bg-white p-2 text-slate-900"
                type="number"
                min={0}
                value={welcomeBonusAmountTry}
                onChange={(e) => setWelcomeBonusAmountTry(Number(e.target.value))}
              />
            </div>
          </div>

          <button className="btn-primary" type="submit">
            Kaydet
          </button>
          {message ? <p className="text-sm text-slate-800">{message}</p> : null}
        </form>
      )}
    </main>
  );
}
