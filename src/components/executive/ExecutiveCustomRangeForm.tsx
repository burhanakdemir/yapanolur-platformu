"use client";

import { FormEvent, useState } from "react";
import { EXEC_MAX_DAILY_TREND_BUCKETS } from "@/lib/executive/istanbulCalendar";

type Props = {
  /** İstanbul takvimine göre bugün — `<input max>` için `YYYY-MM-DD` */
  maxYmd: string;
  defaultFrom: string;
};

export default function ExecutiveCustomRangeForm({ maxYmd, defaultFrom }: Props) {
  const [from, setFrom] = useState(defaultFrom);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = from.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
    const q = new URLSearchParams();
    q.set("period", "custom");
    q.set("from", v);
    window.location.assign(`/executive?${q.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-3 flex flex-col gap-2 rounded-lg border border-orange-100 bg-orange-50/40 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <label className="flex min-w-[12rem] flex-col gap-1 text-xs font-medium text-slate-700">
        Başlangıç (İstanbul) → bugün
        <input
          type="date"
          name="from"
          max={maxYmd}
          value={from}
          onChange={(ev) => setFrom(ev.target.value)}
          className="rounded-lg border border-orange-200 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm outline-none ring-orange-200 focus:ring-2"
          aria-label="Özet ve trend için başlangıç tarihi"
        />
      </label>
      <button type="submit" className="btn-primary shrink-0 px-4 py-2 text-sm">
        Uygula
      </button>
      <p className="w-full text-[11px] leading-snug text-slate-600 sm:col-span-full">
        Özet kartları bu aralıkta hesaplanır. {EXEC_MAX_DAILY_TREND_BUCKETS} günden uzun aralıkta trend
        grafikleri otomatik{" "}
        <strong>aylık</strong> gruplanır (performans).
      </p>
    </form>
  );
}
