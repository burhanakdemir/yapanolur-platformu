"use client";

import { useCallback, useEffect, useState } from "react";
import { HOME_HERO_TICKER_MODES, type HomeHeroTickerMode } from "@/lib/homeHeroTickerMode";

export default function HomeHeroTickerSettingsSection({
  onMessage,
}: {
  onMessage: (msg: string, ok: boolean) => void;
}) {
  const [mode, setMode] = useState<HomeHeroTickerMode>("auto");
  const [memberLimit, setMemberLimit] = useState(24);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        const raw = String(data.homeHeroTickerMode || "auto");
        if (HOME_HERO_TICKER_MODES.includes(raw as HomeHeroTickerMode)) {
          setMode(raw as HomeHeroTickerMode);
        }
        const n = Number(data.homeHeroNewMembersLimit);
        if (Number.isFinite(n) && n >= 1) setMemberLimit(Math.min(48, Math.trunc(n)));
      })
      .catch(() => onMessage("Kayan serit ayarlari yuklenemedi.", false));
  }, [onMessage]);

  useEffect(() => {
    load();
  }, [load]);

  async function onSave() {
    setSaving(true);
    onMessage("", true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeHeroTickerMode: mode,
          homeHeroNewMembersLimit: memberLimit,
        }),
      });
      const data = await res.json();
      onMessage(
        res.ok ? "Kayan serit ayarlari kaydedildi." : data.error || "Kayit basarisiz.",
        res.ok,
      );
    } catch {
      onMessage("Kayit sirasinda hata.", false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="glass-card space-y-3 rounded-2xl p-5">
      <h2 className="text-lg font-semibold text-orange-950">Ana sayfa kayan serit</h2>
      <p className="text-sm text-slate-600">
        Turuncu ust bantta kayan metinler: aktif sponsor slaytlari veya son kayit olan uyeler (isim —
        meslek · il). Sponsor yokken otomatik mod yeni uyeleri gosterir.
      </p>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-800">Gosterim</legend>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="radio"
            name="homeHeroTickerMode"
            checked={mode === "auto"}
            onChange={() => setMode("auto")}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">Otomatik</span> — Sponsor slayt varsa sponsor; yoksa yeni
            uyeler
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="radio"
            name="homeHeroTickerMode"
            checked={mode === "sponsors"}
            onChange={() => setMode("sponsors")}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">Yalnizca sponsorlar</span> — Hero slayt / sponsor kayitlari
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="radio"
            name="homeHeroTickerMode"
            checked={mode === "new_members"}
            onChange={() => setMode("new_members")}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">Yalnizca yeni uyeler</span> — Son kayitlar (onayli, ornek
            hesaplar haric)
          </span>
        </label>
      </fieldset>

      {(mode === "new_members" || mode === "auto") && (
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Yeni uye listesi uzunlugu (max 48)</span>
          <input
            type="number"
            min={1}
            max={48}
            className="mt-1 w-full rounded-lg border bg-white p-2"
            value={memberLimit}
            onChange={(e) => setMemberLimit(Math.max(1, Math.min(48, Number(e.target.value) || 24)))}
          />
        </label>
      )}

      <button type="button" className="btn-primary" disabled={saving} onClick={() => void onSave()}>
        {saving ? "Kaydediliyor…" : "Kayan seridi kaydet"}
      </button>
    </section>
  );
}
