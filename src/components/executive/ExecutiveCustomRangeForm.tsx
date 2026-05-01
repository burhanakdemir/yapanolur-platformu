"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  addCalendarDaysYmd,
  EXEC_MAX_CUSTOM_RANGE_DAYS,
  EXEC_MAX_DAILY_TREND_BUCKETS,
  istCalendarDaysInclusive,
} from "@/lib/executive/istanbulCalendar";

type Props = {
  /** İstanbul bugün — bitiş ve başlangıç üst sınırı */
  maxYmd: string;
  defaultFrom: string;
  defaultTo: string;
};

/** Bitiş sabitken başlangıcın erken olabileceği gün (365 gün dahil pencere). */
function earliestFromYmdForEnd(endYmd: string): string {
  return addCalendarDaysYmd(endYmd, -(EXEC_MAX_CUSTOM_RANGE_DAYS - 1));
}

export default function ExecutiveCustomRangeForm({ maxYmd, defaultFrom, defaultTo }: Props) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  const fromMin = useMemo(() => earliestFromYmdForEnd(to), [to]);
  const fromMax = to;
  const toMin = from;
  const toMax = maxYmd;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = from.trim();
    const t = to.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f) || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return;
    if (f > t || t > maxYmd || f > maxYmd) return;
    if (istCalendarDaysInclusive(f, t) > EXEC_MAX_CUSTOM_RANGE_DAYS) return;
    const q = new URLSearchParams();
    q.set("period", "custom");
    q.set("from", f);
    q.set("to", t);
    window.location.assign(`/executive?${q.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-3 flex flex-col gap-2 rounded-lg border border-orange-100 bg-orange-50/40 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <label className="flex min-w-[11rem] flex-col gap-1 text-xs font-medium text-slate-700">
        Başlangıç
        <input
          type="date"
          name="from"
          min={fromMin}
          max={fromMax}
          value={from}
          onChange={(ev) => {
            const v = ev.target.value;
            setFrom(v);
            if (v > to) setTo(v);
          }}
          className="rounded-lg border border-orange-200 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm outline-none ring-orange-200 focus:ring-2"
          aria-label="Başlangıç tarihi"
        />
      </label>
      <label className="flex min-w-[11rem] flex-col gap-1 text-xs font-medium text-slate-700">
        Bitiş
        <input
          type="date"
          name="to"
          min={toMin}
          max={toMax}
          value={to}
          onChange={(ev) => {
            const v = ev.target.value;
            setTo(v);
            const earliest = earliestFromYmdForEnd(v);
            if (from < earliest) setFrom(earliest);
          }}
          className="rounded-lg border border-orange-200 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm outline-none ring-orange-200 focus:ring-2"
          aria-label="Bitiş tarihi"
        />
      </label>
      <button type="submit" className="btn-primary shrink-0 px-4 py-2 text-sm">
        Uygula
      </button>
      <p className="w-full text-[11px] leading-snug text-slate-600 sm:col-span-full">
        Özet ve trend bu aralıkta hesaplanır. En fazla <strong>{EXEC_MAX_CUSTOM_RANGE_DAYS} gün</strong>{" "}
        (dahil). {EXEC_MAX_DAILY_TREND_BUCKETS} günden uzun aralıkta trend grafikleri otomatik{" "}
        <strong>aylık</strong> gruplanır.
      </p>
    </form>
  );
}
