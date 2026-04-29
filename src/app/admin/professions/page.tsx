"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";

type ProfessionRow = { id: string; name: string; sortOrder: number };

function formatApiError(data: unknown): string {
  if (!data || typeof data !== "object") return "Hata.";
  const o = data as { error?: unknown; details?: unknown };
  const err = o.error;
  const details = typeof o.details === "string" ? o.details : "";
  if (typeof err === "string") return details ? `${err} (${details})` : err;
  if (Array.isArray(err)) {
    return err
      .map((i) => {
        if (i && typeof i === "object" && "message" in i && typeof (i as { message: string }).message === "string") {
          return (i as { message: string }).message;
        }
        return String(i);
      })
      .join(" ");
  }
  return "Hata.";
}

export default function AdminProfessionsPage() {
  const [list, setList] = useState<ProfessionRow[]>([]);
  const [newName, setNewName] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/professions");
    const data = await res.json();
    setList(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/admin/professions");
      const data = await res.json();
      if (!cancelled) setList(Array.isArray(data) ? data : []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (name.length < 2) return;
    setMessage("");
    const res = await fetch("/api/admin/professions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Meslek eklendi." : formatApiError(data));
    if (res.ok) {
      setNewName("");
      await load();
    }
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`"${name}" meslegini silmek istiyor musunuz?`)) return;
    setMessage("");
    const res = await fetch(`/api/admin/professions/${id}`, { method: "DELETE" });
    const data = await res.json();
    setMessage(res.ok ? "Silindi." : formatApiError(data));
    if (res.ok) void load();
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4 md:p-6">
      <Link className="admin-back-link" href="/admin">
        ← Yonetici Ana Panel
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Meslek Ayarlari</h1>
      <p className="text-sm text-slate-600">
        Burada eklediginiz meslekler uye kayit formunda secilebilir olur. Kategori yonetimine benzer
        sekilde liste halinde tutulur (hiyerarsi yok).
      </p>

      <form onSubmit={onAdd} className="glass-card flex flex-wrap items-end gap-2 rounded-2xl p-4">
        <div className="min-w-[12rem] flex-1 space-y-1">
          <label className="text-xs font-medium text-slate-700" htmlFor="new-prof">
            Yeni meslek adi
          </label>
          <input
            id="new-prof"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm"
            placeholder="Ornek: Harita Muhendisi"
            minLength={2}
            autoComplete="off"
          />
        </div>
        <button className="btn-primary shrink-0" type="submit">
          Ekle
        </button>
      </form>

      {message && <p className="text-sm text-slate-800">{message}</p>}

      <section className="glass-card rounded-2xl p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Tanimli meslekler ({list.length})</h2>
        {list.length === 0 ? (
          <p className="text-sm text-slate-600">Henuz meslek yok. Yukaridan ekleyin.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-orange-100 bg-white px-3 py-2 text-sm"
              >
                <span className="font-medium text-slate-900">{p.name}</span>
                <button
                  type="button"
                  className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-800 hover:bg-red-100"
                  onClick={() => void remove(p.id, p.name)}
                >
                  Sil
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
