"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { adminUrl } from "@/lib/adminUrls";
import { MAX_ADMIN_TEAM_SIZE, MAX_SUPER_ADMIN_ACCOUNTS } from "@/lib/adminRoles";

type TeamRow = {
  id: string;
  email: string;
  name: string | null;
  role: "SUPER_ADMIN" | "ADMIN";
  hasAllProvinces: boolean;
  provinces: string[];
  memberNumber: number;
  createdAt: string;
};

type TeamPayload = {
  team: TeamRow[];
  maxSize: number;
  /** GET yanıtı; yoksa sabit MAX_SUPER_ADMIN_ACCOUNTS kullanılır */
  maxSuperAdmins?: number;
  selfId: string;
};

type TeamAdminsClientProps = {
  /** Ana yönetici panelinde gömülü gösterim (daha sıkı boşluk) */
  embedded?: boolean;
  /** Kenar çubuğu: dar sütun için küçük tipografi ve boşluk */
  compact?: boolean;
};

function provinceScopeSummary(row: TeamRow): string {
  if (row.hasAllProvinces) return "Tüm iller";
  if (row.provinces.length === 0) return "Atama yok";
  const sorted = [...row.provinces].sort((a, b) => a.localeCompare(b, "tr"));
  return `${sorted.length} il — ${sorted.join(", ")}`;
}

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
  const [newRole, setNewRole] = useState<"ADMIN" | "SUPER_ADMIN">("ADMIN");

  const [pwdById, setPwdById] = useState<Record<string, string>>({});
  const [allProvinces, setAllProvinces] = useState<string[]>([]);
  const [provinceSelectionById, setProvinceSelectionById] = useState<Record<string, string[]>>({});
  const [hasAllById, setHasAllById] = useState<Record<string, boolean>>({});
  /** Her yardımcı satırı için ayrı il araması (tek filtre birden fazla satırı karıştırıyordu). */
  const [provinceFilterById, setProvinceFilterById] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoadError(null);
    const res = await fetch("/api/admin/team", { credentials: "include", cache: "no-store" });
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

  useEffect(() => {
    if (!data) return;
    const nextSel: Record<string, string[]> = {};
    const nextAll: Record<string, boolean> = {};
    for (const row of data.team) {
      nextSel[row.id] = row.provinces ?? [];
      nextAll[row.id] = row.hasAllProvinces;
    }
    setProvinceSelectionById(nextSel);
    setHasAllById(nextAll);
  }, [data]);

  useEffect(() => {
    let done = false;
    (async () => {
      const res = await fetch("/api/locations?level=provinces", {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json().catch(() => [])) as { name?: string }[];
      if (done || !Array.isArray(json)) return;
      const list = json
        .map((p) => (typeof p.name === "string" ? p.name.trim() : ""))
        .filter(Boolean);
      setAllProvinces(list);
    })();
    return () => {
      done = true;
    };
  }, []);

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
          role: newRole,
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
      setNewRole("ADMIN");
      setMessage(newRole === "SUPER_ADMIN" ? "Ana yönetici eklendi." : "Yardımcı yönetici eklendi.");
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

  async function saveProvinceScope(id: string) {
    setMessage(null);
    const hasAllProvinces = hasAllById[id] ?? true;
    const provinces = Array.from(new Set((provinceSelectionById[id] ?? []).filter(Boolean)));
    if (!hasAllProvinces && provinces.length === 0) {
      setMessage(
        "Belirli iller modundayken en az bir il seçin — ya da «Tüm iller yetkisi» kutusunu işaretleyin.",
      );
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/team/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hasAllProvinces, provinces }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: unknown };
      if (!res.ok) {
        setMessage(apiErrorMessage(json.error, "İl yetkileri kaydedilemedi."));
        return;
      }
      setMessage("İl yetkileri güncellendi.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <p className="text-sm text-red-700">{loadError}</p>
        <Link href={adminUrl()} className="mt-4 inline-block text-sm font-medium text-orange-800 underline">
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

  /** Sunucu eski önbellekle yanlış maxSize döndürse bile gösterim tek kaynak: adminRoles */
  const teamLimit = MAX_ADMIN_TEAM_SIZE;
  const superCap = data.maxSuperAdmins ?? MAX_SUPER_ADMIN_ACCOUNTS;
  const superCount = data.team.filter((t) => t.role === "SUPER_ADMIN").length;
  const superSlotsLeft = Math.max(0, superCap - superCount);
  const slotsLeft = Math.max(0, teamLimit - data.team.length);
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
          Toplam en fazla {teamLimit} yönetici (ana + yardımcılar). Şu an {data.team.length} / {teamLimit}.
          {" "}
          Ana yönetici: {superCount} / {superCap}.
        </p>
        <ul className={compact ? "mt-3 space-y-2" : "mt-4 space-y-4"}>
          {data.team.map((row) => {
            const isSelf = row.id === data.selfId;
            const isSuper = row.role === "SUPER_ADMIN";
            const showDelete =
              !isSelf && (row.role === "ADMIN" || (isSuper && superCount > 1));
            const rowProvFilter = provinceFilterById[row.id] ?? "";
            const provinceQuery = rowProvFilter.trim().toLocaleLowerCase("tr-TR");
            const provincesForPicker = provinceQuery
              ? allProvinces.filter((p) =>
                  p.toLocaleLowerCase("tr-TR").includes(provinceQuery),
                )
              : allProvinces;

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
                    <p className="mt-1 text-[11px] leading-snug text-slate-500">
                      İl yetkisi:{" "}
                      <span className="font-medium text-slate-700">{provinceScopeSummary(row)}</span>
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
                {row.role === "ADMIN" ? (
                  <div
                    className={
                      compact
                        ? "mt-2 rounded-lg border border-orange-100 bg-orange-50/40 p-2"
                        : "mt-3 rounded-lg border border-orange-100 bg-orange-50/40 p-3"
                    }
                  >
                    {allProvinces.length === 0 ? (
                      <p className="mb-2 text-[11px] font-medium text-amber-900">
                        İl listesi henüz yüklenmedi veya API erişilemedi; sayfayı yenileyin.
                      </p>
                    ) : null}
                    <div className="mb-2 flex items-center gap-2">
                      <input
                        id={`all-provinces-${row.id}`}
                        type="checkbox"
                        checked={hasAllById[row.id] ?? true}
                        onChange={(e) =>
                          setHasAllById((prev) => ({ ...prev, [row.id]: e.target.checked }))
                        }
                      />
                      <label htmlFor={`all-provinces-${row.id}`} className="text-xs font-medium text-slate-700">
                        Tüm iller yetkisi
                      </label>
                    </div>
                    {!(hasAllById[row.id] ?? true) ? (
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-slate-700">
                          İller (işaretleyin; Ctrl gerekmez)
                          <input
                            type="search"
                            value={rowProvFilter}
                            onChange={(e) =>
                              setProvinceFilterById((prev) => ({
                                ...prev,
                                [row.id]: e.target.value,
                              }))
                            }
                            placeholder="İl ara…"
                            className="mt-1 w-full rounded-lg border border-orange-200 bg-white px-2 py-1.5 text-xs"
                            autoComplete="off"
                          />
                        </label>
                        <div className="max-h-44 overflow-y-auto rounded-lg border border-orange-200 bg-white p-2">
                          {provincesForPicker.length === 0 ? (
                            <p className="text-[11px] text-slate-500">Eşleşen il yok.</p>
                          ) : (
                            <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                              {provincesForPicker.map((p) => {
                                const checked = (provinceSelectionById[row.id] ?? []).includes(p);
                                return (
                                  <li key={p}>
                                    <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-[11px] text-slate-800 hover:bg-orange-50">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => {
                                          const on = e.target.checked;
                                          setProvinceSelectionById((prev) => {
                                            const cur = new Set(prev[row.id] ?? []);
                                            if (on) cur.add(p);
                                            else cur.delete(p);
                                            return {
                                              ...prev,
                                              [row.id]: Array.from(cur).sort((a, b) =>
                                                a.localeCompare(b, "tr"),
                                              ),
                                            };
                                          });
                                        }}
                                      />
                                      <span className="min-w-0 break-words">{p}</span>
                                    </label>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Seçili: {(provinceSelectionById[row.id] ?? []).length} il
                          {(provinceSelectionById[row.id] ?? []).length > 0 ? (
                            <span className="mt-0.5 block text-[10px] leading-snug text-slate-500">
                              {(provinceSelectionById[row.id] ?? []).sort((a, b) => a.localeCompare(b, "tr")).join(", ")}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    ) : null}
                    <div className="mt-2">
                      <button
                        type="button"
                        disabled={
                          busy ||
                          (allProvinces.length === 0 && !(hasAllById[row.id] ?? true))
                        }
                        onClick={() => void saveProvinceScope(row.id)}
                        className="rounded-lg border border-orange-300 bg-white px-3 py-1.5 text-xs font-medium text-orange-900 shadow-sm hover:bg-orange-50 disabled:opacity-50"
                      >
                        İl yetkilerini kaydet
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {slotsLeft > 0 ? (
        <section className={innerCardClass}>
          <h2 className={h2Class}>Yönetici ekle</h2>
          <p className={`mt-1 ${bodyText}`}>
            Hesap türünü seçin. Ana yönetici en fazla <strong>{superCap}</strong> hesap (tam yetki + ekip yönetimi).
            Yardımcı yöneticiler il ile kısıtlanabilir.
          </p>
          <form className={compact ? "mt-3 space-y-2" : "mt-4 space-y-3"} onSubmit={onAdd}>
            <div>
              <span className={labelClass}>Yönetici türü</span>
              <div
                className={
                  compact
                    ? "mt-1 flex flex-col gap-2 rounded-lg border border-orange-200/80 bg-white p-2"
                    : "mt-1 flex flex-col gap-2 rounded-lg border border-orange-200/80 bg-white p-3 sm:flex-row sm:flex-wrap sm:gap-4"
                }
              >
                <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-800">
                  <input
                    type="radio"
                    name="new-admin-role"
                    className="mt-1"
                    checked={newRole === "ADMIN"}
                    onChange={() => setNewRole("ADMIN")}
                  />
                  <span>
                    <strong>Yardımcı yönetici</strong>
                    <span className="block text-xs font-normal text-slate-600">
                      Panel modülleri; süper yönetici alanları kısıtlı olabilir, il yetkisi atanabilir.
                    </span>
                  </span>
                </label>
                <label
                  className={`flex cursor-pointer items-start gap-2 text-sm ${
                    superSlotsLeft === 0 ? "cursor-not-allowed text-slate-400" : "text-slate-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="new-admin-role"
                    className="mt-1"
                    disabled={superSlotsLeft === 0}
                    checked={newRole === "SUPER_ADMIN"}
                    onChange={() => setNewRole("SUPER_ADMIN")}
                  />
                  <span>
                    <strong>Ana yönetici (süper yönetici)</strong>
                    <span className="block text-xs font-normal text-slate-600">
                      Tam yetki, yönetici ekibi. Kalan kot: {superSlotsLeft} / {superCap}.
                      {superSlotsLeft === 0 ? " Kotayı doldurdunuz." : ""}
                    </span>
                  </span>
                </label>
              </div>
            </div>
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
              disabled={busy || (newRole === "SUPER_ADMIN" && superSlotsLeft === 0)}
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
