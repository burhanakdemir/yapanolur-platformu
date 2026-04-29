"use client";

import { FormEvent, useEffect, useState } from "react";
import { normalizeAdTextForStorage, stripHashAndAfter } from "@/lib/adTitleDisplay";

type Props = {
  adId: string;
  initialTitle: string;
  /** Detay sayfası: başta sadece “düzenle”; panel: her zaman form */
  compact?: boolean;
  /** Açık turuncu/koyu tema kutusu üzerinde kontrast için */
  onVibrantBackground?: boolean;
  onSaved?: (title: string) => void;
};

export default function AdTitleEditor({
  adId,
  initialTitle,
  compact = false,
  onVibrantBackground = false,
  onSaved,
}: Props) {
  const [title, setTitle] = useState(() => initialTitle ?? "");
  const [editing, setEditing] = useState(compact);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      setTitle(initialTitle ?? "");
    });
  }, [initialTitle]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    const trimmed = normalizeAdTextForStorage(title);
    if (trimmed.length < 4) {
      setErr("En az 4 karakter girin.");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/ads/${adId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
    const data = (await res.json()) as { error?: string; title?: string };
    setSaving(false);
    if (!res.ok) {
      setErr(typeof data.error === "string" ? data.error : "Kaydedilemedi.");
      return;
    }
    const next = data.title ?? trimmed;
    setTitle(next);
    onSaved?.(next);
    if (!compact) setEditing(false);
  }

  if (!compact && !editing) {
    return (
      <button
        type="button"
        className={
          onVibrantBackground
            ? "text-sm font-medium text-white underline decoration-white/70 underline-offset-2 hover:text-orange-50"
            : "text-sm font-medium text-orange-800 underline decoration-orange-400/80 underline-offset-2 hover:text-orange-950"
        }
        onClick={() => setEditing(true)}
      >
        Proje adini duzenle
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className={
        compact
          ? "flex flex-col gap-2 rounded-lg border border-orange-200 bg-white/90 p-2 sm:flex-row sm:items-center"
          : onVibrantBackground
            ? "space-y-2 rounded-xl border border-white/35 bg-white/95 p-3 shadow-sm"
            : "space-y-2 rounded-xl border border-orange-200 bg-orange-50/80 p-3"
      }
    >
      <label className={compact ? "min-w-0 flex-1 text-[11px] font-medium text-slate-600" : "block text-sm font-medium text-slate-700"}>
        {compact ? "Proje adi" : "Yeni proje adi"}
        <input
          className="mt-1 w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-orange-300"
          value={title ?? ""}
          onChange={(e) => setTitle(stripHashAndAfter(e.target.value))}
          minLength={4}
          required
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-60"
          type="submit"
          disabled={saving}
        >
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
        {!compact && (
          <button
            className="text-sm text-slate-600 hover:text-slate-900"
            type="button"
            onClick={() => {
              setTitle(initialTitle ?? "");
              setErr("");
              setEditing(false);
            }}
            disabled={saving}
          >
            Iptal
          </button>
        )}
      </div>
      {err ? <p className="w-full text-xs text-red-700">{err}</p> : null}
    </form>
  );
}
