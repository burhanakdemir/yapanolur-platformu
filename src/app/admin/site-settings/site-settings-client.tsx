"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { adminUrl } from "@/lib/adminUrls";

export default function SiteSettingsClient() {
  const [heroTitleTr, setHeroTitleTr] = useState("");
  const [heroSubtitleTr, setHeroSubtitleTr] = useState("");
  const [taglineTr, setTaglineTr] = useState("");
  const [primaryBtnTr, setPrimaryBtnTr] = useState("");
  const [footerContact, setFooterContact] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setHeroTitleTr(String(data.homeHeroTitleTr || ""));
        setHeroSubtitleTr(String(data.homeHeroSubtitleTr || ""));
        setTaglineTr(String(data.homeTaglineTr || ""));
        setPrimaryBtnTr(String(data.homePrimaryButtonTr || ""));
        setFooterContact(String(data.homeFooterContact || ""));
      });
  }, []);

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homeHeroTitleTr: heroTitleTr,
        homeHeroSubtitleTr: heroSubtitleTr,
        homeTaglineTr: taglineTr,
        homePrimaryButtonTr: primaryBtnTr,
        homeFooterContact: footerContact,
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Site ayarlari kaydedildi." : data.error || "Kayit basarisiz.");
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-4 p-4 md:p-6">
      <Link className="admin-back-link" href={adminUrl()}>
        ← Yönetici ana panel
      </Link>
      <h1 className="text-3xl font-bold tracking-tight text-orange-950">Site ayarları</h1>
      <p className="text-sm text-slate-600">
        Ana sayfa üst şerit için carousel slaytları:{" "}
        <Link className="font-semibold text-orange-800 underline-offset-2 hover:underline" href={adminUrl("/home-hero-slides")}>
          Hero slaytları yönetimi
        </Link>
      </p>
      <form className="glass-card rounded-2xl p-5 space-y-3" onSubmit={onSave}>
        <input
          className="w-full border rounded-lg p-2 bg-white"
          value={heroTitleTr}
          onChange={(e) => setHeroTitleTr(e.target.value)}
          placeholder="TR ana sayfa baslik"
        />
        <textarea
          className="w-full border rounded-lg p-2 bg-white"
          value={heroSubtitleTr}
          onChange={(e) => setHeroSubtitleTr(e.target.value)}
          placeholder="TR ana sayfa alt aciklama"
        />
        <input
          className="w-full border rounded-lg p-2 bg-white"
          value={taglineTr}
          onChange={(e) => setTaglineTr(e.target.value)}
          placeholder="TR logo alti kisa aciklama"
        />
        <input
          className="w-full border rounded-lg p-2 bg-white"
          value={primaryBtnTr}
          onChange={(e) => setPrimaryBtnTr(e.target.value)}
          placeholder="TR birincil buton metni"
        />
        <input
          className="w-full border rounded-lg p-2 bg-white"
          value={footerContact}
          onChange={(e) => setFooterContact(e.target.value)}
          placeholder="Footer iletisim satiri"
        />
        <button className="btn-primary" type="submit">
          Kaydet
        </button>
        {message && <p className="text-sm">{message}</p>}
      </form>
    </main>
  );
}
