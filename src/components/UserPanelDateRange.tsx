"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";

type Copy = {
  rangeLabel: string;
  rangeStart: string;
  rangeEnd: string;
  rangeReset: string;
  rangeHint: string;
};

export default function UserPanelDateRange({
  lang,
  fromIso,
  toIso,
  usedDefaultRange,
  copy,
}: {
  lang: "tr" | "en";
  fromIso: string;
  toIso: string;
  usedDefaultRange: boolean;
  copy: Copy;
}) {
  const router = useRouter();
  const maxYmd = useMemo(() => {
    const n = new Date();
    const y = n.getFullYear();
    const m = String(n.getMonth() + 1).padStart(2, "0");
    const d = String(n.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  function pushRange(nextFrom: string, nextTo: string) {
    const q = new URLSearchParams();
    if (lang === "en") q.set("lang", "en");
    q.set("from", nextFrom);
    q.set("to", nextTo);
    router.push(`/panel/user?${q.toString()}`);
  }

  function onFromChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    if (!v) return;
    let nextTo = toIso;
    if (v > nextTo) nextTo = v;
    pushRange(v, nextTo);
  }

  function onToChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    if (!v) return;
    let nextFrom = fromIso;
    if (v < nextFrom) nextFrom = v;
    pushRange(nextFrom, v);
  }

  function onReset() {
    router.push(lang === "en" ? "/panel/user?lang=en" : "/panel/user");
  }

  const inputClass =
    "w-full min-w-[8.75rem] max-w-[11rem] cursor-pointer rounded-md border border-orange-200 bg-white/95 px-2 py-1.5 text-xs font-medium text-orange-950 shadow-sm outline-none transition focus:border-orange-400 focus:ring-1 focus:ring-orange-300/50 sm:min-w-[9.25rem]";

  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-2">
      <div className="min-w-0 shrink sm:max-w-[min(100%,14rem)]">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.rangeLabel}</h2>
        {usedDefaultRange ? (
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{copy.rangeHint}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-end gap-2 sm:gap-2.5">
        <label className="flex flex-col gap-0.5">
          <span className="text-[11px] font-medium text-slate-600">{copy.rangeStart}</span>
          <input
            type="date"
            className={inputClass}
            value={fromIso}
            max={maxYmd}
            onChange={onFromChange}
            aria-label={copy.rangeStart}
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[11px] font-medium text-slate-600">{copy.rangeEnd}</span>
          <input
            type="date"
            className={inputClass}
            value={toIso}
            min={fromIso}
            max={maxYmd}
            onChange={onToChange}
            aria-label={copy.rangeEnd}
          />
        </label>
        <button
          type="button"
          className="rounded-full border border-orange-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-orange-900 transition hover:border-orange-300 hover:bg-orange-50"
          onClick={onReset}
        >
          {copy.rangeReset}
        </button>
      </div>
    </div>
  );
}
