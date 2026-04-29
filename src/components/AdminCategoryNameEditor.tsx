"use client";

import { FormEvent, useEffect, useState } from "react";

type Props = {
  categoryId: string;
  initialName: string;
  variant: "main" | "sub";
  onRenamed: () => void | Promise<void>;
};

export default function AdminCategoryNameEditor({
  categoryId,
  initialName,
  variant,
  onRenamed,
}: Props) {
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setErr("En az 2 karakter.");
      return;
    }
    if (trimmed === initialName.trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/admin/categories/${encodeURIComponent(categoryId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ name: trimmed }),
    });
    const data = (await res.json()) as { error?: string };
    setSaving(false);
    if (!res.ok) {
      setErr(typeof data.error === "string" ? data.error : "Kaydedilemedi.");
      return;
    }
    await onRenamed();
    setEditing(false);
  }

  const isMain = variant === "main";

  const shellMain =
    "w-full min-w-0 rounded-xl border-2 border-orange-200/90 bg-gradient-to-r from-white to-orange-50/50 px-3 py-2.5 shadow-sm sm:px-4";
  const shellSub =
    "w-full min-w-0 rounded-xl border-2 border-orange-100 bg-white px-3 py-2.5 shadow-sm sm:px-4";

  if (!editing) {
    return (
      <div
        className={`flex min-w-0 flex-1 items-stretch justify-between gap-3 ${isMain ? shellMain : shellSub}`}
      >
        <span
          className={`flex min-w-0 flex-1 items-center ${isMain ? "text-base font-semibold text-orange-950 sm:text-lg" : "text-sm text-slate-800"}`}
        >
          <span className="truncate">{name}</span>
        </span>
        <button
          type="button"
          className={
            isMain
              ? "inline-flex w-[8.25rem] shrink-0 items-center justify-center rounded-lg border border-orange-400/80 bg-white px-3 py-2 text-xs font-semibold text-orange-900 shadow-sm transition hover:bg-orange-50"
              : "inline-flex w-[8.25rem] shrink-0 items-center justify-center rounded-lg border border-orange-300/90 bg-orange-50/80 px-3 py-2 text-xs font-semibold text-orange-900 shadow-sm transition hover:bg-orange-100/80"
          }
          onClick={() => {
            setErr("");
            setEditing(true);
          }}
        >
          Adi duzenle
        </button>
      </div>
    );
  }

  return (
    <form
      className={`flex min-w-0 flex-1 flex-col flex-wrap gap-3 sm:flex-row sm:items-stretch ${isMain ? shellMain : shellSub}`}
      onSubmit={(e) => void onSubmit(e)}
    >
      <input
        className={
          isMain
            ? "min-h-[2.75rem] min-w-0 flex-1 rounded-lg border border-orange-300 bg-white px-3 py-2 text-base font-semibold text-orange-950 outline-none focus:ring-2 focus:ring-orange-300 sm:text-lg"
            : "min-h-[2.75rem] min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
        }
        value={name}
        onChange={(e) => setName(e.target.value)}
        minLength={2}
        autoFocus
        aria-label="Kategori adi"
      />
      <div className="flex shrink-0 items-stretch gap-2 sm:w-auto sm:min-w-0">
        <button
          type="submit"
          disabled={saving}
          className={`inline-flex min-h-[2.75rem] min-w-[5.5rem] flex-1 items-center justify-center rounded-lg px-3 text-xs font-semibold text-white shadow-sm transition disabled:opacity-60 sm:flex-initial sm:min-w-[6rem] ${
            isMain ? "bg-orange-600 hover:bg-orange-700" : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
          }`}
        >
          {saving ? "..." : "Kaydet"}
        </button>
        <button
          type="button"
          className="inline-flex min-h-[2.75rem] min-w-[5.5rem] flex-1 items-center justify-center rounded-lg border-2 border-orange-200 bg-white px-3 text-xs font-semibold text-orange-900 shadow-sm transition hover:bg-orange-50 sm:flex-initial sm:min-w-[6rem]"
          disabled={saving}
          onClick={() => {
            setName(initialName);
            setErr("");
            setEditing(false);
          }}
        >
          Iptal
        </button>
      </div>
      {err ? <p className="w-full basis-full text-center text-[11px] text-red-700 sm:text-left">{err}</p> : null}
    </form>
  );
}
