"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiErrorMessage } from "@/lib/apiErrorMessage";

type SlideLang = "tr" | "en";

type SlideRow = {
  id: string;
  lang: SlideLang;
  sortOrder: number;
  active: boolean;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  ctaUrl: string | null;
  ctaLabel: string | null;
  isSponsor: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

const emptyForm = {
  lang: "tr" as SlideLang,
  sortOrder: 0,
  active: true,
  title: "",
  subtitle: "",
  imageUrl: "",
  ctaUrl: "",
  ctaLabel: "",
  isSponsor: false,
  startsAt: "",
  endsAt: "",
};

function isoInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local → sunucuda güvenilir parse için UTC ISO (tarayıcı yerel saatinden). */
function localDatetimeToIsoOrNull(value: string): string | null {
  const t = value.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

const fetchJsonOpts = { credentials: "include" as RequestCredentials };

export default function AdminHomeHeroSlidesPage() {
  const [slides, setSlides] = useState<SlideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const sortedPreview = useMemo(() => {
    return [...slides].sort((a, b) => {
      if (a.lang !== b.lang) return a.lang.localeCompare(b.lang);
      return a.sortOrder - b.sortOrder || a.title.localeCompare(b.title);
    });
  }, [slides]);

  async function reload() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/home-hero-slides", { ...fetchJsonOpts });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data.error, "Liste alınamadı."));
      setSlides(Array.isArray(data) ? data : []);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Liste alınamadı.");
      setSlides([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
  }

  function startEdit(row: SlideRow) {
    setEditingId(row.id);
    setForm({
      lang: row.lang,
      sortOrder: row.sortOrder,
      active: row.active,
      title: row.title,
      subtitle: row.subtitle ?? "",
      imageUrl: row.imageUrl ?? "",
      ctaUrl: row.ctaUrl ?? "",
      ctaLabel: row.ctaLabel ?? "",
      isSponsor: row.isSponsor,
      startsAt: isoInput(row.startsAt),
      endsAt: isoInput(row.endsAt),
    });
    setMessage("");
  }

  function payloadBody() {
    const sortOrder = Number.isFinite(form.sortOrder) ? Math.trunc(form.sortOrder) : 0;
    return {
      lang: form.lang,
      sortOrder,
      active: form.active,
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      ctaUrl: form.ctaUrl.trim() || null,
      ctaLabel: form.ctaLabel.trim() || null,
      isSponsor: form.isSponsor,
      startsAt: localDatetimeToIsoOrNull(form.startsAt),
      endsAt: localDatetimeToIsoOrNull(form.endsAt),
    };
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    const body = payloadBody();
    if (!body.title) {
      setMessage("Başlık zorunlu.");
      return;
    }

    const url = editingId
      ? `/api/admin/home-hero-slides/${editingId}`
      : "/api/admin/home-hero-slides";
    const res = await fetch(url, {
      ...fetchJsonOpts,
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(apiErrorMessage(data.error, "Kayıt başarısız."));
      return;
    }
    setMessage(editingId ? "Slayt güncellendi." : "Slayt eklendi.");
    startCreate();
    await reload();
  }

  async function onDelete(id: string) {
    if (!window.confirm("Bu slaytı silmek istediğinize emin misiniz?")) return;
    setMessage("");
    const res = await fetch(`/api/admin/home-hero-slides/${id}`, {
      ...fetchJsonOpts,
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(apiErrorMessage(data.error, "Silinemedi."));
      return;
    }
    setMessage("Slayt silindi.");
    if (editingId === id) startCreate();
    await reload();
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 p-4 md:p-6">
      <Link className="admin-back-link" href="/admin">
        ← Yönetici ana panel
      </Link>
      <Link className="admin-back-link ml-3" href="/admin/site-settings">
        Site ayarları
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-orange-950">Ana sayfa hero slaytları</h1>
        <p className="mt-1 text-sm text-slate-600">
          Carousel metinleri ve görselleri; sponsor işaretli slaytlarda küçük etiket gösterilir. Görsel URL:{" "}
          <code className="rounded bg-orange-50 px-1">/uploads/…</code> veya yapılandırılmış HTTPS yükleme hostları.
        </p>
      </div>

      {message ? (
        <p className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-950">{message}</p>
      ) : null}

      <div className="glass-card rounded-2xl p-4 md:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-orange-950">Slayt listesi</h2>
          <button
            type="button"
            className="rounded-lg border border-orange-300 bg-white px-3 py-1.5 text-sm font-semibold text-orange-950 hover:bg-orange-50"
            onClick={() => startCreate()}
          >
            Yeni slayt formu
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-slate-600">Yükleniyor…</p>
        ) : sortedPreview.length === 0 ? (
          <p className="text-sm text-slate-600">Henüz slayt yok; ana sayfa site ayarlarındaki hero metnine düşer.</p>
        ) : (
          <ul className="space-y-2">
            {sortedPreview.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-orange-200/80 bg-white/90 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase text-slate-500">
                    <span>{row.lang === "tr" ? "TR" : "EN"}</span>
                    <span>sıra {row.sortOrder}</span>
                    <span>{row.active ? "aktif" : "pasif"}</span>
                    {row.isSponsor ? <span className="text-amber-700">sponsor</span> : null}
                  </div>
                  <p className="mt-1 font-semibold text-slate-900">{row.title}</p>
                  {row.subtitle ? (
                    <p className="truncate text-sm text-slate-600" title={row.subtitle}>
                      {row.subtitle}
                    </p>
                  ) : null}
                  {row.imageUrl ? (
                    <p className="truncate text-xs text-slate-500" title={row.imageUrl ?? ""}>
                      {row.imageUrl}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-orange-300 px-2 py-1 text-xs font-semibold text-orange-950 hover:bg-orange-50"
                    onClick={() => startEdit(row)}
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-300 px-2 py-1 text-xs font-semibold text-red-800 hover:bg-red-50"
                    onClick={() => void onDelete(row.id)}
                  >
                    Sil
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form className="glass-card space-y-3 rounded-2xl p-5" onSubmit={(e) => void onSubmit(e)}>
        <h2 className="text-lg font-semibold text-orange-950">{editingId ? "Slaytı güncelle" : "Yeni slayt"}</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Dil
            <select
              className="mt-1 w-full rounded-lg border border-orange-200 bg-white p-2"
              value={form.lang}
              onChange={(e) => setForm((f) => ({ ...f, lang: e.target.value as SlideLang }))}
            >
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Sıra
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-orange-200 bg-white p-2"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
            />
          </label>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
          />
          Aktif
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
          <input
            type="checkbox"
            checked={form.isSponsor}
            onChange={(e) => setForm((f) => ({ ...f, isSponsor: e.target.checked }))}
          />
          Sponsor / reklam etiketi
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Başlık *
          <input
            className="mt-1 w-full rounded-lg border border-orange-200 bg-white p-2"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Alt metin
          <textarea
            className="mt-1 w-full rounded-lg border border-orange-200 bg-white p-2"
            rows={2}
            value={form.subtitle}
            onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Görsel URL
          <input
            className="mt-1 w-full rounded-lg border border-orange-200 bg-white p-2"
            value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
            placeholder="/uploads/… veya HTTPS"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            CTA bağlantısı
            <input
              className="mt-1 w-full rounded-lg border border-orange-200 bg-white p-2"
              value={form.ctaUrl}
              onChange={(e) => setForm((f) => ({ ...f, ctaUrl: e.target.value }))}
              placeholder="/ilanlar veya https://…"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            CTA etiketi
            <input
              className="mt-1 w-full rounded-lg border border-orange-200 bg-white p-2"
              value={form.ctaLabel}
              onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Yayında başlangıç (yerel)
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-lg border border-orange-200 bg-white p-2"
              value={form.startsAt}
              onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Yayında bitiş (yerel)
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-lg border border-orange-200 bg-white p-2"
              value={form.endsAt}
              onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button type="submit" className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
            {editingId ? "Kaydet" : "Ekle"}
          </button>
          {editingId ? (
            <button type="button" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50" onClick={() => startCreate()}>
              İptal
            </button>
          ) : null}
        </div>
      </form>
    </main>
  );
}
