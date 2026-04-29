"use client";

import { useEffect, useMemo, useState } from "react";

type Lang = "tr" | "en";

type Props = {
  endsAt: string;
  lang?: Lang;
  /** Daha küçük kartlar için sıkı tipografi */
  compact?: boolean;
};

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

const LABELS: Record<Lang, { day: string; hour: string; minute: string }> = {
  tr: { day: "Gün", hour: "Saat", minute: "Dak." },
  en: { day: "Day", hour: "Hr", minute: "Min" },
};

export default function AuctionCountdown({ endsAt, lang = "tr", compact }: Props) {
  const labels = LABELS[lang];
  const target = useMemo(() => new Date(endsAt).getTime(), [endsAt]);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, target - Date.now()));
    const timer = setInterval(tick, 1000);
    queueMicrotask(tick);
    return () => clearInterval(timer);
  }, [target]);

  const msLeft = left;
  const totalSec = Math.floor(msLeft / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);

  const units = [
    { key: "d", label: labels.day, value: d, twoDigit: false },
    { key: "h", label: labels.hour, value: h, twoDigit: true },
    { key: "m", label: labels.minute, value: m, twoDigit: true },
  ] as const;

  return (
    <div
      className={compact ? "grid w-full grid-cols-3 gap-0.5" : "grid w-full grid-cols-3 gap-1"}
      role="timer"
      aria-live="polite"
      aria-label={lang === "tr" ? "Ihale bitimine kalan sure" : "Time remaining until auction ends"}
    >
      {units.map(({ key, label, value, twoDigit }) => (
        <div
          key={key}
          className={
            compact
              ? "flex min-w-0 flex-col items-center rounded-md border border-orange-300/90 bg-gradient-to-b from-orange-50 to-amber-50 px-0.5 py-0.5 shadow-sm"
              : "flex min-w-0 flex-col items-center rounded-lg border border-orange-300/90 bg-gradient-to-b from-orange-50 to-amber-50 px-0.5 py-1 shadow-sm"
          }
        >
          <span
            className={
              compact
                ? "w-full truncate text-center text-[6px] font-bold uppercase leading-tight tracking-tight text-orange-900/90"
                : "w-full truncate text-center text-[8px] font-bold uppercase leading-tight tracking-tight text-orange-900/90"
            }
          >
            {label}
          </span>
          <span
            className={
              compact
                ? "text-xs font-bold tabular-nums leading-tight text-slate-900"
                : "text-base font-bold tabular-nums leading-tight text-slate-900"
            }
          >
            {twoDigit ? pad(value) : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}
