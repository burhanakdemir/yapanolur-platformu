"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiErrorMessage } from "@/lib/apiErrorMessage";

type TeamRow = {
  id: string;
  email: string;
  name: string | null;
  role: "SUPER_ADMIN" | "ADMIN";
  memberNumber: number;
  createdAt: string;
};

type TeamPayload = {
  team: TeamRow[];
  maxSize: number;
  selfId: string;
};

type TeamAdminsClientProps = {
  /** Ana yönetici panelinde gömülü gösterim (daha sıkı boşluk) */
  embedded?: boolean;
  /** Kenar çubuğu: dar sütun için küçük tipografi ve boşluk */
  compact?: boolean;
};

export default function TeamAdminsClient({
  embedded = false,
  compact = false,
}: TeamAdminsClientProps) {
  const [data, setData] = useState<TeamPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");

  const [pwdById, setPwdById] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoadError(null);
    const res = await fetch("/api/admin/team", { credentials: "include" });
    const json = (await res.json().catch(() => ({}))) as TeamPayload & { error?: unknown };
    if (!res.ok) {
      setLoadError(apiErrorMessage(json.error, "Liste yüklenemedi."));
      setData(null);
      return;
    }
    setData(json);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          password: newPassword,
          name: newName.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({})) as { error?: unknown };
      if (!res.ok) {
        setMessage(apiErrorMessage(json.error, "Eklenemedi."));
        return;
      }
      setNewEmail("");
      setNewPassword("");
      setNewName("");
      setMessage("Yardımcı yönetici eklendi.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(id: string) {
    const password = pwdById[id]?.trim();
    if (!password || password.length < 4) {
      setMessage("Şifre en az 4 karakter olmalı.");
      return;
    }
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/team/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json().catch(() => ({})) as { error?: unknown };
      if (!res.ok) {
        setMessage(apiErrorMessage(json.error, "Şifre güncellenemedi."));
        return;
      }
      setPwdById((prev) => ({ ...prev, [id]: "" }));
      setMessage("Şifre güncellendi.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Bu yönetici hesabını silmek istediğinize emin misiniz?")) return;
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/team/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({})) as { error?: unknown };
      if (!res.ok) {
        setMessage(apiErrorMessage(json.error, "Silinemedi."));
        return;
      }
      setMessage("Hesap silindi.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <p className="text-sm text-red-700">{loadError}</p>
        <Link href="/admin" className="mt-4 inline-block text-sm font-medium text-orange-800 underline">
          ← Yönetici paneli
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-slate-600" aria-live="polite">
        Yükleniyor…
      </p>
    );
  }

  const slotsLeft = Math.max(0, data.maxSize - data.team.length);
  const gapClass = compact ? "space-y-3" : embedded ? "space-y-5" : "space-y-8";
  const cardPad = compact ? "p-4" : "p-6";
  const innerCardClass = compact
    ? `rounded-xl border border-orange-200/80 bg-white/90 ${cardPad} shadow-sm`
    : `glass-card rounded-2xl ${cardPad} shadow-md`;
  const h2Class = compact
    ? "text-sm font-semibold text-orange-950"
    : "text-lg font-semibold text-orange-950";
  const bodyText = compact ? "text-xs text-orange-900/85" : "text-sm text-orange-900/80";
  const labelClass = compact
    ? "block text-xs font-medium text-slate-700"
    : "block text-sm font-medium text-slate-700";
  const inputClass = compact
    ? "mt-1 w-full rounded-lg border border-orange-200 bg-white px-2 py-1.5 text-sm"
    : "mt-1 w-full rounded-lg border border-orange-200 bg-white px-3 py-2";

  return (
    <div className={gapClass}>
      {message ? (
        <p
          className={
            compact
              ? "rounded-lg border border-orange-200 bg-orange-50/90 px-2.5 py-1.5 text-xs text-orange-950"
              : "rounded-xl border border-orange-200 bg-orange-50/90 px-4 py-2 text-sm text-orange-950"
          }
          role="status"
        >
          {message}
        </p>
      ) : null}

      <section className={innerCardClass}>
        <h2 className={h2Class}>Mevcut ekip</h2>
        <p className={`mt-1 ${bodyText}`}>
          En fazla {data.maxSize} yönetici (ana + yardımcılar). Şu an {data.team.length} / {data.maxSize}.
        </p>
        <ul className={compact ? "mt-3 space-y-2" : "mt-4 space-y-4"}>
          {data.team.map((row) => {
            const isSelf = row.id === data.selfId;
            const isSuper = row.role === "SUPER_ADMIN";
            const superCount = data.team.filter((t) => t.role === "SUPER_ADMIN").length;
            const showDelete =
              !isSelf && (row.role === "ADMIN" || (isSuper && superCount > 1));

            return (
              <li
                key={row.id}
                className={
                  compact
                    ? "rounded-lg border border-orange-100 bg-white/80 p-3 shadow-sm"
                    : "rounded-xl border border-orange-100 bg-white/80 p-4 shadow-sm"
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={compact ? "truncate text-sm font-medium text-slate-900" : "font-medium text-slate-900"}>
                      {row.email}
                    </p>
                    {row.name ? (
                      <p className={compact ? "truncate text-xs text-slate-600" : "text-sm text-slate-600"}>
                        {row.name}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-slate-500">
                      Üye no: {row.memberNumber} ·{" "}
                      {isSuper ? (
                        <span className="font-semibold text-amber-800">Ana yönetici</span>
                      ) : (
                        <span>Yardımcı yönetici</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className={compact ? "mt-2 flex flex-col gap-2" : "mt-3 flex flex-wrap items-end gap-2"}>
                  <label
                    className={
                      compact
                        ? "w-full min-w-0 text-[11px] font-medium text-slate-600"
                        : "min-w-[200px] flex-1 text-xs font-medium text-slate-600"
                    }
                  >
                    Yeni şifre
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={pwdById[row.id] ?? ""}
                      onChange={(e) =>
                        setPwdById((prev) => ({ ...prev, [row.id]: e.target.value }))
                      }
                      className={
                        compact
                          ? "mt-1 w-full rounded-lg border border-orange-200 bg-white px-2 py-1 text-sm"
                          : "mt-1 w-full rounded-lg border border-orange-200 bg-white px-2 py-1.5 text-sm"
                      }
                      placeholder="••••••"
                    />
                  </label>
                  <div className={compact ? "flex flex-wrap gap-1.5" : "contents"}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void savePassword(row.id)}
                      className={
                        compact
                          ? "rounded-lg bg-orange-600 px-2.5 py-1.5 text-xs font-medium text-white shadow hover:bg-orange-700 disabled:opacity-50"
                          : "rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-orange-700 disabled:opacity-50"
                      }
                    >
                      Şifreyi kaydet
                    </button>
                    {showDelete ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void remove(row.id)}
                        className={
                          compact
                            ? "rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                            : "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                        }
                      >
                        Sil
                      </button>
                    ) : null}
                    {isSelf ? (
                      <span className="self-center text-[11px] text-slate-500">(siz)</span>
                    ) : null}
                    {!showDelete && !isSelf && isSuper ? (
                      <span className="self-center text-[11px] text-amber-800">Son ana yönetici silinemez</span>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {slotsLeft > 0 ? (
        <section className={innerCardClass}>
          <h2 className={h2Class}>Yardımcı yönetici ekle</h2>
          <p className={`mt-1 ${bodyText}`}>
            Yeni hesap <strong>yardımcı yönetici</strong> olarak oluşturulur (ana yönetici ataması veritabanından yapılır).
          </p>
          <form className={compact ? "mt-3 space-y-2" : "mt-4 space-y-3"} onSubmit={onAdd}>
            <label className={labelClass}>
              E-posta
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Şifre
              <input
                type="password"
                required
                minLength={4}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Ad (isteğe bağlı)
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className={inputClass}
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className={
                compact
                  ? "btn-primary w-full py-2 text-sm disabled:opacity-50"
                  : "btn-primary w-full sm:w-auto disabled:opacity-50"
              }
            >
              Ekle
            </button>
          </form>
        </section>
      ) : (
        <p className={compact ? "text-xs text-amber-900" : "text-sm text-amber-900"}>
          Ekip kotası doldu; yeni yönetici eklemek için önce bir hesap silin.
        </p>
      )}
    </div>
  );
}
