"use client";

import { useEffect, useState } from "react";

export default function ExecutiveAnalyticsCards({
  initialLive,
  initialTotalMembers,
  activeWindowMs,
}: {
  initialLive: number;
  initialTotalMembers: number;
  activeWindowMs: number;
}) {
  const [live, setLive] = useState(initialLive);
  const [total, setTotal] = useState(initialTotalMembers);
  const nf = new Intl.NumberFormat("tr-TR");
  const windowMin = Math.max(1, Math.round(activeWindowMs / 60_000));

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const r = await fetch("/api/executive/analytics/live", { credentials: "include" });
        if (!r.ok) return;
        const j = (await r.json()) as {
          liveVisitors: number;
          totalMemberAccounts: number;
        };
        if (!cancelled) {
          setLive(j.liveVisitors);
          setTotal(j.totalMemberAccounts);
        }
      } catch {
        /* ignore */
      }
    }

    void poll();
    const id = setInterval(() => void poll(), 45_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="glass-card rounded-xl p-4 shadow-md">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Anlık ziyaretçi</p>
        <p className="mt-1 text-xl font-bold tabular-nums text-orange-950 md:text-2xl">{nf.format(live)}</p>
        <p className="mt-1 text-[11px] leading-snug text-slate-600">
          Son {windowMin} dakikada en az bir ping; sunucu penceresi ortam değişkeniyle ayarlanır
        </p>
      </div>
      <div className="glass-card rounded-xl p-4 shadow-md">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Toplam üye hesabı</p>
        <p className="mt-1 text-xl font-bold tabular-nums text-orange-950 md:text-2xl">{nf.format(total)}</p>
        <p className="mt-1 text-[11px] leading-snug text-slate-600">
          Veritabanında role=<span className="font-mono text-[10px]">MEMBER</span> kayıtları (silme alanı yok)
        </p>
      </div>
    </div>
  );
}
